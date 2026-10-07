import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { cylinderZ, lathe } from '../geom';
import { useMats } from '../materials';
import { PartGroup } from '../view';

export function Case04() {
  const m = useMats();
  const body = useMemo(() => lathe([
    [R.caseInner, Z.backTop], [R.case - 0.8, Z.backTop], [R.case, Z.backTop + 0.8],
    [R.case, Z.caseTop - 0.8], [R.case - 0.8, Z.caseTop], [R.caseInner, Z.caseTop], [R.caseInner, Z.backTop],
  ]), []);
  const lugs: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  return (
    <PartGroup id="04" offset={EXPLODE['04']}>
      <mesh geometry={body} material={m.steelPolished} />
      {lugs.map(([sx, sy]) => (
        <RoundedBox key={`${sx}${sy}`} args={[3.4, 10, 5.2]} radius={1} smoothness={4}
          position={[sx * 11.7, sy * 19.4, Z.lugCenter]} rotation={[-sy * 0.12, 0, 0]} material={m.steelBrushed} />
      ))}
    </PartGroup>
  );
}

export function Caseback10() {
  const m = useMats();
  const geo = useMemo(() => lathe([[0, 0], [R.back - 1.2, 0], [R.back, 0.6], [R.back, Z.backTop], [0, Z.backTop]]), []);
  return (
    <PartGroup id="10" offset={EXPLODE['10']}>
      <mesh geometry={geo} material={m.steelBrushed} />
    </PartGroup>
  );
}

export function Bezel02() {
  const m = useMats();
  const ring = useMemo(() => lathe([
    [R.bezelInner, Z.caseTop], [R.bezelOuter, Z.caseTop], [R.bezelOuter, Z.caseTop + 1.4],
    [R.bezelOuter - 0.6, Z.bezelTop], [R.bezelInner, Z.bezelTop], [R.bezelInner, Z.caseTop],
  ]), []);
  const insert = useMemo(() => new THREE.RingGeometry(R.insertInner, R.insertOuter, 128), []);
  return (
    <PartGroup id="02" offset={EXPLODE['02']}>
      <mesh geometry={ring} material={m.steelPolished} />
      <mesh geometry={insert} material={m.bezelInsert} position={[0, 0, Z.bezelTop + 0.02]} />
    </PartGroup>
  );
}

export function Crystal22() {
  const m = useMats();
  const geo = useMemo(() => lathe([
    [0, Z.bezelTop - 0.6], [R.crystal, Z.bezelTop - 0.6], [R.crystal, Z.crystalTop - 0.4],
    [R.crystal - 0.5, Z.crystalTop], [0, Z.crystalTop],
  ]), []);
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
  return (
    <PartGroup id="15" offset={EXPLODE['15']}>
      <mesh geometry={face} material={m.dial} position={[0, 0, Z.dial]} />
      <mesh geometry={plate} material={m.steelDark} />
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

function swordShape(len: number, w: number, tail: number) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.35, -tail); s.lineTo(w * 0.35, -tail); s.lineTo(w / 2, len * 0.75);
  s.lineTo(0, len); s.lineTo(-w / 2, len * 0.75); s.closePath();
  return s;
}

const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });

/** Hands set to 10:10:35. */
export function Hands18() {
  const m = useMats();
  const g = useMemo(() => ({
    hour: extrude(swordShape(8.5, 1.8, 1.5), 0.25),
    hourLume: extrude(swordShape(6.2, 0.9, -1.2), 0.05),
    minute: extrude(swordShape(13, 1.4, 2), 0.25),
    minuteLume: extrude(swordShape(10, 0.7, -1.5), 0.05),
    cap: cylinderZ(1.1, 0, 0.35, 32),
  }), []);
  const turn = (f: number) => -f * Math.PI * 2;
  return (
    <PartGroup id="18" offset={EXPLODE['18']}>
      <group position={[0, 0, Z.dial + 0.7]} rotation={[0, 0, turn((10 + 10 / 60) / 12)]}>
        <mesh geometry={g.hour} material={m.steelPolished} />
        <mesh geometry={g.hourLume} material={m.lume} position={[0, 0, 0.3]} />
      </group>
      <group position={[0, 0, Z.dial + 1.05]} rotation={[0, 0, turn(10 / 60)]}>
        <mesh geometry={g.minute} material={m.steelPolished} />
        <mesh geometry={g.minuteLume} material={m.lume} position={[0, 0, 0.3]} />
      </group>
      <group position={[0, 0, Z.dial + 1.4]} rotation={[0, 0, turn(35 / 60)]}>
        <mesh material={m.steelPolished} position={[0, 4, 0]}><boxGeometry args={[0.3, 16, 0.15]} /></mesh>
        <mesh material={m.lume} position={[0, 9, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.8, 0.8, 0.15, 24]} /></mesh>
      </group>
      <mesh geometry={g.cap} material={m.steelPolished} position={[0, 0, Z.dial + 1.55]} />
    </PartGroup>
  );
}
