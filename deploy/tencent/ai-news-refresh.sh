#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ai-news-site}"
DOMAIN="${DOMAIN:-news.ben1067190.top}"
SERVER_IP="${SERVER_IP:-122.51.163.190}"
ORIGIN_HOST="${ORIGIN_HOST:-127.0.0.1}"
ORIGIN_PORT="${ORIGIN_PORT:-8787}"
LOG_DIR="${LOG_DIR:-/var/log/ai-news}"
LOCK_FILE="${LOCK_FILE:-/var/lock/ai-news-refresh.lock}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
RUN_SERVER_UPDATE="${RUN_SERVER_UPDATE:-0}"

mkdir -p "$LOG_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "已有更新任务在运行，本次跳过。"
  exit 0
fi

cd "$APP_DIR"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export npm_config_registry="${npm_config_registry:-https://mirrors.tencentyun.com/npm/}"

if [ -d .git ]; then
  if command -v timeout >/dev/null 2>&1; then
    GIT_TERMINAL_PROMPT=0 timeout 45s git pull --ff-only || echo "代码自动拉取失败，继续使用服务器当前版本构建。"
  else
    GIT_TERMINAL_PROMPT=0 git pull --ff-only || echo "代码自动拉取失败，继续使用服务器当前版本构建。"
  fi
fi

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci
fi

if [ "$RUN_SERVER_UPDATE" = "1" ]; then
  npm run update
else
  echo "跳过腾讯云本机抓取，使用 GitHub 同步的完整新闻数据。"
fi
npm run build

write_site_block() {
  local label="$1"
  cat <<EOF
$label {
	encode zstd gzip
	header Cache-Control "no-store, no-cache, must-revalidate"
	header Pragma "no-cache"
	header Expires "0"
	reverse_proxy $ORIGIN_HOST:$ORIGIN_PORT
}
EOF
}

tmp_caddy="$(mktemp)"
{
  write_site_block "$DOMAIN"
  echo
  write_site_block "http://$SERVER_IP"
} > "$tmp_caddy"

caddy fmt --overwrite "$tmp_caddy" >/dev/null
if [ ! -f "$CADDYFILE" ] || ! cmp -s "$tmp_caddy" "$CADDYFILE"; then
  install -m 0644 "$tmp_caddy" "$CADDYFILE"
  rm -f "$tmp_caddy"
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
else
  rm -f "$tmp_caddy"
fi

node -e "const fs=require('fs'); const n=JSON.parse(fs.readFileSync('public/news.json','utf8')); console.log(JSON.stringify({generatedAt:n.generatedAt,total:n.items?.length||0,nextUpdateHint:n.nextUpdateHint||null}, null, 2));"
