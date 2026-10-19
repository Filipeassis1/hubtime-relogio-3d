# Critique loop — judging screenshots like an art director

Building is half the job; the other half is looking at the render and fixing what reads as "default CG".
Every lesson in this file came from real iterations on the bundled examples.

## The loop
1. Render: `python3 scripts/preview.py <folder | dev-server URL> [--artifact-csp for artifacts] [--gpu] [--states a,b]` → desktop, panel, mobile PNGs.
2. Open every PNG (yes, all of them) and score the rubric below, writing one line per item: ✅ or the problem.
3. Fix the 2–3 worst items only — big levers first (light direction, scale, composition) before micro (roughness 0.42 vs 0.45).
4. Re-render. Minimum 2 iterations; stop when every item is ✅ or the remaining issue is a deliberate choice.
5. If the page will be published as an artifact, open it in the app (or ask the user to) — only the app is ground truth.

## Rubric (score each screenshot)
| # | Check | Passes when |
|---|---|---|
| 1 | **Silhouette & values** | Squint: the hero separates from the background; there's a lit side, a terminator, a shadow side. |
| 2 | **Grounding** | Objects touch something: contact shadow / AO darkest at the contact point, softer away from it. Floating things still cast a soft shadow below. |
| 3 | **Edge separation** | Rim light, fresnel or background value change along the silhouette — no edge melts into the backdrop. |
| 4 | **Imperfection** | Color, roughness and normal vary across surfaces; scale/rotation vary across repeats. Nothing is perfectly uniform. |
| 5 | **Believable material** | There is an environment map; reflections show shape; roughness differs between materials (metal ≠ ceramic ≠ wood). |
| 6 | **Composition & breathing room** | Deliberate placement (thirds / copy column), hero 55–75% of the limiting dimension, nothing cropped by accident. |
| 7 | **Fits the host** | Palette, type and UI come from the project; overlay never covers the hero; the page around the 3D still works (header, scroll, dark mode). |
| 8 | **All aspects** | every container size it will live in — desktop 1280×800, narrow/panel 900×860, phone 390×844 — composed, not just "not broken". |

## Symptom → cause → fix (from real iterations)
| Symptom in the screenshot | Likely cause | Fix |
|---|---|---|
| Object evenly lit, looks flat/cut-out | Key light near the camera direction; env too strong | Key ~90° from camera azimuth and high; env intensity 0.2–0.5 when a key exists |
| Light looks right in one frame, wrong after orbiting | Camera orbits around fixed lights | Rotate the object (turntable) or parent the rig to the camera |
| Contact shadow has a light center and dark ring | Alpha > 1 in a HalfFloat target (darkness > 1) → negative blend | Clamp the sampled alpha (fixed in `contact-shadows.js`) |
| Contact shadow shows only the outline of the sole | Depth test off: top surfaces overwrite the bottom | Depth test on in the depth material (fixed) |
| Hard black shadow sheet under a floating object | Contact shadow darkness/opacity too high, blur too low | blur 3.5–4.5, darkness 1.2–1.6, opacity 0.7–0.8; key `shadow.intensity` 0.5–0.7 |
| Pedestal/platform dominates | Platform radius ≥ product length; camera too high | Platform ≈ 0.6× product length, camera elevation 8–15° |
| Platform floats in a void | Nothing under the platform | Wide soft radial occlusion blob on the invisible floor |
| White seam / sky visible through the base | Mismatched outline between parts (circle vs noisy shape) | Loft/extrude every part from the same outline |
| Procedural wood reads as flat brown | Pattern scale too large for the view (figure ≈ 0.5 m at scale 1) or grain across the board | Scale ×5–8, rotate so the grain runs along the long axis |
| Marble looks like cracked plaster | Veins too thin, too high frequency, no halo | Low-frequency domain warp, pow 12–18 for veins + pow ~4 halo |
| Hammered metal looks like a turtle shell | Dent cells too large / bump too strong | Raise cell frequency, lower bump height (≈0.0005 world units at 30–70 cells/unit) |
| Objects all in shadow while the window light hits empty wall | Gobo/blocker misplaced | Put the blocker on the sun ray through the point you want lit (`target + sunDir * d`) |
| Phone view: hero cropped or tiny | Distance computed from vertical FOV only | Fit both `tan(vfov/2)` and `tan(vfov/2)*aspect`; portrait: pull back + view offset up |
| Phone view: table edge / underside visible | Pulled back too far | Make the ground deeper/wider rather than pulling the camera further |
| Artifact panel: hero overlaps the copy | Only tested 16:10 and phone | Interpolate fill/offset by aspect; always render the `panel` viewport |
| Model renders white in the app (fine locally without `--artifact-csp`) | GLTFLoader ImageBitmap path → fetch(blob:) blocked | TextureLoader fix (`loadGLTF`) — see assets-in-artifacts.md |
| Endless loader in the app | Something fetched a data:/blob: URL, or an import failed | Boot guard prints the error; never fetch data:/blob: |
| WebGPU scene: one surface black for some viewers | Node feature unsupported on the WebGL 2 fallback (e.g. WoodNodeMaterial) | Render `--page 'index.html#webgl'`; branch on `renderer.backend.isWebGPUBackend` |
| Colors shifted from the brand swatch | AgX/ACES tone mapping | Neutral tone mapping or compare swatches in the screenshot |
| Jaggies after adding post | Composer target without MSAA | `new WebGLRenderTarget(w, h, { type: HalfFloatType, samples: 4 })` / `pass(scene, camera, { samples: 4 })`, or SMAA/FXAA last |

## Anti-patterns ("default CG" tells)
- Default grey `MeshStandardMaterial` / `MeshNormalMaterial` / `MeshBasicMaterial` on lit objects.
- No environment map (metals go black, everything looks plastic).
- Pure black shadows; `AmbientLight` as the only fill (use hemisphere + IBL).
- Flat frontal light (key from the camera direction).
- FOV 75 default; camera at elevation 0; object dead center with nothing else in frame.
- Perfect symmetry and perfect repeats (same tree, same scale, same rotation).
- Raw primitives as the final product (`BoxGeometry` with 90° edges): bevel, round, lathe, extrude-with-bevel, or load a model.
- No tone mapping, or textures in the wrong color space (color maps sRGB, data maps linear).
- Aliasing after the composer; bloom on everything (threshold too low).
- Fog color different from the background/horizon.
- Shadow acne or peter-panning (fix `normalBias` first, then `bias`; tighten the shadow camera frustum).
- Text overlay covering the hero; an infinite loader with no error state.
- Colors and fonts invented instead of taken from the project; placeholder copy from the examples left in.
- Canvas sized to `window` inside a smaller container; no cleanup on unmount (leaks on route change).
- Metal reflecting a synthetic environment with hard black/white bands ("checkerboard" bracelets): use lightformers or a studio HDRI with a mid-grey background.
- A bright crescent between dial and case: the polished case bore shows through the gap; close it with a rehaut ring.
