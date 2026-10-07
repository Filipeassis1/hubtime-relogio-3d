import { Suspense, useEffect, useRef, type Dispatch } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, Outline, Selection, ToneMapping } from '@react-three/postprocessing';
import { KernelSize, ToneMappingMode } from 'postprocessing';
import type * as THREE from 'three';
import type { PartId } from '../data/parts';
import { COLORS, VIEWS } from '../data/watchParams';
import type { Action, SelectionState } from '../state/selection';
import { CameraRig } from './CameraRig';
import { Stage } from './Stage';
import { Watch } from './Watch';

export interface WatchSceneProps {
  state: SelectionState;
  dispatch: Dispatch<Action>;
  hoverId: PartId | null;
  onHover: (id: PartId | null, at?: { x: number; y: number }) => void;
}

const OUTLINE = parseInt(COLORS.selected.slice(1), 16);
const OUTLINE_HIDDEN = 0x9fb4d8;

/** Marks the scene ready for scripts/preview.py once everything inside Suspense has loaded. */
function Ready() {
  const { gl, scene, camera, controls } = useThree();
  useEffect(() => {
    const w = window as unknown as { __app?: Record<string, unknown> };
    w.__app = Object.assign(w.__app ?? {}, { renderer: gl, scene, camera, controls, ready: true });
  }, [gl, scene, camera, controls]);
  return null;
}

export function WatchScene({ state, dispatch, hoverId, onHover }: WatchSceneProps) {
  const groups = useRef(new Map<PartId, THREE.Object3D>());
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: false, preserveDrawingBuffer: true }} // keeps the frame readable for screenshot capture
      camera={{ fov: 28, near: 1, far: 4000, position: VIEWS.frente.position }}
      onPointerMissed={() => dispatch({ type: 'select', id: null })}
    >
      <Suspense fallback={null}>
        <Selection>
          <EffectComposer multisampling={4} autoClear={false}>
            <N8AO aoRadius={2.5} distanceFalloff={1} intensity={2.2} quality="high" />
            <Outline blur kernelSize={KernelSize.VERY_SMALL} visibleEdgeColor={OUTLINE} hiddenEdgeColor={OUTLINE_HIDDEN} edgeStrength={12} width={2000} />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          </EffectComposer>
          <Stage>
            <Watch state={state} dispatch={dispatch} hoverId={hoverId} onHover={onHover} groups={groups} />
          </Stage>
        </Selection>
        <Ready />
      </Suspense>
      <CameraRig groups={groups} activeId={state.activeId} view={state.view} />
    </Canvas>
  );
}
