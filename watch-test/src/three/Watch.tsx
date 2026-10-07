import { useCallback, useMemo, useRef, type Dispatch, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { PART_BY_ID, PART_IDS, type PartId } from '../data/parts';
import { isPresent } from '../data/config';
import { partState, pickPart } from '../state/picking';
import type { Action, SelectionState } from '../state/selection';
import { PART_COMPONENTS } from './parts';
import { WatchViewContext, findPartId, type WatchView } from './view';

const EXPLODE_SECONDS = 0.9;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface WatchProps {
  state: SelectionState;
  dispatch: Dispatch<Action>;
  hoverId: PartId | null;
  onHover: (id: PartId | null, at?: { x: number; y: number }) => void;
  groups: MutableRefObject<Map<PartId, THREE.Object3D>>;
}

export function Watch({ state, dispatch, hoverId, onHover, groups }: WatchProps) {
  const explode = useRef(0);
  const raw = useRef(0);
  useFrame((_, dt) => {
    const dir = state.view === 'explodido' ? 1 : -1;
    raw.current = Math.min(1, Math.max(0, raw.current + (dir * dt) / EXPLODE_SECONDS));
    explode.current = easeInOut(raw.current);
  });

  const register = useCallback((id: PartId, obj: THREE.Object3D | null) => {
    if (obj) groups.current.set(id, obj); else groups.current.delete(id);
  }, [groups]);

  const view = useMemo<WatchView>(() => ({
    explode, register,
    stateOf: (id) => partState(id, state.activeId, hoverId, !!state.sintomas[id]?.length),
    defectCount: (id) => state.sintomas[id]?.length ?? 0,
  }), [register, state.activeId, state.sintomas, hoverId]);

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    pickPart(e.intersections.map((i) => ({ partId: findPartId(i.object), distance: i.distance })));

  return (
    <WatchViewContext.Provider value={view}>
      <group
        onPointerMove={(e) => { e.stopPropagation(); onHover(pick(e), { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }); }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 4) return; // a drag that orbited the camera is not a click
          const id = pick(e);
          if (id) dispatch({ type: 'select', id });
        }}
      >
        {PART_IDS.filter((id) => isPresent(id, state.config) && (state.view === 'explodido' || !PART_BY_ID[id].interna)).map((id) => {
          const C = PART_COMPONENTS[id];
          return C ? <C key={id} config={state.config} /> : null;
        })}
      </group>
    </WatchViewContext.Provider>
  );
}
