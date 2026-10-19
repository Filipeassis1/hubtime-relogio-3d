# Art direction — decide the look before writing code

Generic three.js output happens when the look is never decided: grey material, default light, FOV 75, object in the
middle. Decide five things first, write them as a `LOOK` object at the top of the code, and judge every screenshot
against them.

## Contents
1. Questions worth asking
2. The look brief
3. Genre presets (hero/landing, product, configurator, toy/game, data viz, generative art, stylized/NPR, environment, still life/interior, night/sci-fi)
4. Palette and value rules
5. Camera and composition
6. Reference vocabulary

## 1. Questions worth asking

Ask only what changes the result, 2–4 at most, each with a proposed default so the user can just say "ok".
If the request or the project (`project-integration.md` §1) already answers them, don't ask: state the direction
you picked in one line and build. Never ask for something the codebase shows (palette, fonts, framework, placement).

| Ask about | Why it matters | Default if unknown |
|---|---|---|
| **Use**: hero section, standalone toy, product page, portfolio piece, internal demo? | layout (copy column?), perf budget, interaction depth | the slot the project shows; else standalone, full-bleed |
| **Mood / reference**: "Apple product page", "Townscaper", "Lusion", "museum still life", a URL or image | picks the preset below | the preset closest to the project's visual language, said out loud |
| **The hero object**: real product/model available? | real asset vs. procedural | the project's own model if it has one; else a CC0 model that fits (asset-sources.md) |
| **Brand**: palette, type | palette, overlay UI | the project's tokens and fonts; a neutral palette only when there is no project |
| **Interaction**: look only, orbit, play (tap/drag), scroll story? | controls, game feel, test states | gentle orbit/drag + idle motion |
| **Target**: phone-first? low-end laptops? | quality tiers, post, shadow size | desktop-first, mobile must still look good |

Good question format (one message, numbered, defaults in bold):
> 1. Mood: **soft studio like an Apple product page** / moody dark / playful toy?
> 2. Use your `public/models/product.glb` or a stylized procedural one? **your model**
> 3. Interaction: **drag to turn + color swatches** / scroll-driven story?

## 2. The look brief (write it into the code)

Values below are neutral placeholders — in a project, palette entries come from its tokens (`project-integration.md` §2).
```js
const LOOK = {
  preset: 'product-studio',
  palette: { bg: ['#e4e7ee', '#a9b1c2'], accent: '#c9452f', shadowTint: '#1d2433' },  // 60/30/10 ← project tokens
  light: { env: 'assets/studio_small_09_1k.hdr.b64.txt', envIntensity: 1.0, key: [-2.4, 4, 1.6], keyColor: 0xfff4e8, rim: [2.2, 1.8, -2.8] },
  camera: { fov: 26, elevationDeg: 11, fill: 0.74 },
  toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
  post: ['msaa'], motion: 'idle drift 0.12 rad/s, float ±0.018',
};
```

## 3. Genre presets

Numbers are starting points; the critique loop tunes them.

### Hero / landing (abstract or brand object)
- Composition: object in the right 55–60%, copy column left (`camera.setViewOffset` shift −12…−20% of width; on portrait shift up and put copy below). Near-square frames (artifact panel) → smaller fill.
- Camera: FOV 25–35, slight low angle (8–15°) for presence.
- Light: studio HDRI (Poly Haven `studio_small_09`, `brown_photostudio_02`) at 0.8–1.2 for reflections; key 2–3.5 at ~90° from the camera; rim 2–3 opposite. Canvas transparent over a CSS radial gradient that matches the palette.
- Tone mapping: Neutral when brand colors must match; AgX for softer filmic highlights.
- Motion: one orchestrated intro (rise + settle, 1.2 s, ease-out), then idle drift. Scroll-linked variants: `scroll-and-gsap.md`.
- Post: MSAA in the composer; optional bloom ≤ 0.3 only on emissive bits.

### Product shot / e-commerce
- Real model (GLB) + pedestal with a real bevel (lathe profile) or seamless sweep backdrop.
- Two-level grounding: contact shadow under the product + soft occlusion blob under the pedestal.
- Shadows: `PCFShadowMap`, `radius` 8–12, `shadow.intensity` 0.5–0.7 (the contact shadow carries the dark core).
- Turntable: rotate the product, not the camera (keeps the designed light/view relation); inertia on drag.
- Model: `examples/product-hero`.

### Configurator
- Same as product + variant switching (`KHR_materials_variants` or material swaps by mesh name).
- Hide the swap: spin/flip the product and swap at the fastest point; crossfade the backdrop (CSS custom props).
- Warm every variant up front (apply each once at load) → no hitch on click. Label swatches with real color names; `aria-pressed`.
- Keep node names: `fetch_asset.py --optimize` preserves them; plain `gltf-transform optimize` does not.

### Toy / casual game
- Long lens (FOV 18–25) from ~25–35° above = miniature/diorama. Or orthographic for puzzle games.
- Shapes: everything rounded (RoundedBoxGeometry, bevelled extrudes, lathe), chunky proportions, slight randomness in scale/rotation.
- Materials: flat pastel colors, roughness 0.75–0.9, `flatShading` only on rocks/props for contrast; vertex colors for strata.
- Light: hemisphere (sky/ground tinted) 1.2–1.6 + warm sun with soft shadows + warm rim. Neutral tone mapping.
- Game feel: damped-spring pop-ins, particles on every action, synthesized sound, counters that bump (`motion-and-interaction.md`).
- Model: `examples/toy-island`.

### Data visualization
- Clarity beats spectacle: orthographic or FOV ≤ 30, no DOF, no bloom unless it encodes something.
- Color encodes data (sequential/diverging palettes); background neutral; one accent for selection.
- Instanced bars/points (one draw call), hover picking via instanceId, HTML labels (CSS2DRenderer) for crisp text.
- Grounding still matters: a faint floor grid (fwidth AA) + soft AO makes 3D bars read.

### Generative art
- Constraint first: 1 form + 1 material idea + 2–3 colors. Seeded randomness (`mulberry32(seed)`), seed shown in the UI, "reroll".
- TSL noise/displacement on dense geometry, iridescence/sheen/transmission for richness; or particles via compute (`webgpu-tsl.md`, `particles.md`).
- Dark backgrounds + bloom only with a threshold that keeps the form readable. Add grain (film node) to kill banding.

### Stylized / NPR (toon, ink, cel)
- `MeshToonMaterial` + `gradientMap` (3–4 bands, NearestFilter: `toonRamp()` in procedural.js) + outline (inverted-hull mesh or OutlinePass/Sobel).
- Rim via fresnel in TSL/`onBeforeCompile`; shadows as hard bands. Limited palette, hand-picked shadow color (never darker grey).
- Halftone/pixel/retro: `webgl_postprocessing_rgb_halftone`, `webgpu_postprocessing_pixel/retro`, `webgpu_tsl_halftone`.

### Environment / landscape
- Atmospheric perspective is the whole game: fog color = horizon color = sky bottom (`Sky` addon or HDRI).
- Low sun (5–20°), long shadows, warm key vs. cool sky fill. FOV 40–55. Scale cues (trees, rocks, people) for size.
- Terrain from fBm, vertex colors by height/slope; instanced vegetation with wind in the vertex stage.

### Still life / interior
- Window light: directional sun + an invisible "gobo" blocker with pane holes (`colorWrite:false` still casts shadows) → mullion shadows on wall and table.
- Warm sun / cool hemisphere fill. Odd number of objects, varied heights, overlapping silhouettes. AO + slight DOF + grain.
- Model: `examples/tsl-still-life` (zero textures).

### Night / neon / sci-fi
- Dark but not black (#0b0d12…#14161b); emissive accents with bloom (threshold 0.8–0.9, strength 0.3–0.8).
- Wet floor: low roughness + roughness variation map → streaky reflections (SSR on WebGPU or a Reflector with blur).
- Volumetric feel: fog + light shafts (godrays nodes), haze planes with additive soft particles.

## 4. Palette and value rules
- **Values first**: squint test — hero clearly lighter or darker than its background; 3 value groups (light/mid/dark).
- **60/30/10**: dominant neutral, secondary, accent. Pick neutrals with a hue bias toward the accent, never pure mid-grey.
- **Warm/cool split**: warm key + cool fill (or the reverse for night). This alone removes the "CG" look.
- Shadows take the ground's hue (`ShadowMaterial` color, contact shadow `color`), never pure black.
- Tone mapping shifts colors: under AgX/ACES saturated brand colors drift. Need exact colors → Neutral, or check swatches in the screenshot.

## 5. Camera and composition
- Focal length = mood: 18–30° FOV product/hero/diorama, 35–50° environments, 60–75° only for first-person.
- Never dead-center by default: rule of thirds or the copy-column offset. Leave breathing room (hero fills 55–75% of the limiting dimension).
- Slight low angle = heroic; high angle = toy/overview. Elevation 0° looks like a technical drawing.
- Frame for three aspects: wide desktop, near-square artifact panel, phone portrait. Use the bounding sphere + aspect to compute distance; `setViewOffset` to shift.
- Depth layers: foreground element (out of focus), subject, background. Even a gradient backdrop + floor shadow counts.

## 6. Reference vocabulary (useful when asking or briefing)
softbox, rim light, kicker, bounce card, seamless sweep, contact shadow, ambient occlusion, terminator (light→shadow edge),
specular highlight, fresnel, subsurface, roughness breakup, gobo, atmospheric perspective, chiaroscuro, high-key / low-key,
golden hour, rack focus, turntable, diorama, tilt-shift, cel shading, ink outline, halftone.
