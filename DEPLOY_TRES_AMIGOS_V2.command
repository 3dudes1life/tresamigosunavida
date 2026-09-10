#!/bin/bash
set -euo pipefail

BUILD_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$HOME/Downloads/tresamigosunavida-secure-update"
REPO_URL="https://github.com/3dudes1life/tresamigosunavida.git"

echo "📚 Tres Amigos, Una Vida — Secure Etsy v2 GitHub deploy"

echo "1/5 Verifying build..."
bash "$BUILD_DIR/VERIFY_TRES_AMIGOS_V2.command"

echo "2/5 Cloning current GitHub repo..."
rm -rf "$WORK_DIR"
git clone "$REPO_URL" "$WORK_DIR"

echo "3/5 Applying build..."
rsync -av --delete \
  --exclude='.git' \
  --exclude='__MACOSX' \
  --exclude='.DS_Store' \
  "$BUILD_DIR/" "$WORK_DIR/"

cd "$WORK_DIR"

echo "4/5 Final verification..."
bash ./VERIFY_TRES_AMIGOS_V2.command

echo "5/5 Committing and pushing..."
git add -A
if git diff --cached --quiet; then
  echo "✅ GitHub already matches this build. Nothing to push."
else
  git commit -m "Tres Amigos secure Etsy storefront + Cloudflare edge v2"
  git push
  echo "✅ GitHub push complete."
fi

echo
echo "Next: run SETUP_CLOUDFLARE.command once to activate the secure edge + private Etsy API connection."
