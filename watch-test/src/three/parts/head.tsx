import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { BEZEL, HANDS, PROFILE, bezelEdgeOutline, caseOutline, handOutline, type Pt } from '../../data/profiles';
import { cylinderZ, lathe } from '../geom';
import { useMats } from '../materials';
import { PartGroup } from '../view';

/** Brushed top faces, polished sides and chamfers — the sheet's "escovado com detalhes polidos". */
function extrudeOutline(outline: Pt[], holeR: number | null, z0: number, z1: number, bevel: number, uvScale = 1 / 20) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  if (holeR) shape.holes.push(new THREE.Path().absarc(0, 0, holeR, 0, Math.PI * 2, true));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: z1 - z0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8,
    bevelSegments: 3, curveSegments: 96,
  });
  g.translate(0, 0, z0 + bevel);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvScale, uv.getY(i) * uvScale);
  return g;
}

export function Case04() {
  const m = useMats();
  const body = useMemo(() => extrudeOutline(caseOutline(), R.caseInner, Z.backTop, Z.caseTop, 0.6), []);
  return (
    <PartGroup id="04" offset={EXPLODE['04']}>
      {/* ExtrudeGeometry groups: 0 = top/bottom caps, 1 = side walls + bevels */}
      <mesh geometry={body} material={[m.steelBrushed, m.steelPolished]} />
    </PartGroup>
  );
}

export function Caseback10() {
  const m = useMats();
  const geo = useMemo(() => lathe(PROFILE.caseback), []);
  return (
    <PartGroup id="10" offset={EXPLODE['10']}>
      <mesh geometry={geo} material={m.steelBrushed} />
    </PartGroup>
  );
}

export function Bezel02() {
  const m = useMats();
  const body = useMemo(() => extrudeOutline(bezelEdgeOutline(), R.bezelInner, Z.caseTop, BEZEL.bodyTop, 0.12), []);
  const top = useMemo(() => lathe(PROFILE.bezelTop), []);
  const insert = useMemo(() => new THREE.RingGeometry(R.insertInner, R.insertOuter, 128), []);
  return (
    <PartGroup id="02" offset={EXPLODE['02']}>
      <mesh geometry={body} material={[m.steelBrushed, m.steelPolished]} />
      <mesh geometry={top} material={m.steelPolished} />
      <mesh geometry={insert} material={m.bezelInsert} position={[0, 0, Z.bezelTop + 0.02]} />
    </PartGroup>
  );
}

export function Crystal22() {
  const m = useMats();
  const geo = useMemo(() => lathe(PROFILE.crystal), []);
  return (
    <PartGroup id="22" offset={EXPLODE['22']}>
      <mesh geometry={geo} material={m.sapphire} />
    </PartGroup>
  );
}

export function Dial15() {
  const m = useMats();
  const face = useMemo(() => new THREE.CircleGeometry(R.dial, 128), []);
  const plate = useMemo(() => cylinderZ(R.dial, Z.dial - 0.4, Z.dial - 0.01), []);
  const rehaut = useMemo(() => lathe(PROFILE.rehaut), []);
  return (
    <PartGroup id="15" offset={EXPLODE['15']}>
      <mesh geometry={face} material={m.dial} position={[0, 0, Z.dial]} />
      <mesh geometry={plate} material={m.steelDark} />
      <mesh geometry={rehaut} material={m.rehaut} />
    </PartGroup>
  );
}

/** Applied hour markers; 6h is left out for the LCD window, 12h is doubled. */
export function Indices11() {
  const m = useMats();
  const marks = useMemo(() => {
    const out: { x: number; y: number; rot: number }[] = [];
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * Math.PI * 2;
      const offsets = h === 0 ? [-0.9, 0.9] : [0];
      for (const o of offsets) out.push({ x: Math.sin(a) * 12.2 + Math.cos(a) * o, y: Math.cos(a) * 12.2 - Math.sin(a) * o, rot: -a });
    }
    return out;
  }, []);
  return (
    <PartGroup id="11" offset={EXPLODE['11']}>
      {marks.map((k, i) => (
        <group key={i} position={[k.x, k.y, Z.dial + 0.25]} rotation={[0, 0, k.rot]}>
          <RoundedBox args={[1.3, 3.8, 0.5]} radius={0.15} smoothness={2} material={m.steelPolished} />
          <mesh position={[0, 0, 0.28]} material={m.lume}><boxGeometry args={[0.8, 3.2, 0.12]} /></mesh>
        </group>
      ))}
    </PartGroup>
  );
}

export function Lcd08() {
  const m = useMats();
  const W = 9, H = 4.4, t = 0.5;
  return (
    <PartGroup id="08" offset={EXPLODE['08']}>
      <group position={[0, -7.6, Z.dial + 0.05]}>
        <mesh material={m.lcd} position={[0, 0, 0.02]}><planeGeometry args={[W, H]} /></mesh>
        <mesh material={m.steelPolished} position={[0, (H + t) / 2, 0.15]}><boxGeometry args={[W + 2 * t, t, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[0, -(H + t) / 2, 0.15]}><boxGeometry args={[W + 2 * t, t, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[(W + t) / 2, 0, 0.15]}><boxGeometry args={[t, H, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[-(W + t) / 2, 0, 0.15]}><boxGeometry args={[t, H, 0.3]} /></mesh>
      </group>
    </PartGroup>
  );
}

/** Dauphine-style faceted hand: two sloped facets meeting on a center ridge, polished side walls. */
function facetedHand(len: number, w: number, tail: number, base = 0.18, ridge = 0.16) {
  const [A, B, C, D, E] = handOutline(len, w, tail);
  const v = (p: Pt, z: number) => [p[0], p[1], z];
  const R0 = [0, -tail, base + ridge], low = (p: Pt) => v(p, base);
  const tris: number[][] = [
    R0, low(B), low(C), R0, low(C), low(D),        // right facet
    R0, low(E), low(A), R0, low(D), low(E),        // left facet
    R0, low(A), low(B),                            // tail cap
  ];
  const ring = [A, B, C, D, E];
  ring.forEach((p, i) => {                          // side walls (outline is counter-clockwise)
    const q = ring[(i + 1) % ring.length];
    tris.push(v(p, 0), v(q, 0), v(q, base), v(p, 0), v(q, base), v(p, base));
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

/** Flat lume strip set into the hand's center. */
function lumeStrip(len: number, w: number) {
  const s = new THREE.Shape(handOutline(len, w, -len * 0.12).map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
}

/** Hands set to 10:10:35. */
export function Hands18() {
  const m = useMats();
  const g = useMemo(() => ({
    hour: facetedHand(HANDS.hour.len, HANDS.hour.w, HANDS.hour.tail),
    hourLume: lumeStrip(HANDS.hour.len * 0.72, HANDS.hour.w * 0.42),
    minute: facetedHand(HANDS.minute.len, HANDS.minute.w, HANDS.minute.tail),
    minuteLume: lumeStrip(HANDS.minute.len * 0.76, HANDS.minute.w * 0.4),
    cap: cylinderZ(1.1, 0, 0.35, 32),
  }), []);
  const turn = (f: number) => -f * Math.PI * 2;
  return (
    <PartGroup id="18" offset={EXPLODE['18']}>
      <group position={[0, 0, Z.dial + 0.7]} rotation={[0, 0, turn((10 + 10 / 60) / 12)]}>
        <mesh geometry={g.hour} material={m.steelPolished} />
        <mesh geometry={g.hourLume} material={m.lume} position={[0, HANDS.hour.len * 0.08, 0.26]} />
      </group>
      <group position={[0, 0, Z.dial + 1.05]} rotation={[0, 0, turn(10 / 60)]}>
        <mesh geometry={g.minute} material={m.steelPolished} />
        <mesh geometry={g.minuteLume} material={m.lume} position={[0, HANDS.minute.len * 0.08, 0.26]} />
      </group>
      <group position={[0, 0, Z.dial + 1.4]} rotation={[0, 0, turn(35 / 60)]}>
        <mesh material={m.steelPolished} position={[0, 4, 0]}><boxGeometry args={[0.3, 16, 0.15]} /></mesh>
        <mesh material={m.lume} position={[0, 9, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.8, 0.8, 0.15, 24]} /></mesh>
      </group>
      <mesh geometry={g.cap} material={m.steelPolished} position={[0, 0, Z.dial + 1.55]} />
    </PartGroup>
  );
}
