#!/bin/bash
# Repackage download/harax.zip from the live project (Task 6: profile logout button)
set -e
cd /home/z/my-project

STAGE=/tmp/harax-pkg/harax
mkdir -p "$STAGE" download

# 1) sync source trees + config + README (delete removed files)
rsync -a --delete src "$STAGE/"
rsync -a --delete prisma "$STAGE/"
rsync -a --delete mini-services "$STAGE/"
rsync -a --delete db "$STAGE/"
# whole public dir except uploads (icons, manifest, img/landing photos...)
rsync -a --delete --exclude 'uploads' public/ "$STAGE/public/"
for f in README.md package.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json eslint.config.mjs; do
  cp -f "$f" "$STAGE/"
done

# 2) scripts: only the runtime orchestrators, never test screenshots or one-off image tooling
mkdir -p "$STAGE/scripts"
cp -f scripts/dev.mjs scripts/start.mjs "$STAGE/scripts/"
rm -f "$STAGE"/scripts/shot-*.png "$STAGE"/scripts/final-*.png "$STAGE"/scripts/make-atmo-images.py 2>/dev/null || true

# 3) public/uploads: empty, then restore ONLY files actually referenced by the DB
rm -rf "$STAGE/public/uploads"
mkdir -p "$STAGE/public/uploads"
DB=db/custom.db
for u in $(python3 -c "
import sqlite3
con = sqlite3.connect('$DB')
for r in con.execute(\"SELECT DISTINCT mediaUrl FROM Post WHERE mediaUrl LIKE '/uploads/%' UNION SELECT avatarUrl FROM User WHERE avatarUrl LIKE '/uploads/%' UNION SELECT coverUrl FROM User WHERE coverUrl LIKE '/uploads/%'\").fetchall():
    print(r[0])
"); do
  f="public${u}"
  if [ -f "$f" ]; then cp "$f" "$STAGE/public/uploads/"; echo "kept $(basename "$f")"; fi
done

# 4) zip it
cd /tmp/harax-pkg
rm -f /home/z/my-project/download/harax.zip
zip -rq /home/z/my-project/download/harax.zip harax
cd /home/z/my-project

# 5) verify
unzip -t download/harax.zip > /dev/null && echo "zip OK"
echo "files: $(unzip -l download/harax.zip | tail -1 | awk '{print $2}')"
echo "size: $(du -h download/harax.zip | awk '{print $1}')"
unzip -p download/harax.zip harax/src/components/profile/profile-view.tsx | grep -c "Log out" | xargs echo "Log-out refs in zipped profile-view:"
