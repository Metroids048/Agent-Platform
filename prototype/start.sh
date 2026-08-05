#!/usr/bin/env sh
# Agent Platform prototype — local HTTP server (port 8766)
cd "$(dirname "$0")"

URL="http://127.0.0.1:8766/index.html"
echo "Agent Platform prototype"
echo "Open: $URL"
echo "Press Ctrl+C to stop."
echo ""

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server 8766
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server 8766
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -p 8766
else
  echo "Need Python 3 or Node.js (npx). Install one, or open index.html in a browser." >&2
  exit 1
fi
