#!/usr/bin/env bash
# StorageBox installer for Linux.
#
#   sudo ./install.sh                 # interactive
#   sudo ./install.sh --yes           # accept every default, no prompts
#
# What it does:
#   1. Makes sure git, curl and Node.js >= 18 are installed (offers to install them).
#   2. Puts the code in --dir (this checkout if you ran it from one, otherwise a fresh
#      clone in /opt/storagebox) and runs `npm ci --omit=dev`.
#   3. Creates a *data directory* (default /var/lib/storagebox) that holds config.json,
#      users.json, the session secret, upload logs and the default shared folder. It lives
#      OUTSIDE the code directory on purpose, so update.sh can never touch it.
#   4. Writes config.json (only if one doesn't already exist - never overwritten).
#   5. Creates a systemd service and offers to enable + start it.
#
# Re-running is safe: existing config, users and data are left alone.

set -euo pipefail

SERVICE_NAME="storagebox"
DEFAULT_REPO="https://github.com/niruxx/StorageBox.git"

APP_DIR=""
DATA_DIR="/var/lib/storagebox"
SVC_USER=""
REPO=""
BRANCH=""
TITLE=""
PORT=""
HOST=""
SHARE_ROOT=""
ADMIN=""
INSTALL_SERVICE=1
ASSUME_YES=0
IN_PLACE=0

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: sudo ./install.sh [options]

  --dir PATH          Where the code lives (default: this checkout, else /opt/storagebox)
  --data-dir PATH     Where config, users and data live (default: /var/lib/storagebox)
  --user NAME         Account the service runs as (default: a dedicated "storagebox"
                      system user, or the owner of this checkout if run from one)
  --repo URL          Git repo to clone when not run from a checkout
  --branch NAME       Branch to install/track (default: the checkout's branch, else main)
  --title TEXT        Site title for a new config.json
  --port N            Port for a new config.json (default 3000)
  --host ADDR         Bind address for a new config.json (default 0.0.0.0)
  --root PATH         Folder to share (default: <data-dir>/files)
  --admin | --no-admin
                      Enable accounts + admin panel (adminEnabled) in a new config.json.
                      Default is off: a plain, anonymous, read-only directory.
  --no-service        Don't create/enable a systemd service
  -y, --yes           Non-interactive: accept defaults for anything not given as a flag
  -h, --help          Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)        APP_DIR="${2:?--dir needs a value}"; shift 2 ;;
    --data-dir)   DATA_DIR="${2:?--data-dir needs a value}"; shift 2 ;;
    --user)       SVC_USER="${2:?--user needs a value}"; shift 2 ;;
    --repo)       REPO="${2:?--repo needs a value}"; shift 2 ;;
    --branch)     BRANCH="${2:?--branch needs a value}"; shift 2 ;;
    --title)      TITLE="${2:?--title needs a value}"; shift 2 ;;
    --port)       PORT="${2:?--port needs a value}"; shift 2 ;;
    --host)       HOST="${2:?--host needs a value}"; shift 2 ;;
    --root)       SHARE_ROOT="${2:?--root needs a value}"; shift 2 ;;
    --admin)      ADMIN="yes"; shift ;;
    --no-admin)   ADMIN="no"; shift ;;
    --no-service) INSTALL_SERVICE=0; shift ;;
    -y|--yes)     ASSUME_YES=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            usage >&2; die "unknown option: $1" ;;
  esac
done

# The whole script is wrapped in main() and only invoked on the last line so bash has
# parsed everything before running - editing this file mid-run can't corrupt it.
main() {
  [ "$(uname -s)" = "Linux" ] || die "this installer is for Linux."

  # ---------- root ----------
  if [ "$(id -u)" -ne 0 ]; then
    command -v sudo >/dev/null 2>&1 || die "run as root (sudo is not available)."
    log "Re-running with sudo (needed for the service user, /var/lib and systemd)..."
    exec sudo -E bash "$SELF" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
  fi

  # ---------- where does the code live? ----------
  local script_dir
  script_dir="$(cd "$(dirname "$SELF")" && pwd)"
  if [ -z "$APP_DIR" ] && [ -f "$script_dir/package.json" ] && [ -f "$script_dir/server/index.js" ] \
     && [ -d "$script_dir/.git" ]; then
    APP_DIR="$script_dir"
  fi
  APP_DIR="${APP_DIR:-/opt/storagebox}"
  APP_DIR="$(readlink -m "$APP_DIR")"
  DATA_DIR="$(readlink -m "$DATA_DIR")"
  if [ -d "$APP_DIR/.git" ] && [ -f "$APP_DIR/server/index.js" ]; then IN_PLACE=1; fi

  case "$DATA_DIR/" in
    "$APP_DIR"/*) die "the data directory ($DATA_DIR) must not be inside the code directory ($APP_DIR) - updates would touch it." ;;
  esac

  if [ -z "$BRANCH" ]; then
    if [ "$IN_PLACE" = 1 ]; then
      BRANCH="$(git -C "$APP_DIR" symbolic-ref --short -q HEAD 2>/dev/null || echo main)"
    else
      BRANCH="main"
    fi
  fi
  if [ -z "$REPO" ]; then
    if [ "$IN_PLACE" = 1 ]; then
      REPO="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || echo "$DEFAULT_REPO")"
    else
      REPO="$DEFAULT_REPO"
    fi
  fi

  # ---------- service account ----------
  if [ -z "$SVC_USER" ]; then
    if [ "$IN_PLACE" = 1 ]; then
      SVC_USER="$(stat -c %U "$APP_DIR")"
      if [ "$SVC_USER" = "root" ]; then SVC_USER="storagebox"; fi
    else
      SVC_USER="storagebox"
    fi
  fi

  log "Code directory:  $APP_DIR $([ "$IN_PLACE" = 1 ] && echo '(existing checkout)' || echo '(will be cloned)')"
  log "Data directory:  $DATA_DIR"
  log "Service account: $SVC_USER"

  install_prerequisites
  ensure_service_user
  fetch_code
  install_dependencies
  prepare_data_dir
  write_config
  if [ "$INSTALL_SERVICE" = 1 ]; then
    setup_service
  else
    log "Skipping systemd service (--no-service)."
  fi
  print_summary
}

# ---------------------------------------------------------------- helpers

ask() { # ask VAR "prompt" default
  local var="$1" prompt="$2" def="$3" reply=""
  if [ "$ASSUME_YES" = 1 ] || [ ! -t 0 ]; then
    printf -v "$var" '%s' "$def"
    return
  fi
  read -r -p "$prompt [$def]: " reply || true
  printf -v "$var" '%s' "${reply:-$def}"
}

confirm() { # confirm "prompt" y|n  -> returns 0 for yes
  local prompt="$1" def="${2:-y}" reply=""
  if [ "$ASSUME_YES" = 1 ] || [ ! -t 0 ]; then
    [ "$def" = "y" ]
    return
  fi
  local hint="Y/n"; [ "$def" = "n" ] && hint="y/N"
  read -r -p "$prompt [$hint]: " reply || true
  reply="${reply:-$def}"
  case "$reply" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

RUN_HOME=""
# Run a command as another account with a throwaway HOME, so git/npm don't try to read
# or write root's home (or a nologin system user's non-existent one).
run_as() { # run_as USER cmd args...
  local user="$1"; shift
  if [ -z "$RUN_HOME" ]; then
    RUN_HOME="$(mktemp -d)"
    trap 'rm -rf "$RUN_HOME"' EXIT
  fi
  chown "$user" "$RUN_HOME"
  if command -v runuser >/dev/null 2>&1; then
    runuser -u "$user" -- env HOME="$RUN_HOME" "$@"
  else
    sudo -u "$user" -- env HOME="$RUN_HOME" "$@"
  fi
}

pkg_manager() {
  for pm in apt-get dnf yum pacman zypper apk; do
    command -v "$pm" >/dev/null 2>&1 && { echo "$pm"; return; }
  done
  echo ""
}

pkg_install() {
  case "$(pkg_manager)" in
    apt-get) DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y "$@" ;;
    dnf)     dnf install -y "$@" ;;
    yum)     yum install -y "$@" ;;
    pacman)  pacman -Sy --noconfirm --needed "$@" ;;
    zypper)  zypper --non-interactive install "$@" ;;
    apk)     apk add "$@" ;;
    *)       return 1 ;;
  esac
}

node_ok() {
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 \
    && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]
}

install_prerequisites() {
  log "Checking prerequisites (git, curl, Node.js >= 18)..."
  local missing=()
  command -v git  >/dev/null 2>&1 || missing+=(git)
  command -v curl >/dev/null 2>&1 || missing+=(curl)
  if [ ${#missing[@]} -gt 0 ]; then
    [ -n "$(pkg_manager)" ] || die "missing: ${missing[*]} - install them and re-run."
    confirm "Install ${missing[*]} with $(pkg_manager)?" y || die "git and curl are required."
    pkg_install "${missing[@]}"
  fi

  if node_ok; then
    log "Found Node.js $(node -v)."
    return
  fi

  local pm; pm="$(pkg_manager)"
  [ -n "$pm" ] || die "Node.js >= 18 (with npm) is required. Install it (https://nodejs.org) and re-run."
  confirm "Node.js >= 18 not found. Install it with $pm?" y || die "Node.js >= 18 is required."

  case "$pm" in
    pacman|apk|zypper) pkg_install nodejs npm ;;
    *)                 pkg_install nodejs npm || true ;;
  esac
  if node_ok; then return; fi

  # The distro's Node is missing or too old - offer NodeSource for apt/dnf/yum.
  case "$pm" in
    apt-get|dnf|yum)
      warn "The distro's Node.js is missing or older than 18."
      if confirm "Add the official NodeSource repository (Node 20 LTS)? This downloads and runs NodeSource's setup script as root." n; then
        if [ "$pm" = "apt-get" ]; then
          curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        else
          curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        fi
        pkg_install nodejs
      fi
      ;;
  esac
  node_ok || die "Node.js >= 18 with npm is still missing. Install it (https://nodejs.org, or nvm) and re-run."
}

ensure_service_user() {
  if id "$SVC_USER" >/dev/null 2>&1; then
    return
  fi
  log "Creating system user '$SVC_USER'..."
  useradd --system --user-group --no-create-home --home-dir "$DATA_DIR" \
    --shell "$(command -v nologin || echo /usr/sbin/nologin)" "$SVC_USER"
}

fetch_code() {
  if [ "$IN_PLACE" = 1 ]; then
    log "Using the existing checkout at $APP_DIR."
    return
  fi
  if [ -e "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
    die "$APP_DIR exists and is not a StorageBox checkout - pick another --dir."
  fi
  log "Cloning $REPO ($BRANCH) into $APP_DIR..."
  mkdir -p "$APP_DIR"
  chown "$SVC_USER":"$(id -gn "$SVC_USER")" "$APP_DIR"
  run_as "$SVC_USER" git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
}

install_dependencies() {
  log "Installing npm dependencies (production only)..."
  local owner; owner="$(stat -c %U "$APP_DIR")"
  if [ "$owner" = "root" ]; then
    (cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund)
  else
    (cd "$APP_DIR" && run_as "$owner" npm ci --omit=dev --no-audit --no-fund)
  fi
  if [ "$owner" != "$SVC_USER" ]; then
    warn "The code is owned by '$owner' but the service runs as '$SVC_USER' - make sure '$SVC_USER' can read $APP_DIR."
  fi
}

prepare_data_dir() {
  log "Preparing data directory $DATA_DIR..."
  mkdir -p "$DATA_DIR"
  chown "$SVC_USER":"$(id -gn "$SVC_USER")" "$DATA_DIR"
  chmod 750 "$DATA_DIR"
}

write_config() {
  local cfg="$DATA_DIR/config.json"
  if [ -f "$cfg" ]; then
    log "Keeping your existing $cfg (not modified)."
    return
  fi

  [ -n "$TITLE" ] || ask TITLE "Site title" "StorageBox"
  [ -n "$PORT" ] || ask PORT "Port" "3000"
  [ -n "$HOST" ] || HOST="0.0.0.0"
  [ -n "$SHARE_ROOT" ] || ask SHARE_ROOT "Folder to share" "$DATA_DIR/files"
  if [ -z "$ADMIN" ]; then
    if confirm "Enable accounts + admin panel? (No = plain anonymous read-only directory; Yes = first visit forces creating an admin login)" n; then
      ADMIN="yes"
    else
      ADMIN="no"
    fi
  fi

  case "$PORT" in ''|*[!0-9]*) die "port must be a number." ;; esac
  { [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ]; } || die "port must be 1-65535."
  SHARE_ROOT="$(readlink -m "$SHARE_ROOT")"

  if [ ! -d "$SHARE_ROOT" ]; then
    mkdir -p "$SHARE_ROOT"
    case "$SHARE_ROOT/" in
      "$DATA_DIR"/*) chown "$SVC_USER":"$(id -gn "$SVC_USER")" "$SHARE_ROOT" ;;
      *) warn "Created $SHARE_ROOT as root - grant '$SVC_USER' read (and write, if you'll enable write access) permission on it." ;;
    esac
  fi

  # Build the JSON with node so titles/paths are escaped correctly.
  CFG_TITLE="$TITLE" CFG_ROOT="$SHARE_ROOT" CFG_HOST="$HOST" CFG_PORT="$PORT" CFG_ADMIN="$ADMIN" \
    node -e '
      const cfg = {
        title: process.env.CFG_TITLE,
        root: process.env.CFG_ROOT,
        host: process.env.CFG_HOST,
        port: Number(process.env.CFG_PORT),
        adminEnabled: process.env.CFG_ADMIN === "yes",
        allowAnonymousUpload: false,
        allowWriteAccess: { enabled: false, webdav: false, defaultMode: "read-only", rules: [] }
      };
      process.stdout.write(JSON.stringify(cfg, null, 2) + "\n");
    ' > "$cfg"
  chown "$SVC_USER":"$(id -gn "$SVC_USER")" "$cfg"
  chmod 640 "$cfg"
  log "Wrote $cfg"
}

setup_service() {
  if ! command -v systemctl >/dev/null 2>&1 || [ ! -d /run/systemd/system ]; then
    warn "systemd isn't running here - skipping the service. Start manually with:"
    warn "  CONFIG_PATH=$DATA_DIR/config.json node $APP_DIR/server/index.js"
    return
  fi

  local unit="/etc/systemd/system/${SERVICE_NAME}.service"
  local node_bin port cfg="$DATA_DIR/config.json"
  node_bin="$(command -v node)"
  port="$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).port||3000)}catch{console.log(3000)}' "$cfg")"

  local caps=""
  if [ "$port" -lt 1024 ]; then
    caps=$'AmbientCapabilities=CAP_NET_BIND_SERVICE\nCapabilityBoundingSet=CAP_NET_BIND_SERVICE'
  fi

  local tmp; tmp="$(mktemp)"
  cat > "$tmp" <<EOF
[Unit]
Description=StorageBox file browser / storage server
Documentation=https://github.com/niruxx/StorageBox
After=network.target

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=CONFIG_PATH=$cfg
ExecStart=$node_bin $APP_DIR/server/index.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectControlGroups=true
$caps

[Install]
WantedBy=multi-user.target
EOF

  if [ -f "$unit" ] && ! cmp -s "$tmp" "$unit"; then
    warn "$unit already exists and differs from what this installer would write."
    if confirm "Replace it? (the old one is kept as ${unit}.bak)" y; then
      cp -p "$unit" "${unit}.bak"
    else
      rm -f "$tmp"; log "Left the existing service file alone."; return
    fi
  fi
  install -m 644 "$tmp" "$unit"
  rm -f "$tmp"
  systemctl daemon-reload
  log "Installed $unit"

  if confirm "Enable $SERVICE_NAME to start at boot and start it now?" y; then
    systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
    systemctl restart "$SERVICE_NAME"
    sleep 2
    if systemctl is-active --quiet "$SERVICE_NAME"; then
      log "Service is running."
    else
      warn "The service didn't stay up. Recent logs:"
      journalctl -u "$SERVICE_NAME" -n 20 --no-pager || true
    fi
  else
    log "Not enabled. Later: sudo systemctl enable --now $SERVICE_NAME"
  fi
}

print_summary() {
  local cfg="$DATA_DIR/config.json" port host
  port="$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).port||3000)}catch{console.log(3000)}' "$cfg")"
  host="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo
  log "Done."
  echo "   Open:        http://${host:-localhost}:$port"
  echo "   Config:      $cfg   (edit, then: sudo systemctl restart $SERVICE_NAME)"
  echo "   User data:   $DATA_DIR   (never touched by update.sh)"
  echo "   Update:      sudo $APP_DIR/update.sh"
  echo "   Logs:        journalctl -u $SERVICE_NAME -f"
  if grep -q '"adminEnabled": true' "$cfg" 2>/dev/null; then
    echo "   First visit: you'll be asked to create the admin account."
  fi
  echo "   Firewall:    remember to allow TCP $port if you want other machines to reach it."
}

SELF="$(readlink -f "${BASH_SOURCE[0]}")"
ORIG_ARGS=("$@")
main
exit $?
