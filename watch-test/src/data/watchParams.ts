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

/** Bracelet path: z = lugCenter − k·s², s along the band from the lug end. */
export const BAND = { k: 0.009, endLink: 5, pitch: 7, linksTop: 11, linksBottom: 8, width: DIM.lugWidth } as const;

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
  '19': [0, 70, -16], '07': [24.5, 0, 5.1], '21': [17, 0, 5.1], '03': [23.5, 11, 5.1], '17': [10.6, 40, 0], '20': [0, 27, 4.5], '16': [0, -76, -20],
};

/** Camera per view mode: closed front (head fills the frame), back, and a 3/4 side view of the exploded stack. */
export const VIEWS: Record<'frente' | 'traseira' | 'explodido', View> = {
  frente: { position: [62, 34, 200], target: [0, -2, 2] },
  traseira: { position: [-70, 34, -200], target: [0, -2, 2] },
  explodido: { position: [330, 80, 175], target: [0, 0, 6] },
};
