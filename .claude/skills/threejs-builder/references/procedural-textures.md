# Procedural textures (zero downloads)

Two engines: **Canvas 2D** (any renderer, baked once, `assets/procedural.js`) and **TSL nodes** (WebGPU/WebGL2 via
WebGPURenderer, evaluated per pixel in 3D space — no UV seams, infinite resolution). See `examples/tsl-still-life`.

## 1. Canvas (assets/procedural.js)
| Helper | Use |
|---|---|
| `makeNoise(seed)` | periodic value noise `N(x, y, period)` → tileable |
| `fbmTexture(THREE, { scale, octaves, min, max, warp })` | roughness/bump/AO breakup (linear) |
| `mottleTexture(THREE, base, { amount, hueShift })` | color variation for flat colors (sRGB) |
| `radialTexture(THREE, stops)` | glow sprites, occlusion blobs, vignettes |
| `toonRamp(THREE, [.3, .65, 1])` | MeshToonMaterial bands |
Painting pattern for custom maps (per pixel into `ImageData`):
- layer: base color → low-freq mottling → pattern (stripes/veins with `smoothstep` edges) → local features (gaussian `exp(-(du²+dv²)k)`) → edge darkening → fine grain (`×(0.94 + 0.08·fine)`).
- **Domain warp**: offset the lookup by noise at 2 frequencies → organic, ragged edges.
- Seamless in u for spheres: blend samples at `u` and `u−1` (`f(U)·(1−U) + f(U−1)·U`).
- Live painting (damage, paint, scratches): keep the clean `ImageData`, draw strokes, `texture.needsUpdate = true`.
Bake big canvases once at load (512–2048²); they cost ~10–80 ms each on the main thread.

## 2. TSL building blocks (import from 'three/tsl')
- Noise (MaterialX): `mx_noise_float(p)` (≈ −1…1), `mx_fractal_noise_float(p, octaves, lacunarity, diminish)`, `mx_worley_noise_float(p)` (distance to nearest cell point, 0…~1), `mx_cell_noise_float(floor(p))` (random per cell).
- Space: `positionLocal` (moves with the object — use for materials), `positionWorld` (world-locked: terrain, fog), `uv()`, `normalView`, `screenUV`.
- Math: `mix smoothstep step abs sin pow clamp fract length atan`, `.mul .add .sub .div .oneMinus .dFdx() .dFdy()`.
- Hooks on node materials: `colorNode`, `roughnessNode`, `metalnessNode`, `normalNode`, `emissiveNode`, `positionNode` (vertex displacement), `opacityNode`, `clearcoatNode`.
- Uniforms: `const uSeed = uniform(1)`; change `uSeed.value` at runtime (reroll without recompiling).
- `WoodNodeMaterial.fromPreset('walnut','semigloss')` (three/addons/materials) — **WebGPU backend only** (black on the WebGL 2 fallback in r186). Grain runs across local Z, figure ≈ 0.5 m at scale 1: for a tabletop `transformationMatrix = rotY(90°)·scale(7)`. Portable alternative: rings = `fract(length(p.yz) + fbmWarp)` with the log axis along X (`tslWalnut()` in examples/tsl-still-life).

### Bump from procedural height (position-based)
TSL's `bumpMap()` differentiates a texture via its UVs, so it ignores position-based noise. Use:
```js
const bumpNormal = Fn(([h]) => {   // h in world units
  const dpdx = positionView.dFdx(), dpdy = positionView.dFdy();
  const r1 = dpdy.cross(normalView), r2 = normalView.cross(dpdx), det = dpdx.dot(r1).mul(faceDirection);
  return det.abs().mul(normalView).sub(det.sign().mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)))).normalize();
});
mat.normalNode = bumpNormal(mx_noise_float(positionLocal.mul(160)).mul(0.0003));
```
Heights: fine grain 0.0001–0.0004, hammered dents 0.0005, throwing rings `sin(y·260)·0.00025`.

### Recipes (all in examples/tsl-still-life)
```js
// Marble: low-freq warp → long veins + soft halo
const q = positionLocal.mul(6).add(seed);
const warp = mx_fractal_noise_float(q.mul(0.45), 6, 2, 0.5).mul(3.2);
const v = abs(sin(q.x.mul(0.8).add(q.y.mul(0.35)).add(warp)));
const veins = pow(v.oneMinus(), 16).add(pow(v.oneMinus(), 4).mul(0.45));
mat.colorNode = mix(color('#f1eee8'), color('#6a6d72'), clamp(veins, 0, 0.9));

// Glaze drip on ceramic: noisy height threshold, darker pooling at the edge, raw clay below
const edge = uDrip.add(mx_fractal_noise_float(vec3(atan(p.z, p.x).mul(1.6), p.y.mul(4), seed), 3, 2, .5).mul(0.05));
const glazed = smoothstep(edge.sub(0.006), edge.add(0.006), p.y.div(H));
const pool = smoothstep(edge.add(0.08), edge, p.y.div(H)).mul(glazed);

// Speckles: worley dots, thinned by a per-cell random
const c = p.mul(70);
const speck = smoothstep(0.17, 0.07, mx_worley_noise_float(c)).mul(step(0.62, mx_cell_noise_float(c.floor())));

// Hammered metal: worley distance squared as height, patina in the hollows
const d = mx_worley_noise_float(positionLocal.mul(70)); mat.normalNode = bumpNormal(d.mul(d).mul(0.0005));

// Plaster wall: two-octave mottling + anisotropic trowel noise in the bump
mat.colorNode = mix(color('#cfc4b4'), color('#e2d9cb'), mx_fractal_noise_float(p.mul(1.4), 4, 2, .5).mul(.5).add(.5));
```
More in the official examples: `webgpu_tsl_wood`, `webgpu_procedural_texture` (bake with `convertToTexture`),
`webgpu_materialx_noise`, `webgpu_tsl_earth`, `webgpu_tsl_raging_sea`, `webgpu_tsl_procedural_terrain`, `webgpu_tsl_halftone`.
Libraries: `tsl-textures` (Boytchev) — dozens of ready procedural TSL textures (marble, rust, camouflage, …).

## 3. Choosing
- Pattern must move with the object → `positionLocal`; static world pattern → `positionWorld`; UV-mapped model → `uv()`.
- Needs to run on any renderer or be painted live → Canvas. Needs infinite detail / no seams / runtime reseeding → TSL.
- Prefer a real CC0 texture when photo realism matters (wood planks, brick, fabric weave) — procedural shines on
  stone, ceramics, metals, plaster, terrain, stylized surfaces.
