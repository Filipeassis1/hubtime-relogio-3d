# TSL still life — zero textures

WebGPU (auto-fallback to WebGL 2) still life where every surface is a TSL node graph: WoodNodeMaterial walnut,
domain-warped marble, celadon stoneware (noisy drip line, pooling, iron speckles, throwing rings), hammered brass
(worley dents + patina). Window light = DirectionalLight + an invisible "gobo" blocker with 4 pane holes
(colorWrite:false still casts shadows). Warm sun / cool hemisphere fill. RenderPipeline: SSAO into the ambient
term (builtinAOContext) + MSAA, depth of field, vignette, film grain. "Reroll" re-seeds every pattern.

Genre preset: `art-direction.md` → Still life / interior. No assets, single file.
```bash
python3 ../../scripts/preview.py . --artifact-csp --wait 40 --states 4,23
python3 ../../scripts/preview.py . --artifact-csp --wait 40 --page 'index.html#webgl'   # WebGL 2 fallback
```
Lessons baked in: TSL `bumpMap()` only differentiates UV-sampled textures — for position-based noise use the
`bumpNormal(height)` helper (screen-space derivatives). WoodNodeMaterial grain runs across local Z and its figure
is ~0.5 m at scale 1: rotate Y 90° and scale ~7 for a tabletop.
WoodNodeMaterial is WebGPU-backend-only in r186 (black on the WebGL 2 fallback), so the page switches to `tslWalnut()`
(MaterialX-noise rings) when `renderer.backend.isWebGPUBackend` is false.

Copy, names and colors in this scene are placeholders — in a real project take them from its content and design tokens.
