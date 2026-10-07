import type { Dispatch } from 'react';
import { PART_BY_ID } from '../data/parts';
import { isPresent } from '../data/config';
import type { Action, SelectionState } from '../state/selection';

export function SymptomPanel({ state, dispatch }: { state: SelectionState; dispatch: Dispatch<Action> }) {
  if (!state.activeId) return <section className="panel"><p className="note">Selecione uma peça no relógio ou na lista.</p></section>;
  const part = PART_BY_ID[state.activeId];
  const marked = state.sintomas[part.id] ?? [];
  return (
    <section className="panel">
      <h2>{part.id} — {part.nome}</h2>
      {!isPresent(part.id, state.config) && <p className="note">Peça não visível na configuração atual.</p>}
      <fieldset>
        <legend className="note">Sintomas</legend>
        {part.sintomas.map((s) => (
          <label key={s}>
            <input type="checkbox" checked={marked.includes(s)}
              onChange={() => dispatch({ type: 'toggleSymptom', id: part.id, sintoma: s })} />
            {s}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
