import { createContext, useContext, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { PartId } from '../data/parts';
import { PIN_ANCHOR, type Vec3 } from '../data/watchParams';
import type { PartState } from '../state/picking';

export interface WatchView {
  explode: MutableRefObject<number>;
  stateOf: (id: PartId) => PartState;
  defectCount: (id: PartId) => number;
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

interface Orig { color?: THREE.Color; envMapIntensity: number }

/** Unselected parts get slightly darker while another part is active — always opaque, materials stay true. */
function applyState(root: THREE.Object3D, state: PartState) {
  const dim = state === 'dimmed';
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.hitProxy) return;
    for (const mat of ([] as THREE.Material[]).concat(mesh.material)) {
      const m = mat as THREE.MeshStandardMaterial;
      const orig = (m.userData.orig ??= { color: m.color?.clone(), envMapIntensity: m.envMapIntensity ?? 1 }) as Orig;
      if (m.color && orig.color) m.color.copy(orig.color).multiplyScalar(dim ? 0.8 : 1);
      if (m.envMapIntensity !== undefined) m.envMapIntensity = orig.envMapIntensity * (dim ? 0.7 : 1);
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
const HIDDEN_LAYER = 31; // raycaster only tests layer 0

/** `whenExploded`: internal parts are hidden while assembled, so their proxy must not steal the pointer then. */
export function HitProxy({ position, rotation, whenExploded = false, children }: {
  position?: Vec3; rotation?: Vec3; whenExploded?: boolean; children: ReactNode;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const { explode } = useWatchView();
  useFrame(() => {
    if (whenExploded) ref.current.layers.set(explode.current > 0.5 ? 0 : HIDDEN_LAYER);
  });
  return <mesh ref={ref} position={position} rotation={rotation} material={PROXY_MAT} userData={{ hitProxy: true }}>{children}</mesh>;
}

/** The part contract: ID for picking, exploded offset, highlight state, outline, defect pin, registration for camera focus. */
export function PartGroup({ id, offset, proxy, children }: { id: PartId; offset: Vec3; proxy?: ReactNode; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const view = useWatchView();
  const state = view.stateOf(id);
  const defects = view.defectCount(id);
  const { register } = view;
  const [anchor, setAnchor] = useState<Vec3 | null>(PIN_ANCHOR[id] ?? null);
  useLayoutEffect(() => { register(id, ref.current); return () => register(id, null); }, [id, register]);
  useLayoutEffect(() => applyState(ref.current, state), [state]);
  useLayoutEffect(() => {
    if (anchor) return;
    const g = ref.current, saved = g.position.clone();
    g.position.set(0, 0, 0); g.updateWorldMatrix(true, true);
    const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
    g.position.copy(saved);
    setAnchor([c.x, c.y, c.z]);
  }, [anchor]);
  useFrame(() => { const t = view.explode.current; ref.current.position.set(offset[0] * t, offset[1] * t, offset[2] * t); });
  return (
    <group ref={ref} userData={{ partId: id }}>
      <Select enabled={state === 'selected' || state === 'hover'}>{children}</Select>
      {proxy}
      {defects > 0 && anchor && (
        <Html position={anchor} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pin" title={`${defects} sintoma(s)`}>{defects}</div>
        </Html>
      )}
    </group>
  );
}
