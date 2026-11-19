#!/bin/bash
# ---------------------------------------------------------------------------
# Runs on the EC2 instance (as root) after the release has been copied to
# /tmp/bitezy-<release-id>. Installs dependencies, publishes the static apps,
# restarts the API and verifies that it is healthy.
#
# Usage: sudo bash deploy/deploy.sh <release-id>
# ---------------------------------------------------------------------------
set -euo pipefail

RELEASE_ID="${1:?usage: deploy.sh <release-id>}"
ROOT=/opt/bitezy
APP_USER=bitezy
STATIC=/var/www/bitezy
SRC="/tmp/bitezy-$RELEASE_ID"
DEST="$ROOT/releases/$RELEASE_ID"

log() { echo "[deploy] $*"; }

if [ ! -d "$SRC" ]; then
    echo "[deploy] ERROR: $SRC does not exist" >&2
    exit 1
fi

log "Installing release $RELEASE_ID"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$SRC/." "$DEST/"

# The environment file is uploaded separately so it never lives in the repo.
if [ -f "/tmp/bitezy-$RELEASE_ID.env" ]; then
    install -m 600 -o "$APP_USER" -g "$APP_USER" \
        "/tmp/bitezy-$RELEASE_ID.env" "$ROOT/shared/.env"
    rm -f "/tmp/bitezy-$RELEASE_ID.env"
fi

if [ ! -s "$ROOT/shared/.env" ]; then
    echo "[deploy] ERROR: $ROOT/shared/.env is missing or empty" >&2
    exit 1
fi

log "Installing backend dependencies"
cd "$DEST/Backend"
if [ -f package-lock.json ]; then
    npm ci --omit=dev --no-audit --no-fund
else
    npm install --omit=dev --no-audit --no-fund
fi

# Uploaded food images survive releases.
rm -rf "$DEST/Backend/uploads"
mkdir -p "$ROOT/shared/uploads"
ln -sfn "$ROOT/shared/uploads" "$DEST/Backend/uploads"
ln -sfn "$ROOT/shared/.env" "$DEST/Backend/.env"

# Seed the sample images that ship with the code (never overwrites uploads).
if [ -d "$DEST/Backend/seed/uploads" ]; then
    cp -an "$DEST/Backend/seed/uploads/." "$ROOT/shared/uploads/" 2>/dev/null || true
fi

chown -R "$APP_USER:$APP_USER" "$DEST" "$ROOT/shared"

log "Switching the current release"
ln -sfn "$DEST" "$ROOT/current"

log "Publishing static apps"
mkdir -p "$STATIC"
for app in frontend admin; do
    rm -rf "$STATIC/$app.new" "$STATIC/$app.old"
    cp -a "$DEST/$app" "$STATIC/$app.new"
    if [ -d "$STATIC/$app" ]; then
        mv "$STATIC/$app" "$STATIC/$app.old"
    fi
    mv "$STATIC/$app.new" "$STATIC/$app"
    rm -rf "$STATIC/$app.old"
done

log "Restarting the API"
systemctl daemon-reload
systemctl restart bitezy-api
nginx -t
systemctl reload nginx

log "Waiting for the API health check"
healthy=0
for _ in $(seq 1 40); do
    if curl -fsS --max-time 3 http://127.0.0.1:4000/ >/dev/null 2>&1; then
        healthy=1
        break
    fi
    sleep 2
done

if [ "$healthy" -ne 1 ]; then
    echo "[deploy] ERROR: the API did not become healthy" >&2
    journalctl -u bitezy-api -n 80 --no-pager || true
    exit 1
fi

log "Removing old releases (keeping the 5 most recent)"
cd "$ROOT/releases"
ls -1dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf

log "Deploy complete: $RELEASE_ID"
