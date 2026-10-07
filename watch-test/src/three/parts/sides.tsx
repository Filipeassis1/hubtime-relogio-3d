import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { cylinderX, lathe } from '../geom';
import { useMats } from '../materials';
import { HitProxy, PartGroup } from '../view';

const CROWN_X0 = R.case + 1.2;     // crown starts just outside the case, after the tube
const CROWN_LEN = 3.4;

export function Crown07() {
  const m = useMats();
  const g = useMemo(() => ({
    body: cylinderX(R.crown, CROWN_X0, CROWN_X0 + CROWN_LEN, 48),
    tube: cylinderX(1.6, R.case - 0.2, CROWN_X0, 24),
    ridge: new THREE.BoxGeometry(CROWN_LEN - 0.4, 0.7, 0.5),
  }), []);
  const ridges = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const n = 30, mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      e.set(a, 0, 0);
      q.setFromEuler(e);
      mtx.compose(new THREE.Vector3(CROWN_X0 + CROWN_LEN / 2, Math.cos(a) * R.crown, Math.sin(a) * R.crown), q, new THREE.Vector3(1, 1, 1));
      ridges.current.setMatrixAt(i, mtx);
    }
    ridges.current.instanceMatrix.needsUpdate = true;
    ridges.current.computeBoundingSphere();
  }, []);
  return (
    <PartGroup id="07" offset={EXPLODE['07']}>
      <group position={[0, 0, Z.sideCenter]}>
        <mesh geometry={g.body} material={m.steelPolished} />
        <mesh geometry={g.tube} material={m.steelBrushed} />
        <instancedMesh ref={ridges} args={[g.ridge, m.steelPolished, 30]} />
      </group>
    </PartGroup>
  );
}

export function Tige21() {
  const m = useMats();
  const rod = useMemo(() => cylinderX(0.45, 8, CROWN_X0 + 0.5, 16), []);
  return (
    <PartGroup id="21" offset={EXPLODE['21']}
      proxy={<HitProxy position={[(8 + CROWN_X0) / 2, 0, Z.sideCenter]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.4, 1.4, CROWN_X0 - 8, 8]} />
      </HitProxy>}>
      <mesh geometry={rod} material={m.steelPolished} position={[0, 0, Z.sideCenter]} />
    </PartGroup>
  );
}

/** Two chronograph pushers at 2h and 4h. */
export function Pushers03() {
  const m = useMats();
  const angles = [Math.PI / 6, -Math.PI / 6];
  const r = R.case + 2.2;
  return (
    <PartGroup id="03" offset={EXPLODE['03']}>
      {angles.map((a) => (
        <group key={a} position={[Math.cos(a) * r, Math.sin(a) * r, Z.sideCenter]} rotation={[0, 0, a - Math.PI / 2]}>
          <mesh material={m.steelPolished}><cylinderGeometry args={[1.7, 1.7, 3.2, 32]} /></mesh>
          <mesh material={m.steelBrushed} position={[0, -2.2, 0]}><cylinderGeometry args={[1.2, 1.2, 1.6, 24]} /></mesh>
        </group>
      ))}
    </PartGroup>
  );
}

/** Resin bumper around the case (toggle). */
export function ResinCover05() {
  const m = useMats();
  const geo = useMemo(() => lathe([
    [20.7, 0.6], [22.4, 0.6], [23.4, 1.8], [23.6, 8.0], [22.6, 9.8], [20.7, 9.8], [20.7, 0.6],
  ]), []);
  return (
    <PartGroup id="05" offset={EXPLODE['05']}>
      <mesh geometry={geo} material={m.resin} />
    </PartGroup>
  );
}
