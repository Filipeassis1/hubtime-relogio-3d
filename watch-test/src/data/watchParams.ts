import type { PartId } from './parts';

export type Vec3 = [number, number, number];
export interface View { position: Vec3; target: Vec3 }

/** Sheet measurements (mm). */
export const DIM = {
  caseDiameter: 42, caseThickness: 12.5, lugToLug: 48, lugWidth: 20,
  bezelThickness: 2, crystalThickness: 1.8, crownDiameter: 6.5,
  braceletLength: 180, braceletThickness: 3.5,
} as const;

/** Radii (mm). Dial faces +Z, 12h is +Y, 3h is +X. */
export const R = {
  case: 20.5, caseInner: 16.8, back: 17.5,
  bezelInner: 16, bezelOuter: DIM.caseDiameter / 2,
  insertInner: 16.3, insertOuter: 20.1,
  crystal: 16.3, dial: 15.6, crown: DIM.crownDiameter / 2,
  lugEndY: DIM.lugToLug / 2,
} as const;

/** Heights along Z (mm), back of the caseback = 0, top of the crystal = 12.5. */
export const Z = {
  backTop: 1.5, caseTop: 8.7, bezelTop: 8.7 + DIM.bezelThickness, crystalTop: DIM.caseThickness,
  dial: 7.0, movement: [2.6, 5.8] as const, module: [1.6, 2.1] as const,
  lugCenter: 4.5, sideCenter: 5.1,
} as const;

/**
 * Bracelet path: a closed ellipse in the YZ plane (the wrist) that passes through both lug ends.
 * φ is measured from +Z; the 12h side runs φ0 → π, the 6h side mirrors it, and both meet behind the wrist.
 */
const WRIST = { a: 38, b: 30 }; // half-height (Y) and half-depth (Z) of the wrist, mm
const PHI0 = Math.asin(DIM.lugToLug / 2 / WRIST.a);
const CENTER_Z = 4.5 - WRIST.b * Math.cos(PHI0); // ellipse passes through (y = lugEnd, z = lugCenter)
const wristPoint = (phi: number): [number, number] => [WRIST.a * Math.sin(phi), CENTER_Z + WRIST.b * Math.cos(phi)];
/** Cumulative arc length table φ0 → π: [s, φ][] */
const ARC: [number, number][] = (() => {
  const out: [number, number][] = [[0, PHI0]];
  let s = 0, prev = wristPoint(PHI0);
  for (let i = 1; i <= 2048; i++) {
    const phi = PHI0 + ((Math.PI - PHI0) * i) / 2048, p = wristPoint(phi);
    s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    out.push([s, phi]);
    prev = p;
  }
  return out;
})();

export const BAND = {
  a: WRIST.a, b: WRIST.b, centerZ: CENTER_Z, phi0: PHI0, arc: ARC, halfLength: ARC[ARC.length - 1][0],
  endLink: 5, pitch: 7, linksTop: 11, linksBottom: 8, claspLength: 20, width: DIM.lugWidth,
} as const;

export const COLORS = {
  blue: '#1F4EBC', steelLight: '#C7CCD4', steelDark: '#7E8794', white: '#F7F8FA', black: '#1B1F24', gold: '#C7A44B',
  hover: '#9ccaff', selected: '#3d8bff', defect: '#ff6a2b',
} as const;

/** Exploded-view offset per part (mm), applied × explode (0–1). Side parts move toward the exploded camera (+X). */
export const EXPLODE: Record<PartId, Vec3> = {
  '01': [0, 0, -46], '02': [0, 0, 34], '03': [10, 0, 0], '04': [0, 0, 0], '05': [0, 0, 74], '06': [0, 0, 0],
  '07': [16, 0, 0], '08': [0, 0, 18], '09': [0, 0, 0], '10': [0, 0, -58], '11': [0, 0, 14], '12': [0, 0, 44],
  '13': [0, 0, -22], '14': [0, 0, -34], '15': [0, 0, 8], '16': [0, 0, 0], '17': [18, 0, 0], '18': [0, 0, 24],
  '19': [0, 0, 0], '20': [0, 0, 0], '21': [7, 0, 0], '22': [0, 0, 56],
};

/** Where the defect pin sits, when the part's box center would be hidden (rings, two-sided bracelet parts). */
export const PIN_ANCHOR: Partial<Record<PartId, Vec3>> = {
  '01': [16.9, -6, 1.5], '12': [16.6, 6, 10.3], '02': [0, 18.5, 10.7], '04': [-20.5, 0, 5],
  '19': [0, 35.2, -30], '07': [24.5, 0, 5.1], '21': [17, 0, 5.1], '03': [23.5, 11, 5.1], '17': [10.6, 36.6, -10.6], '20': [0, 27, 3], '16': [0, -21, -43.7],
};

/** Camera per view mode: closed front (head fills the frame), back, and a 3/4 side view of the exploded stack. */
export const VIEWS: Record<'frente' | 'traseira' | 'explodido', View> = {
  frente: { position: [62, 34, 200], target: [0, -2, 2] },
  traseira: { position: [-165, 18, -95], target: [0, -2, -4] }, // looks through the loop opening, where the wrist goes
  explodido: { position: [330, 80, 175], target: [0, 0, 6] },
};
