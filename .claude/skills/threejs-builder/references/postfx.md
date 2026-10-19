# Post-processing

Post is seasoning: AA + tone mapping are mandatory, AO/bloom/DOF/grain are choices. Order matters.

## Contents
1. Color pipeline basics
2. WebGL: EffectComposer (three/addons)
3. WebGL: pmndrs `postprocessing` + N8AO
4. WebGPU: RenderPipeline + TSL nodes
5. Effect cookbook (values)

## 1. Color pipeline
- Render in linear HDR → tone map → sRGB. With a composer, the renderer skips tone mapping on render targets; `OutputPass` (WebGL) or `RenderPipeline` (WebGPU, `outputColorTransform = true`) applies `renderer.toneMapping` + sRGB at the end.
- Tone mappers: `AgXToneMapping` (filmic, gentle highlights, slightly desaturating), `NeutralToneMapping` (keeps base colors ≈ sRGB → brand/product/pastel), `ACESFilmicToneMapping` (punchy, hue shifts on saturated colors).
- `toneMappingExposure` 0.8–1.3. Transparent canvas + CSS backdrop works with composers (OutputPass preserves alpha).
- Background colors also get tone-mapped in the composer path: pick them after looking at the render, or keep the backdrop in CSS.

## 2. WebGL — EffectComposer
```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// MSAA inside the composer: no jaggies after post (renderer antialias doesn't apply to render targets)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new GTAOPass(scene, camera, w, h));                        // optional AO
composer.addPass(new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.3, 0.5, 0.88)); // strength, radius, threshold
composer.addPass(new OutputPass());                                        // always last (or before SMAA/FXAA)
// resize: composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h)
```
Other passes (r186): `SMAAPass()` / `FXAAPass()` (no args now; after OutputPass when not using MSAA), `TAARenderPass`, `SSAOPass`, `SAOPass`, `SSRPass`, `BokehPass(scene, camera, { focus, aperture, maxblur })`, `OutlinePass`, `LUTPass` (+ `LUTCubeLoader`), `FilmPass`, `HalftonePass`, `RenderPixelatedPass`, `AfterimagePass`, `GlitchPass`.
`renderer.info` resets per render call — with a composer read it with `renderer.info.autoReset = false` + manual `reset()`.

## 3. WebGL — pmndrs postprocessing (merges effects into one pass: faster, prettier)
```html
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/",
  "three/examples/jsm/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/",
  "postprocessing": "https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js",
  "n8ao": "https://cdn.jsdelivr.net/npm/n8ao@2.0.1/dist/N8AO.js"
} }</script>
```
```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect, NoiseEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
renderer.toneMapping = THREE.NoToneMapping;               // tone mapping moves into the effect chain
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
composer.addPass(new RenderPass(scene, camera));
const n8 = new N8AOPostPass(scene, camera, w, h); n8.configuration.aoRadius = 0.6; n8.configuration.intensity = 2.5; composer.addPass(n8);
composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 0.4, luminanceThreshold: 0.85 }),
  new VignetteEffect({ darkness: 0.35 }), new ToneMappingEffect({ mode: ToneMappingMode.AGX })));
```
`"three/examples/jsm/"` is required: n8ao imports `three/examples/jsm/postprocessing/Pass.js`. This exact snippet was rendered under the artifact CSP (r186, postprocessing 6.39.5, n8ao 2.0.1).

## 4. WebGPU — RenderPipeline + TSL nodes (r186: `THREE.RenderPipeline`, formerly `PostProcessing`)
```js
import * as THREE from 'three/webgpu';
import { pass, mrt, sample, screenUV, normalView, packNormalToRGB, unpackRGBToNormal, builtinAOContext, uniform, smoothstep, length, vec2, float } from 'three/tsl';
import { ssao } from 'three/addons/tsl/display/SSAONode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';

const pipeline = new THREE.RenderPipeline(renderer);
// AO: a normal pre-pass → SSAO → fed into the lighting's ambient term (not multiplied over the image)
const pre = pass(scene, camera); pre.transparent = false;
pre.setMRT(mrt({ output: packNormalToRGB(normalView) })); pre.getTexture('output').type = THREE.UnsignedByteType;
const aoPass = ssao(pre.getTextureNode('depth'), sample(uv => unpackRGBToNormal(pre.getTextureNode().sample(uv))), camera);
aoPass.radius.value = 0.12; aoPass.resolutionScale = 0.75;
const scenePass = pass(scene, camera, { samples: 4 });          // MSAA
scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);
let out = scenePass.getTextureNode();
out = dof(out, scenePass.getViewZNode(), uniform(1.4) /*focus dist*/, uniform(0.7) /*focal range*/, uniform(1.1) /*bokeh*/);
out = out.add(bloom(out, 0.25, 0.5, 0.85));
const vig = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(1.25, 1))));
pipeline.outputNode = film(out.mul(vig.mul(0.35).add(0.65)), float(0.18));
// loop: pipeline.render()   (not renderer.render)
```
- GTAO (`ao()`) is ground-truth but noisy → pair with `traa()` (temporal AA) and a velocity MRT; SSAO is self-denoised → pair with MSAA. Pattern: official `webgpu_postprocessing_ao`.
- Other nodes in `three/addons/tsl/display/`: `smaa`, `fxaa`, `traa`, `ssr`, `ssgi`, `sss`, `godrays`, `lensflare`, `motionBlur`, `outline`, `pixelationPass`, `retroPass`, `chromaticAberration`, `rgbShift`, `lut3D`, `sepia`, `bleachBypass`, `sharpen`, `gaussianBlur`, `denoise`, `fsr1`, `taau`, `transition`, `afterImage`, `anamorphic`.
- Debug panel: `renderer.inspector = new Inspector()` (three/addons/inspector/Inspector.js).

## 5. Cookbook
| Effect | When | Values |
|---|---|---|
| MSAA (samples 4) | always, in composer/pipeline | — |
| AO | interiors, still lifes, clusters, diorama | radius ≈ 5–15% of object size, intensity 1–2.5 |
| Bloom | emissive, neon, sun glints, night | threshold 0.8–0.9, strength 0.2–0.8; never threshold 0 |
| DOF | still life, macro, product close-ups | subtle: subject sharp, foreground/background soft; off for UI/data viz |
| Vignette | photographic scenes | 0.25–0.4 darkness |
| Grain | dark scenes, gradients (kills banding), filmic | 0.08–0.2 |
| LUT | brand grade, film looks | `LUTPass` / `lut3D` with three's `luts/*.CUBE` (ship as supporting file; .CUBE is text — rename to .txt) |
| Outline | selection, toon | OutlinePass / `outline()` node, or inverted hull |
| Chromatic aberration | sci-fi, glitch | very low (0.001–0.003) |
