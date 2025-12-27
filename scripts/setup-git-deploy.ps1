param(
  [Parameter(Mandatory = $true)][string]$TargetHost,
  [string]$RemoteGitDir = "/srv/git/simulatebg.git",
  [string]$RemotePath = "/srv/simulatebg",
  [string]$Branch = "main",
  [string]$ServiceName = "simulatebg-worker",
  [string]$CaddyWebRoot = "/var/snap/caddy/common/www"
)

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw "ssh is not available. Install OpenSSH client first."
}

$remoteCommand = @'
set -e
GIT_DIR="__GIT_DIR__"
WORK_TREE="__WORK_TREE__"
BRANCH="__BRANCH__"
SERVICE="__SERVICE__"
CADDY_ROOT="__CADDY_ROOT__"

mkdir -p "$(dirname "$GIT_DIR")" "$WORK_TREE"

if [ ! -d "$GIT_DIR" ]; then
  git init --bare "$GIT_DIR"
fi

HOOK="$GIT_DIR/hooks/post-receive"
cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
set -e
GIT_DIR="__GIT_DIR__"
WORK_TREE="__WORK_TREE__"
BRANCH="__BRANCH__"
SERVICE="__SERVICE__"
CADDY_ROOT="__CADDY_ROOT__"

read -r oldrev newrev ref
if [ "$ref" != "refs/heads/$BRANCH" ]; then
  exit 0
fi

git --work-tree="$WORK_TREE" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
cd "$WORK_TREE"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm build
else
  echo "pnpm not found; skipping install/build"
fi

if [ -n "$CADDY_ROOT" ] && [ -d "$WORK_TREE/dist" ]; then
  mkdir -p "$CADDY_ROOT"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$WORK_TREE/dist/" "$CADDY_ROOT/"
  else
    rm -rf "$CADDY_ROOT"/*
    cp -R "$WORK_TREE/dist/." "$CADDY_ROOT/"
  fi
fi

if [ -n "$SERVICE" ] && command -v systemctl >/dev/null 2>&1; then
  systemctl restart "$SERVICE"
  systemctl status "$SERVICE" --no-pager
fi
EOF

chmod +x "$HOOK"
echo "Hook installed at $HOOK"
'@

$remoteCommand = $remoteCommand.Replace("__GIT_DIR__", $RemoteGitDir)
$remoteCommand = $remoteCommand.Replace("__WORK_TREE__", $RemotePath)
$remoteCommand = $remoteCommand.Replace("__BRANCH__", $Branch)
$remoteCommand = $remoteCommand.Replace("__SERVICE__", $ServiceName)
$remoteCommand = $remoteCommand.Replace("__CADDY_ROOT__", $CaddyWebRoot)

ssh $TargetHost $remoteCommand
