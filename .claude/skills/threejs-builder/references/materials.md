# Materials

## Contents
1. Which material class
2. Measured-ish PBR values
3. Physical features (clearcoat, sheen, transmission, iridescence, anisotropy, dispersion)
4. Imperfection: the difference between CG and photo
5. Texture sets and color spaces
6. Stylized materials

## 1. Which material class
| Need | Use |
|---|---|
| Almost everything lit | `MeshStandardMaterial` (WebGPU: `MeshStandardNodeMaterial`) |
| Car paint, lacquer, glass, fabric, gems, soap | `MeshPhysicalMaterial` (`MeshPhysicalNodeMaterial`) |
| Toon / cel | `MeshToonMaterial` + `gradientMap` |
| Fast stylized "baked light" look | `MeshMatcapMaterial` (`pmndrsTexture(THREE,'matcaps',id)`) |
| Unlit UI-in-3D, decals, glows | `MeshBasicMaterial` (`transparent`, `depthWrite:false`, `toneMapped:false` for exact colors) |
| Shadows only | `ShadowMaterial` / `ShadowNodeMaterial` |
`MeshLambertMaterial`/`MeshPhongMaterial` are legacy: no IBL-correct reflections.

## 2. Values that look right (sRGB base colors; tune by eye)
| Material | color | metalness | roughness | extras |
|---|---|---|---|---|
| Gold | #f5c86b–#d8b56a | 1 | 0.15–0.35 | patina in crevices |
| Brass (aged) | #c9a35a | 1 | 0.25–0.4 | hammered: worley bump |
| Aluminium brushed | #d6d8db | 1 | 0.3–0.45 | `anisotropy` 0.6–0.9 + tangents |
| Chrome | #f0f0f0 | 1 | 0.02–0.08 | needs a good HDRI |
| Plastic glossy | any | 0 | 0.2–0.35 | `clearcoat` 0.2 |
| Plastic matte / rubber | any | 0 | 0.6–0.8 | |
| Ceramic glaze | any | 0 | 0.1–0.2 | `clearcoat` 0.5–1, clearcoatRoughness 0.1 |
| Raw clay / terracotta | #b07a55–#c2906a | 0 | 0.8–0.9 | grain bump |
| Marble polished | #efece6 | 0 | 0.06–0.15 | veins slightly rougher; clearcoat 0.5 |
| Wood oiled | — | 0 | 0.45–0.6 | `WoodNodeMaterial` (WebGPU) or PBR set |
| Fabric / velvet | any | 0 | 0.8–1 | `sheen` 1, `sheenColor` lighter, `sheenRoughness` 0.3–0.6 |
| Skin (stylized) | #e8b49a | 0 | 0.5 | `sheen` 0.2; SSS on WebGPU (`webgpu_materials_sss`) |
| Glass | #ffffff | 0 | 0–0.05 | `transmission` 1, `thickness` 0.2–1, `ior` 1.5 |
| Frosted glass | #ffffff | 0 | 0.3–0.5 | `transmission` 1 |
| Car paint | any | 0.4–0.9 | 0.3–0.5 | `clearcoat` 1, `clearcoatRoughness` 0.03 |
Reference values per real material: physicallybased.info.

## 3. Physical features worth knowing
- `clearcoat` + `clearcoatRoughness`: second specular lobe (lacquer, glaze, car paint). Cheap win.
- `sheen`, `sheenColor`, `sheenRoughness`: fabric rim glow.
- `transmission`, `thickness`, `attenuationColor/Distance`, `ior`: real glass/liquid (renders the scene behind; costly on mobile).
- `iridescence`, `iridescenceIOR`, `iridescenceThicknessRange`: soap, oil, beetles.
- `anisotropy`, `anisotropyRotation`: brushed metal, hair, satin (needs tangents: `geometry.computeTangents()` on indexed geo with uv).
- `dispersion`: rainbow fringes in glass/gems.
- `specularIntensity`/`specularColor`: tame plastic-y highlights on dielectrics.
glTF models carry these through `KHR_materials_*` — no code needed.

## 4. Imperfection (most important section)
Real surfaces vary. Uniform values are the strongest CG tell.
- **Roughness breakup**: `roughness: 1` + `roughnessMap` from `fbmTexture({ min: .3, max: .6 })` (canvas) or TSL noise. Smudges, fingerprints, wear.
- **Color mottling**: `mottleTexture(THREE, base, { amount: .06–.1 })` or TSL `mix(c1, c2, noise)`. ±3–8% lightness is enough.
- **Micro normal**: bump from fine noise (`bumpMap` canvas, or `bumpNormal(height)` in TSL for position-based noise).
- **Edge wear**: lighter/rougher on convex edges (curvature from a baked map, or fresnel/normal tricks in TSL).
- **Per-instance variation**: `color.offsetHSL(±0.01, ±0.05, ±0.04)`, random scale 0.85–1.15, random yaw.
- **Dirt in crevices**: AO-driven darkening (glTF AO, or worley distance in procedural metal).

## 5. Texture sets and color spaces
| File suffix | Slot | Color space |
|---|---|---|
| diff / Color / albedo / baseColor | `map` | `SRGBColorSpace` |
| nor_gl / NormalGL (DX → `normalScale.y = -1`) | `normalMap` | linear |
| rough / Roughness | `roughnessMap` | linear |
| arm (R=AO, G=Rough, B=Metal) | `aoMap` + `roughnessMap` + `metalnessMap` (same texture) | linear |
| disp / Displacement | `displacementMap` (dense mesh) or `bumpMap` | linear |
| emissive | `emissiveMap` | sRGB |
- `wrapS = wrapT = RepeatWrapping`, `repeat.set(n, n)`, `anisotropy = renderer.capabilities.getMaxAnisotropy()` on floors.
- `aoMap` uses `uv` (r152+). 1–2K textures; 4K only for full-screen close-ups.
- `loadPBR(THREE, 'assets/rosewood_veneer1/', { map: '..._diff_1k.jpg', normalMap: '..._nor_gl_1k.jpg', arm: '..._arm_1k.jpg' }, { repeat: 2 })`.

## 6. Stylized
- Toon: `MeshToonMaterial({ color, gradientMap: toonRamp(THREE, [.3, .65, 1]) })`; outline with an inverted-hull copy (`side: BackSide`, scaled 1.02, black or darker hue) or OutlinePass.
- Clay/pastel (toy): Standard, roughness 0.8–0.9, saturated-but-light colors, `flatShading` on rocks only.
- Matcap: fastest "lit" look with zero lights; matcaps 0000–0283 in `@pmndrs/assets`. No shadows, no environment interplay.
- Gradient/holographic: TSL `mix(c1, c2, normalView.y)` + fresnel `pow(1 - dot(N, V), 3)` into emissive.
