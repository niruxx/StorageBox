#!/usr/bin/env bash
# StorageBox updater for Linux.
#
#   sudo ./update.sh            # pull the latest commits, refresh dependencies, restart
#
# Brings the *code* up to date with the latest git commits. Your data is never modified:
#   - config.json, users.json, session-secret.txt and log_anonymous.log live in the data
#     directory (or are gitignored, for older installs that keep them next to the code),
#     and this script only ever copies them into a backups/ folder before updating;
#   - the shared folder and everything uploaded into it are not touched either.
#
# If the new version fails to come back up, the script rolls the code back to the commit
# you were on and restarts it.

set -euo pipefail

SERVICE_NAME="storagebox"
BRANCH_OVERRIDE=""
DO_STASH=0
DO_RESTART=1
FORCE_DEPS=0
KEEP_BACKUPS=5

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: sudo ./update.sh [options]

  --branch NAME   Update to this branch instead of the one currently checked out
  --stash         If tracked files in the code directory have local changes, stash them
                  for the update and re-apply them afterwards (default: refuse to update)
  --force-deps    Re-run `npm ci` even if package.json/package-lock.json didn't change
  --no-restart    Don't restart the systemd service afterwards
  -h, --help      Show this help
EOF
}

RUN_HOME=""
OWNER=""
APP_DIR=""

# Run a command as the account that owns the code (so git/npm don't leave root-owned files
# behind and git doesn't complain about "dubious ownership"), with a throwaway HOME.
as_owner() {
  if [ "$(id -u)" -eq 0 ] && [ "$OWNER" != "root" ]; then
    if [ -z "$RUN_HOME" ]; then
      RUN_HOME="$(mktemp -d)"
      trap 'rm -rf "$RUN_HOME"' EXIT
    fi
    chown "$OWNER" "$RUN_HOME"
    if command -v runuser >/dev/null 2>&1; then
      runuser -u "$OWNER" -- env HOME="$RUN_HOME" "$@"
    else
      sudo -u "$OWNER" -- env HOME="$RUN_HOME" "$@"
    fi
  else
    "$@"
  fi
}

git_() { as_owner git -C "$APP_DIR" "$@"; }

# Everything lives in main() and the file ends with a single `main "$@"; exit $?` line.
# git replaces this very file during the update, and bash reads scripts incrementally -
# having the whole thing parsed up front keeps that from corrupting the running script.
main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --branch)     BRANCH_OVERRIDE="${2:?--branch needs a value}"; shift 2 ;;
      --stash)      DO_STASH=1; shift ;;
      --force-deps) FORCE_DEPS=1; shift ;;
      --no-restart) DO_RESTART=0; shift ;;
      -h|--help)    usage; exit 0 ;;
      *)            usage >&2; die "unknown option: $1" ;;
    esac
  done

  [ "$(uname -s)" = "Linux" ] || die "this updater is for Linux."
  APP_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
  [ -d "$APP_DIR/.git" ] && [ -f "$APP_DIR/server/index.js" ] \
    || die "$APP_DIR is not a StorageBox git checkout."
  command -v git  >/dev/null 2>&1 || die "git is not installed."
  command -v node >/dev/null 2>&1 || die "node is not installed."
  command -v npm  >/dev/null 2>&1 || die "npm is not installed."

  OWNER="$(stat -c %U "$APP_DIR")"
  if [ "$(id -u)" -ne 0 ] && [ "$(id -un)" != "$OWNER" ]; then
    if command -v sudo >/dev/null 2>&1; then
      log "Re-running with sudo (the code is owned by '$OWNER')..."
      exec sudo -E bash "$APP_DIR/update.sh" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
    fi
    die "run this as root or as '$OWNER'."
  fi

  local cfg cfg_dir
  cfg="$(find_config)"
  cfg_dir="$(dirname "$cfg")"
  log "Code directory: $APP_DIR"
  log "Config:         $cfg  (left untouched)"

  # ---------- figure out what to update to ----------
  local branch old_head upstream
  branch="$(git_ symbolic-ref --short -q HEAD || true)"
  [ -n "$branch" ] || die "the checkout is in detached-HEAD state; check out a branch first."
  if [ -n "$BRANCH_OVERRIDE" ] && [ "$BRANCH_OVERRIDE" != "$branch" ]; then
    branch="$BRANCH_OVERRIDE"
    log "Switching to branch $branch."
  fi
  old_head="$(git_ rev-parse HEAD)"

  log "Fetching from origin..."
  git_ fetch --prune origin "$branch"
  upstream="origin/$branch"
  git_ rev-parse --verify -q "$upstream" >/dev/null || die "origin has no branch '$branch'."

  # ---------- local modifications to tracked files ----------
  local dirty stashed=0
  dirty="$(git_ status --porcelain --untracked-files=no)"
  if [ -n "$dirty" ]; then
    if [ "$DO_STASH" = 1 ]; then
      log "Stashing local changes to tracked files..."
      git_ stash push -m "storagebox-update-$(date +%Y%m%d-%H%M%S)" >/dev/null
      stashed=1
    else
      printf '%s\n' "$dirty" >&2
      die "tracked files in $APP_DIR have local changes (listed above). Commit or revert them, or re-run with --stash. (Files you added, and gitignored ones like config.json/users.json, are never affected.)"
    fi
  fi

  # ---------- already current? ----------
  local current_branch new_head
  current_branch="$(git_ symbolic-ref --short -q HEAD)"
  if [ "$current_branch" = "$branch" ] && [ "$old_head" = "$(git_ rev-parse "$upstream")" ] && [ "$FORCE_DEPS" = 0 ]; then
    log "Already up to date ($(git_ rev-parse --short HEAD))."
    finish_stash "$stashed"
    return 0
  fi

  backup_userdata "$cfg_dir"

  if [ "$current_branch" = "$branch" ]; then
    log "Incoming commits:"
    git_ log --oneline --no-decorate "HEAD..$upstream" | sed 's/^/     /' || true
    git_ merge --ff-only "$upstream" \
      || die "can't fast-forward - the local branch has commits that aren't on origin. Resolve that by hand (nothing was changed)."
  else
    git_ checkout "$branch" 2>/dev/null || git_ checkout -b "$branch" --track "$upstream"
    git_ merge --ff-only "$upstream" || die "can't fast-forward $branch to $upstream."
  fi
  new_head="$(git_ rev-parse HEAD)"
  log "Code is now at $(git_ rev-parse --short HEAD)."

  # ---------- dependencies ----------
  if [ "$FORCE_DEPS" = 1 ] || [ ! -d "$APP_DIR/node_modules" ] \
     || git_ diff --name-only "$old_head" "$new_head" | grep -Eq '^package(-lock)?\.json$'; then
    install_deps
  else
    log "Dependencies unchanged - skipping npm ci."
  fi

  # ---------- restart + health check, with rollback ----------
  if [ "$DO_RESTART" = 1 ] && service_active; then
    log "Restarting $SERVICE_NAME..."
    if restart_and_check "$cfg"; then
      log "Service is healthy."
    else
      warn "The updated version didn't come up cleanly - rolling back to ${old_head:0:7}."
      git_ reset --hard "$old_head" >/dev/null
      install_deps
      restart_and_check "$cfg" || warn "Still not healthy after rollback - check: journalctl -u $SERVICE_NAME -n 50"
      finish_stash "$stashed"
      die "update rolled back. Your data was not touched. See: journalctl -u $SERVICE_NAME -n 50"
    fi
  elif [ "$DO_RESTART" = 1 ]; then
    log "The $SERVICE_NAME service isn't running (or isn't installed) - nothing to restart."
  else
    log "Skipped restart (--no-restart). Restart it yourself to load the new code."
  fi

  finish_stash "$stashed"
  log "Update complete: ${old_head:0:7} -> ${new_head:0:7}."
}

# ---------------------------------------------------------------- helpers

# Where is the live config.json? Prefer what the installed service is actually using, then
# CONFIG_PATH from the environment, then a config.json next to the code (older layout).
find_config() {
  local unit path=""
  for unit in "/etc/systemd/system/${SERVICE_NAME}.service" "/lib/systemd/system/${SERVICE_NAME}.service"; do
    if [ -f "$unit" ]; then
      path="$(sed -n 's/^Environment="\{0,1\}CONFIG_PATH=\([^"]*\)"\{0,1\}$/\1/p' "$unit" | head -n1)"
      [ -n "$path" ] && break
    fi
  done
  [ -n "$path" ] || path="${CONFIG_PATH:-}"
  [ -n "$path" ] || path="$APP_DIR/config.json"
  printf '%s' "$path"
}

backup_userdata() {
  local dir="$1" stamp dest f copied=0
  stamp="$(date +%Y%m%d-%H%M%S)"
  dest="$dir/backups/$stamp"
  for f in config.json users.json session-secret.txt log_anonymous.log; do
    if [ -f "$dir/$f" ]; then
      mkdir -p "$dest"
      cp -p "$dir/$f" "$dest/$f"
      copied=1
    fi
  done
  if [ "$copied" = 1 ]; then
    chmod 700 "$dir/backups" "$dest" 2>/dev/null || true
    log "Backed up config/users to $dest"
    # Only ever prune the backups this script made itself.
    # shellcheck disable=SC2012
    ls -1dt "$dir"/backups/*/ 2>/dev/null | tail -n +"$((KEEP_BACKUPS + 1))" | while read -r old; do rm -rf "$old"; done
  fi
}

install_deps() {
  log "Installing npm dependencies (production only)..."
  (cd "$APP_DIR" && as_owner npm ci --omit=dev --no-audit --no-fund)
}

finish_stash() {
  [ "${1:-0}" = 1 ] || return 0
  log "Re-applying your stashed local changes..."
  if ! git_ stash pop >/dev/null; then
    warn "Couldn't cleanly re-apply your stashed changes. They're safe in 'git stash list' - resolve with: git -C $APP_DIR stash pop"
  fi
}

have_systemd() { command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; }

sysctl_() {
  if [ "$(id -u)" -eq 0 ]; then systemctl "$@"; else sudo systemctl "$@"; fi
}

service_active() {
  have_systemd && systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null
}

restart_and_check() {
  local cfg="$1" port host url i
  sysctl_ restart "$SERVICE_NAME" || return 1
  read -r port host < <(node -e '
    try {
      const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const h = c.host && !["0.0.0.0", "::", "localhost"].includes(c.host) ? c.host : "127.0.0.1";
      console.log((c.port || 3000) + " " + h);
    } catch { console.log("3000 127.0.0.1"); }
  ' "$cfg")
  url="http://${host}:${port}/api/config"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    systemctl is-active --quiet "$SERVICE_NAME" || continue
    if ! command -v curl >/dev/null 2>&1; then return 0; fi
    if curl -fsS -o /dev/null --max-time 3 "$url"; then return 0; fi
  done
  return 1
}

ORIG_ARGS=("$@")
main "$@"; exit $?
