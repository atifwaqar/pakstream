#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="_site"
[ -d "$SITE_DIR" ] || { echo "❌ Built site not found at $SITE_DIR (did Jekyll build run?)"; exit 1; }

echo "Running SEO guard checks against $SITE_DIR ..."

fail=0
err()  { printf "❌ %s\n" "$*" >&2; fail=1; }
ok()   { printf "✅ %s\n" "$*"; }

# --- Helpers ---
get_attr() { # $1=file, $2=pattern (grep), $3=attr name
  grep -i -m1 "$2" "$1" | sed -nE "s/.*$3=[\"']([^\"']+)[\"'].*/\1/ip" | head -n1
}

# Infer site URL from sitemap or fallback
SITEMAP="$SITE_DIR/sitemap.xml"
SITE_URL=""
if [ -f "$SITEMAP" ]; then
  SITE_URL=$(grep -Eo '<loc>https?://[^/"]+' "$SITEMAP" | head -n1 | sed -E 's#<loc>##')
fi
[ -n "${SITE_URL:-}" ] || SITE_URL="https://pakstream.com"

# 1) No internal links to /index.html
#    - relative: href="/x/index.html"
#    - absolute to our host: href="https://pakstream.com/x/index.html"
if grep -R --binary-files=without-match --include="*.html" -n 'href="/[^\"]*index\.html"' "$SITE_DIR" >/dev/null; then
  err "Found internal relative links to /path/index.html (use /path/)."
  grep -R --binary-files=without-match --include="*.html" -n 'href="/[^\"]*index\.html"' "$SITE_DIR" || true
fi
abs_idx_pat="href=\"${SITE_URL//\//\\/}[^\"']*index\.html\""
if grep -R --binary-files=without-match --include="*.html" -n -E "$abs_idx_pat" "$SITE_DIR" >/dev/null; then
  err "Found internal absolute links to ${SITE_URL}/path/index.html (use trailing slash)."
  grep -R --binary-files=without-match --include="*.html" -n -E "$abs_idx_pat" "$SITE_DIR" || true
fi

# 2) Canonical cardinality: <= 1 per page
while IFS= read -r f; do
  count=$(grep -ci '<link rel="canonical"' "$f" || true)
  if [ "$count" -gt 1 ]; then
    err "$f has $count canonical tags (should be exactly 1 or 0 if noindex)."
  fi
done < <(find "$SITE_DIR" -name "*.html")

# 3) Indexable pages MUST have exactly one canonical; noindex pages MUST have none
while IFS= read -r f; do
  # detect noindex
  robots=$(grep -i "<meta[^>]*name=['\"]robots['\"]" "$f" | sed -nE "s/.*content=['\"]([^'\"]+)['\"].*/\1/ip")
  has_noindex=0
  printf "%s" "$robots" | grep -qi 'noindex' && has_noindex=1
  can_count=$(grep -ci '<link rel="canonical"' "$f" || true)

  if [ "$has_noindex" -eq 1 ] && [ "$can_count" -gt 0 ]; then
    err "$f renders robots noindex but also outputs a canonical (should omit canonical)."
  fi
  if [ "$has_noindex" -eq 0 ] && [ "$can_count" -eq 0 ]; then
    err "$f is indexable but has no canonical tag."
  fi
done < <(find "$SITE_DIR" -name "*.html")

# 4) Canonical correctness (shape + OG/Twitter alignment)
while IFS= read -r f; do
  canon=$(get_attr "$f" '<link rel="canonical"' 'href')
  [ -z "$canon" ] && continue
  # must be https, absolute, same host, and not /index.html
  if ! printf "%s" "$canon" | grep -Eq '^https://'; then
    err "$f canonical is not HTTPS absolute: $canon"
  fi
  if ! printf "%s" "$canon" | grep -Eq "^${SITE_URL//\//\\/}(/|$)"; then
    err "$f canonical host differs from site URL (${SITE_URL}): $canon"
  fi
  if printf "%s" "$canon" | grep -Eq '/index\.html$'; then
    err "$f canonical ends with /index.html: $canon"
  fi

  ogurl=$(get_attr "$f" '<meta property="og:url"' 'content')
  twurl=$(get_attr "$f" 'name="twitter:url"' 'content')
  [ -n "$ogurl" ] && [ "$ogurl" != "$canon" ] && err "$f og:url ($ogurl) does not match canonical ($canon)"
  [ -n "$twurl" ] && [ "$twurl" != "$canon" ] && err "$f twitter:url ($twurl) does not match canonical ($canon)"
done < <(find "$SITE_DIR" -name "*.html")

# 5) Sitemap checks: exists, all loc under SITE_URL, none end with /index.html, and excludes dev/maintenance/offline/404
if [ ! -f "$SITEMAP" ]; then
  err "sitemap.xml not found at $SITEMAP"
else
  # host & shape
  if grep -Eq '<loc>https?://' "$SITEMAP"; then
    if grep -Ev "<loc>${SITE_URL//\//\\/}(/|</loc>)" "$SITEMAP" | grep -E '<loc>https?://'; then
      err "sitemap.xml contains URLs not under ${SITE_URL}"
    fi
  fi
  if grep -E '<loc>[^<]*/index\.html</loc>' "$SITEMAP" >/dev/null; then
    err "sitemap.xml contains URLs ending with /index.html"
    grep -nE '<loc>[^<]*/index\.html</loc>' "$SITEMAP" || true
  fi
  # exclusions
  bad_urls=$(grep -E '<loc>.*(\/dev\/|\/maintenance\.html|\/offline\.html|\/404\.html)</loc>' "$SITEMAP" || true)
  [ -n "$bad_urls" ] && err "sitemap.xml includes excluded pages:\n$bad_urls"
fi

if [ "$fail" -ne 0 ]; then
  err "SEO checks failed."
  exit 1
fi
ok "SEO checks passed."

