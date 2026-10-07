import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BAND, EXPLODE, R, Z } from '../../data/watchParams';
import { bandFrame, sweepBand } from '../geom';
import { useMats } from '../materials';
import { ExplodeShift, HitProxy, PartGroup } from '../view';
import type { PartComponentProps } from './index';

type Sign = 1 | -1;
const SIDES: Sign[] = [1, -1];
const links = (sign: Sign) => (sign === 1 ? BAND.linksTop : BAND.linksBottom);
const linkS = (i: number) => BAND.endLink + i * BAND.pitch + BAND.pitch / 2;
const CLASP_S = BAND.endLink + BAND.linksBottom * BAND.pitch + BAND.claspLength / 2;
const leatherLen = (sign: Sign) => (sign === 1 ? BAND.halfLength - 1 : 62); // tail side closes the loop, buckle side shorter
const KEEPER_S = 56;
const BUCKLE_S = 66;

/** Places something on the band path: local Y = along the band, local Z = band normal. */
function OnBand({ s, sign, lift = 0, children }: { s: number; sign: Sign; lift?: number; children: ReactNode }) {
  const f = bandFrame(s, sign);
  const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
  return <group position={[0, f.pos.y + ny * lift, f.pos.z + nz * lift]} rotation={[f.angle, 0, 0]}>{children}</group>;
}

function fillInstances(mesh: THREE.InstancedMesh, items: { s: number; sign: Sign; x: number; lift: number }[]) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  items.forEach((it, i) => {
    const f = bandFrame(it.s, it.sign);
    const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
    q.setFromEuler(e.set(f.angle, 0, 0));
    m.compose(new THREE.Vector3(it.x, f.pos.y + ny * it.lift, f.pos.z + nz * it.lift), q, one);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function SteelLinks({ sign }: { sign: Sign }) {
  const m = useMats();
  const g = useMemo(() => ({
    outer: new RoundedBoxGeometry(6, BAND.pitch - 0.4, 3.5, 3, 0.8),
    center: new RoundedBoxGeometry(8, BAND.pitch - 0.4, 3.0, 3, 0.8),
  }), []);
  const outer = useRef<THREE.InstancedMesh>(null!);
  const center = useRef<THREE.InstancedMesh>(null!);
  const n = links(sign);
  useLayoutEffect(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    fillInstances(outer.current, idx.flatMap((i) => [-7, 7].map((x) => ({ s: linkS(i), sign, x, lift: 0 }))));
    fillInstances(center.current, idx.map((i) => ({ s: linkS(i), sign, x: 0, lift: 0.2 })));
  }, [n, sign]);
  return (
    <>
      <instancedMesh ref={outer} args={[g.outer, m.steelBrushed, n * 2]} />
      <instancedMesh ref={center} args={[g.center, m.steelPolished, n]} />
    </>
  );
}

function LeatherSide({ sign }: { sign: Sign }) {
  const m = useMats();
  const geo = useMemo(() => sweepBand(sign, 0, leatherLen(sign), BAND.width, BAND.width - 2, 3.2), [sign]);
  return <mesh geometry={geo} material={m.leather} />;
}

/** 19 — steel bracelet or leather strap, both sides. */
export function Bracelet19({ config }: PartComponentProps) {
  return (
    <PartGroup id="19" offset={EXPLODE['19']}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 16, 0]}>
          {config.pulseira === 'aco' ? <SteelLinks sign={sign} /> : <LeatherSide sign={sign} />}
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}

/** 20 — end links between the lugs and the first link (steel only). */
export function EndLinks20() {
  const m = useMats();
  return (
    <PartGroup id="20" offset={EXPLODE['20']}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 8, 0]}>
          <OnBand s={BAND.endLink / 2} sign={sign}>
            <RoundedBox args={[BAND.width, BAND.endLink, 4.2]} radius={1} smoothness={3} material={m.steelPolished} />
          </OnBand>
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}

/** 09 — folding clasp (steel) or tang buckle (leather), on the 6h side. */
export function Clasp09({ config }: PartComponentProps) {
  const m = useMats();
  return (
    <PartGroup id="09" offset={EXPLODE['09']}>
      {config.pulseira === 'aco' ? (
        <ExplodeShift offset={[0, -30, 0]}>
          <OnBand s={CLASP_S} sign={-1} lift={-0.6}>
            <RoundedBox args={[21, BAND.claspLength, 5.5]} radius={1.5} smoothness={4} material={m.steelBrushed} />
            <mesh material={m.steelPolished} position={[0, 0, 2.85]}><boxGeometry args={[10, 12, 0.3]} /></mesh>
          </OnBand>
        </ExplodeShift>
      ) : (
        <ExplodeShift offset={[0, -26, 0]}>
          <OnBand s={BUCKLE_S} sign={-1}>
            <mesh material={m.steelPolished} position={[11, 0, 0]}><boxGeometry args={[2, 16, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[-11, 0, 0]}><boxGeometry args={[2, 16, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, 7, 0]}><boxGeometry args={[24, 2, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, -7, 0]}><boxGeometry args={[24, 2, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, 0, 1.6]} rotation={[0.15, 0, 0]}><boxGeometry args={[1.2, 14, 1.2]} /></mesh>
          </OnBand>
        </ExplodeShift>
      )}
    </PartGroup>
  );
}

/** 16 — leather keeper loop (leather only). */
export function Keeper16() {
  const m = useMats();
  return (
    <PartGroup id="16" offset={EXPLODE['16']}>
      <ExplodeShift offset={[0, -24, 0]}>
        <OnBand s={KEEPER_S} sign={-1}>
          <mesh material={m.leather} position={[0, 0, 2.4]}><boxGeometry args={[22, 4, 1]} /></mesh>
          <mesh material={m.leather} position={[0, 0, -2.4]}><boxGeometry args={[22, 4, 1]} /></mesh>
          <mesh material={m.leather} position={[10.5, 0, 0]}><boxGeometry args={[1, 4, 5.8]} /></mesh>
          <mesh material={m.leather} position={[-10.5, 0, 0]}><boxGeometry args={[1, 4, 5.8]} /></mesh>
        </OnBand>
      </ExplodeShift>
    </PartGroup>
  );
}

function LinkPins({ sign }: { sign: Sign }) {
  const m = useMats();
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.55, 0.55, BAND.width + 1.2, 12); g.rotateZ(Math.PI / 2); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = links(sign) + 1;
  useLayoutEffect(() => {
    fillInstances(ref.current, Array.from({ length: n }, (_, i) => ({ s: BAND.endLink + i * BAND.pitch, sign, x: 0, lift: 0 })));
  }, [n, sign]);
  return <instancedMesh ref={ref} args={[geo, m.steelPolished, n]} />;
}

/** 17 — link pins (steel) or spring bars at the lugs (leather). */
export function Pins17({ config }: PartComponentProps) {
  const m = useMats();
  if (config.pulseira === 'aco') {
    return (
      <PartGroup id="17" offset={EXPLODE['17']}>
        {SIDES.map((sign) => (
          <ExplodeShift key={sign} offset={[0, sign * 16, 0]}><LinkPins sign={sign} /></ExplodeShift>
        ))}
      </PartGroup>
    );
  }
  return (
    <PartGroup id="17" offset={EXPLODE['17']}
      proxy={SIDES.map((sign) => (
        <HitProxy key={sign} position={[0, sign * (R.lugEndY - 2.2), Z.lugCenter]}><boxGeometry args={[BAND.width, 3, 3]} /></HitProxy>
      ))}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 8, 0]}>
          <mesh material={m.steelPolished} position={[0, sign * (R.lugEndY - 2.2), Z.lugCenter]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.75, 0.75, BAND.width + 0.4, 16]} />
          </mesh>
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}
