// asset-loader.js — artifact-safe asset helpers for three.js r186 (WebGL or WebGPU builds).
// Publish this file next to index.html and `import { ... } from './asset-loader.js'`, or paste the parts you need inline.
// Every function takes THREE as an argument so it works with both 'three' and 'three/webgpu'.
//
// What ships how inside a claude.ai artifact (see references/assets-in-artifacts.md):
//   .jpg .png .webp            -> supporting file, load by relative URL
//   .glb / .hdr / .exr         -> base64 in a .txt supporting file, decoded here (scripts/fetch_asset.py converts)
//                                 Verified in the app: GLB-b64 + the TextureLoader fix below ✅; without the fix the
//                                 embedded textures come out white; .gltf.json + separate images did not load at all.
//   UltraHDR (.hdr.jpg)        -> supporting file, real HDR in a small JPG
//   @pmndrs/assets             -> import() from cdn.jsdelivr.net/npm (module exports a data: URL: decode it, never fetch it)

// Addons resolve through the page's importmap ("three/addons/"), so they share the page's single copy of three.
const CDN = 'three/addons/';
const PMNDRS = 'https://cdn.jsdelivr.net/npm/@pmndrs/assets@1.7.0/';

// ── THE sandbox rule (measured in the claude.ai app): fetch() of data: and blob: URLs FAILS inside an
// artifact (the local CSP emulation allows it — don't trust it). <img> from data:/blob: works, createImageBitmap works,
// same-origin fetch works. So: bytes -> atob + loader.parse(); images -> <img> (TextureLoader). Never hand a data:/blob:
// URL to a loader that fetches (FileLoader, ImageBitmapLoader, EXRLoader.load, HDRLoader.load, GLTF buffers).

/** Decode base64 text to an ArrayBuffer without fetch(data:). */
export function decodeBase64(s) {
  s = s.replace(/\s+/g, '');
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s).buffer;   // native, fast (newer browsers)
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Fetch a base64 .txt supporting file (same-origin fetch is fine) and return its bytes. */
export async function b64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return decodeBase64(await res.text());
}

/** Bytes of a data: URL (e.g. an @pmndrs/assets module export) without fetching it. */
export function dataUrlBytes(url) { return decodeBase64(url.slice(url.indexOf(',') + 1)); }

/** A LoadingManager that drives a progress callback (0..1) — wire it to the boot screen. */
export function makeManager(THREE, onProgress = () => {}) {
  const m = new THREE.LoadingManager();
  m.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 1);
  return m;
}

/**
 * Load a glTF model from a .glb.b64.txt (artifacts) or a plain .glb/.gltf URL (local projects).
 * Routes textures through TextureLoader (<img>) instead of ImageBitmapLoader — REQUIRED in the artifact sandbox,
 * where the ImageBitmap path silently fails and every texture comes out white.
 * Handles meshopt-compressed files. Returns the full gltf ({ scene, animations, parser, ... }).
 */
export async function loadGLTF(THREE, url, { manager, meshopt = true, imgTextures = true } = {}) {
  const { GLTFLoader } = await import(CDN + 'loaders/GLTFLoader.js');
  const loader = new GLTFLoader(manager);
  if (meshopt) {
    const { MeshoptDecoder } = await import(CDN + 'libs/meshopt_decoder.module.js');
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  if (imgTextures) loader.register(p => { p.textureLoader = new THREE.TextureLoader(p.options.manager); return { name: 'img-textures' }; });
  if (url.endsWith('.b64.txt')) {
    const base = url.slice(0, url.lastIndexOf('/') + 1);
    return loader.parseAsync(await b64(url), base);
  }
  return loader.loadAsync(url);
}

/**
 * Environment map for IBL (+ optional background). Sources, best first:
 *   'assets/x.hdr.jpg'                       UltraHDR JPG supporting file (small, real HDR)
 *   'assets/x_1k.hdr.b64.txt' / '.exr.b64.txt'  Poly Haven HDRI via fetch_asset.py
 *   'pmndrs:studio'                          one of @pmndrs/assets/hdri (apartment bridge city dawn esplanade forest
 *                                            hall lab lobby night park sky studio sunrise sunset venice warehouse workshop)
 *   'room'                                   procedural RoomEnvironment (no download, neutral studio)
 * Returns the equirect texture (use for scene.background / GroundedSkybox) and sets scene.environment.
 */
export async function loadEnvironment(THREE, renderer, scene, source, { background = false, blur = 0, intensity = 1, rotationY = 0 } = {}) {
  let tex;
  if (source === 'room') {
    const { RoomEnvironment } = await import(CDN + 'environments/RoomEnvironment.js');
    const pmrem = new THREE.PMREMGenerator(renderer);
    tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    return tex;
  }
  if (source.startsWith('pmndrs:')) {
    const { EXRLoader } = await import(CDN + 'loaders/EXRLoader.js');
    const { default: dataUrl } = await import(PMNDRS + `hdri/${source.slice(7)}.exr.js`);
    tex = dataTex(THREE, new EXRLoader().setDataType(THREE.HalfFloatType).parse(dataUrlBytes(dataUrl)));   // not .load(): that fetches the data: URL
  } else if (source.endsWith('.hdr.jpg') || source.endsWith('.uhdr.jpg')) {
    const { UltraHDRLoader } = await import(CDN + 'loaders/UltraHDRLoader.js');
    tex = await new UltraHDRLoader().setDataType(THREE.HalfFloatType).loadAsync(source);
  } else if (source.endsWith('.exr.b64.txt') || source.endsWith('.exr')) {
    const { EXRLoader } = await import(CDN + 'loaders/EXRLoader.js');
    tex = source.endsWith('.txt') ? dataTex(THREE, new EXRLoader().setDataType(THREE.HalfFloatType).parse(await b64(source))) : await new EXRLoader().loadAsync(source);
  } else {
    const { HDRLoader } = await import(CDN + 'loaders/HDRLoader.js');
    tex = source.endsWith('.txt') ? dataTex(THREE, new HDRLoader().parse(await b64(source))) : await new HDRLoader().loadAsync(source);
  }
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
  scene.environmentIntensity = intensity;
  scene.environmentRotation.y = rotationY;
  if (background) {
    scene.background = tex;
    scene.backgroundBlurriness = blur;
    scene.backgroundRotation.y = rotationY;
  }
  return tex;
}

// Mirror what DataTextureLoader does with a parse() result (format/flipY differ: HDR flips, EXR doesn't)
function dataTex(THREE, d) {
  const t = new THREE.DataTexture(d.data, d.width, d.height, d.format ?? THREE.RGBAFormat, d.type);
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.flipY = d.flipY ?? false;
  t.needsUpdate = true;
  return t;
}

/**
 * PBR texture set from a folder (Poly Haven / ambientCG naming), applied to a new MeshStandardMaterial
 * or MeshPhysicalMaterial. `files` maps slot -> filename, e.g.
 *   { map: 'x_diff_1k.jpg', normalMap: 'x_nor_gl_1k.jpg', arm: 'x_arm_1k.jpg' }   (arm = AO/Rough/Metal packed)
 * Color maps get sRGB; data maps stay linear. `repeat` tiles everything; `maxAniso` from renderer.capabilities.
 */
export async function loadPBR(THREE, base, files, { repeat = 1, physical = false, maxAniso = 8, params = {} } = {}) {
  const tl = new THREE.TextureLoader();
  const load = async (f, srgb) => {
    const t = await tl.loadAsync(base + f);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...[].concat(repeat, repeat).slice(0, 2));
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mat = new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)(params);
  const jobs = [];
  for (const [slot, f] of Object.entries(files)) {
    if (slot === 'arm') jobs.push(load(f, false).then(t => { mat.aoMap = mat.roughnessMap = mat.metalnessMap = t; }));
    else jobs.push(load(f, slot === 'map' || slot === 'emissiveMap' || slot === 'sheenColorMap').then(t => { mat[slot] = t; }));
  }
  await Promise.all(jobs);
  if (!files.arm && !files.metalnessMap) mat.metalness = params.metalness ?? 0;
  mat.needsUpdate = true;
  return mat;
}

/** Matcap (0000..0283) or tileable normal map (0000..0028) from @pmndrs/assets — no supporting files needed. */
export async function pmndrsTexture(THREE, kind, id) {
  const { default: dataUrl } = await import(PMNDRS + `${kind}/${String(id).padStart(4, '0')}.webp.js`);
  const t = await new THREE.TextureLoader().loadAsync(dataUrl);
  if (kind === 'matcaps') t.colorSpace = THREE.SRGBColorSpace;
  else t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Center a loaded model on the origin, sit it on y=0 and scale it so its largest side equals `size`. */
export function fitToGround(THREE, object, size = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const dim = box.getSize(new THREE.Vector3());
  const s = size / Math.max(dim.x, dim.y, dim.z);
  object.scale.multiplyScalar(s);
  box.setFromObject(object);
  const c = box.getCenter(new THREE.Vector3());
  object.position.x -= c.x;
  object.position.z -= c.z;
  object.position.y -= box.min.y;
  return new THREE.Box3().setFromObject(object);
}
