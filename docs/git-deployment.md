# Git-based deployment (VPS)

This setup uses a bare repo on the VPS and a post-receive hook. Every `git push` to the VPS deploys and optionally restarts a systemd service.

## Quick setup (using the helper script)

1) Make sure the VPS has `git`, `node`, and `pnpm` in PATH for non-interactive shells.
2) Run the helper from your local machine:

```powershell
  .\scripts\setup-git-deploy.ps1 `
    -TargetHost user@host `
    -RemoteGitDir /srv/git/simulatebg.git `
    -RemotePath /srv/simulatebg `
    -Branch main `
    -ServiceName simulatebg-worker `
    -CaddyWebRoot /var/snap/caddy/common/www
```

3) Add a Git remote and push:

```bash
git remote add vps user@host:/srv/git/simulatebg.git
git push vps main
```

## What the hook does

- Checks out the pushed branch into `/srv/simulatebg`.
- Runs `pnpm install --frozen-lockfile`.
- Runs `pnpm build` (creates `dist/`).
- Syncs `dist/` to Caddy web root when `-CaddyWebRoot` is set.
- Restarts `simulatebg-worker` when `systemctl` is available.

## Notes

- If you only deploy the static frontend, set `-ServiceName ""` to skip the restart.
- Set `-CaddyWebRoot ""` to skip syncing `dist/`.
- If `pnpm` is installed via `nvm` or `corepack`, ensure it is available in non-interactive shells (for example, add it in `.profile`).
- To deploy a different branch, change `-Branch`.
- Roll back by pushing a specific commit: `git push vps <commit>:main`.

## Manual setup (no helper script)

On the VPS:

```bash
mkdir -p /srv/git /srv/simulatebg
git init --bare /srv/git/simulatebg.git
```

Create `/srv/git/simulatebg.git/hooks/post-receive`:

```bash
#!/usr/bin/env bash
set -e
GIT_DIR="/srv/git/simulatebg.git"
WORK_TREE="/srv/simulatebg"
BRANCH="main"
SERVICE="simulatebg-worker"
CADDY_ROOT="/var/snap/caddy/common/www"

read -r oldrev newrev ref
if [ "$ref" != "refs/heads/$BRANCH" ]; then
  exit 0
fi

git --work-tree="$WORK_TREE" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
cd "$WORK_TREE"

pnpm install --frozen-lockfile
pnpm build

if [ -n "$CADDY_ROOT" ] && [ -d "$WORK_TREE/dist" ]; then
  mkdir -p "$CADDY_ROOT"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$WORK_TREE/dist/" "$CADDY_ROOT/"
  else
    rm -rf "$CADDY_ROOT"/*
    cp -R "$WORK_TREE/dist/." "$CADDY_ROOT/"
  fi
fi

systemctl restart "$SERVICE"
systemctl status "$SERVICE" --no-pager
```

Then:

```bash
chmod +x /srv/git/simulatebg.git/hooks/post-receive
```

From your local machine:

```bash
git remote add vps user@host:/srv/git/simulatebg.git
git push vps main
```
