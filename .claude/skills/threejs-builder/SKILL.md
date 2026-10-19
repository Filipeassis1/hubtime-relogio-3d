---
name: threejs-builder
description: >-
  Build portfolio-quality 3D on the web with three.js (r186+) and fit it into whatever project it lands in: product
  heroes and configurators, 3D landing pages, interactive toys and small games, generative art, procedural scenes,
  data viz, scroll-driven stories, selectable multi-part products (configurators, diagnostics, exploded views) —
  inside an existing codebase (Vite, React/R3F, Next.js, Vue/Tres, Svelte/Threlte, Astro, plain HTML), as a
  standalone page, or as a claude.ai artifact. It first reads the project (stack, three version, design tokens,
  fonts, conventions) and asks only what the project can't answer, then covers art direction, real CC0
  models/HDRIs/PBR textures, lighting, materials, procedural TSL/WebGPU surfaces, post-processing, motion, physics,
  sound, and a screenshot critique loop that removes the "boxy, flat, default-CG" look. Use it whenever the user
  wants anything rendered with three.js, WebGL, WebGPU, TSL, React Three Fiber, drei, TresJS or Threlte — a "3D
  scene", "3D hero", "3D object", "model viewer", "spinning product", "exploded view", "interactive 3D", "shader",
  "particles", "globe", "low-poly game" — even if they never say three.js, and whenever existing three.js output
  looks cheap.
---

# three.js Builder

Goal: 3D that looks art-directed and belongs to the project it lives in — not a default three.js demo pasted into a
page. Cheap-looking output has three root causes: (1) the scene ignores its host (wrong stack idioms, off-brand
colors, fonts that clash), (2) no look was decided before coding, and (3) no real assets, so everything degrades to
primitives and canvas noise. This skill fixes those in order, then judges the result from screenshots.

The skill carries no project of its own. Every color, font, name, copy line and file path comes from the user's
project or the conversation; the values in references and examples are neutral starting points to replace.

Talk to the user in their language. Keep code comments in the project's convention (English if none).

## Workflow

### 0. Read the project (before asking anything)
If there is a codebase, spend a minute learning it — the answers to most questions are already there.
- **Stack**: `package.json` (framework, bundler, TS, `three` / `@react-three/*` / `@tresjs/*` / `@threlte/*` already
  installed and their versions), SSR or not, monorepo layout.
- **Design language**: CSS variables, Tailwind theme, design-token files, theme providers → palette, radii, fonts,
  dark mode. Brand assets (logo SVG, product models in `public/`).
- **Conventions**: where components and static assets live, naming, state management, lint/format, existing tests.
- **Where it goes**: the page/section/component that will host the 3D, its size, what surrounds it.
Write the findings as a short `PROJECT` note (stack, three version, palette from tokens, fonts, target path, assets
available). Integration recipes per stack: `references/project-integration.md`.
No codebase (fresh page or claude.ai artifact)? Skip to step 1 — the conversation is the only source.

### 1. Frame the job (no code yet)
- **Target**: existing project (from step 0) · new Vite/plain three page · React/R3F · claude.ai artifact.
- **Genre**: hero/landing · product · configurator · toy/game · data viz · generative · stylized/NPR · environment ·
  still life · night/sci-fi. Each has a preset in `references/art-direction.md`. Products whose parts must be picked,
  isolated or exploded: `references/selectable-parts.md`.
- **Ask only what neither the project nor the request answers** (2–4 questions max, one message, each with a
  default): mood/reference, the hero object (real model available? which file?), interaction, target devices. If
  everything is answered, state the direction you picked in one line and build.

### 2. Write the look brief into the code
A `LOOK` object at the top of the module (or a config file next to the component): palette derived from the
project's tokens (60/30/10 + shadow tint), environment + key/rim positions relative to the camera, FOV/elevation/fill,
tone mapping, post, motion. Every later decision derives from it, and the user can retune it in one place.

### 3. Plan assets — real first
- The project's own assets win (a product GLB, logo SVG, brand textures). Then a fitting CC0/CC-BY model, HDRI or PBR
  set (`references/asset-sources.md`).
- Codebase / local page: download into the project's static folder (`scripts/fetch_asset.py --raw`), optimize with
  gltf-transform, load normally.
- claude.ai artifact: the sandbox blocks external files — download in your shell, convert with
  `scripts/fetch_asset.py` (GLB → `.glb.b64.txt`, HDRI → `.hdr.b64.txt`, textures as jpg) and load with
  `assets/asset-loader.js` (`references/assets-in-artifacts.md`).
- No network / nothing fits: `@pmndrs/assets` → TSL procedural (`references/procedural-textures.md`) → canvas
  imperfection maps (`assets/procedural.js`) → careful modeling (`references/modeling.md`). Procedural modeling done
  well (profiles with chamfers, extruded outlines, instancing, faceted details) reaches catalog quality for
  machined objects; see the "refined procedural" section of `references/modeling.md`.

### 4. Build
- Inside a project: follow its idioms (component, hooks/composables, lifecycle cleanup, SSR guards, its build's asset
  imports) — `references/project-integration.md`. The look techniques below are framework-agnostic.
- Standalone: `assets/boilerplate-webgl.html` (quality tiers, boot guard + progress, IBL, key/rim rig, shadow catcher
  + contact shadow, MSAA composer, Timer loop, test hooks) or `assets/boilerplate-webgpu.html` (WebGPURenderer + TSL
  + RenderPipeline, falls back to WebGL 2). Copy the helper modules you use (`asset-loader.js`, `contact-shadows.js`,
  `procedural.js`) next to the page or into the project's lib folder.
- Start from the closest example when one fits: `examples/product-hero`, `examples/tsl-still-life`,
  `examples/toy-island`. Their copy, names and colors are placeholders — replace all of it with the project's.

### 5. Render and critique — at least 2 iterations
```bash
python3 scripts/preview.py <folder-or-url> [--artifact-csp] [--gpu] [--states a,b] [--sim 2]
```
Writes desktop (1280×800), panel (900×860) and mobile (390×844) screenshots; prints console errors, CSP violations,
renderer stats; exits 1 on errors. For a project with a dev server, point it at the running URL. Use `--artifact-csp`
only for claude.ai artifacts. Open every screenshot, score the rubric, fix the 2–3 worst items (big levers first),
re-render. `references/critique.md` has the symptom → cause → fix table. Needs `pip install playwright &&
playwright install chromium` once; `--gpu` uses the real GPU (and WebGPU).
WebGPU pages: also render the WebGL 2 fallback (`#webgl` hook in the boilerplate) — many viewers get it.
Also run the project's own checks (typecheck, lint, build) before calling it done.

### 6. Ship
- Project: the 3D lives where the project's conventions say, with its assets in the static folder, cleanup on
  unmount, and a loading/error state that matches the surrounding UI. Mention any new dependency you added.
- Artifact: publish with `files` = everything under `assets/` and `lib/` (fetch_asset.py prints the map).
- Credit CC-BY authors visibly. Tell the user the direction you took and what to try (drag, tap, swatches, scroll).

## Rubric (score every screenshot)
1. **Silhouette & values** — hero separates from background; lit side, terminator, shadow side.
2. **Grounding** — contact shadow/AO darkest where things touch; floating things still cast soft shadows.
3. **Edge separation** — rim light, fresnel or value change along the silhouette.
4. **Imperfection** — color, roughness and normal vary; repeats vary in scale/rotation.
5. **Believable material** — an environment map exists; roughness differs per material.
6. **Composition** — deliberate placement, 55–75% fill, breathing room, nothing cropped by accident.
7. **Fits the host** — palette, type and UI match the project; the 3D never covers its copy or controls.
8. **All aspects** — every container size it will live in (desktop, narrow/panel, phone) is composed.

## Anti-patterns (instant "default CG")
Grey default material · no environment map · pure black shadows · key light from the camera direction · FOV 75 at
elevation 0, object dead center · perfect symmetry and identical repeats · raw `BoxGeometry` as the product (bevel,
round, lathe or load a model) · no tone mapping or wrong texture color space · jaggies after post (no MSAA/SMAA) ·
bloom with threshold 0 · fog not matching the background · an infinite loader with no error state · colors invented
instead of taken from the project · a second copy of three bundled next to the project's own.

## claude.ai artifact sandbox (only when the target is an artifact)
Inside an artifact, `fetch()` of `data:` and `blob:` URLs fails, even though `<img>` from data:/blob: works.
Consequences: GLTFLoader's default embedded textures render white, `.gltf` with data: buffers never loads,
`EXRLoader.load(dataURL)` fails. Decode with `atob`/`Uint8Array.fromBase64` + `loader.parse()` and route glTF
textures through `TextureLoader` — `loadGLTF()` and `loadEnvironment()` in `assets/asset-loader.js` already do.
Scripts load only from cdn.jsdelivr.net/npm, cdnjs, unpkg; everything else ships as supporting files with web
extensions (.glb/.hdr/.bin are refused → base64 `.txt`). None of this applies to real projects.

## Versions
In a project, use the `three` version it already has; if it's older than the APIs here, either adapt (see the
old → new table in `references/ecosystem.md`) or propose the upgrade — don't silently add a second copy. New pages:
check `npm view three version` and pin it (references were written against **0.186.1**). r183–r186 changes that
bite: `THREE.Timer` replaces `Clock`; `HDRLoader` replaces `RGBELoader`; `PCFSoftShadowMap` removed → `PCFShadowMap`
+ `shadow.radius`; `RenderPipeline` replaces `PostProcessing`; `SMAAPass()` takes no args.

## Index — read when needed
| File | Read when |
|---|---|
| `references/project-integration.md` | step 0 and 4 in any existing codebase: detection, tokens → LOOK, per-stack recipes, SSR, cleanup |
| `references/art-direction.md` | always at step 1–2: questions, look brief, genre presets, palette, composition |
| `references/selectable-parts.md` | products whose parts are picked, isolated, exploded or swapped (configurators, diagnostics, service tools) |
| `references/assets-in-artifacts.md` | an artifact that should use real models/HDRIs/textures |
| `references/asset-sources.md` | choosing a model/HDRI/texture (quick picks, catalogs, licenses) |
| `references/critique.md` | every render iteration: rubric details, symptom → fix, anti-patterns |
| `references/lighting.md` | rigs, environments, shadows, grounding, mood recipes |
| `references/materials.md` | material classes, PBR values, physical features, imperfection, color spaces |
| `references/procedural-textures.md` | no assets: canvas maps and TSL recipes (marble, glaze, metal, plaster, wood) |
| `references/modeling.md` | silhouettes that aren't boxy, refined procedural, custom geometry, vertex deformation, glTF pipeline |
| `references/postfx.md` | AA, AO, bloom, DOF, grain, LUTs — WebGL composer, pmndrs, WebGPU RenderPipeline |
| `references/motion-and-interaction.md` | loop/test hooks, easing/springs, drag/tap/picking, camera framing, game feel, loading states |
| `references/scroll-and-gsap.md` | scroll-driven pages (GSAP ScrollTrigger + Lenis) |
| `references/webgpu-tsl.md` | WebGPURenderer, TSL nodes, compute particles |
| `references/physics.md` · `particles.md` · `sound.md` | Rapier/cannon/mini solver · instanced pools, points, compute · WebAudio synth recipes |
| `references/r3f.md` | React / R3F / drei |
| `references/performance.md` | quality tiers, budgets, adaptive DPR, disposal |
| `references/ecosystem.md` | versions, old → new API table, libraries, official examples by goal |
| `scripts/fetch_asset.py` | download + convert assets (polyhaven, khronos, three, ambientcg, url, pack; `--raw` for projects) |
| `scripts/preview.py` | headless screenshots + error/CSP report |
| `examples/*/` | tested reference scenes to start from (placeholder content) |
