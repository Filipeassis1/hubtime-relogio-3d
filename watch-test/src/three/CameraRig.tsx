import { useEffect, useRef, type ComponentRef, type MutableRefObject } from 'react';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PartId } from '../data/parts';
import { VIEWS } from '../data/watchParams';

const EXPLODE_MS = 950;

export function CameraRig({ groups, activeId, explode }: {
  groups: MutableRefObject<Map<PartId, THREE.Object3D>>; activeId: PartId | null; explode: boolean;
}) {
  const ref = useRef<ComponentRef<typeof CameraControls>>(null);
  const prevExplode = useRef(explode);
  useEffect(() => {
    const explodeChanged = prevExplode.current !== explode;
    prevExplode.current = explode;
    const focus = () => {
      const c = ref.current;
      if (!c) return;
      const view = explode ? VIEWS.exploded : VIEWS.assembled;
      const obj = activeId ? groups.current.get(activeId) : undefined;
      if (!obj) { void c.setLookAt(...view.position, ...view.target, true); return; }
      const s = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
      void c.setTarget(s.center.x, s.center.y, s.center.z, true);
      void c.dollyTo(THREE.MathUtils.clamp(s.radius * 7, 70, 260), true);
    };
    // wait for the explode animation so the part's box is measured where it ends up
    const t = window.setTimeout(focus, explodeChanged && activeId ? EXPLODE_MS : 0);
    return () => window.clearTimeout(t);
  }, [activeId, explode, groups]);
  return <CameraControls ref={ref} makeDefault minDistance={50} maxDistance={600} smoothTime={0.35} />;
}
