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
    g.fillStyle = grad; g.fillRect(-512, -512, 1024, 1024);
    for (let i = 0; i < 720; i++) {
      g.save(); g.rotate((i / 720) * Math.PI * 2);
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
      g.fillRect(-1, 0, 2, 512);
      g.restore();
    }
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
