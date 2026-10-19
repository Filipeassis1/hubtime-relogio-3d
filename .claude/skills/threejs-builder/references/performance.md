# Performance and quality tiers

## Quality tiers (one place for every expensive knob)
```js
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
const QUAL = MOBILE ? { dpr: 1.5, shadow: 1024, samples: 4, tex: 1024, particles: 60 }
                    : { dpr: 2,   shadow: 2048, samples: 4, tex: 2048, particles: 160 };
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUAL.dpr));   // DPR cap = biggest single win on phones
```
Adaptive: measure frame time over ~60 frames after load; if > 22 ms, drop DPR by 0.25 (floor 1), then disable AO/DOF.

## Budgets (phone-safe)
| Item | Budget |
|---|---|
| Draw calls | < 100 mobile, < 300 desktop (each material × mesh = a call; instancing for repeats) |
| Triangles | < 300k mobile, < 1.5M desktop |
| Shadow casters | 1 directional with shadows on mobile; hero objects only cast |
| Textures | 1–2K; 4K only for full-screen close-ups; KTX2 in local projects (stays compressed in VRAM) |
| Post | MSAA + 1–2 effects on mobile; AO at `resolutionScale` 0.5 |
| Transmission/refraction | expensive (extra scene render) — one object max on mobile |

## Habits
- Pre-allocate temp vectors/matrices at module scope; zero allocations in the loop.
- `renderer.compileAsync(scene, camera)` before revealing; WebGPU: wait a few frames.
- Pause when hidden (`Timer.connect(document)` handles dt; also skip heavy sims when `document.hidden`).
- Static scenes: render on demand (only after input/animation).
- Dispose what you remove: `geometry.dispose()`, `material.dispose()`, textures, render targets; don't dispose shared ones.
- `renderer.info.render.calls/triangles` and `.memory` to audit (with a composer set `info.autoReset = false` and reset per frame).
- Raycasting large meshes: `three-mesh-bvh`. Many instances with culling/LOD: `@three.ez/instanced-mesh`, `BatchedMesh`.
- Contact shadows: `update()` only when something moved.

## Testing
`scripts/preview.py <folder> --artifact-csp` (SwiftShader, runs anywhere; slow but faithful for correctness) or `--gpu`
(real GPU: fidelity + WebGPU). It prints renderer.info, console errors, CSP violations and failed requests and exits 1
on errors — usable in a loop. Install once: `pip install playwright && playwright install chromium`.
