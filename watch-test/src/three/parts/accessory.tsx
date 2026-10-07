import { RoundedBox } from '@react-three/drei';
import { EXPLODE } from '../../data/watchParams';
import { useMats } from '../materials';
import { PartGroup } from '../view';

const ARC = Math.PI * 1.3;
const RADIUS = 55;

/** 06 — chest strap with sensor pod, lying beside the watch. */
export function ChestStrap06() {
  const m = useMats();
  const mid = ARC / 2;
  return (
    <PartGroup id="06" offset={EXPLODE['06']}>
      <group position={[95, -38.3, -95]} rotation={[-Math.PI / 2, 0, 0.5]} scale={0.7}>
        <mesh material={m.silicone} scale={[1, 1, 3.5]}><torusGeometry args={[RADIUS, 2.6, 12, 120, ARC]} /></mesh>
        <group position={[Math.cos(mid) * RADIUS, Math.sin(mid) * RADIUS, 0]} rotation={[0, 0, mid + Math.PI / 2]}>
          <RoundedBox args={[36, 9, 26]} radius={3} smoothness={4} material={m.resin} />
          <mesh material={m.steelPolished} position={[-12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2, 2, 10, 24]} /></mesh>
          <mesh material={m.steelPolished} position={[12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2, 2, 10, 24]} /></mesh>
        </group>
      </group>
    </PartGroup>
  );
}
