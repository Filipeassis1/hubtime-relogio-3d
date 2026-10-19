# Modeling — shapes that don't look boxy

Hard 90° edges and raw primitives are the second-biggest "CG" tell after lighting. Real objects have bevels that
catch a highlight line, tapering, and asymmetry.

## Contents
1. Cheap ways to get good silhouettes
2. Custom geometry patterns
3. Deforming meshes in the vertex shader (onBeforeCompile, Jacobian normals)
4. Refined procedural (catalog quality without model files)
5. Using real models (glTF pipeline)

## 1. Good silhouettes cheaply
| Want | Use |
|---|---|
| Box / slab / device | `RoundedBoxGeometry(w, h, d, segments 4–6, radius)` (three/addons/geometries) |
| Any flat outline with thickness (logo, island, roof, key) | `ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness, bevelSize, bevelSegments: 3–4 })` |
| Anything turned (vase, bottle, bowl, pedestal, tree canopy, chess piece) | `LatheGeometry(new SplineCurve(points).getPoints(N), radialSegments)` — profile with a bevel at every corner |
| Tubes, cables, tentacles, handles | `TubeGeometry(new CatmullRomCurve3(pts), segs, r, radial)` |
| Blobs, rocks | `IcosahedronGeometry(1, 1–4)` → `mergeVertices` → displace by noise → `computeVertexNormals()`; `flatShading` for faceted rocks |
| Smooth metaballs / organic fusion | `MarchingCubes` addon, or SDF raymarch (TSL `Raymarching` utils) |
| Booleans (holes, cuts) | `three-bvh-csg` (local projects; ESM from jsdelivr works in artifacts) |
| Lofted surfaces | `LoftGeometry` (new in r186 addons) or a ring loft (below) |
| Text | `TextGeometry` with `bevelEnabled` + typeface JSON; or troika-three-text (SDF, crisp, not extruded) |
| Many repeats | `InstancedMesh` with per-instance scale/rotation/color jitter |

Bevel rule of thumb: radius ≈ 2–5% of the object's size. Bevel segments 3–4 is enough to catch light.

### Bevelled lathe profile
```js
const H = 0.12, R = 0.74, B = 0.03, prof = [[0, 0], [R - 0.02, 0], [R, 0.02], [R, H - B]];
for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; prof.push([R - B + Math.cos(a) * B, H - B + Math.sin(a) * B]); }
prof.push([0, H]);
const pedestal = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 128);
```

## 2. Custom geometry patterns
- **Ring loft** from one outline (used for the island underside): for ring j, scale the outline by `f(t)`, offset y, jitter with noise; index quads `(a, b, a+1), (b, b+1, a+1)`. Build every stacked part from the **same** outline or seams leak.
- **Parametric surface with UVs** (`f(t,p) → xyz`): ellipsoids, blobs, terrain, vases.
```js
function paramGeometry(nt, np, P, Nrm) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= nt; i++) for (let j = 0; j <= np; j++) {
    const t = Math.PI * i / nt, p = 2 * Math.PI * j / np, v = P(t, p), n = Nrm(v);
    pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); uv.push(j / np, 1 - i / nt);
  }
  const w = np + 1;
  for (let i = 0; i < nt; i++) for (let j = 0; j < np; j++) { const a = i * w + j, b = (i + 1) * w + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}
```
- **Object wrapped around a surface** (band, belt, road): walk a ring on the surface, per-sample frame (tangent by finite difference, normal from the surface, side = tangent × normal), extrude a rounded cross-section with a small lift.
- **Fix winding**: compare each face normal with the vertex normal (or centroid direction) and swap indices if negative.
- **Multi-material**: `g.addGroup(start, count, matIndex)` + `new Mesh(g, [matA, matB])`.
- **Vertex colors** for strata/gradients/baked AO: darken lower vertices, lerp colors by height → free "painted" look.
- **Bake pose** before handing a piece to physics: `g.applyMatrix4(mesh.matrixWorld)`, recenter, compute radius.

## 3. Deforming in the vertex shader (keep PBR, shadows, fog)
One shared uniforms object drives every material; normals stay correct for ANY deformation via a finite-difference Jacobian.
```js
const DU = { uPinch: { value: 0 }, uSquash: { value: 0 }, uWob: { value: 0 }, uTime: { value: 0 } };
const DEFORM_GLSL = /* glsl */`
uniform float uPinch; uniform float uSquash; uniform float uWob; uniform float uTime;
vec3 deformP(vec3 p){
  float waist = exp(-(p.x*p.x)/0.21);
  float s = 1.0 - uPinch*waist + uWob*sin(uTime*21.0 + p.x*2.6);
  vec3 q = vec3(p.x, p.y*s, p.z*s);
  q.y *= 1.0 - uSquash; q.xz *= 1.0 + uSquash*0.45;      // volume-preserving squash
  return q;
}
vec3 deformN(vec3 p, vec3 n){                           // cofactor of the Jacobian
  const float e = 0.01;
  vec3 jx=(deformP(p+vec3(e,0,0))-deformP(p-vec3(e,0,0)))/(2.0*e);
  vec3 jy=(deformP(p+vec3(0,e,0))-deformP(p-vec3(0,e,0)))/(2.0*e);
  vec3 jz=(deformP(p+vec3(0,0,e))-deformP(p-vec3(0,0,e)))/(2.0*e);
  return normalize(cross(jy,jz)*n.x + cross(jz,jx)*n.y + cross(jx,jy)*n.z);
}`;
function patchDeform(mat, depth = false) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, DU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + DEFORM_GLSL);
    if (!depth) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>',
      'vec3 objectNormal = deformN(position, normal);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif');
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = deformP(position);');
  };
  mat.customProgramCacheKey = () => 'deform' + (depth ? '-depth' : '');
  return mat;
}
mesh.material = patchDeform(new THREE.MeshPhysicalMaterial({ /* … */ }));
mesh.customDepthMaterial = patchDeform(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), true); // shadows deform too
mesh.frustumCulled = false;
```
- Mirror `deformP` in JS when the CPU needs the deformed shape (spawning fragments, hit tests, rest height).
- Attached things (bands, stickers) apply the same `deformP` after their own transform → stay glued.
- Animate uniforms, never rebuild geometry per frame.
- WebGPU equivalent: `material.positionNode = Fn(() => deform(positionLocal))()`; normals via `normalNode` or analytic.
- `three-custom-shader-material` (CSM) is a cleaner alternative to `onBeforeCompile` in local projects.

## 4. Refined procedural (catalog quality without model files)
What separates a "sketch" from a believable machined object is construction technique, not triangle count:
- **One outline per silhouette.** Draw the top view of body + lugs/handles as one closed 2D outline (arcs + rounded
  ends) and `ExtrudeGeometry` it with a small bevel; never glue boxes onto a cylinder. Holes go in `shape.holes`.
- **Chamfers catch light.** Bevel radius 2–5% of the part; `ExtrudeGeometry` groups give two materials for free:
  group 0 = caps (e.g. brushed top), group 1 = walls + bevels (polished). Scale extrude UVs to ~1/20 mm.
- **Revolved profiles with steps.** Half-section `[radius, z]` profiles for every round part (case back, bezel top,
  crystal, gaskets, rings), each with real chamfers and steps.
- **Real repetition, not texture.** Teeth, knurling, ridges as geometry (outline with n lobes:
  `r = rOut − depth·(0.5 − 0.5·cos(nφ))^0.7`), links/pins/ridges as `InstancedMesh`.
- **Facets.** Hands, indices and gems as two sloped facets meeting on a ridge (build the triangles yourself, flat
  normals) — the ridge line is what reads as "polished".
- **Close every gap the camera can see** (rehaut ring between dial and case, end links between lugs and strap).
- **Stagger repeated assemblies** like the real object (center links over the joints of outer links, 0.2 mm gaps).
- **Single source for drawings**: keep these profiles in a module without three.js and export them as 1:1 SVG
  (`selectable-parts.md` §7).

## 5. Real models (glTF)
- Sources: `asset-sources.md`. Artifacts: `fetch_asset.py … --optimize` → `.glb.b64.txt` → `loadGLTF()`.
- Local: `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 2048 --flatten false --join false --palette false` (keep names/variants), `gltfjsx` for R3F components.
- After load: `fitToGround(THREE, gltf.scene, size)`; `traverse` to set `castShadow/receiveShadow`, `envMapIntensity`; dispose unused.
- Animated models: `new THREE.AnimationMixer(gltf.scene)`, `mixer.clipAction(gltf.animations[0]).play()`, `mixer.update(dt)`.
- Variants: `gltf.userData.gltfExtensions.KHR_materials_variants` + per-primitive mappings (see `examples/product-hero`).
- From Blender: apply transforms, Y-up export, one material per distinct look (each material = one draw call).
