# WebGPU + TSL (three r186)

Use WebGPURenderer when you want node materials (procedural surfaces, displacement), compute (huge particle counts,
cloth, fluids), or the modern post stack. It falls back to a WebGL 2 backend automatically, so it is safe as a default
for procedural/generative work (WebGPU also works inside claude.ai artifacts). In a bundler project import from
`three/webgpu` and `three/tsl` — no importmap needed.
Template: `assets/boilerplate-webgpu.html`; full example: `examples/tsl-still-life`.

## Setup
```html
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.tsl.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
} }</script>
```
Map **both** `three` and `three/webgpu` to `three.webgpu.js`, or addons pull a second (WebGL-only) copy.
```js
import * as THREE from 'three/webgpu';
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
await renderer.init();                      // before compileAsync / first frame
renderer.backend.isWebGPUBackend            // false → running on the WebGL 2 fallback
```
Differences from WebGL: node materials (`MeshStandardNodeMaterial`, `MeshPhysicalNodeMaterial`, `MeshBasicNodeMaterial`, `PointsNodeMaterial`, `ShadowNodeMaterial`); regular materials still work (auto-converted); no `onBeforeCompile` (use nodes); post = `RenderPipeline`; `renderer.compileAsync`; set your ready flag after ~3 rendered frames.

## TSL essentials
```js
import { Fn, uniform, float, vec2, vec3, color, mix, smoothstep, sin, time, positionLocal, positionWorld, normalView, uv } from 'three/tsl';
const uSeed = uniform(1);                                     // .value changes at runtime, no recompile
mat.colorNode = mix(color('#1d2b4a'), color('#d9c7a0'), smoothstep(-0.3, 0.6, n));
mat.positionNode = positionLocal.add(normalLocal.mul(n.mul(0.1)));   // vertex displacement
mat.roughnessNode = float(0.2).add(mx_noise_float(positionLocal.mul(12)).mul(0.08));
const fresnel = Fn(() => float(1).sub(normalView.dot(positionView.normalize().negate())).pow(3));
mat.emissiveNode = color('#7fb3ff').mul(fresnel());
```
- Method chaining: `.mul .add .sub .div .pow .oneMinus .abs .clamp .dFdx .dFdy .normalize .dot .cross .sample`.
- `Fn(([a, b]) => …)` defines reusable shader functions; call with nodes or numbers.
- Noise: `mx_noise_float/vec3`, `mx_fractal_noise_float(p, oct, lac, dim)`, `mx_worley_noise_float`, `mx_cell_noise_float` — recipes in `procedural-textures.md`.
- Bump from position-based height: the `bumpNormal(h)` Fn (TSL `bumpMap` only works on UV-sampled textures).
- Textures: `texture(tex, uv())`, `triplanarTexture(tex)` (no UVs needed), `convertToTexture(node, w, h)` to bake.
- Transpile GLSL: `webgpu_tsl_transpiler` example / threejsresources glsl-to-tsl.

## Compute (particles)
```js
import { instancedArray, instanceIndex, hash, Fn, deltaTime, vec3 } from 'three/tsl';
const COUNT = 200_000;
const pos = instancedArray(COUNT, 'vec3'), vel = instancedArray(COUNT, 'vec3');
const init = Fn(() => { const p = pos.element(instanceIndex); p.assign(vec3(hash(instanceIndex), hash(instanceIndex.add(1)), hash(instanceIndex.add(2))).sub(0.5).mul(4)); })().compute(COUNT);
const update = Fn(() => { const p = pos.element(instanceIndex), v = vel.element(instanceIndex);
  v.addAssign(p.negate().mul(deltaTime.mul(0.5))); p.addAssign(v.mul(deltaTime)); })().compute(COUNT);
await renderer.computeAsync(init);
const mat = new THREE.SpriteNodeMaterial({ blending: THREE.AdditiveBlending, depthWrite: false });
mat.positionNode = pos.toAttribute(); mat.scaleNode = float(0.01);
const sprites = new THREE.Sprite(mat); sprites.count = COUNT; scene.add(sprites);
// loop: renderer.compute(update); pipeline.render();
```
This snippet renders 200k sprites under the artifact CSP (r186); the init fills a cube — shape it (sphere, image, mesh surface) and add forces. Deeper patterns: `webgpu_compute_particles`, `webgpu_compute_particles_rain/snow/fluid`, `webgpu_tsl_compute_attractors_particles`, `webgpu_compute_cloth`, `webgpu_compute_birds`.

## Post (RenderPipeline)
See `postfx.md` §4 (SSAO via `builtinAOContext`, DOF, bloom, film, vignette). Loop calls `pipeline.render()`.

## Gotchas
- **Test the WebGL 2 fallback** (Safari/Firefox/older GPUs land there): create the renderer with `forceWebGL: location.hash === '#webgl'` and run `preview.py <folder> --page 'index.html#webgl'`. In r186 `WoodNodeMaterial` throws on that backend (`THREE.TSL: TypeError … reading '0'`) and renders black — branch on `renderer.backend.isWebGPUBackend` and use a MaterialX-noise wood (see `examples/tsl-still-life` `tslWalnut()`). MaterialX noise, physical node materials, SSAO, DOF, bloom and film all work on both backends.
- `positionLocal` vs `positionWorld`: materials that should move with the object must use local.
- `WoodNodeMaterial` grain axis/scale (rotate Y 90°, scale ~7 for a table).
- Shadows: same API (`castShadow`, `shadowMap.type = PCFShadowMap`, `shadow.radius`).
- WebGL-only addons (EffectComposer passes, `onBeforeCompile` patches) don't apply here.
- Debug: `renderer.inspector = new Inspector()`; `.toInspector('name')` on nodes to view intermediate passes.
