#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🔎 Tres Amigos Secure Etsy v2 — verification"

echo "• Checking required files..."
for f in \
  "index.html" \
  "shop/index.html" \
  "links/index.html" \
  "assets/site.js" \
  "assets/etsy-store.js" \
  "cloudflare/worker/src/index.js" \
  "cloudflare/worker/wrangler.jsonc"; do
  test -f "$f" || { echo "❌ Missing $f"; exit 1; }
done

echo "• Checking that legacy Shopify URLs are gone..."
if grep -RniE 'myshopify\.com|outatinc\.myshopify' \
  --exclude-dir=.git --exclude='*.zip' .; then
  echo "❌ Legacy Shopify URL found."
  exit 1
fi

echo "• Checking that secrets were not committed..."
if find . -type f \( -name '.dev.vars' -o -name '.env' \) -print | grep -q .; then
  echo "❌ A local secret file is present. Remove it before committing."
  exit 1
fi
if grep -RniE 'ETSY_SHARED_SECRET[[:space:]]*=[[:space:]]*[^<\$\{]' \
  --exclude-dir=.git --exclude='*.md' --exclude='*.command' .; then
  echo "❌ Possible hard-coded Etsy secret found."
  exit 1
fi

echo "• Checking JavaScript syntax..."
if command -v node >/dev/null 2>&1; then
  node --check assets/etsy-store.js
  node --check cloudflare/worker/src/index.js
else
  echo "  ⚠️ Node not installed; skipped JS syntax check."
fi

echo "• Checking Etsy links page..."
grep -q 'https://www.etsy.com/shop/TresAmigosUnaVida' links/index.html || { echo "❌ Etsy link missing from links page"; exit 1; }

echo "• Checking live catalog mount..."
grep -q 'id="etsy-live-catalog"' shop/index.html || { echo "❌ Live catalog mount missing"; exit 1; }
grep -q '/api/etsy/catalog' assets/etsy-store.js || { echo "❌ Etsy API route missing"; exit 1; }

echo "✅ Verification passed."
