#!/usr/bin/env python3
"""Render a three.js page headless, the way a viewer would see it, and save screenshots to critique.

Serves a folder over http (optionally with the claude.ai artifact CSP) — or opens a URL such as a
project's running dev server — in Chromium, waits until the scene says it's ready, then saves
desktop / panel / mobile screenshots and prints console errors, failed requests, CSP violations,
GPU string and renderer stats.

Usage:
  python3 preview.py <folder | http(s)://url> [--page index.html] [--artifact-csp] [--gpu]
                     [--wait 20] [--settle 1.5] [--sim 2.0] [--states idle,hover,end]
                     [--viewports desktop,panel,mobile] [--out shots/]

  --artifact-csp  emulate the artifact sandbox: scripts only from the CDN allowlist, everything else
                  (images, fetch, wasm, workers) only same-origin / data: / blob:.
  --gpu           use the real GPU (full Chromium, ANGLE Metal on macOS, WebGPU enabled). Default is
                  SwiftShader (software WebGL), which works anywhere but is slow and has no WebGPU.
  --wait          max seconds to wait for readiness: window.__app.ready === true or body.ready.
                  Pages without a ready flag are shot after --wait seconds.
  --settle        extra seconds after ready (lets damping / fades / progressive effects converge).
  --sim           if the page exposes window.__app.sim(seconds), fast-forward before shooting.
  --states        comma list; for each, calls window.__app.state?.(name) before an extra screenshot.

Exit code 1 if there were console errors, page errors or CSP violations, so it works in a loop.
"""
import argparse, http.server, json, os, platform, socketserver, sys, threading
from functools import partial

ARTIFACT_CSP = (
    "default-src 'self' data: blob:; "
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com "
    "https://cdn.jsdelivr.net/npm/ https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' data: https://fonts.gstatic.com; "
    "img-src 'self' data: blob:; media-src 'self' data: blob:; "
    "connect-src 'self'; worker-src 'self' blob:"
)
# connect-src deliberately has NO data:/blob: — matches the real claude.ai sandbox (measured in the app):
# fetch(data:) and fetch(blob:) fail there, which is why GLTFLoader's default embedded-texture path renders white.

VIEWPORTS = {
    "desktop": ({"width": 1280, "height": 800}, False),
    "wide": ({"width": 1600, "height": 900}, False),
    "panel": ({"width": 900, "height": 860}, False),   # claude.ai artifact side panel: nearly square — test it
    "mobile": ({"width": 390, "height": 844}, True),
}

# Report CSP violations from the page itself (more reliable than parsing console text).
CSP_HOOK = """
window.__csp = [];
document.addEventListener('securitypolicyviolation', e =>
  window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '').slice(0, 120)));
"""

# Artifacts wrap the published page in this skeleton; do the same so local renders match (no quirks mode).
SKELETON = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);'
            'padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif;'
            'background:#fafaf8}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')

def serve(folder, csp):
    class H(http.server.SimpleHTTPRequestHandler):
        def send_head(self):
            if self.path.split('?')[0] == '/favicon.ico':  # artifacts have their own icon; don't report a 404
                self.send_response(204); self.end_headers(); return None
            path = self.translate_path(self.path)
            if path.endswith(".html") and os.path.isfile(path):
                body = open(path, "rb").read()
                if not body.lstrip()[:15].lower().startswith(b"<!doctype"):
                    body = SKELETON.encode() + body + b"</body></html>"
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                import io
                return io.BytesIO(body)
            return super().send_head()
        def end_headers(self):
            if csp:
                self.send_header("Content-Security-Policy", csp)
            self.send_header("Cache-Control", "no-store")
            super().end_headers()
        def log_message(self, *a):
            pass
    H.extensions_map.update({".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
                             ".wasm": "application/wasm", ".txt": "text/plain"})
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), partial(H, directory=folder))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def launch(p, gpu, proxy):
    if gpu:
        args = ["--ignore-gpu-blocklist", "--enable-gpu", "--enable-unsafe-webgpu",
                "--enable-features=Vulkan,WebGPU"]
        if platform.system() == "Darwin":
            args.append("--use-angle=metal")
        kw = {"channel": "chromium"}  # full Chromium in new headless mode: real GPU process
    else:
        args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                "--enable-webgl", "--disable-gpu-sandbox"]
        kw = {}
    if proxy:  # sandboxed environments: send CDN traffic through the proxy, keep the local server direct
        args += [f"--proxy-server={proxy}", "--proxy-bypass-list=127.0.0.1;localhost"]
    return p.chromium.launch(args=args, **kw)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--page", default="index.html")
    ap.add_argument("--artifact-csp", action="store_true")
    ap.add_argument("--gpu", action="store_true")
    ap.add_argument("--wait", type=float, default=20)
    ap.add_argument("--settle", type=float, default=1.5)
    ap.add_argument("--sim", type=float, default=0)
    ap.add_argument("--states", default="")
    ap.add_argument("--viewports", default="desktop,panel,mobile")
    ap.add_argument("--out", default="shots")
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright
    if a.folder.startswith(("http://", "https://")):
        httpd, url = None, a.folder  # project dev server: use the page as-is
    else:
        httpd = serve(os.path.abspath(a.folder), ARTIFACT_CSP if a.artifact_csp else None)
        url = f"http://127.0.0.1:{httpd.server_address[1]}/{a.page}"
    os.makedirs(a.out, exist_ok=True)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    errors, failed, csp = [], [], []

    with sync_playwright() as p:
        b = launch(p, a.gpu, proxy)
        for name in [v for v in a.viewports.split(",") if v]:
            vp, mobile = VIEWPORTS[name]
            ctx = b.new_context(viewport=vp, device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
                                ignore_https_errors=True)
            ctx.add_init_script(CSP_HOOK)
            pg = ctx.new_page()
            pg.on("console", lambda m, n=name: errors.append(f"[{n}] {m.text[:300]}") if m.type == "error" else None)
            pg.on("pageerror", lambda e, n=name: errors.append(f"[{n}] pageerror: {e}"))
            pg.on("requestfailed", lambda r, n=name: failed.append(f"[{n}] {r.url[:120]} {r.failure}"))
            pg.goto(url, wait_until="load", timeout=60000)
            # Poll with evaluate (wait_for_function compiles a Function in-page, which a strict CSP reports as eval)
            ready, waited = False, 0.0
            while waited < a.wait and not ready:
                ready = pg.evaluate("window.__app?.ready === true || !!document.body?.classList.contains('ready')")
                if not ready:
                    pg.wait_for_timeout(250); waited += 0.25
            pg.wait_for_timeout(int(a.settle * 1000))
            if a.sim:
                pg.evaluate(f"window.__app?.sim?.({a.sim})")
                pg.wait_for_timeout(300)
            pg.screenshot(path=f"{a.out}/{name}.png")
            for s in [x for x in a.states.split(",") if x]:
                pg.evaluate(f"window.__app?.state?.({json.dumps(s)})")
                pg.wait_for_timeout(int(a.settle * 1000))
                pg.screenshot(path=f"{a.out}/{name}-{s}.png")
            csp += [f"[{name}] {v}" for v in (pg.evaluate("window.__csp || []") or [])]
            if name == a.viewports.split(",")[0]:
                gpu = pg.evaluate("""() => { const c = document.createElement('canvas').getContext('webgl2');
                    if (!c) return 'no webgl2'; const e = c.getExtension('WEBGL_debug_renderer_info');
                    return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); }""")
                webgpu = pg.evaluate("!!navigator.gpu")
                info = pg.evaluate("""() => { const r = window.__app?.renderer; if (!r || !r.info) return null;
                    const i = r.info; return { calls: i.render.calls, triangles: i.render.triangles,
                    geometries: i.memory.geometries, textures: i.memory.textures }; }""")
                results = pg.evaluate("window.__results ?? null")
                print(f"ready flag: {ready} | gpu: {gpu} | navigator.gpu: {webgpu}")
                if info: print("renderer.info:", json.dumps(info))
                if results: print("page results:", json.dumps(results, indent=1, ensure_ascii=False))
            ctx.close()
        b.close()
    if httpd:
        httpd.shutdown()

    print(f"screenshots -> {a.out}/")
    for title, items in [("console errors", errors), ("CSP violations", csp), ("failed requests", failed)]:
        print(f"{title}: {len(items)}")
        for i in items[:25]:
            print("  ", i)
    sys.exit(1 if (errors or csp) else 0)

if __name__ == "__main__":
    main()
