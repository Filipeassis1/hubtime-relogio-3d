# Real assets inside a claude.ai artifact

The #1 reason three.js output looks "boxy and textureless" is that the artifact sandbox blocks external assets, so
everything falls back to primitives + canvas noise. The sandbox does allow real assets — they just have to be
**downloaded in Claude's own shell and published as supporting files**, in formats the sandbox serves and loads.

Only relevant when the target is a claude.ai artifact — real projects load assets normally (§6). Everything below
was measured in the claude.ai app (4 GLB strategies side by side); re-check in the app if behaviour seems to differ.

## 1. What the sandbox allows (measured, not documented)

| Action inside the artifact page | Works? |
|---|---|
| `<script>`/`import()` from cdn.jsdelivr.net/npm, cdnjs, unpkg | ✅ (three via importmap, addons, gsap, rapier, postprocessing…) |
| `fetch('assets/x')` of a supporting file (same origin) | ✅ |
| `fetch` / `<img>` from any other host (jsdelivr **/gh/**, polyhaven, github raw…) | ❌ |
| **`fetch('data:…')` and `fetch('blob:…')`** | ❌ **fails** — the published CSP suggests it works; it doesn't |
| `<img src="data:…">` / `<img src="blob:…">` (→ TextureLoader) | ✅ |
| `createImageBitmap(blob)`, `.wasm` supporting file + `WebAssembly.compile`, `Worker(blob:)` | ✅ |
| WebGPU adapter (`navigator.gpu`) | ✅ (desktop app) |
| Supporting file extensions | `.html .css .js .mjs .wasm .json .txt .csv .svg .png .jpg .jpeg .gif .webp .avif .woff(2) .ttf .otf .mp3 .wav .ogg .mp4 .webm .pdf` — **`.glb .gltf .bin .hdr .exr .ktx2` are refused** |
| Limits | 15 MB per binary file, 16 MB per text file, 64 MB per publish, 16 MB for the page |

**The rule that follows:** never let anything `fetch` a `data:` or `blob:` URL. Bytes → `atob`/`Uint8Array.fromBase64`
→ `loader.parse()`. Images → `<img>` (TextureLoader accepts data:/blob:).

Where that rule bites, by default, without you noticing:
- `GLTFLoader` decodes embedded GLB textures with `ImageBitmapLoader` → `fetch(blob:)` → **model renders white**.
- `.gltf` with `data:` buffers → `FileLoader` → `fetch(data:)` → **model never appears**.
- `EXRLoader.load(dataURL)` / `HDRLoader.load(dataURL)` (e.g. `@pmndrs/assets` HDRIs) → **fails**.
- Any "fast base64 decode" trick via `fetch('data:…')`.

`scripts/preview.py --artifact-csp` emulates this (connect-src has no data:/blob:), so these failures reproduce locally.

## 2. Formats that work

| Asset | Ship as | Load with (`assets/asset-loader.js`) |
|---|---|---|
| glTF/GLB model | `<name>.glb.b64.txt` (meshopt + webp via `--optimize`) | `loadGLTF(THREE, 'assets/x.glb.b64.txt')` — applies the TextureLoader fix + MeshoptDecoder |
| HDRI | `<id>_1k.hdr.b64.txt` (Poly Haven) | `loadEnvironment(THREE, renderer, scene, url)` |
| HDRI, small | UltraHDR `.hdr.jpg` (JPEG + gain map, served as-is) | same; e.g. three's `royal_esplanade_2k.hdr.jpg` (550 KB) |
| HDRI, zero files | `'pmndrs:studio'` etc. (`@pmndrs/assets` module → decoded, then `EXRLoader.parse`) | same (low-res: IBL only, not a sharp background) |
| HDRI, procedural | `'room'` (RoomEnvironment) | same |
| PBR texture set | `.jpg` files (Poly Haven / ambientCG) | `loadPBR(THREE, 'assets/<id>/', { map, normalMap, arm })` |
| Matcap / tileable normal | `@pmndrs/assets` modules (`matcaps/0042`, `normals/0007`) | `pmndrsTexture(THREE, 'matcaps', 42)` (TextureLoader → `<img>` data: ✅) |
| Font | Google Fonts `<link>` (CSS) / `.woff2` file | CSS; for 3D text use troika or `TextGeometry` + typeface `.json` file |
| Sound | `.mp3/.ogg` file, or synthesize (WebAudio) | `new Audio('assets/x.mp3')` after a user gesture |

Base64 inflates size by 33%, so optimize first: the Shopify shoe goes 7.6 MB GLB → 1.8 MB (2048 webp) → 2.4 MB b64.

## 3. Pipeline (Claude's shell → artifact)

```bash
cd <page folder>
python3 <skill>/scripts/fetch_asset.py khronos MaterialsVariantsShoe --optimize --tex-size 2048
python3 <skill>/scripts/fetch_asset.py polyhaven studio_small_09            # HDRI → .hdr.b64.txt
python3 <skill>/scripts/fetch_asset.py polyhaven rosewood_veneer1 --maps diff,nor_gl,arm   # PBR jpgs
python3 <skill>/scripts/fetch_asset.py polyhaven ceramic_vase_01 --optimize # Poly Haven model (.gltf) → packed GLB b64
python3 <skill>/scripts/fetch_asset.py three models/gltf/ferrari.glb --optimize
python3 <skill>/scripts/fetch_asset.py ambientcg Wood049                    # zip → Color/NormalGL/Roughness jpgs
mkdir -p lib && cp <skill>/assets/{asset-loader,contact-shadows,procedural}.js lib/
python3 <skill>/scripts/preview.py . --artifact-csp                         # verify before publishing
```
Each run prints the files map for the Artifact tool's `files` parameter and license notes (credit CC-BY authors in the page).

- `--optimize` = gltf-transform with **structure-preserving** flags (no flatten/join/palette/simplify): node names,
  materials and `KHR_materials_variants` survive. Plain `gltf-transform optimize` merges meshes and kills variants.
- `.gltf` inputs (Poly Haven models) are packed to one GLB in pure Python (no Node needed unless `--optimize`).
- Needs network from the shell: jsdelivr (/gh and /npm), api.polyhaven.com, dl.polyhaven.org, ambientcg.com all respond.
- Decoders: meshopt works (JS module from the CDN). Avoid Draco in artifacts (its wasm/JS decoder would have to ship
  as supporting files); re-export with meshopt. KTX2 textures can't be served — use webp.

## 4. Code: the essential fix, if you load GLB yourself

```js
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);                       // three/addons/libs/meshopt_decoder.module.js
loader.register(p => { p.textureLoader = new THREE.TextureLoader(p.options.manager); return { name: 'img-textures' }; });
const text = await (await fetch('assets/model.glb.b64.txt')).text();
const bytes = Uint8Array.fromBase64 ? Uint8Array.fromBase64(text.trim()) : Uint8Array.from(atob(text.trim()), c => c.charCodeAt(0));
const gltf = await loader.parseAsync(bytes.buffer, '');
```

## 5. Budgets

| | Desktop hero | Mobile-friendly |
|---|---|---|
| Model (b64) | ≤ 4 MB | ≤ 1.5 MB (`--tex-size 1024`) |
| HDRI | 1k `.hdr` (2 MB b64) or UltraHDR 2k jpg (0.5 MB) | pmndrs / UltraHDR / room |
| Textures per material | 2k max, 1k for anything not filling the screen | 1k |
| Whole publish | < 20 MB keeps first load reasonable | < 8 MB |

Show a progress bar (LoadingManager → `makeManager`) and a boot guard that prints errors (see boilerplates):
a silent infinite loader is the worst failure mode, and a fetch of a data:/blob: URL produces exactly that.

## 6. Local / Vite projects

None of this applies: load `.glb`/`.hdr` directly from the project's static folder, use Poly Haven URLs (CORS `*`),
Draco/KTX2 freely, `useGLTF`/`useTexture` in R3F. `fetch_asset.py --raw --out public/models` downloads without
converting. Integration per framework: `project-integration.md`.

## 7. When nothing can be downloaded

Order of preference: `@pmndrs/assets` (HDRI, matcaps, normals, 3 models) → TSL procedural materials
(`procedural-textures.md`, see `examples/tsl-still-life`) → canvas imperfection maps (`assets/procedural.js`) → good modeling
(`modeling.md`). Procedural done well (`examples/tsl-still-life`) is portfolio-grade; procedural done lazily is the
"boxy" look this skill exists to prevent.
