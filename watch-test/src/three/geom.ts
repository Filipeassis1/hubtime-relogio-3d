import * as THREE from 'three';
import { BAND } from '../data/watchParams';

/** Revolve a [radius, z] profile around the Z axis. */
export function lathe(profile: [number, number][], segments = 128): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2); // lathe height (Y) → Z
  return g;
}

export function cylinderZ(r: number, z0: number, z1: number, segments = 96): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, segments);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

export function cylinderX(r: number, x0: number, x1: number, segments = 32): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, segments);
  g.rotateZ(Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}

/** φ on the wrist ellipse for arc length s (binary search in the precomputed table). */
function phiAt(s: number): number {
  const t = BAND.arc;
  if (s <= 0) return t[0][1];
  if (s >= BAND.halfLength) return t[t.length - 1][1];
  let lo = 0, hi = t.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t[mid][0] < s) lo = mid; else hi = mid; }
  const f = (s - t[lo][0]) / (t[hi][0] - t[lo][0]);
  return t[lo][1] + (t[hi][1] - t[lo][1]) * f;
}

/** Point and tilt (rotation about X) on the closed bracelet; s from the lug end, sign 1 = 12h side, −1 = 6h side. */
export function bandFrame(s: number, sign: 1 | -1): { pos: THREE.Vector3; angle: number } {
  const phi = phiAt(s);
  const ty = sign * BAND.a * Math.cos(phi), tz = -BAND.b * Math.sin(phi);
  return {
    pos: new THREE.Vector3(0, sign * BAND.a * Math.sin(phi), BAND.centerZ + BAND.b * Math.cos(phi)),
    angle: Math.atan2(tz, ty),
  };
}

/** Strap swept along bandFrame with a rounded-rectangle section (width along X, thickness along the path normal). */
export function sweepBand(
  sign: 1 | -1, s0: number, s1: number, w0: number, w1: number, h: number, steps = 60, ring = 24,
): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, f = bandFrame(s0 + (s1 - s0) * t, sign), w = w0 + (w1 - w0) * t;
    const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** 0.35 * (w / 2);
      const d = Math.sign(sn) * Math.abs(sn) ** 0.35 * (h / 2);
      pos.push(x, f.pos.y + ny * d, f.pos.z + nz * d);
      uv.push(j / ring, t);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + ((j + 1) % ring);
    idx.push(a, a + ring, b, b, a + ring, b + ring);
  }
  for (const [row, flip] of [[0, true], [steps, false]] as const) {
    const f = bandFrame(s0 + (s1 - s0) * (row / steps), sign);
    const center = pos.length / 3;
    pos.push(0, f.pos.y, f.pos.z); uv.push(0.5, row / steps);
    for (let j = 0; j < ring; j++) {
      const a = row * ring + j, b = row * ring + ((j + 1) % ring);
      if (flip) idx.push(center, b, a); else idx.push(center, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
