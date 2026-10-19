# Lighting

## Contents
1. The base rig (IBL + key + rim)
2. Environment options
3. Shadows (r186 specifics)
4. Grounding helpers
5. Recipes by mood
6. Physical / special lights

## 1. The base rig
- **IBL** (`scene.environment`) does soft fill + reflections. Without it metals are black and everything is plastic.
- **Key**: one shadow-casting `DirectionalLight`, high and ~90° from the camera azimuth. A key near the camera direction flattens form.
- **Rim/kicker**: second directional from behind on the opposite side, often cooler; separates the silhouette.
- **Fill**: `HemisphereLight(sky, ground)` tinted (cool sky / warm bounce) instead of `AmbientLight`.
- Balance: with a key present keep `scene.environmentIntensity` ≈ 0.2–0.5 (RoomEnvironment) or ≈ 1 for a real studio HDRI used mainly for reflections.
- Place lights relative to the camera, then rotate the subject (turntable) instead of orbiting the camera — the look you designed survives interaction.

```js
const key = new THREE.DirectionalLight(0xfff1e0, 3.2); key.position.set(-3, 4.2, 1.2);   // camera at +x/+z
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 15 });
key.shadow.normalBias = 0.02; key.shadow.radius = 6;
const rim = new THREE.DirectionalLight(0xdfe8ff, 3.0); rim.position.set(2.5, 2.2, -3.5);
scene.add(key, rim, new THREE.HemisphereLight('#cfe0ff', '#d9c2a8', 0.6));
```

## 2. Environment options (artifact-safe loaders in `assets/asset-loader.js`)
| Source | Look | Notes |
|---|---|---|
| `RoomEnvironment` (`'room'`) | neutral studio box | free; reflections show blocky panels at low roughness — fine for satin, weak for chrome |
| Poly Haven studio HDRI (`studio_small_09`, `brown_photostudio_02`, `photo_studio_loft_hall`) | real softboxes | best for products; 1k is enough for IBL; rotate (`environmentRotation.y`) to place the softbox streak |
| Poly Haven outdoor (`kloofendal_48d_partly_cloudy`, `venice_sunset`, `royal_esplanade`) | sky + sun | use as background + IBL; add a directional matching the sun for shadows |
| UltraHDR `.hdr.jpg` | real HDR, small | three examples ship `royal_esplanade_2k.hdr.jpg`, `spruit_sunrise_2k.hdr.jpg`, `moonless_golf_2k.hdr.jpg` |
| `@pmndrs/assets` (`'pmndrs:studio'`, `city`, `sunset`, …) | low-res IBL | zero files; never as a sharp background |
| `GroundedSkybox(envMap, height, radius)` | HDRI with a projected floor | product on location; three/addons/objects/GroundedSkybox.js |
| `ColorEnvironment(color)` | uniform | stylized scenes that still want IBL |

Background ≠ environment: keep `scene.background` as CSS (transparent canvas) or a blurred HDRI (`backgroundBlurriness` 0.3–0.6, `backgroundIntensity` < 1).

## 3. Shadows (r186)
- `PCFSoftShadowMap` was **removed** in r186 (warns and falls back). Use `PCFShadowMap` — it now samples a Vogel disk and honors `shadow.radius` (soft).
- `light.shadow.intensity` (0–1) lightens a shadow without dimming the light.
- `VSMShadowMap` gives very soft blur (`radius`, `blurSamples`) but can bleed; good for large soft scenes.
- The #1 cause of missing or blurry shadows is the shadow camera frustum: fit it tightly around the subject.
- Acne → raise `normalBias` (0.01–0.04) first; `bias` (−0.0001…−0.0005) second. Too much = peter-panning.
- Only the hero casts; large static receivers only receive. One shadow-casting light on mobile.

## 4. Grounding helpers
- **Contact shadow** (`assets/contact-shadows.js`): depth-from-below + blur; dark core where objects touch. `update()` each frame for moving objects.
- **ShadowMaterial catcher**: invisible floor that only shows shadows; tint it (`color` = shadow hue) and keep `opacity` 0.15–0.3.
- **Occlusion blob**: radial-gradient plane (`radialTexture`) under platforms or characters — cheap and very effective.
- **AO**: GTAO/N8AO (WebGL) or `ao()`/`ssao()` nodes + `builtinAOContext` (WebGPU). Baked AO in glTF `occlusionTexture` uses `aoMap`.

## 5. Recipes by mood
| Mood | Rig |
|---|---|
| Soft studio product | studio HDRI 1.0 (rotated), key 2–3 at side/high, rim 2–3, contact shadow, Neutral |
| Window light interior | low warm sun 4–6 + gobo blocker with pane holes, cool hemisphere 0.8–1, Room env 0.2, AgX |
| Toy / diorama | hemisphere 1.3–1.6 (sky #cfe6ff, ground #e8b48f), warm sun 2.5 soft shadows, warm rim 1.2, Neutral |
| Golden hour exterior | sun 5–15° elevation, color #ffb070, sky HDRI or `Sky` addon, fog = horizon color, AgX |
| Night neon | almost no IBL (0.05–0.1), colored point/rect lights, emissive + bloom, wet floor |
| Moody museum | single spot (`penumbra` 0.6–1, `decay` 2), dark falloff, subtle rim, AO strong |

## 6. Physical / special lights
- `RectAreaLight` = softbox look (Standard/Physical only, no shadows); WebGL needs `RectAreaLightUniformsLib.init()`.
- `SpotLight` with `map` = projected gobo texture (alternative to the blocker trick).
- `IESLoader` + `IESSpotLight` (WebGPU) for real fixture profiles.
- `SunLight` addon (new in r186): direction from position, cascaded shadows for large scenes (WebGPU: register `SunLightNode`).
- Light probes (`LightProbeGenerator`, `webgl_lightprobes_*`) for baked GI in static interiors.
