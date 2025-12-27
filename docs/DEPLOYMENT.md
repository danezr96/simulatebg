# Deployment (Simple)

This project has 2 core deploy targets, plus a frontend host:

- Supabase = database + RLS (SQL only)
- VPS = worker (Node + systemd)
- Frontend = Strato (static files from dist/) OR VPS (Caddy static)

## One-time setup

### Supabase
Run these in the Supabase SQL editor when schema/rls change:

- `src/supabase/schema.sql`
- `src/supabase/seed.sql`
- `src/supabase/rls.sql`

### VPS worker
Required files:

- Code at `/srv/simulatebg`
- Systemd unit: `/etc/systemd/system/simulatebg-worker.service`
- Env file: `/etc/simulatebg/worker.env`

Worker env must contain:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
WORKER_POLL_INTERVAL_MS=5000
WORKER_TICK_STALE_MS=1200000
```

Do NOT put the service role key in the frontend.

### Strato frontend
You upload files from `dist/` to your Strato webspace folder.

### VPS frontend (Caddy)
If you host the frontend on the VPS, use the Caddy snap.

Files:
- Frontend env: `/srv/simulatebg/.env` (anon key only)
- Caddyfile: `/var/snap/caddy/common/Caddyfile`
- Caddy web root: `/var/snap/caddy/common/www`

Example Caddyfile:
```
ethics-404.com {
    root * /var/snap/caddy/common/www
    file_server
    encode gzip zstd
    try_files {path} /index.html
}
```

After edits, adapt to JSON and restart:
```
sudo /snap/caddy/current/usr/bin/caddy adapt --config /var/snap/caddy/common/Caddyfile --adapter caddyfile | sudo tee /var/snap/caddy/common/caddy.json > /dev/null
sudo snap restart caddy
```

## Every deploy

### Frontend (Strato)
On your Windows machine, in the repo:

```
pnpm install
pnpm build
```
    
Then upload everything inside `dist/` to the Strato webspace folder.

### Frontend (VPS + Caddy)
If the frontend is on the VPS:

```
cd /srv/simulatebg
pnpm install
pnpm build
sudo rsync -a --delete /srv/simulatebg/dist/ /var/snap/caddy/common/www/
```

If you used `scripts/setup-git-deploy.ps1` with the default `-CaddyWebRoot`,
the post-receive hook does the rsync step automatically after build.

### VPS worker
SSH into the VPS:

```
ssh root@85.215.192.58
cd /srv/simulatebg
git pull
pnpm install
systemctl restart simulatebg-worker
journalctl -u simulatebg-worker -n 50 --no-pager
```

### Supabase
Only rerun SQL when you changed schema or RLS.

## Quick troubleshooting

- Worker exits immediately: check `journalctl -u simulatebg-worker -n 200 --no-pager`
- Missing env: check `/etc/simulatebg/worker.env`
- RLS errors: ensure service role key is used on the VPS worker
- Caddy shows 404: ensure `dist/` is synced to `/var/snap/caddy/common/www`
- Tick stuck on "running": reset the lock
  ```
  node --import tsx -e "import { supabase } from './src/core/persistence/supabaseClient.ts'; const id='00000000-0000-0000-0000-000000000001'; await supabase.from('world_economy_state').update({is_ticking:false,last_tick_started_at:null}).eq('world_id',id); console.log('reset ok');"
  ```
- Stale tick auto-reset: adjust `WORKER_TICK_STALE_MS` in `/etc/simulatebg/worker.env` and restart the worker
