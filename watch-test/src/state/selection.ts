import { PART_BY_ID, PART_IDS, isPartId, type PartId } from '../data/parts';
import { DEFAULT_CONFIG, configWith, type WatchConfig } from '../data/config';

export interface SelectedPart { id: PartId; nome: string; sintomas: string[] }
export interface Selection { modelo: 'geral'; config: WatchConfig; pecas: SelectedPart[] }

export type ViewMode = 'frente' | 'traseira' | 'explodido';

export interface SelectionState {
  config: WatchConfig;
  view: ViewMode;
  activeId: PartId | null;
  sintomas: Partial<Record<PartId, string[]>>;
}

export type Action =
  | { type: 'select'; id: PartId | null }
  | { type: 'selectFromList'; id: PartId }
  | { type: 'toggleSymptom'; id: PartId; sintoma: string }
  | { type: 'setConfig'; config: Partial<WatchConfig> }
  | { type: 'setView'; view: ViewMode }
  | { type: 'clear' };

export function initState(initial?: Selection): SelectionState {
  const config: WatchConfig = {
    pulseira: initial?.config?.pulseira === 'couro' ? 'couro' : DEFAULT_CONFIG.pulseira,
    capaResina: initial?.config?.capaResina === true,
  };
  const sintomas: Partial<Record<PartId, string[]>> = {};
  for (const p of initial?.pecas ?? []) {
    if (!isPartId(p.id)) continue;
    const valid = PART_BY_ID[p.id].sintomas.filter((x) => p.sintomas?.includes(x));
    if (valid.length) sintomas[p.id] = valid;
  }
  return { config, view: 'frente', activeId: null, sintomas };
}

export function reducer(s: SelectionState, a: Action): SelectionState {
  switch (a.type) {
    case 'select':
      return s.activeId === a.id ? s : { ...s, activeId: a.id };
    case 'selectFromList':
      return {
        ...s,
        activeId: a.id,
        config: configWith(a.id, s.config),
        view: PART_BY_ID[a.id].interna ? 'explodido' : s.view,
      };
    case 'toggleSymptom': {
      const def = PART_BY_ID[a.id];
      if (!def.sintomas.includes(a.sintoma)) return s;
      const cur = s.sintomas[a.id] ?? [];
      const next = cur.includes(a.sintoma) ? cur.filter((x) => x !== a.sintoma) : [...cur, a.sintoma];
      const ordered = def.sintomas.filter((x) => next.includes(x));
      const sintomas = { ...s.sintomas };
      if (ordered.length) sintomas[a.id] = ordered;
      else delete sintomas[a.id];
      return { ...s, sintomas };
    }
    case 'setConfig':
      return { ...s, config: { ...s.config, ...a.config } };
    case 'setView':
      return s.view === a.view ? s : { ...s, view: a.view };
    case 'clear':
      return { ...s, activeId: null, sintomas: {} };
  }
}

export function toSelection(s: SelectionState): Selection {
  return {
    modelo: 'geral',
    config: { ...s.config },
    pecas: PART_IDS.filter((id) => s.sintomas[id]?.length).map((id) => ({
      id, nome: PART_BY_ID[id].nome, sintomas: [...(s.sintomas[id] ?? [])],
    })),
  };
}
