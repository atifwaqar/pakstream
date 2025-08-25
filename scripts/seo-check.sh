#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="_site"
[ -d "$SITE_DIR" ] || { echo "❌ Built site not found at $SITE_DIR (did Jekyll build run?)"; exit 1; }

echo "Running SEO guard checks against $SITE_DIR ..."

fail=0

note() { printf "%s\n" "$*"; }
err()  { printf "❌ %s\n" "$*" >&2; fail=1; }

# 1) No links to /index.html (internal)
if grep -R --binary-files=without-match --include="*.html" -n 'href="\/[^"]*index\.html"' "$SITE_DIR" >/dev/null; then
  err "Found internal links pointing to /path/index.html. Use trailing slash (/path/) instead."
  grep -R --binary-files=without-match --include="*.html" -n 'href="\/[^"]*index\.html"' "$SITE_DIR" || true
fi

# 2) Canonical: exactly one per page (where present)
while IFS= read -r f; do
  count=$(grep -c '<link rel="canonical"' "$f" || true)
  if [ "$count" -gt 1 ]; then
    err "$f has $count canonical tags (should be 1)."
  fi
done < <(find "$SITE_DIR" -name "*.html")

# Helper: extract content of a meta/link tag attribute
get_attr() {
  # $1=file, $2=pattern, $3=attr
  local file="$1" pat="$2" attr="$3"
  # naive extraction; fine for guard
  grep -i -m1 "$pat" "$file" | sed -nE "s/.*$attr=[\"']([^\"']+)[\"'].*/\1/ip" | head -n1
}

# 3) For each page that HAS a canonical, validate its shape and OG/Twitter match
while IFS= read -r f; do
  canon=$(get_attr "$f" '<link rel="canonical"' 'href')
  [ -z "$canon" ] && continue

  # shape: must be https, absolute, and not end with /index.html
  if ! printf "%s" "$canon" | grep -Eq '^https://'; then
    err "$f canonical is not HTTPS absolute: $canon"
  fi
  if printf "%s" "$canon" | grep -Eq '/index\.html$'; then
    err "$f canonical ends with /index.html: $canon"
  fi

  ogurl=$(get_attr "$f" '<meta property="og:url"' 'content')
  twurl=$(get_attr "$f" 'name="twitter:url"' 'content')

  if [ -n "$ogurl" ] && [ "$ogurl" != "$canon" ]; then
    err "$f og:url ($ogurl) does not match canonical ($canon)"
  fi
  if [ -n "$twurl" ] && [ "$twurl" != "$canon" ]; then
    err "$f twitter:url ($twurl) does not match canonical ($canon)"
  fi
done < <(find "$SITE_DIR" -name "*.html")

# 4) Pages with rendered meta robots noindex SHOULD NOT have a canonical
#    We detect by presence of meta robots and value containing 'noindex'
while IFS= read -r f; do
  robots=$(grep -i "<meta[^>]*name=['\"]robots['\"]" "$f" | sed -nE "s/.*content=['\"]([^'\"]+)['\"].*/\1/ip")
  if printf "%s" "$robots" | grep -qi 'noindex'; then
    if grep -qi '<link rel="canonical"' "$f"; then
      err "$f has meta robots noindex but also outputs a canonical (should omit canonical)."
    fi
  fi
done < <(find "$SITE_DIR" -name "*.html")

# 5) Sitemap checks
SITEMAP="$SITE_DIR/sitemap.xml"
if [ ! -f "$SITEMAP" ]; then
  err "sitemap.xml not found at $SITEMAP"
else
  # Ensure no dev/ or maintenance/offline/404 paths are present
  bad_urls=$(grep -E '<loc>.*(\/dev\/|\/maintenance\.html|\/offline\.html|\/404\.html)<\/loc>' "$SITEMAP" || true)
  if [ -n "$bad_urls" ]; then
    err "sitemap.xml includes excluded pages:\n$bad_urls"
  fi
fi

if [ "$fail" -ne 0 ]; then
  err "SEO checks failed."
  exit 1
fi

echo "✅ SEO checks passed."

