#!/usr/bin/env bash
# Smoke test: boots the game in headless Chrome, verifies all scenes start.
# Usage: ./tests/run.sh
# Returns exit code 0 on pass, 1 on fail.

set -e
cd "$(dirname "$0")/.."

PORT=8099
TIMEOUT=40

# Find Chrome
CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "google-chrome" "google-chrome-stable" "chromium-browser" "chromium"; do
  if command -v "$c" &>/dev/null || [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then echo "FAIL: Chrome not found"; exit 1; fi

# Start server
lsof -ti:$PORT | xargs kill 2>/dev/null || true
python3 -m http.server $PORT --directory . > /dev/null 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT
sleep 1

# Run headless Chrome
OUTPUT=$("$CHROME" \
  --headless --disable-gpu --no-sandbox \
  --virtual-time-budget=$((TIMEOUT * 1000)) \
  --dump-dom "http://localhost:$PORT/tests/smoke.html" 2>/dev/null)

# Extract title (PASS/FAIL)
RESULT=$(echo "$OUTPUT" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')

# Extract log content between <pre> tags
LOG=$(echo "$OUTPUT" | sed -n '/<pre id="log">/,/<\/pre>/p' | sed 's/<[^>]*>//g')

echo "$LOG"

if [ "$RESULT" = "PASS" ]; then
  echo "🟢 Smoke test PASSED"
  exit 0
else
  echo "🔴 Smoke test FAILED"
  exit 1
fi
