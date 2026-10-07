import type { Dispatch } from 'react';
import { PARTS } from '../data/parts';
import type { Action, SelectionState } from '../state/selection';

export function PartList({ state, dispatch }: { state: SelectionState; dispatch: Dispatch<Action> }) {
  return (
    <nav aria-label="Peças">
      <ul className="parts">
        {PARTS.map((p) => {
          const n = state.sintomas[p.id]?.length ?? 0;
          return (
            <li key={p.id}>
              <button type="button" aria-current={state.activeId === p.id ? 'true' : undefined}
                onClick={() => dispatch({ type: 'selectFromList', id: p.id })}>
                <span>{p.id} — {p.nome}</span>
                {n > 0 && <span className="badge" aria-label={`${n} sintoma(s)`}>{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
