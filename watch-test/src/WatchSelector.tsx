import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PART_BY_ID, type PartId } from './data/parts';
import { initState, reducer, toSelection, type Selection } from './state/selection';
import { WatchScene } from './three/WatchScene';
import { PartList } from './ui/PartList';
import { SymptomPanel } from './ui/SymptomPanel';
import { Toolbar } from './ui/Toolbar';
import './ui/styles.css';

export interface WatchSelectorProps {
  initial?: Selection;
  onChange?: (s: Selection) => void;
}

export function WatchSelector({ initial, onChange }: WatchSelectorProps) {
  const [state, dispatch] = useReducer(reducer, initial, initState);
  const [hover, setHover] = useState<{ id: PartId; x: number; y: number } | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const { config, sintomas } = state;
  const selection = useMemo(() => toSelection({ ...state, config, sintomas }), [config, sintomas]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChangeRef.current?.(selection);
  }, [selection]);

  // test/screenshot hook: lets scripts switch views and select parts without clicking
  useEffect(() => {
    const w = window as unknown as { __app?: Record<string, unknown> };
    w.__app = Object.assign(w.__app ?? {}, { dispatch });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch({ type: 'select', id: null }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onHover = useCallback((id: PartId | null, at?: { x: number; y: number }) => {
    setHover(id && at ? { id, ...at } : null);
    document.body.style.cursor = id ? 'pointer' : '';
  }, []);

  return (
    <div className="ws">
      <div className="ws-stage">
        <WatchScene state={state} dispatch={dispatch} hoverId={hover?.id ?? null} onHover={onHover} />
        {hover && (
          <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            {hover.id} — {PART_BY_ID[hover.id].nome}
          </div>
        )}
      </div>
      <aside className="ws-side">
        <Toolbar state={state} dispatch={dispatch} />
        <SymptomPanel state={state} dispatch={dispatch} />
        <PartList state={state} dispatch={dispatch} />
      </aside>
    </div>
  );
}
