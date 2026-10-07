import { createContext, useContext, useLayoutEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { PartId } from '../data/parts';
import { COLORS, type Vec3 } from '../data/watchParams';
import type { PartState } from '../state/picking';

export interface WatchView {
  explode: MutableRefObject<number>;
  stateOf: (id: PartId) => PartState;
  register: (id: PartId, obj: THREE.Object3D | null) => void;
}

export const WatchViewContext = createContext<WatchView | null>(null);

export function useWatchView(): WatchView {
  const v = useContext(WatchViewContext);
  if (!v) throw new Error('useWatchView must be used inside <Watch>');
  return v;
}

export function findPartId(o: THREE.Object3D | null): string | undefined {
  for (let n = o; n; n = n.parent) if (n.userData.partId) return n.userData.partId as string;
  return undefined;
}

const TINT: Partial<Record<PartState, [string, number]>> = {
  selected: [COLORS.selected, 0.35], hover: [COLORS.hover, 0.22], defect: [COLORS.defect, 0.35],
};

interface Orig { emissive?: THREE.Color; emissiveIntensity: number; transparent: boolean; opacity: number; depthWrite: boolean }

function applyState(root: THREE.Object3D, state: PartState) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.hitProxy) return;
    for (const mat of ([] as THREE.Material[]).concat(mesh.material)) {
      const m = mat as THREE.MeshStandardMaterial;
      const orig = (m.userData.orig ??= {
        emissive: m.emissive?.clone(), emissiveIntensity: m.emissiveIntensity ?? 0,
        transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite,
      }) as Orig;
      const tint = TINT[state];
      if (m.emissive && orig.emissive) {
        if (tint) { m.emissive.set(tint[0]); m.emissiveIntensity = tint[1]; }
        else { m.emissive.copy(orig.emissive); m.emissiveIntensity = orig.emissiveIntensity; }
      }
      const dim = state === 'dimmed';
      m.transparent = dim || orig.transparent;
      m.opacity = dim ? 0.28 : orig.opacity;
      m.depthWrite = dim ? false : orig.depthWrite;
      m.needsUpdate = true;
    }
  });
}

/** Moves its children by offset × explode, every frame. */
export function ExplodeShift({ offset, children }: { offset: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const { explode } = useWatchView();
  useFrame(() => { const t = explode.current; ref.current.position.set(offset[0] * t, offset[1] * t, offset[2] * t); });
  return <group ref={ref}>{children}</group>;
}

/** Invisible, pickable volume that makes tiny parts easier to click. */
const PROXY_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export function HitProxy({ position, rotation, children }: { position?: Vec3; rotation?: Vec3; children: ReactNode }) {
  return <mesh position={position} rotation={rotation} material={PROXY_MAT} userData={{ hitProxy: true }}>{children}</mesh>;
}

/** The part contract: ID for picking, exploded offset, highlight state, outline, registration for camera focus. */
export function PartGroup({ id, offset, proxy, children }: { id: PartId; offset: Vec3; proxy?: ReactNode; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const view = useWatchView();
  const state = view.stateOf(id);
  const { register } = view;
  useLayoutEffect(() => { register(id, ref.current); return () => register(id, null); }, [id, register]);
  useLayoutEffect(() => applyState(ref.current, state), [state]);
  useFrame(() => { const t = view.explode.current; ref.current.position.set(offset[0] * t, offset[1] * t, offset[2] * t); });
  return (
    <group ref={ref} userData={{ partId: id }}>
      <Select enabled={state === 'selected' || state === 'hover'}>{children}</Select>
      {proxy}
    </group>
  );
}
