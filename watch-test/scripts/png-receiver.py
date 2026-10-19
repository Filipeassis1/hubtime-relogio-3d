"""Local receiver for render captures: the page POSTs {name, data: dataURL} and the PNG lands in OUT_DIR.

Usage: python3 scripts/png-receiver.py renders/v2   (listens on 127.0.0.1:5199)
"""
import base64, http.server, json, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "renders"
os.makedirs(OUT, exist_ok=True)


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        name = os.path.basename(body["name"])
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(base64.b64decode(body["data"].split(",", 1)[1]))
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b"ok")

    def log_message(self, *args):
        pass


http.server.HTTPServer(("127.0.0.1", 5199), Handler).serve_forever()
