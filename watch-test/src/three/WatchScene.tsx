import { Suspense, useEffect, useRef, type Dispatch } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Outline, Selection, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
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

const OUTLINE = parseInt(COLORS.hover.slice(1), 16);

/** Marks the scene ready for scripts/preview.py once everything inside Suspense has loaded. */
function Ready() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    (window as unknown as { __app: unknown }).__app = { renderer: gl, scene, camera, ready: true };
  }, [gl, scene, camera]);
  return null;
}

export function WatchScene({ state, dispatch, hoverId, onHover }: WatchSceneProps) {
  const groups = useRef(new Map<PartId, THREE.Object3D>());
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: false }}
      camera={{ fov: 28, near: 1, far: 4000, position: VIEWS.assembled.position }}
      onPointerMissed={() => dispatch({ type: 'select', id: null })}
    >
      <Suspense fallback={null}>
        <Selection>
          <EffectComposer multisampling={4} autoClear={false}>
            <Outline blur visibleEdgeColor={OUTLINE} hiddenEdgeColor={OUTLINE} edgeStrength={6} width={1200} />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          </EffectComposer>
          <Stage>
            <Watch state={state} dispatch={dispatch} hoverId={hoverId} onHover={onHover} groups={groups} />
          </Stage>
        </Selection>
        <Ready />
      </Suspense>
      <CameraRig groups={groups} activeId={state.activeId} explode={state.explode} />
    </Canvas>
  );
}
