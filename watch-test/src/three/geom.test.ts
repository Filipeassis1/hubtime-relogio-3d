import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bandFrame, cylinderX, cylinderZ, lathe, sweepBand } from './geom';
import { BAND, R, Z } from '../data/watchParams';

const box = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return g.boundingBox!; };

describe('geom', () => {
  it('lathe gira o perfil [raio, z] em torno do eixo Z', () => {
    const b = box(lathe([[0, 2], [10, 2], [10, 5], [0, 5]]));
    expect(b.min.z).toBeCloseTo(2); expect(b.max.z).toBeCloseTo(5);
    expect(b.max.x).toBeCloseTo(10, 0); expect(b.max.y).toBeCloseTo(10, 0);
  });
  it('cylinderZ e cylinderX ficam nos intervalos pedidos', () => {
    const z = box(cylinderZ(3, 1, 4));
    expect([z.min.z, z.max.z]).toEqual([expect.closeTo(1), expect.closeTo(4)]);
    const x = box(cylinderX(1, 8, 22));
    expect([x.min.x, x.max.x]).toEqual([expect.closeTo(8), expect.closeTo(22)]);
  });
  it('bandFrame sai da ponta da alça e fecha em volta do pulso', () => {
    const top = bandFrame(0, 1);
    expect(top.pos.x).toBe(0);
    expect(top.pos.y).toBeCloseTo(R.lugEndY, 3);
    expect(top.pos.z).toBeCloseTo(Z.lugCenter, 3);
    expect(bandFrame(0, -1).pos.y).toBeCloseTo(-R.lugEndY, 3);
    // the two sides meet behind the wrist: same point, mirrored
    const endTop = bandFrame(BAND.halfLength, 1), endBottom = bandFrame(BAND.halfLength, -1);
    expect(endTop.pos.y).toBeCloseTo(0, 1);
    expect(endTop.pos.distanceTo(endBottom.pos)).toBeLessThan(0.1);
    expect(endTop.pos.z).toBeCloseTo(BAND.centerZ - BAND.b, 1);
    // symmetric about the XZ plane
    expect(bandFrame(40, -1).pos.y).toBeCloseTo(-bandFrame(40, 1).pos.y, 5);
    // path length matches the link layout of the 12h side
    expect(BAND.halfLength).toBeCloseTo(BAND.endLink + BAND.linksTop * BAND.pitch, 0);
  });
  it('sweepBand gera malha fechada com tampas', () => {
    const g = sweepBand(1, 0, 40, 20, 18, 3.5, 60, 24);
    expect(g.getIndex()!.count).toBe(60 * 24 * 6 + 2 * 24 * 3);
    const pos = g.getAttribute('position').array as Float32Array;
    expect(Array.from(pos).every(Number.isFinite)).toBe(true);
  });
});
