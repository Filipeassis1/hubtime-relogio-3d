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
  it('bandFrame começa na ponta da alça e curva para trás', () => {
    const top = bandFrame(0, 1);
    expect(top.pos.toArray()).toEqual([0, R.lugEndY, Z.lugCenter]);
    expect(top.angle).toBeCloseTo(0);
    expect(bandFrame(0, -1).angle).toBeCloseTo(Math.PI);
    const far = bandFrame(60, 1);
    expect(far.pos.z).toBeCloseTo(Z.lugCenter - BAND.k * 3600);
    expect(far.angle).toBeLessThan(0);
  });
  it('sweepBand gera malha fechada com tampas', () => {
    const g = sweepBand(1, 0, 40, 20, 18, 3.5, 60, 24);
    expect(g.getIndex()!.count).toBe(60 * 24 * 6 + 2 * 24 * 3);
    const pos = g.getAttribute('position').array as Float32Array;
    expect(Array.from(pos).every(Number.isFinite)).toBe(true);
  });
});
