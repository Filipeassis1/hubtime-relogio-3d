import * as THREE from 'three';
import { COLORS } from '../data/watchParams';

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

const dataCache = new Map<string, THREE.DataTexture>();
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Linear RGBA data map (roughness, anisotropy…), tiling. */
function dataTexture(key: string, size: number, px: (x: number, y: number) => [number, number, number]) {
  const hit = dataCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b] = px(x, y), i = (y * size + x) * 4;
    data[i] = r * 255; data[i + 1] = g * 255; data[i + 2] = b * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  dataCache.set(key, t);
  return t;
}

/** Brushed-steel roughness (G channel): fine streaks along U plus slow drift, so highlights break up like real satin finish. */
export function brushedRoughness() {
  const S = 512;
  const row = Array.from({ length: S }, (_, y) => hash(y));
  return dataTexture('brushed', S, (x, y) => {
    const streak = 0.6 * row[y] + 0.4 * row[(y + 1) % S];
    const drift = 0.5 + 0.5 * Math.sin((x / S) * Math.PI * 2 * 3 + row[(y >> 5) % S] * 6);
    const v = 0.72 + 0.2 * streak + 0.08 * drift;
    return [v, v, v];
  });
}

/** Polished-steel micro variation (G channel): soft blotches, a few % roughness change — kills the "perfect chrome" look. */
export function polishedRoughness() {
  const S = 256, C = 16;
  const at = (i: number, j: number) => hash(((i + C) % C) * 57 + ((j + C) % C) * 131);
  return dataTexture('polished', S, (x, y) => {
    const fx = (x / S) * C, fy = (y / S) * C, i = Math.floor(fx), j = Math.floor(fy);
    const u = fx - i, w = fy - j, su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
    const n = (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sw) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sw;
    const v = 0.55 + 0.45 * n;
    return [v, v, v];
  });
}

/** Sunburst: anisotropy direction (RG, tangent space) points radially from the dial center; B = strength. */
export function sunburstAnisotropy() {
  const S = 512;
  return dataTexture('sunburst', S, (x, y) => {
    const dx = x / S - 0.5, dy = y / S - 0.5, l = Math.hypot(dx, dy) || 1;
    return [dx / l * 0.5 + 0.5, dy / l * 0.5 + 0.5, 1];
  });
}

/** Bezel insert artwork for a RingGeometry(inner, outer): planar UVs span [−outer, outer]. */
export function bezelTexture(inner: number, outer: number) {
  return canvasTexture(`bezel:${inner}:${outer}`, 1024, 1024, (g) => {
    const k = 1024 / (2 * outer);
    g.translate(512, 512);
    g.fillStyle = COLORS.blue;
    g.beginPath(); g.arc(0, 0, outer * k, 0, Math.PI * 2); g.arc(0, 0, inner * k, 0, Math.PI * 2, true); g.fill();
    g.fillStyle = COLORS.white;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round((outer - inner) * 0.5 * k)}px Inter, Arial, sans-serif`;
    const mid = (inner + outer) / 2;
    for (let m = 0; m < 60; m++) {
      g.save();
      g.rotate((m / 60) * Math.PI * 2);
      if (m === 0) {
        g.beginPath();
        g.moveTo(0, -(inner + 0.7) * k); g.lineTo(-1.5 * k, -(outer - 0.6) * k); g.lineTo(1.5 * k, -(outer - 0.6) * k);
        g.fill();
      } else if (m % 10 === 0) {
        g.translate(0, -mid * k);
        g.fillText(String(m), 0, 0);
      } else if (m % 5 === 0) {
        g.fillRect(-0.45 * k, -(outer - 0.7) * k, 0.9 * k, (outer - inner - 1.6) * k);
      } else if (m < 15) {
        g.fillRect(-0.2 * k, -(outer - 0.7) * k, 0.4 * k, 1.2 * k);
      }
      g.restore();
    }
  });
}

/** Sunburst blue dial with a white minute track, for a CircleGeometry(radius). */
export function dialTexture(radius: number) {
  return canvasTexture(`dial:${radius}`, 1024, 1024, (g) => {
    const k = 1024 / (2 * radius);
    g.translate(512, 512);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 512);
    grad.addColorStop(0, '#2a57c4'); grad.addColorStop(0.65, COLORS.blue); grad.addColorStop(1, '#10296b');
    g.fillStyle = grad; g.fillRect(-512, -512, 1024, 1024); // the sunburst itself comes from anisotropic reflections
    g.fillStyle = 'rgba(247,248,250,0.85)';
    for (let m = 0; m < 60; m++) {
      g.save(); g.rotate((m / 60) * Math.PI * 2);
      const len = m % 5 === 0 ? 0.9 : 0.5;
      g.fillRect(-0.12 * k, -(radius - 0.25) * k, 0.24 * k, len * k);
      g.restore();
    }
  });
}

/** Grey-green LCD with dark segments, for a 9 × 4.4 mm plane. */
export function lcdTexture() {
  return canvasTexture('lcd', 512, 250, (g) => {
    g.fillStyle = '#a9b39a'; g.fillRect(0, 0, 512, 250);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 150px "DSEG7 Classic", ui-monospace, monospace';
    g.fillStyle = 'rgba(34,38,31,0.08)'; g.fillText('88:88', 256, 135);
    g.fillStyle = '#22261f'; g.fillText('10:10', 256, 135);
  });
}
