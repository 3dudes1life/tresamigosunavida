#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WORKER_DIR="$ROOT/cloudflare/worker"
cd "$WORKER_DIR"

echo "☁️ Tres Amigos, Una Vida — Cloudflare secure edge setup"
echo
echo "This keeps GitHub Pages as the website origin and puts Cloudflare in front of it."
echo "The Worker route requires www.tresamigosunavida.com to be a PROXIED Cloudflare DNS record."
echo

command -v node >/dev/null 2>&1 || {
  echo "❌ Node.js is required for Wrangler. Install Node, then run this again."
  exit 1
}
command -v npx >/dev/null 2>&1 || {
  echo "❌ npx is required. Install Node/npm, then run this again."
  exit 1
}

echo "1/5 Checking Cloudflare login..."
if ! npx --yes wrangler@latest whoami >/dev/null 2>&1; then
  echo "Cloudflare will open a browser login."
  npx --yes wrangler@latest login
fi

echo "2/5 Verifying Worker build..."
npx --yes wrangler@latest deploy --dry-run >/dev/null

echo "3/5 Creating/updating Worker route..."
if ! npx --yes wrangler@latest deploy; then
  echo
  echo "❌ Cloudflare could not attach the Worker route."
  echo "Check that tresamigosunavida.com is active in Cloudflare and that the www DNS record is orange-cloud PROXIED."
  echo "Nothing was written into GitHub and no Etsy secret was exposed."
  exit 1
fi

echo
echo "4/5 Saving Etsy credentials as Cloudflare secrets..."
read -r -p "Paste Etsy KEYSTRING: " ETSY_KEYSTRING
if [ -z "$ETSY_KEYSTRING" ]; then
  echo "❌ Keystring cannot be empty."
  exit 1
fi
read -r -s -p "Paste Etsy SHARED SECRET (hidden): " ETSY_SHARED_SECRET
echo
if [ -z "$ETSY_SHARED_SECRET" ]; then
  echo "❌ Shared secret cannot be empty."
  exit 1
fi

printf '%s' "$ETSY_KEYSTRING" | npx --yes wrangler@latest secret put ETSY_KEYSTRING
printf '%s' "$ETSY_SHARED_SECRET" | npx --yes wrangler@latest secret put ETSY_SHARED_SECRET
unset ETSY_KEYSTRING ETSY_SHARED_SECRET

echo "5/5 Deploying final Worker with secrets..."
npx --yes wrangler@latest deploy

echo
if command -v curl >/dev/null 2>&1; then
  echo "Testing public Etsy catalog endpoint..."
  HTTP_CODE="$(curl -sS -o /tmp/tres-etsy-catalog.json -w '%{http_code}' https://www.tresamigosunavida.com/api/etsy/catalog || true)"
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Etsy catalog endpoint is live."
  else
    echo "⚠️ Endpoint returned HTTP $HTTP_CODE. DNS/route propagation may still be catching up."
  fi
  rm -f /tmp/tres-etsy-catalog.json
fi

echo "✅ Cloudflare secure edge setup complete."
echo "GitHub remains your normal website update workflow."
