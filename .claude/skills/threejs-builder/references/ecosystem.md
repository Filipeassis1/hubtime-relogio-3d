# Ecosystem: versions, libraries, official examples

## three.js r186.1 facts (checked Oct 2026)
In a project, use its installed version and translate with this table; for new pages run `npm view three version`.
| Old | Current |
|---|---|
| `THREE.Clock` | deprecated (r183) → `THREE.Timer` + `timer.connect(document)`, `timer.update()`, `getDelta()` |
| `RGBELoader` | `HDRLoader` (old name still exported) |
| `PCFSoftShadowMap` | **removed in r186** (warns, falls back) → `PCFShadowMap` + `shadow.radius` |
| `PostProcessing` (WebGPU) | `THREE.RenderPipeline` (alias kept) |
| `SMAAPass(w, h)` | `SMAAPass()` / `FXAAPass()` take no args |
| Tone mapping | `AgXToneMapping`, `NeutralToneMapping`, `ACESFilmicToneMapping`, `Reinhard`, `Cineon`, `Custom` |
| Shadows | `light.shadow.intensity` (0–1) |
| New addons | `SunLight` (+ SunLightNode/SunLightShadow), `LoftGeometry`, `GroundedSkybox`, `UltraHDRLoader`, Gaussian splat loaders (`GaussianSplatPLYLoader`, `SPZLoader`, …), `MaterialXLoader`, `WoodNodeMaterial`, `Inspector` |
Builds: `three.module.js`, `three.core.js`, `three.webgpu.js`, `three.webgpu.nodes.js`, `three.tsl.js`.

## Libraries (npm versions Oct 2026 — a project's lockfile wins; "Artifact" = loads from cdn.jsdelivr.net/npm under the claude.ai artifact CSP)
| Library | Version | Artifact | Notes |
|---|---|---|---|
| postprocessing (pmndrs) | 6.39.5 | ✅ | `build/index.js`; importmap `postprocessing` |
| n8ao | 2.0.1 | ✅ | `dist/N8AO.js`; needs importmap `three/examples/jsm/` |
| gsap (+ScrollTrigger) | 3.15.0 | ✅ | `dist/gsap.min.js`, `dist/ScrollTrigger.min.js` (globals) or `+esm` |
| lenis | 1.3.26 | ✅ | `dist/lenis.min.js` (global `Lenis`) |
| @dimforge/rapier3d-compat | 0.21.0 | ✅ | `dist/rapier.mjs`, `await RAPIER.init()` |
| cannon-es | 0.20.0 | ✅ | `dist/cannon-es.js` |
| troika-three-text | 0.52.5 | ⚠️ | `+esm` works but bundles its own three; for production map its deps in the importmap |
| three-mesh-bvh | 0.9.15 | ⚠️ (+esm) | same duplicate-three caveat |
| camera-controls | 3.1.2 | ⚠️ (+esm) | |
| lil-gui / tweakpane | 0.21.0 / 4.0.5 | ✅ | three ships `three/addons/libs/lil-gui.module.min.js` |
| three-bvh-csg | 0.0.18 | local | booleans |
| three-custom-shader-material | 6.4.0 | local | extend PBR materials with GLSL |
| three-gpu-pathtracer | 0.0.26 | local | progressive path tracing (product stills) |
| @takram/three-atmosphere / -clouds | 0.19.1 / 0.7.6 | local | physical sky & volumetric clouds |
| @theatre/core | 0.7.2 | local | visual timeline |
| maath | 0.10.8 | local | easing/damping/random helpers |
| @gltf-transform/cli | 4.5.1 | shell | used by `fetch_asset.py --optimize` |
| gltfjsx | 6.5.3 | shell | GLB → R3F component |
R3F stack versions: `r3f.md`.

## Official examples worth reading before inventing (`https://threejs.org/examples/#<name>`, source `github.com/mrdoob/three.js/blob/r186/examples/<name>.html`)
- **Product/realism**: webgl_materials_car, webgl_loader_gltf_{transmission,iridescence,sheen,anisotropy,dispersion,variants}, webgl_materials_physical_clearcoat, webgl_materials_envmaps_groundprojected, webgl_shadow_contact, webgpu_backdrop, webgpu_reflection_roughness, webgpu_materials_sss, webgl_lights_rectarealight
- **Lighting/GI**: webgl_lightprobes_*, webgpu_vxgi(_sponza), webgpu_postprocessing_ssgi, webgl_shadowmap_{pcss,csm,progressive}, webgpu_lights_ies_spotlight, webgpu_volume_lighting
- **Post**: webgl_postprocessing_{unreal_bloom(_selective),3dlut,gtao,smaa,taa,dof2,outline}, webgpu_postprocessing_{bloom_emissive,ao,ssr,anamorphic,lensflare,motion_blur,traa,ca,retro}
- **Procedural/TSL**: webgpu_tsl_wood, webgpu_tsl_procedural_terrain, webgpu_tsl_raging_sea, webgpu_tsl_earth, webgpu_tsl_galaxy, webgpu_tsl_vfx_{flames,tornado,linkedparticles}, webgpu_materialx_noise, webgpu_procedural_texture, webgpu_tsl_halftone
- **Environment**: webgpu_sky, webgl_shaders_sky, webgpu_ocean, webgpu_water, webgl_shaders_ocean, webgpu_volume_cloud, webgpu_fog_height, webgpu_custom_fog_scattering
- **Particles/compute**: webgpu_compute_particles(_rain/_snow/_fluid), webgpu_tsl_compute_attractors_particles, webgpu_compute_birds, webgpu_compute_cloth, webgl_gpgpu_birds, webgpu_particles_soft
- **Generation**: webgpu_generator_city, webgpu_generator_building, webgl_geometry_terrain, webgl_marchingcubes, webgl_geometry_csg
- **Interaction/games**: games_fps, physics_rapier_{character_controller,vehicle_controller,instancing,joints}, webgl_animation_walk, webgl_decals, misc_controls_*
- **New formats**: webgpu_gaussian_splat, webgl_loader_3dtiles, webgpu_loader_materialx
Counts in r186: 219 webgl, 26 webgl/postprocessing, 48 webgl/advanced, 234 webgpu, 13 physics.

## Tools & learning
- Inspect: three.js DevTools (Chrome), Spector.js, Needle Inspector, `renderer.inspector` (WebGPU).
- Showcase/reference: bruno-simon.com, lusion.co, Active Theory, Awwwards WebGL, threejs.org showcase, threejsresources.com/showcase, Codrops.
- Learn: Three.js Journey (Bruno Simon), SimonDev, Wawa Sensei (R3F/configurators), Akella (creative shaders), Nik Lever, the TSL tour (threejs.org/tsl), The Book of Shaders.
- Non-obvious from threejsresources guides: shadow camera frustum is the #1 shadow bug; HemisphereLight > AmbientLight; normal maps are the biggest visual win per cost; fog must match the horizon; globe math `phi = (90 − lat)`, `theta = (lng + 180)`; gallery = camera moves, not images.
