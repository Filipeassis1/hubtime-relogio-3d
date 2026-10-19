# Asset sources (what to fetch, and how)

Catalog checked in Oct 2026 (links rot — if one 404s, search the source's index). The project's own assets always
come first. In a codebase: `fetch_asset.py … --raw --out <static folder>` or load directly (Poly Haven sends CORS `*`).
Inside a claude.ai artifact the browser can't reach these hosts: fetch in the shell and publish as supporting files
(`assets-in-artifacts.md`). Check every license; CC-BY needs a visible credit.

## Contents
1. Quick picks by need
2. three.js repo (models, textures, HDRIs, LUTs, fonts)
3. Khronos glTF-Sample-Assets
4. Poly Haven, ambientCG
5. @pmndrs/assets and drei-assets
6. Other catalogs (CC0 models, textures, characters, AI 3D)

## 1. Quick picks
| Need | Pick | Command |
|---|---|---|
| Sneaker / configurator | Khronos `MaterialsVariantsShoe` (CC-BY Shopify, 3 variants) | `fetch_asset.py khronos MaterialsVariantsShoe --optimize` |
| Watch / luxury | Khronos `ChronographWatch`, three `models/gltf/rolex.glb` | `… khronos ChronographWatch --optimize` |
| Furniture | Khronos `SheenChair`, `GlamVelvetSofa`; three `SheenChair.glb` | |
| Camera / gadget | Khronos `AntiqueCamera` (17 MB → optimize!), three `steampunk_camera.glb`, `BoomBox` | |
| Car | three `ferrari.glb` (+ `webgl_materials_car`), Khronos `CarConcept`, `ToyCar` | |
| Glass / transmission | Khronos `DragonAttenuation`, `GlassVaseFlowers`, `IridescentDishWithOlives` | |
| Hero sci-fi | `DamagedHelmet`, `SciFiHelmet` (glTF only) | |
| Animated character | three `models/gltf/Soldier.glb`, `Xbot.glb`, `Michelle.glb`, `RobotExpressive/RobotExpressive.glb` (emotes), Khronos `Fox`, `CesiumMan` | |
| Low-poly animals | three `Horse.glb`, `Flamingo.glb`, `Parrot.glb`, `Stork.glb` (morph targets) | |
| Whole scene | three `LittlestTokyo.glb` (animated), `dungeon_warkarma.glb`, `space_ship_hallway.glb`, `bath_day.glb` | |
| Props for still life | Poly Haven models: `ceramic_vase_01`… (search API `?t=models`) | `fetch_asset.py polyhaven <id> --optimize` |
| Studio HDRI | Poly Haven `studio_small_09`, `brown_photostudio_02`, `photo_studio_loft_hall` | `fetch_asset.py polyhaven studio_small_09` |
| Outdoor HDRI | `kloofendal_48d_partly_cloudy`, `venice_sunset`, `royal_esplanade`, `spruit_sunrise` | |
| Small real HDR | three `textures/equirectangular/royal_esplanade_2k.hdr.jpg` (UltraHDR, 550 KB) | `fetch_asset.py three textures/equirectangular/royal_esplanade_2k.hdr.jpg` |
| Wood / stone / fabric PBR | Poly Haven textures (`rosewood_veneer1`, …), ambientCG (`Wood049`, `Marble012`, `Fabric062`…) | `fetch_asset.py polyhaven <id> --maps diff,nor_gl,arm` |
| Zero-file IBL / matcap / normal | `@pmndrs/assets` | `loadEnvironment(…,'pmndrs:city')`, `pmndrsTexture(…)` |

Always read the license note the script prints; CC-BY needs a visible credit line (see `examples/product-hero`).

## 2. three.js repo via jsDelivr GH (`https://cdn.jsdelivr.net/gh/mrdoob/three.js@r186/examples/<path>`; `fetch_asset.py three <path>`)
**Models** (`models/gltf/<Name>.glb`, a few in subfolders: `RobotExpressive/RobotExpressive.glb`, `LeePerrySmith/LeePerrySmith.glb`, `Nefertiti/Nefertiti.glb`, `Flower/Flower.glb`, `AVIFTest/forest_house.glb`): AVIFTest/forest_house, AnisotropyBarnLamp, BoomBox, CarbonFrameBike, ClearcoatTest, DiffuseRoughnessParameterSweep, DispersionTest, DragonAttenuation, Flamingo, Flower, Horse, IridescenceLamp, IridescentDishWithOlives, LeePerrySmith, LittlestTokyo, Michelle, Nefertiti, Parrot, PrimaryIonDrive, RobotExpressive, ShaderBall, ShaderBall2, ShadowmappableMesh, SheenChair, Soldier, Stork, Xbot, bath_day, coffeeMug, coffeemat, collision-world, duck, dungeon_warkarma, facecap (face morphs), ferrari, gears, godrays_demo, kira, nemetona, pool, readyplayer.me, rolex, space_ship_hallway, steampunk_camera, tennyson-bust, venice_mask.
**HDR/EXR** (`textures/equirectangular/`): 752-hdri-skies-com_1k.hdr, blouberg_sunrise_2_1k.hdr, ferndale_studio_04_1k.hdr, monochrome_studio_02_1k.hdr, moonless_golf_1k.hdr, pedestrian_overpass_1k.hdr, quarry_01_1k.hdr, san_giuseppe_bridge_2k.hdr, spruit_sunrise_1k.hdr, venice_sunset_1k.hdr; **UltraHDR jpg**: moonless_golf_2k.hdr.jpg, royal_esplanade_2k.hdr.jpg, spruit_sunrise_2k.hdr.jpg/4k.
**Textures**: brick_{diffuse,bump,roughness}, hardwood2_{diffuse,bump,roughness}, carbon/Carbon(+_Normal), ambientcg/Ice002_1K-*, floors/FloorsCheckerboard_S_*, pbr/Scratched_gold_01_1K_Normal, planets/earth_* (day/night/clouds/normal/specular 2–4K), moon_1024, water/Water_1_M_{Flow,Normal}, waternormals, lava/*, terrain/grasslight-big, noise/perlin/voronoi PNGs, lensflare/*, sprites/* (spark, snowflakes, disc, circle), decal/*, matcaps/matcap-porcelain-white, gradientMaps/{threeTone,fiveTone}, uv_grid_opengl.
**Cubemaps** (`textures/cube/<name>/p[xyz]/n[xyz].jpg`): Bridge2, MilkyWay, Park2, Park3Med, SwedishRoyalCastle, pisa(HDR).
**LUTs** (`luts/`): Bourbon 64.CUBE, Chemical 168.CUBE, Clayton 33.CUBE, Cubicle 99.CUBE, Remy 24.CUBE, Presetpro-Cinematic.3dl, NeutralLUT/NightLUT/B&WLUT.png.
**Fonts** (`fonts/`): helvetiker/optimer/gentilis/droid `*.typeface.json`, MPLUSRounded1c.

## 3. Khronos glTF-Sample-Assets (`fetch_asset.py khronos <Name>`; license per model, see its README)
Scene/product: ABeautifulGame, AnimatedMorphCube, AnisotropyBarnLamp, AntiqueCamera, Avocado, BarramundiFish, BoomBox, BrainStem, CarConcept, CarbonFibre, CesiumMan, CesiumMilkTruck, ChairDamaskPurplegold, ChronographWatch, ClearCoatCarPaint, ClearcoatWicker, CommercialRefrigerator, Corset, DamagedHelmet, DiffuseTransmissionPlant, DiffuseTransmissionTeacup, DragonAttenuation, DragonDispersion, Duck, Fox, GlamVelvetSofa, GlassBrokenWindow, GlassHurricaneCandleHolder, GlassVaseFlowers, IridescenceAbalone, IridescenceLamp, IridescentDishWithOlives, Lantern, MaterialsVariantsShoe, MosquitoInAmber, PotOfCoals, ScatteringSkull, SheenChair, SpecularSilkPouf, SunglassesKhronos, ToyCar, TrafficCone, USDShaderBallForGltf, VirtualCity, WaterBottle.
Material references: CompareRoughness/Metallic/Transmission/Sheen/Iridescence/Clearcoat, MetalRoughSpheres, SheenTestGrid.
Index: `…/glTF-Sample-Assets@main/Models/model-index.json`.

## 4. Poly Haven (CC0) and ambientCG (CC0)
- Poly Haven API: `https://api.polyhaven.com/assets?t=hdris|textures|models&c=<category>` (list), `/info/<id>`, `/files/<id>`. `fetch_asset.py polyhaven <id>` auto-detects the type. HDRI 1k ≈ 1.6 MB; textures 1k jpg ≈ 0.3–1 MB each; models are glTF + jpgs.
- ambientCG API: `https://ambientcg.com/api/v2/full_json?type=Material&q=<query>`; zips `<Id>_1K-JPG.zip` with Color, NormalGL, Roughness, AmbientOcclusion, Displacement. `fetch_asset.py ambientcg <Id>`.

## 5. pmndrs
- **@pmndrs/assets 1.7.0** (npm; each file is an ES module exporting a `data:` URL — importable in artifacts, decode don't fetch):
  `hdri/{apartment,bridge,city,dawn,esplanade,forest,hall,lab,lobby,night,park,sky,studio,sunrise,sunset,venice,warehouse,workshop}.exr.js` (130–410 KB, low-res IBL),
  `matcaps/0000…0283.webp.js`, `normals/0000…0028.webp.js`, `models/{bunny,suzi,pmndrs}.glb.js`, `textures/cloud.webp.js`, `fonts/` (Inter json/woff).
- **drei-assets** (GitHub, `https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/<path>`; fetch in the shell with `fetch_asset.py url`):
  `hdri/*_1k.hdr` (drei Environment presets: adams_place_bridge, dikhololo_night, empty_warehouse_01, forest_slope, immenstadter_horn, kiara_1_dawn, lebombo, potsdamer_platz, rooitou_park, st_fagans_interior, studio_small_03, venice_sunset), `lut/*.png`, `normals/*_norm.jpg`, `prototype/{dark,green,light,orange,purple,red}/texture_01..13.png` (Kenney-style grid textures for game blockouts), `cloud.png`.

## 6. Other catalogs
| Type | Sources |
|---|---|
| CC0 / low-poly models | Kenney (kenney.nl), Quaternius, Poly Pizza (license per model, many CC-BY), Smithsonian 3D (CC0), NASA 3D Resources |
| Paid / mixed | Sketchfab (per model), Fab, CGTrader, TurboSquid, BlenderKit, market.pmnd.rs |
| Textures | Poly Haven, ambientCG, cgbookcase, ShareTextures, 3dtextures.me, FreePBR, Freestylized, Poliigon (paid), physicallybased.info (measured PBR values) |
| Matcaps | nidorx/matcaps (600+), emmelleppi/matcaps |
| Characters / animation | Mixamo, Ready Player Me, AccuRIG, Mesh2Motion, DeepMotion, Cascadeur |
| AI 3D (generate a GLB, then `fetch_asset.py pack`) | Meshy, Tripo, Rodin (Hyper3D), Sam3D, 3D AI Studio; Higgsfield `generate_3d` if that connector is available |
| Generators | EZ-Tree (procedural trees), Three Scatter, Procedural Terrains |
Kenney/Quaternius packs download as zips from their sites; unzip in the shell, `fetch_asset.py pack <file.glb> --optimize`.
