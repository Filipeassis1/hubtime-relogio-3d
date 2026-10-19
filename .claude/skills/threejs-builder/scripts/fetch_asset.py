#!/usr/bin/env python3
"""Download CC0 / sample 3D assets — as-is for a project (--raw), or converted for a claude.ai artifact.

In a codebase, use --raw --out <project static folder> (e.g. public/models) and load the files normally.

Artifacts only serve web extensions (.jpg .png .webp .json .txt .js .wasm ...) — .glb .gltf .hdr .exr .bin
.ktx2 are refused. So by default (artifact mode) this script converts:

  .glb / .gltf  -> <name>.glb.b64.txt  (one self-contained GLB, base64 text; .gltf inputs are packed to GLB first)
                   Load with: loadGLTF(THREE, 'assets/<name>.glb.b64.txt')  (assets/asset-loader.js — it applies the
                   TextureLoader fix; without it embedded textures come out WHITE in the real artifact sandbox)
  .hdr / .exr   -> <name>.hdr.b64.txt / <name>.exr.b64.txt (base64 text)
                   Load with: loadEnvironment(THREE, renderer, scene, url)
  images        -> kept as is (.jpg .png .webp are served directly)

  Measured in the claude.ai app: GLB-b64 + TextureLoader fix ✅, meshopt+webp GLB-b64 ✅,
  GLB-b64 without the fix ❌ (white), .gltf.json + separate .jpg ❌ (model never appeared). Hence the default.

Usage:
  fetch_asset.py polyhaven <id> [--res 1k] [--hdr-format hdr|exr] [--maps diff,nor_gl,rough,arm,ao,disp]
                                         # HDRI, texture or model; type auto-detected via the Poly Haven API
  fetch_asset.py khronos <ModelName>     # KhronosGroup/glTF-Sample-Assets (GLB)
  fetch_asset.py three <examples/path>   # mrdoob/three.js@r186 examples, e.g. models/gltf/ferrari.glb
  fetch_asset.py ambientcg <AssetId> [--res 1K]   # ambientCG material zip -> Color/NormalGL/Roughness/AO/...
  fetch_asset.py url <https://...>       # any direct file
  fetch_asset.py pack <local file>       # only convert a local file you already have

Options:
  --out DIR          output folder (default: assets). Each model gets its own subfolder.
  --raw              skip artifact conversion (local/Vite projects can load .glb/.hdr directly)
  --optimize         run gltf-transform (via npx, needs Node 18+): meshopt geometry + webp textures,
                     structure-preserving (no flatten/join/palette/simplify, so node names and
                     KHR_materials_variants survive). Loading then needs GLTFLoader.setMeshoptDecoder().
  --tex-size N       max texture size when optimizing (default 2048; 1024 is plenty for most heroes)
  --gltf-json        emit <name>.gltf.json + separate textures instead (fine for local/Vite; FAILED in the artifact
                     sandbox test — don't use it for artifacts until re-verified)

Prints a JSON `files` map at the end, ready for the Artifact tool's `files` parameter, plus license notes.
"""
import argparse, base64, io, json, os, re, shutil, struct, subprocess, sys, tempfile, urllib.request, zipfile

UA = {"User-Agent": "threejs-builder-skill/1.0"}
SERVED = {".html", ".css", ".js", ".mjs", ".wasm", ".json", ".txt", ".csv", ".svg", ".png", ".jpg", ".jpeg",
          ".gif", ".webp", ".avif", ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".pdf"}
MAX_BIN, MAX_TEXT = 15 * 2**20, 16 * 2**20
MIME_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif", "image/ktx2": ".ktx2"}
written, notes = [], []
GLTF_JSON = False

def get(url, binary=True):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    return data if binary else data.decode()

def save(path, data):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return path

def slug(s):
    return re.sub(r"[^A-Za-z0-9_-]+", "_", s).strip("_") or "asset"

# ---------- glTF conversion ----------

def parse_glb(data):
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError("not a GLB file")
    off, js, bin_ = 12, None, b""
    while off < length:
        clen, ctype = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A: js = json.loads(chunk.decode())
        elif ctype == 0x004E4942: bin_ = bytes(chunk)
        off += 8 + clen
    return js, bin_

def to_gltf_json(gltf, buffers, out_dir, name):
    """buffers: list of bytes per buffer index (None when the buffer has no data, e.g. meshopt fallback).
    Extracts images to files, compacts buffers (drops image bytes), embeds buffers as data: URIs."""
    os.makedirs(out_dir, exist_ok=True)
    views = gltf.get("bufferViews", [])
    image_views = set()
    for i, img in enumerate(gltf.get("images", [])):
        if "bufferView" in img:
            bv = views[img["bufferView"]]
            raw = buffers[bv.get("buffer", 0)][bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
            ext = MIME_EXT.get(img.get("mimeType", ""), ".bin")
            if ext not in SERVED:
                notes.append(f"image {i} is {img.get('mimeType')} — artifacts can't serve {ext}; re-export with --optimize (webp) instead")
            fname = slug(img.get("name") or f"{name}_img{i}") + ext
            save(os.path.join(out_dir, fname), raw)
            written.append(os.path.join(out_dir, fname))
            image_views.add(img.pop("bufferView"))
            img.pop("mimeType", None)
            img["uri"] = fname
        elif "uri" in img and not img["uri"].startswith("data:"):
            pass  # external file already copied by caller
    # Collect every byte range that points into a buffer (bufferViews + EXT_meshopt_compression)
    ranges = []
    for vi, bv in enumerate(views):
        if vi not in image_views:
            ranges.append(bv)
        mo = bv.get("extensions", {}).get("EXT_meshopt_compression")
        if mo:
            ranges.append(mo)
    new_bufs = {}
    for r in ranges:
        b = r.get("buffer", 0)
        src = buffers[b]
        if src is None:
            continue
        nb = new_bufs.setdefault(b, bytearray())
        while len(nb) % 4: nb.append(0)
        start = r.get("byteOffset", 0)
        chunk = src[start: start + r["byteLength"]]
        r["byteOffset"] = len(nb)
        nb += chunk
    for b, buf in enumerate(gltf.get("buffers", [])):
        if b in new_bufs:
            data = bytes(new_bufs[b])
            buf["byteLength"] = len(data)
            buf["uri"] = "data:application/octet-stream;base64," + base64.b64encode(data).decode()
        elif buffers[b] is not None and image_views:
            buf["byteLength"] = 0  # buffer only held images
            buf["uri"] = "data:application/octet-stream;base64,"
    # Dropped image views must disappear and indices must be remapped
    if image_views:
        remap, kept = {}, []
        for vi, bv in enumerate(views):
            if vi in image_views: continue
            remap[vi] = len(kept); kept.append(bv)
        gltf["bufferViews"] = kept
        for acc in gltf.get("accessors", []):
            if "bufferView" in acc: acc["bufferView"] = remap[acc["bufferView"]]
            sp = acc.get("sparse")
            if sp:
                sp["indices"]["bufferView"] = remap[sp["indices"]["bufferView"]]
                sp["values"]["bufferView"] = remap[sp["values"]["bufferView"]]
        for img in gltf.get("images", []):
            if "bufferView" in img: img["bufferView"] = remap[img["bufferView"]]
    out = os.path.join(out_dir, name + ".gltf.json")
    save(out, json.dumps(gltf, separators=(",", ":")).encode())
    written.append(out)
    used = gltf.get("extensionsUsed", [])
    if "KHR_draco_mesh_compression" in used:
        notes.append("model uses Draco: publish draco_decoder.js/.wasm as files and setDecoderPath, or re-run with --optimize (meshopt, no wasm fetch)")
    if "EXT_meshopt_compression" in used:
        notes.append("model uses meshopt: loader.setMeshoptDecoder(MeshoptDecoder) from 'three/addons/libs/meshopt_decoder.module.js'")
    if "KHR_texture_basisu" in used:
        notes.append("model uses KTX2 textures: not servable in artifacts — re-run with --optimize (webp)")
    return out

def convert_glb(path, out_root, optimize, tex_size):
    name = slug(os.path.splitext(os.path.basename(path))[0])
    if optimize:
        path = run_optimize(path, tex_size)
    if not GLTF_JSON:
        return glb_to_b64(open(path, "rb").read(), out_root, name)
    gltf, bin_ = parse_glb(open(path, "rb").read())
    buffers = []
    for i, b in enumerate(gltf.get("buffers", [])):
        buffers.append(bin_ if (i == 0 and "uri" not in b) else None)
    return to_gltf_json(gltf, buffers, os.path.join(out_root, name), name)

def convert_gltf(path, out_root, optimize, tex_size):
    """A .gltf with external .bin/textures (e.g. Poly Haven). Packs to GLB first if optimizing."""
    if optimize:
        packed = os.path.join(tempfile.mkdtemp(), slug(os.path.splitext(os.path.basename(path))[0]) + ".glb")
        npx(["copy", path, packed])
        return convert_glb(packed, out_root, True, tex_size)
    base = os.path.dirname(path)
    name = slug(os.path.splitext(os.path.basename(path))[0])
    out_dir = os.path.join(out_root, name)
    gltf = json.load(open(path))
    buffers = []
    for b in gltf.get("buffers", []):
        uri = b.get("uri", "")
        if uri.startswith("data:"):
            buffers.append(base64.b64decode(uri.split(",", 1)[1]))
        elif uri:
            buffers.append(open(os.path.join(base, urllib.request.url2pathname(uri)), "rb").read())
        else:
            buffers.append(None)
    if not GLTF_JSON:
        return glb_to_b64(pack_glb(gltf, buffers, base), out_root, name)
    for img in gltf.get("images", []):
        uri = img.get("uri", "")
        if uri and not uri.startswith("data:"):
            src = os.path.join(base, uri)
            dst = os.path.join(out_dir, uri)
            if os.path.abspath(src) != os.path.abspath(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copyfile(src, dst)
            written.append(dst)
            if os.path.splitext(uri)[1].lower() not in SERVED:
                notes.append(f"texture {uri} has an extension artifacts can't serve")
    return to_gltf_json(gltf, buffers, out_dir, name)

def npx(args):
    cmd = ["npx", "-y", "@gltf-transform/cli@4.5.1"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"gltf-transform failed:\n{r.stdout}\n{r.stderr}")
    return r.stdout

def run_optimize(path, tex_size):
    out = os.path.join(tempfile.mkdtemp(), os.path.basename(path).rsplit(".", 1)[0] + ".glb")
    npx(["optimize", path, out, "--compress", "meshopt", "--texture-compress", "webp",
         "--texture-size", str(tex_size), "--flatten", "false", "--join", "false", "--palette", "false",
         "--simplify", "false", "--instance", "false"])
    print(f"optimized {os.path.getsize(path)//1024} KB -> {os.path.getsize(out)//1024} KB")
    return out


def pack_glb(gltf, buffers, base_dir):
    """Merge every buffer + external/data: images into one GLB (bytes). Meshopt fallback buffers stay data-less."""
    out, base, newidx, extra = bytearray(), {}, {}, []
    for i, b in enumerate(buffers):
        if b is None:
            newidx[i] = 1 + len(extra); extra.append(gltf["buffers"][i]); continue
        while len(out) % 4: out.append(0)
        base[i], newidx[i] = len(out), 0
        out += b
    def fix(r):
        b = r.get("buffer", 0)
        if b in base: r["byteOffset"] = r.get("byteOffset", 0) + base[b]
        r["buffer"] = newidx.get(b, 0)
    views = gltf.setdefault("bufferViews", [])
    for bv in views:
        mo = bv.get("extensions", {}).get("EXT_meshopt_compression")
        fix(bv)
        if mo: fix(mo)
    for img in gltf.get("images", []):
        uri = img.pop("uri", None)
        if uri is None: continue
        if uri.startswith("data:"):
            head, data = uri.split(",", 1)
            raw = base64.b64decode(data); mime = head[5:].split(";")[0]
        else:
            raw = open(os.path.join(base_dir, urllib.request.url2pathname(uri)), "rb").read()
            mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
                    ".ktx2": "image/ktx2", ".avif": "image/avif"}.get(os.path.splitext(uri)[1].lower(), "image/png")
        while len(out) % 4: out.append(0)
        views.append({"buffer": 0, "byteOffset": len(out), "byteLength": len(raw)})
        out += raw
        img["bufferView"], img["mimeType"] = len(views) - 1, mime
    while len(out) % 4: out.append(0)
    for b in extra: b.pop("uri", None)
    gltf["buffers"] = [{"byteLength": len(out)}] + extra
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    body = struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(out), 0x004E4942) + bytes(out)
    return struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body

def glb_to_b64(glb_bytes, out_root, name):
    os.makedirs(out_root, exist_ok=True)
    out = os.path.join(out_root, name + ".glb.b64.txt")
    save(out, base64.b64encode(glb_bytes))
    written.append(out)
    gltf, _ = parse_glb(glb_bytes)
    used = gltf.get("extensionsUsed", [])
    if "EXT_meshopt_compression" in used:
        notes.append("model uses meshopt: loadGLTF() sets MeshoptDecoder for you")
    if "KHR_draco_mesh_compression" in used:
        notes.append("model uses Draco: decoder wasm must ship as files — prefer re-running with --optimize (meshopt)")
    if "KHR_texture_basisu" in used:
        notes.append("model uses KTX2 textures: re-run with --optimize (webp)")
    return out

def to_b64_txt(path, out_root):
    out = os.path.join(out_root, os.path.basename(path) + ".b64.txt")
    save(out, base64.b64encode(open(path, "rb").read()))
    written.append(out)
    return out

def finalize(path, out_root, raw, optimize, tex_size):
    ext = os.path.splitext(path)[1].lower()
    if raw:
        written.append(path); return path
    if ext == ".glb": return convert_glb(path, out_root, optimize, tex_size)
    if ext == ".gltf": return convert_gltf(path, out_root, optimize, tex_size)
    if ext in (".hdr", ".exr"):
        return to_b64_txt(path, out_root)
    written.append(path)
    if ext not in SERVED:
        notes.append(f"{os.path.basename(path)}: extension {ext} is not served in artifacts; base64 it into a .txt")
    return path

# ---------- sources ----------

def polyhaven(args):
    info = json.loads(get(f"https://api.polyhaven.com/info/{args.id}", False))
    files = json.loads(get(f"https://api.polyhaven.com/files/{args.id}", False))
    kind = {0: "hdri", 1: "texture", 2: "model"}[info["type"]]
    notes.append(f"Poly Haven '{info.get('name', args.id)}' ({kind}) — CC0, credit optional: polyhaven.com/a/{args.id}")
    tmp = tempfile.mkdtemp()
    if kind == "hdri":
        f = files["hdri"][args.res][args.hdr_format]
        p = save(os.path.join(tmp, f"{args.id}_{args.res}.{args.hdr_format}"), get(f["url"]))
        return finalize(p, args.out, args.raw, False, args.tex_size)
    if kind == "texture":
        want = {"diff": "Diffuse", "nor_gl": "nor_gl", "rough": "Rough", "arm": "arm", "ao": "AO",
                "disp": "Displacement", "metal": "Metal"}
        out = os.path.join(args.out, args.id)
        for m in args.maps.split(","):
            key = want.get(m, m)
            if key not in files: continue
            fmt = "png" if key == "Displacement" and "png" in files[key][args.res] else "jpg"
            f = files[key][args.res][fmt]
            p = save(os.path.join(out, os.path.basename(f["url"])), get(f["url"]))
            written.append(p)
        return out
    g = files["gltf"][args.res]["gltf"]
    root = os.path.join(tmp, args.id)
    gpath = save(os.path.join(root, f"{args.id}.gltf"), get(g["url"]))
    for rel, f in g.get("include", {}).items():
        save(os.path.join(root, rel), get(f["url"]))
    return finalize(gpath, args.out, args.raw, args.optimize, args.tex_size)

def khronos(args):
    base = f"https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/{args.id}"
    p = save(os.path.join(tempfile.mkdtemp(), f"{args.id}.glb"), get(f"{base}/glTF-Binary/{args.id}.glb"))
    notes.append(f"Khronos sample '{args.id}' — license varies per model (often CC-BY 4.0): see {base}/README.md and credit the author")
    return finalize(p, args.out, args.raw, args.optimize, args.tex_size)

def three(args):
    rel = args.id.removeprefix("examples/")
    p = save(os.path.join(tempfile.mkdtemp(), os.path.basename(rel)),
             get(f"https://cdn.jsdelivr.net/gh/mrdoob/three.js@r186/examples/{rel}"))
    notes.append("three.js example asset — check the LICENSE/README next to it in the repo before shipping commercially")
    return finalize(p, args.out, args.raw, args.optimize, args.tex_size)

def ambientcg(args):
    z = zipfile.ZipFile(io.BytesIO(get(f"https://ambientcg.com/get?file={args.id}_{args.res}-JPG.zip")))
    out = os.path.join(args.out, args.id)
    keep = ("_Color", "_NormalGL", "_Roughness", "_AmbientOcclusion", "_Displacement", "_Metalness", "_Opacity")
    for n in z.namelist():
        if any(k in n for k in keep) and n.lower().endswith((".jpg", ".png")):
            written.append(save(os.path.join(out, os.path.basename(n)), z.read(n)))
    notes.append(f"ambientCG '{args.id}' — CC0")
    return out

def url(args):
    name = os.path.basename(args.id.split("?")[0]) or "download"
    p = save(os.path.join(tempfile.mkdtemp(), name), get(args.id))
    notes.append("custom URL — confirm the license yourself")
    return finalize(p, args.out, args.raw, args.optimize, args.tex_size)

def pack(args):
    return finalize(args.id, args.out, args.raw, args.optimize, args.tex_size)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", choices=["polyhaven", "khronos", "three", "ambientcg", "url", "pack"])
    ap.add_argument("id")
    ap.add_argument("--out", default="assets")
    ap.add_argument("--res", default=None)
    ap.add_argument("--hdr-format", default="hdr", choices=["hdr", "exr"])
    ap.add_argument("--maps", default="diff,nor_gl,rough,arm")
    ap.add_argument("--raw", action="store_true")
    ap.add_argument("--optimize", action="store_true")
    ap.add_argument("--tex-size", type=int, default=2048)
    ap.add_argument("--gltf-json", action="store_true")
    a = ap.parse_args()
    global GLTF_JSON
    GLTF_JSON = a.gltf_json
    a.res = a.res or ("1K" if a.source == "ambientcg" else "1k")
    globals()[a.source](a)

    page_root = os.path.dirname(os.path.abspath(a.out)) if os.path.basename(a.out.rstrip("/")) == "assets" else os.getcwd()
    files, too_big = {}, []
    for p in dict.fromkeys(written):
        rel = os.path.relpath(os.path.abspath(p), page_root)
        size = os.path.getsize(p)
        ext = os.path.splitext(p)[1].lower()
        limit = MAX_TEXT if ext in (".json", ".txt", ".js", ".csv", ".svg") else MAX_BIN
        if size > limit: too_big.append(f"{rel} ({size/2**20:.1f} MB > {limit/2**20:.0f} MB)")
        files[rel] = rel
        print(f"  {rel}  {size/1024:,.0f} KB")
    total = sum(os.path.getsize(p) for p in dict.fromkeys(written))
    print(f"total {total/2**20:.2f} MB (publish limit 64 MB)")
    for t in too_big: print("TOO BIG for an artifact:", t, "-> use --optimize / --tex-size 1024")
    for n in dict.fromkeys(notes): print("note:", n)
    print("files map:", json.dumps(files))

if __name__ == "__main__":
    main()
