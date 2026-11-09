#!/bin/bash
# Double-click to preview this site locally with clean URLs (like GitHub Pages).
cd "$(dirname "$0")"
PORT=3000
echo "Starting local preview of $(pwd)"
echo "Open http://localhost:$PORT  (press Ctrl+C or close this window to stop)"
( sleep 2; open "http://localhost:$PORT" ) &
if command -v npx >/dev/null 2>&1; then
  npx --yes serve -l $PORT .
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$PORT" << 'PY'
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        p = self.path.split('?')[0].split('#')[0]; fs = os.path.join(os.getcwd(), p.lstrip('/'))
        if not os.path.exists(fs) and os.path.exists(fs + '.html'): self.path = p + '.html'
        return super().send_head()
print('Serving with Python on port', sys.argv[1])
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
PY
else
  echo "Neither Node (npx) nor Python 3 is installed. Install Node from https://nodejs.org and try again."
  read -n 1 -s -r -p "Press any key to close"
fi
