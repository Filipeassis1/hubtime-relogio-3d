/**
 * Writes the SVG reference pack (mm, 1:1) from the same profiles the 3D model uses.
 * Run: npm run export:svg   → docs/referencias-3d/svg/*.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEZEL, HANDS, LINK, LUG, PROFILE, bezelEdgeOutline, caseOutline, handOutline, type Pt } from '../src/data/profiles.ts';
import { BAND, DIM, R, Z } from '../src/data/watchParams.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../docs/referencias-3d/svg');
const f = (n: number) => +n.toFixed(3);
const path = (pts: Pt[], close = true) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + (close ? ' Z' : '');
const flipY = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x, -y]);

const STYLE = `<style>
  .part { fill: #e8ecf2; stroke: #171b22; stroke-width: .12; }
  .cut { fill: #c9d2e6; stroke: #171b22; stroke-width: .1; }
  .thin { fill: none; stroke: #1f4ebc; stroke-width: .08; }
  .hidden { fill: none; stroke: #5a6270; stroke-width: .08; stroke-dasharray: .6 .4; }
  .dim { stroke: #a35a00; stroke-width: .06; fill: none; }
  text { font: .9px "IBM Plex Mono", monospace; fill: #171b22; }
  .title { font: 600 1.4px "IBM Plex Sans", sans-serif; }
  .lbl { fill: #1f4ebc; }
  .dimt { fill: #a35a00; }
</style>`;

function svg(name: string, title: string, [x, y, w, h]: number[], body: string) {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${x} ${y} ${w} ${h}">
<title>${title}</title>
${STYLE}
<text class="title" x="${x + 1}" y="${y + 2.2}">${title}</text>
<text x="${x + 1}" y="${y + 3.6}">1:1 · mm · fonte: src/data/profiles.ts</text>
${body}
</svg>
`;
  writeFileSync(join(OUT, name), doc);
  return name;
}

/** Linear dimension between two points, text offset along the normal. */
function dim(a: Pt, b: Pt, label: string, off = 2) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * off, ny = dx / l * off;
  const A: Pt = [a[0] + nx, a[1] + ny], B: Pt = [b[0] + nx, b[1] + ny];
  const mx = (A[0] + B[0]) / 2 + nx * 0.35, my = (A[1] + B[1]) / 2 + ny * 0.35;
  return `<path class="dim" d="${path([a, A], false)} ${path([b, B], false)} ${path([A, B], false)}"/>
<text class="dimt" x="${f(mx)}" y="${f(my)}" text-anchor="middle" dominant-baseline="middle">${label.replace(/(\d)\.(\d)/g, '$1,$2')}</text>`;
}

mkdirSync(OUT, { recursive: true });
const written: string[] = [];

// 04 — case + lugs from above, with the bezel edge and the case bore
{
  const c = flipY(caseOutline());
  const teeth = flipY(bezelEdgeOutline());
  const body = `
<path class="part" d="${path(c)}"/>
<path class="thin" d="${path(teeth)}"/>
<circle class="hidden" cx="0" cy="0" r="${R.caseInner}"/>
<text class="lbl" x="0" y="0" text-anchor="middle">04 Caixa (contorno + alças)</text>
<text class="lbl" x="0" y="1.4" text-anchor="middle">azul: borda do bezel, ${BEZEL.teeth} dentes</text>
${dim([LUG.outerX, -LUG.endY], [LUG.outerX, LUG.endY], `${DIM.lugToLug} alça a alça`, -12)}
${dim([-LUG.innerX, -LUG.endY], [LUG.innerX, -LUG.endY], `${DIM.lugWidth} entre asas`, -2.5)}
${dim([-R.bezelOuter, 22], [R.bezelOuter, 22], `Ø${DIM.caseDiameter} bezel`, 5)}
${dim([LUG.innerX, LUG.endY], [LUG.outerX, LUG.endY], `${f(LUG.outerX - LUG.innerX)} alça`, 2)}`;
  written.push(svg('04-caixa-topo.svg', '04 · Caixa — vista de cima', [-32, -34, 70, 66], body));
}

// 04 — half section 12h–6h of the head (all revolved profiles)
{
  const parts: [keyof typeof PROFILE, string, string][] = [
    ['caseback', '10 Fundo', 'cut'], ['caseWall', '04 Caixa', 'cut'], ['bezelBody', '02 Bezel', 'cut'], ['bezelTop', '02 Bezel', 'cut'],
    ['crystal', '22 Vidro', 'part'], ['junta', '12 Junta', 'cut'], ['dial', '15 Mostrador', 'cut'], ['rehaut', '15 Rehaut', 'cut'],
    ['movement', '13 Máquina', 'part'],
  ];
  const k = 1; // 1:1
  const toSvg = (pts: Pt[]): Pt[] => pts.map(([r, z]) => [r * k, -z * k]);
  let body = parts.map(([key, , cls]) => `<path class="${cls}" d="${path(toSvg(PROFILE[key]))}"/>`).join('\n');
  const labelAt: Partial<Record<keyof typeof PROFILE, Pt>> = {
    caseback: [9, -0.5], caseWall: [23, -5], bezelTop: [23, -10.4], crystal: [6, -12.9], junta: [23, -9.6],
    dial: [6, -7.6], rehaut: [23, -7.9], movement: [6, -4.2],
  };
  for (const [key, label] of parts) { const p = labelAt[key]; if (p) body += `\n<text class="lbl" x="${p[0]}" y="${p[1]}">${label}</text>`; }
  body += `\n<path class="hidden" d="M0 1 L0 -14"/>`;
  body += dim([R.bezelOuter, 0], [R.bezelOuter, -DIM.caseThickness], `${DIM.caseThickness} total`, 5);
  body += dim([R.crystal, -Z.bezelTop], [R.crystal, -Z.crystalTop], `${DIM.crystalThickness} vidro`, 9);
  body += dim([0, -Z.crystalTop], [R.crystal, -Z.crystalTop], `Ø${f(R.crystal * 2)} vidro (raio ${R.crystal})`, 2);
  written.push(svg('04-cabeca-corte.svg', '04 · Cabeça — meio corte 12h–6h', [-4, -19, 46, 22], body));
}

// 19 — bracelet links: top view (3 rows, staggered) and cross-section
{
  const rr = (x: number, y: number, w: number, h: number, r: number, cls: string) =>
    `<rect class="${cls}" x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`;
  const L = BAND.pitch - LINK.gap;
  let body = '';
  for (let i = 0; i < 3; i++) for (const x of [-LINK.outerX, LINK.outerX]) body += rr(x, i * BAND.pitch, LINK.outerW, L, LINK.radius, 'part');
  for (let i = 0; i < 2; i++) body += rr(0, (i + 0.5) * BAND.pitch, LINK.centerW, L, LINK.radius, 'cut');
  body += `<text class="lbl" x="0" y="${-BAND.pitch / 2 - 1.2}" text-anchor="middle">19 Pulseira — vista de cima (centro sobre as juntas)</text>`;
  body += dim([-BAND.width / 2, 2.5 * BAND.pitch], [BAND.width / 2, 2.5 * BAND.pitch], `${BAND.width} largura`, 2);
  body += dim([LINK.outerX + LINK.outerW / 2, 0], [LINK.outerX + LINK.outerW / 2, BAND.pitch], `${BAND.pitch} passo`, -3);
  const sy = 3 * BAND.pitch + 6;
  body += rr(-LINK.outerX, sy, LINK.outerW, LINK.outerT, LINK.radius, 'part') + rr(LINK.outerX, sy, LINK.outerW, LINK.outerT, LINK.radius, 'part');
  body += rr(0, sy - (LINK.outerT - LINK.centerT) / 2 - 0.15, LINK.centerW, LINK.centerT, LINK.radius, 'cut');
  body += `<text class="lbl" x="0" y="${sy - 3}" text-anchor="middle">corte transversal</text>`;
  body += dim([LINK.outerX + LINK.outerW / 2, sy - LINK.outerT / 2], [LINK.outerX + LINK.outerW / 2, sy + LINK.outerT / 2], `${LINK.outerT}`, -2.5);
  body += dim([-LINK.centerW / 2, sy + LINK.outerT / 2], [LINK.centerW / 2, sy + LINK.outerT / 2], `${LINK.centerW} centro`, 2);
  written.push(svg('19-elo.svg', '19 · Elo da pulseira', [-16, -10, 36, sy + 20], body));
}

// 18 — hands outlines
{
  const items: [string, { len: number; w: number; tail: number }, number][] = [
    ['Hora', HANDS.hour, -6], ['Minuto', HANDS.minute, 0], ['Segundo', HANDS.second, 6],
  ];
  let body = '';
  for (const [label, h, x] of items) {
    const pts = (label === 'Segundo'
      ? [[-h.w / 2, -h.tail], [h.w / 2, -h.tail], [h.w / 2, h.len], [-h.w / 2, h.len]] as Pt[]
      : handOutline(h.len, h.w, h.tail)).map(([px, py]): Pt => [px + x, -py]);
    body += `<path class="part" d="${path(pts)}"/>`;
    if (label !== 'Segundo') body += `<path class="thin" d="M${x} ${h.tail} L${x} ${-h.len}"/>`;
    body += `<circle class="hidden" cx="${x}" cy="0" r="0.75"/>`;
    body += `<text class="lbl" x="${x}" y="${h.tail + 2}" text-anchor="middle">${label}</text>`;
    body += dim([x + 1.6, 0], [x + 1.6, -h.len], `${h.len}`, -1.2);
  }
  body += `<text x="-9" y="${HANDS.second.tail + 4}">azul: aresta central (facetado) · tracejado: furo</text>`;
  written.push(svg('18-ponteiros.svg', '18 · Ponteiros (10:10:35)', [-10, -17, 32, 27], body));
}

console.log('SVGs:', written.join(', '), '→', OUT);
