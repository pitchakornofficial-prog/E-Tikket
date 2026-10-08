#!/usr/bin/env bash
# Invoked over EC2 Instance Connect by deploy-dev's workflow. Existing host only.
set -euo pipefail
archive=${1:?release archive required}
revision=${2:?commit required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
base=/opt/e-tikket
export PATH="$base/node/bin:$PATH"
[[ -x "$base/node/bin/node" && -f "$base/shared/app.env" && -L "$base/current" ]]
# Also protects against simultaneous manual deployments on this host.
exec 9>"$base/shared/deploy.lock"
flock -w 600 9
release="$base/releases/$revision"
previous=$(readlink -f "$base/current")
backup="$base/shared/backups/$(date -u +%Y%m%dT%H%M%SZ)-$revision.db"
stopped=0
activated=0
rollback() {
  code=$?
  trap - ERR
  if [[ "$stopped" == 1 ]]; then
    systemctl stop e-tikket || true
    # Before activation no new writes can exist, so a failed migration can be restored.
    if [[ "$activated" == 0 && -f "$backup" ]]; then
      cp "$backup" "$base/shared/app.db"
      rm -f "$base/shared/app.db-wal" "$base/shared/app.db-shm"
      chown e-tikket:e-tikket "$base/shared/app.db"
      chmod 600 "$base/shared/app.db"
    fi
    ln -sfn "$previous" "$base/current.rollback"
    mv -Tf "$base/current.rollback" "$base/current"
    systemctl restart e-tikket || true
  fi
  echo "Deployment failed; previous application release restored." >&2
  exit "$code"
}
trap rollback ERR
# A retry of an already running, healthy commit does not mutate its active directory.
if [[ "$previous" == "$release/app" ]] && curl -fsS http://127.0.0.1:3100/api/health | python3 -c 'import json,sys; assert json.load(sys.stdin)["revision"]==sys.argv[1]' "$revision"; then
  rm -f "$archive"
  exit 0
fi
[[ "$previous" != "$release/app" ]]
install -d -o e-tikket -g e-tikket "$release" "$base/shared/backups"
tar -xzf "$archive" -C "$release"
ln -sfn "$base/shared/app.env" "$release/.env"
chown -R e-tikket:e-tikket "$release"
cd "$release"
# CLI is needed for migrations; application is already built and verified on Linux in CI.
runuser -u e-tikket -- env PATH="$PATH" NODE_ENV=development npm ci --include=dev --no-audit --no-fund
# Only URL configuration is changed; session/email/storage secrets remain server-side.
python3 - "$base/shared/app.env" <<'PYENV'
from pathlib import Path
import sys
p=Path(sys.argv[1])
keys={'APP_ORIGIN','APP_URL','NEXT_PUBLIC_APP_URL'}
lines=[line for line in p.read_text().splitlines() if line.split('=',1)[0] not in keys]
lines += [f'{key}=https://e-ticket.phatysd.me' for key in sorted(keys)]
p.write_text('\n'.join(lines)+'\n')
PYENV
systemctl stop e-tikket
stopped=1
runuser -u e-tikket -- python3 - "$backup" <<'PYBACKUP'
import sqlite3, sys
with sqlite3.connect('/opt/e-tikket/shared/app.db') as source:
    with sqlite3.connect(sys.argv[1]) as destination:
        source.backup(destination)
PYBACKUP
chmod 600 "$backup"
# Never db push --accept-data-loss, reset, or run seed against this persistent database.
runuser -u e-tikket -- env PATH="$PATH" npx prisma migrate deploy
printf '%s\n' "$previous" > "$base/shared/previous-release"
ln -sfn "$release/app" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
install -d /etc/systemd/system/e-tikket.service.d
cat > /etc/systemd/system/e-tikket.service.d/revision.conf <<'UNIT'
[Service]
EnvironmentFile=-/opt/e-tikket/current/release.env
UNIT
systemctl daemon-reload
systemctl restart e-tikket
activated=1
healthy=0
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3100/api/health | python3 -c 'import json,sys; r=json.load(sys.stdin); assert r["status"]=="ok" and r["revision"]==sys.argv[1]' "$revision"; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" == 1 ]]
systemctl is-active e-tikket
rm -f "$archive"
echo "Deployed commit $revision"
