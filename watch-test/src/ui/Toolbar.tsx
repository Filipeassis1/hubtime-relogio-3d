import type { Dispatch } from 'react';
import type { Action, SelectionState, ViewMode } from '../state/selection';

const VIEWS: [ViewMode, string][] = [['frente', 'Frente'], ['traseira', 'Traseira'], ['explodido', 'Explodido']];

export function Toolbar({ state, dispatch }: { state: SelectionState; dispatch: Dispatch<Action> }) {
  const { config } = state;
  return (
    <div className="toolbar" role="toolbar" aria-label="Visualização">
      <span className="seg" role="group" aria-label="Posição">
        {VIEWS.map(([v, label]) => (
          <button key={v} type="button" aria-pressed={state.view === v} onClick={() => dispatch({ type: 'setView', view: v })}>{label}</button>
        ))}
      </span>
      <span className="seg" role="group" aria-label="Pulseira">
        <button type="button" aria-pressed={config.pulseira === 'aco'} onClick={() => dispatch({ type: 'setConfig', config: { pulseira: 'aco' } })}>Aço</button>
        <button type="button" aria-pressed={config.pulseira === 'couro'} onClick={() => dispatch({ type: 'setConfig', config: { pulseira: 'couro' } })}>Couro</button>
      </span>
      <label>
        <input type="checkbox" checked={config.capaResina}
          onChange={(e) => dispatch({ type: 'setConfig', config: { capaResina: e.target.checked } })} />
        Capa de resina
      </label>
      <button type="button" onClick={() => dispatch({ type: 'clear' })}>Limpar seleção</button>
    </div>
  );
}
