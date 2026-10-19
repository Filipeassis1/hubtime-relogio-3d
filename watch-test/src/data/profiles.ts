/**
 * 2D construction profiles of the watch (mm), with no three.js dependency.
 * The 3D parts and scripts/export-svg.ts read the same numbers, so the SVG reference pack in
 * docs/referencias-3d/svg always matches the model. Explicit .ts extensions let Node run the script directly.
 */
import { DIM, R, Z } from './watchParams.ts';

export type Pt = [number, number];

/** Lugs seen from above: inner face at half the lug width, rounded end at lug-to-lug / 2. */
export const LUG = { innerX: DIM.lugWidth / 2, outerX: 13.4, endY: R.lugEndY, round: 1.4 } as const;

/** Bracelet link (one row): staggered outer pieces and a center piece centered on the joints. */
export const LINK = { outerW: 5.6, outerX: 7.2, centerW: 8.4, gap: 0.2, outerT: 3.5, centerT: 3.2, radius: 0.8 } as const;

/** Bezel edge: 120 rounded teeth (120-click diver bezel). */
export const BEZEL = { teeth: 120, depth: 0.3, bodyTop: Z.caseTop + 1.4 } as const;

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

const dedupe = (pts: Pt[]): Pt[] =>
  pts.filter((p, i) => {
    const q = pts[(i - 1 + pts.length) % pts.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9;
  });

/** Case + lugs seen from above, as one closed outline (clockwise from 12h). */
export function caseOutline(seg = 48): Pt[] {
  const r = R.case, { innerX: x0, outerX: x1, endY: y1, round: rc } = LUG;
  const deg = Math.PI / 180;
  const aIn = Math.acos(x0 / r), aOut = Math.acos(x1 / r);
  // quadrant I, from 12h going clockwise to 3h
  const q1: Pt[] = [
    ...arc(0, 0, r, 90 * deg, aIn, seg),
    [x0, y1 - rc],
    ...arc(x0 + rc, y1 - rc, rc, 180 * deg, 90 * deg, 8),
    ...arc(x1 - rc, y1 - rc, rc, 90 * deg, 0, 8),
    [x1, Math.sqrt(r * r - x1 * x1)],
    ...arc(0, 0, r, aOut, 0, seg),
  ];
  const round = (v: number) => Math.round(v * 1e9) / 1e9;
  const q4 = [...q1].reverse().map(([x, y]): Pt => [x, -y]);
  const q3 = q1.map(([x, y]): Pt => [-x, -y]);
  const q2 = [...q1].reverse().map(([x, y]): Pt => [-x, y]);
  return dedupe([...q1, ...q4, ...q3, ...q2].map(([x, y]): Pt => [round(x), round(y)]));
}

/** Toothed outer edge of the bezel seen from above. */
export function bezelEdgeOutline(sub = 8): Pt[] {
  const n = BEZEL.teeth * sub, rOut = R.bezelOuter;
  return Array.from({ length: n }, (_, i): Pt => {
    const phi = (i / n) * Math.PI * 2;
    const dip = (0.5 - 0.5 * Math.cos(BEZEL.teeth * phi)) ** 0.7;
    const r = rOut - BEZEL.depth * dip;
    return [r * Math.sin(phi), r * Math.cos(phi)];
  });
}

/** Sword/dauphine hand outline pointing +Y (tip at `len`, tail at −tail). */
export function handOutline(len: number, w: number, tail: number): Pt[] {
  return [[-w * 0.35, -tail], [w * 0.35, -tail], [w / 2, len * 0.75], [0, len], [-w / 2, len * 0.75]];
}

/** Hands of the reference (10:10:35): length, width, tail. */
export const HANDS = {
  hour: { len: 8.5, w: 1.8, tail: 1.5 },
  minute: { len: 13, w: 1.4, tail: 2 },
  second: { len: 12, w: 0.3, tail: 4 },
} as const;

/** Closed [radius, z] profiles revolved around the watch axis (half section, 12h–6h). */
export const PROFILE = {
  caseback: [[0, 0], [R.back - 1.2, 0], [R.back, 0.6], [R.back, Z.backTop], [0, Z.backTop]] as Pt[],
  caseWall: [[R.caseInner, Z.backTop], [R.case - 0.6, Z.backTop], [R.case, Z.backTop + 0.6], [R.case, Z.caseTop - 0.6],
    [R.case - 0.6, Z.caseTop], [R.caseInner, Z.caseTop], [R.caseInner, Z.backTop]] as Pt[],
  bezelBody: [[R.bezelInner, Z.caseTop], [R.bezelOuter, Z.caseTop], [R.bezelOuter, BEZEL.bodyTop], [R.bezelInner, BEZEL.bodyTop],
    [R.bezelInner, Z.caseTop]] as Pt[],
  bezelTop: [[R.bezelInner, BEZEL.bodyTop], [R.bezelOuter - 0.6, BEZEL.bodyTop], [R.bezelOuter - 1.2, Z.bezelTop],
    [R.bezelInner, Z.bezelTop], [R.bezelInner, BEZEL.bodyTop]] as Pt[],
  crystal: [[0, BEZEL.bodyTop], [R.crystal, BEZEL.bodyTop], [R.crystal, Z.crystalTop - 0.4], [R.crystal - 0.5, Z.crystalTop],
    [0, Z.crystalTop]] as Pt[],
  junta: [[R.crystal, 9.9], [R.crystal + 0.6, 9.9], [R.crystal + 0.6, Z.bezelTop], [R.crystal, Z.bezelTop], [R.crystal, 9.9]] as Pt[],
  dial: [[0, Z.dial - 0.4], [R.dial, Z.dial - 0.4], [R.dial, Z.dial], [0, Z.dial]] as Pt[],
  /** Rehaut: sloped ring closing the gap between dial edge and case bore (part of 15 — Mostrador). */
  rehaut: [[R.dial - 0.2, Z.dial], [R.caseInner, Z.dial], [R.caseInner, Z.caseTop], [R.bezelInner - 0.3, Z.caseTop],
    [R.dial - 0.2, Z.dial]] as Pt[],
  movement: [[0, Z.movement[0]], [R.movement, Z.movement[0]], [R.movement, Z.movement[1]], [0, Z.movement[1]]] as Pt[],
};
