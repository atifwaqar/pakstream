#!/usr/bin/env bash
set -euo pipefail

echo "Running SEO guard checks..."

# Check for index.html links (any href ending with /index.html)
if grep -R --binary-files=without-match --include="*.html" -n 'href="[^"]*/index\.html"' . > /dev/null; then
  echo "❌ Found links pointing to /index.html. Use trailing slash instead."
  exit 1
fi

# Check for duplicate canonical tags
violations=0
while IFS= read -r file; do
  count=$(grep -c '<link rel="canonical"' "$file" || true)
  if [ "$count" -gt 1 ]; then
    echo "❌ $file has $count canonical tags (should be 1)."
    violations=1
  fi
done < <(find . -name "*.html")

if [ "$violations" -ne 0 ]; then
  exit 1
fi

echo "✅ SEO checks passed."
