// procedural.js — zero-download textures for three.js (Canvas 2D, works with WebGL and WebGPU renderers).
// Use these for imperfection (roughness/bump variation), grain, gradients and stylized patterns.
// For node-based procedural materials on WebGPU, see references/procedural-textures.md (TSL mx_* noise).
//
//   const rough = fbmTexture(THREE, { size: 512, scale: 6, octaves: 5, min: 0.35, max: 0.6 });
//   material.roughnessMap = rough;                 // roughness = material.roughness * map → set roughness: 1
//   material.bumpMap = fbmTexture(THREE, { scale: 24, octaves: 3 }); material.bumpScale = 0.4;

export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Periodic 2D value noise: tiles seamlessly when sampled over [0, period). */
export function makeNoise(seed = 1) {
  const rnd = mulberry32(seed), P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = rnd();
  const s = t => t * t * (3 - 2 * t);
  return (x, y, period = 256) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const v = (a, b) => P[(b & 255) * 256 + (a & 255)];
    const u = s(xf), w = s(yf);
    return (v(x0, y0) * (1 - u) + v(x1, y0) * u) * (1 - w) + (v(x0, y1) * (1 - u) + v(x1, y1) * u) * w;
  };
}

/** Fractal (fBm) noise as a tileable grayscale texture, remapped to [min, max]. Linear color space (data map). */
export function fbmTexture(THREE, { size = 512, scale = 6, octaves = 5, gain = 0.5, min = 0, max = 1, seed = 7, warp = 0, repeat = 1 } = {}) {
  const N = makeNoise(seed), c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let u = x / size * scale, v = y / size * scale;
    if (warp) { u += (N(u * 0.5 + 11, v * 0.5, scale) - 0.5) * warp; v += (N(u * 0.5, v * 0.5 + 7, scale) - 0.5) * warp; }
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) { sum += a * N(u * f, v * f, scale * f); norm += a; a *= gain; f *= 2; }
    const n = min + (max - min) * (sum / norm);
    const i = 4 * (y * size + x), b = Math.max(0, Math.min(255, n * 255));
    d[i] = d[i + 1] = d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Color variation map: base color modulated by low-frequency noise (sRGB). Kills the flat "CG plastic" look. */
export function mottleTexture(THREE, base = '#c8643a', { size = 512, scale = 4, amount = 0.08, hueShift = 0.01, seed = 3 } = {}) {
  const N = makeNoise(seed), col = new THREE.Color(base), hsl = {}, c = document.createElement('canvas');
  col.getHSL(hsl);
  c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, tmp = new THREE.Color();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * scale, v = y / size * scale;
    const n = 0.6 * N(u, v, scale) + 0.3 * N(u * 2, v * 2, scale * 2) + 0.1 * N(u * 8, v * 8, scale * 8) - 0.5;
    tmp.setHSL(hsl.h + n * hueShift, hsl.s, Math.max(0, Math.min(1, hsl.l + n * amount * 2)));
    tmp.convertLinearToSRGB();
    const i = 4 * (y * size + x);
    d[i] = tmp.r * 255; d[i + 1] = tmp.g * 255; d[i + 2] = tmp.b * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Radial gradient (sRGB) — glow sprites, fake AO blobs, vignettes. stops: [[0,'rgba(...)'], [1,'rgba(...)']] */
export function radialTexture(THREE, stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Toon gradient map (N hard bands) for MeshToonMaterial. */
export function toonRamp(THREE, steps = [0.25, 0.6, 1]) {
  const data = new Uint8Array(steps.map(s => Math.round(s * 255)));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
