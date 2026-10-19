import { describe, expect, it } from 'vitest';
import { DIM } from './watchParams';
import { LUG, PROFILE, bezelEdgeOutline, caseOutline, handOutline } from './profiles';

const bounds = (pts: [number, number][]) => ({
  minX: Math.min(...pts.map((p) => p[0])), maxX: Math.max(...pts.map((p) => p[0])),
  minY: Math.min(...pts.map((p) => p[1])), maxY: Math.max(...pts.map((p) => p[1])),
});

describe('profiles', () => {
  it('contorno da caixa: alça a alça 48 mm e largura entre asas 20 mm (sheet)', () => {
    const pts = caseOutline();
    const b = bounds(pts);
    expect(b.maxY - b.minY).toBeCloseTo(DIM.lugToLug, 5);
    expect(b.maxX).toBeCloseTo(DIM.caseDiameter / 2 - 0.5, 5); // case body; the bezel carries the 42 mm
    expect(LUG.innerX * 2).toBe(DIM.lugWidth);
    // the strap gap is open: nothing of the outline sits between the lugs beyond the case circle
    expect(pts.some(([x, y]) => Math.abs(x) < LUG.innerX - 0.01 && Math.abs(y) > 21)).toBe(false);
  });

  it('contorno da caixa é simétrico nos dois eixos', () => {
    const pts = caseOutline();
    for (const [x, y] of pts) {
      expect(pts.some(([a, b]) => Math.abs(a + x) < 1e-6 && Math.abs(b - y) < 1e-6)).toBe(true);
      expect(pts.some(([a, b]) => Math.abs(a - x) < 1e-6 && Math.abs(b + y) < 1e-6)).toBe(true);
    }
  });

  it('borda do bezel tem 120 dentes e Ø externo 42 mm', () => {
    const pts = bezelEdgeOutline();
    const r = pts.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...r)).toBeCloseTo(DIM.caseDiameter / 2, 3);
    let peaks = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i - 1 + r.length) % r.length], b = r[i], c = r[(i + 1) % r.length];
      if (b > a && b >= c) peaks++;
    }
    expect(peaks).toBe(120);
  });

  it('perfis de revolução respeitam espessura total 12,5 mm e vidro 1,8 mm acima do bezel', () => {
    const zs = Object.values(PROFILE).flat().map((p) => p[1]);
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(DIM.caseThickness);
    const crystalTop = Math.max(...PROFILE.crystal.map((p) => p[1]));
    const bezelTop = Math.max(...PROFILE.bezelTop.map((p) => p[1]));
    expect(crystalTop - bezelTop).toBeCloseTo(DIM.crystalThickness, 5);
  });

  it('ponteiro tem ponta no comprimento pedido e é simétrico', () => {
    const pts = handOutline(13, 1.4, 2);
    expect(Math.max(...pts.map((p) => p[1]))).toBe(13);
    expect(Math.min(...pts.map((p) => p[1]))).toBe(-2);
    const xs = pts.map((p) => p[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-xs[xs.length - 1], 6);
  });
});
