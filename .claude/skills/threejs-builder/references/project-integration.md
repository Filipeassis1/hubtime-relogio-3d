# Project integration — make the 3D belong to the codebase it lands in

A scene can be well lit and still feel pasted in: wrong colors, a font from nowhere, a second copy of three, a canvas
that leaks memory on route change. Read the project first, then build with its idioms. The look techniques in the
other references are framework-agnostic; this file is about the host.

## Contents
1. Discovery checklist
2. The PROJECT note and tokens → LOOK
3. Recipes per stack (vanilla/Vite, React/R3F, Next.js, Vue/Nuxt + TresJS, Svelte/SvelteKit + Threlte, Astro, Angular, CMS/embed)
4. Embedding rules that apply everywhere
5. Verifying inside the project

## 1. Discovery checklist (read, don't ask)
| Look at | To learn |
|---|---|
| `package.json` (+ lockfile) | framework, bundler, TS, package manager (pnpm/yarn/npm/bun — use the same one), existing `three`, `@react-three/*`, `@tresjs/*`, `@threlte/*`, `gsap`, `lenis`, `@types/three` versions |
| framework config (`vite.config`, `next.config`, `nuxt.config`, `svelte.config`, `astro.config`) | SSR/SSG, static folder, aliases, `transpilePackages`, base path |
| `tailwind.config.*` / `@theme` in CSS / `:root` variables / `tokens.json` / theme provider | palette, neutrals, accent, radii, dark mode strategy (class vs media) |
| font loading (`next/font`, `@fontsource`, `<link>`, `@font-face`) | the typefaces any overlay UI must use |
| `public/`, `static/`, `assets/` | existing models, HDRIs, logos (SVG → extrude), product imagery |
| the target page/component and its neighbours | container size, what overlaps it, copy column side, scroll behaviour |
| existing 3D code | patterns to follow (or problems to fix first), shared renderer, loaders already configured (Draco/KTX2 paths) |
| scripts (`dev`, `build`, `lint`, `typecheck`, `test`) | what to run before calling it done |

If something important is missing (no product model, no brand palette, unclear placement), that's what you ask about —
with a default, in one message.

## 2. The PROJECT note and tokens → LOOK
Keep it short, at the top of your working notes or as a comment above `LOOK`:
```
PROJECT: Next 15 app router, TS, pnpm · three 0.18x + R3F 9 already installed · target app/(marketing)/page.tsx hero (right column, 560px tall)
palette: --background #0b0c0f · --foreground #f2f2f0 · --primary #ff5a36 · dark only · font: Inter (next/font)
assets: public/models/product.glb (12 MB, Draco) · no HDRI
```
Derive `LOOK.palette` from the tokens instead of inventing colors:
- **60** = page background (or a slightly lifted version of it) → backdrop, fog, floor tint.
- **30** = surface/secondary token → pedestal, secondary objects.
- **10** = primary/accent token → one hero detail, emissive accent, selection.
- **Shadow tint** = background hue, darker and slightly more saturated — never pure black.
Read tokens at runtime when the scene must follow theme switches:
```js
// Resolves any CSS color (hex, rgb, hsl, oklch, color-mix, var()) to a THREE.Color via a 1px canvas.
const _c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
function cssColor(THREE, value, el = document.documentElement) {
  const v = value.startsWith('--') ? getComputedStyle(el).getPropertyValue(value).trim() : value;
  _c.clearRect(0, 0, 1, 1); _c.fillStyle = v; _c.fillRect(0, 0, 1, 1);
  const [r, g, b] = _c.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}
// theme change: matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
// or a MutationObserver on <html class> / [data-theme] for class-based themes
```
Tailwind v4 exposes theme colors as CSS variables (`--color-*`); v3 configs can be imported in JS
(`resolveConfig`) or mirrored as variables. Check the rendered result: tone mapping shifts colors — use
`NeutralToneMapping` when brand colors must match, and keep large flat backgrounds in CSS (transparent canvas).

## 3. Recipes per stack

### Vanilla three in any bundler (Vite, webpack, Parcel) — also the core of every other recipe
Expose `mount(container, options) → dispose()` so any framework can host it:
```js
export function mount(container, { look = LOOK } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  // … scene, camera, lights, loaders …
  const ro = new ResizeObserver(([e]) => { const { width, height } = e.contentRect;   // size from the container, not window
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); });
  ro.observe(container);
  const io = new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting ? frame : null));
  io.observe(container);                                                                // pause offscreen
  return () => { io.disconnect(); ro.disconnect(); renderer.setAnimationLoop(null);
    scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material ?? []).forEach(m => { Object.values(m).forEach(v => v?.isTexture && v.dispose()); m.dispose(); }); });
    renderer.dispose(); renderer.domElement.remove(); };
}
```
- Assets: put them in the static folder and use absolute paths (`/models/x.glb`), or import the URL
  (`new URL('./x.glb', import.meta.url).href`, Vite `?url`). Respect a configured `base` path.
- Lazy-load the 3D chunk (`const { mount } = await import('./scene.js')`) so three doesn't block first paint.
- Draco/KTX2: point decoders at files the project serves (`/draco/`, `/basis/`, copied from `three/examples/jsm/libs/`)
  or a CDN the project already allows.

### React + React Three Fiber
See `r3f.md` for the scene skeleton. Integration points:
- Fit the existing React version: R3F 9 ↔ React 19, R3F 8 ↔ React 18. Don't upgrade React to add 3D without asking.
- `<Canvas>` sizes to its parent — give the parent an explicit height. Keep it in its own component file next to the
  page's other sections; colors come in as props from the theme (`useTheme`, CSS vars via `cssColor`).
- StrictMode mounts twice in dev: R3F handles it; hand-written `useEffect` + `mount()` must return the dispose.
- Many canvases on one page (cards, galleries) → one `<Canvas>` with drei `<View>` per slot; browsers cap WebGL contexts (~16).
- `gltfjsx --transform --types` turns a GLB into a typed component and an optimized file in `public/`.

### Next.js (app or pages router)
- three touches `window`: the component must be a client component (`'use client'`), and heavy scenes are best loaded
  with `dynamic(() => import('./Scene'), { ssr: false, loading: () => <Poster /> })` from a client wrapper.
- Static files in `public/`; `next/image` for the poster/fallback. If a three addon fails to compile, add
  `transpilePackages: ['three']`.
- Fonts from `next/font` expose CSS variables — use them in overlays so text matches the site.

### Vue / Nuxt + TresJS
- `@tresjs/core` (`<TresCanvas>`, `<TresMesh>`…) + `@tresjs/cientos` (`useGLTF`, `OrbitControls`, `Environment`,
  `ContactShadows`); Nuxt: `@tresjs/nuxt` module, wrap in `<ClientOnly>`.
- Plain vanilla also fits: `onMounted(() => dispose = mount(el.value))`, `onBeforeUnmount(() => dispose())`; keep three
  objects out of reactive state (`shallowRef`/`markRaw`) — Vue proxies on scene graphs are slow and break equality.

### Svelte / SvelteKit + Threlte
- `@threlte/core` (`<Canvas>`, `<T.Mesh>`) + `@threlte/extras` (`useGltf`, `Environment`, `ContactShadows`,
  `OrbitControls`, `interactivity`).
- Vanilla: `onMount(() => mount(el))` returns the dispose (Svelte calls it on destroy). SSR: guard with `browser` from
  `$app/environment` or keep all three code inside `onMount`.

### Astro
- 3D as an island: a React/Vue/Svelte component with `client:visible` (load when scrolled into view) or
  `client:only="react"` when it can't render on the server. Plain `<script>` in a `.astro` file also works for vanilla.

### Angular
- `@ViewChild` container, create in `ngAfterViewInit`, run the loop in `NgZone.runOutsideAngular` (otherwise every frame
  triggers change detection), dispose in `ngOnDestroy`. `angular-three` exists if the project wants a declarative API.

### CMS / site builders / plain HTML (WordPress, Webflow, Framer embed, Shopify theme)
- One self-contained module: importmap + `<script type="module">` (pin the three version), mounted into a scoped
  container; CSS prefixed to that container so it can't leak into the theme.
- Assets must be served with CORS from the platform's CDN or a bucket; test from the real domain.

## 4. Embedding rules that apply everywhere
- **One three**: reuse the project's version; adding R3F/drei/postprocessing must match its peer range. Duplicate three
  copies cause `instanceof` bugs and "Multiple instances of Three.js" warnings.
- **Container, not window**: size from the container (ResizeObserver); never assume full-screen unless it is.
- **Lifecycle**: stop the loop and dispose GPU resources on unmount/route change; pause offscreen and when
  `document.hidden`.
- **Performance budget of the page, not the scene**: lazy-load, show a poster image until ready (also the fallback when
  WebGL is unavailable), cap DPR, no layout shift (reserve the container's height).
- **Accessibility**: decorative 3D → `aria-hidden="true"`; interactive 3D → `role="img"` or focusable canvas with an
  `aria-label` describing it and the controls; respect `prefers-reduced-motion`.
- **Copy and UI** belong to the project: real product names, the site's fonts and buttons, its i18n setup. Never
  ship placeholder copy from the bundled examples.
- **Dependencies**: say which ones you added and why; install with the project's package manager.

## 5. Verifying inside the project
1. Run its dev server and `python3 scripts/preview.py http://localhost:<port>/<route> --gpu` (add `--wait` if the
   page has no ready flag; set `window.__app = { ready: true, renderer, … }` in dev builds to make it precise).
2. Check the surrounding page in the screenshots too: header overlap, scroll, dark mode, the mobile layout.
3. Run the project's `typecheck`, `lint`, `build` (SSR breakages show up only in the build).
4. Navigate away and back (route change) and watch for console errors or growing `renderer.info.memory`.
