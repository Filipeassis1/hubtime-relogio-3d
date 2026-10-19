import { useMemo } from 'react';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { PROFILE } from '../../data/profiles';
import { cylinderZ, lathe } from '../geom';
import { useMats } from '../materials';
import { HitProxy, PartGroup } from '../view';

/** O-ring sealing the caseback. */
export function Anel01() {
  const m = useMats();
  return (
    <PartGroup id="01" offset={EXPLODE['01']}
      proxy={<HitProxy whenExploded position={[0, 0, Z.backTop]}><torusGeometry args={[16.9, 1.6, 8, 64]} /></HitProxy>}>
      <mesh material={m.rubber} position={[0, 0, Z.backTop]}><torusGeometry args={[16.9, 0.45, 12, 128]} /></mesh>
    </PartGroup>
  );
}

/** Crystal gasket under the bezel. */
export function Junta12() {
  const m = useMats();
  const geo = useMemo(() => lathe(PROFILE.junta), []);
  return (
    <PartGroup id="12" offset={EXPLODE['12']}
      proxy={<HitProxy whenExploded position={[0, 0, 10.3]}><torusGeometry args={[R.crystal + 0.3, 1.6, 8, 64]} /></HitProxy>}>
      <mesh geometry={geo} material={m.rubber} />
    </PartGroup>
  );
}

export function Movement13() {
  const m = useMats();
  const [z0, z1] = Z.movement;
  const body = useMemo(() => cylinderZ(R.movement, z0, z1), [z0, z1]);
  const jewels: [number, number][] = [[-6, 5], [3, 7], [7, -1], [-2, -8]];
  return (
    <PartGroup id="13" offset={EXPLODE['13']}>
      <mesh geometry={body} material={m.brass} />
      <mesh material={m.steelPolished} position={[0, 4, z1 + 0.3]}><boxGeometry args={[18, 5, 0.6]} /></mesh>
      <mesh material={m.steelPolished} position={[-5, -5, z1 + 0.3]} rotation={[0, 0, 0.5]}><boxGeometry args={[10, 6, 0.6]} /></mesh>
      <mesh material={m.steelPolished} position={[6, -5, z1 + 0.5]}><torusGeometry args={[3.2, 0.35, 12, 48]} /></mesh>
      <mesh material={m.steelPolished} position={[6, -5, z1 + 0.5]}><boxGeometry args={[6.4, 0.5, 0.3]} /></mesh>
      {jewels.map(([x, y]) => (
        <mesh key={`${x}${y}`} material={m.jewel} position={[x, y, z1 + 0.65]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.2, 16]} />
        </mesh>
      ))}
    </PartGroup>
  );
}

export function Module14() {
  const m = useMats();
  const [z0, z1] = Z.module;
  const board = useMemo(() => cylinderZ(14.5, z0, z1), [z0, z1]);
  return (
    <PartGroup id="14" offset={EXPLODE['14']}>
      <mesh geometry={board} material={m.pcb} />
      <mesh material={m.chip} position={[4, 3, z1 + 0.2]}><boxGeometry args={[5, 5, 0.4]} /></mesh>
      <mesh material={m.chip} position={[-6, 2, z1 + 0.15]}><boxGeometry args={[3, 2, 0.3]} /></mesh>
      <mesh material={m.steelPolished} position={[0, -7.6, z1 + 0.15]}><boxGeometry args={[9, 1.2, 0.3]} /></mesh>
    </PartGroup>
  );
}
