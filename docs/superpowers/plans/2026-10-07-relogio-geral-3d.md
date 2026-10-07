# Relógio geral 3D — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Componente React `<WatchSelector>` com um relógio 3D ana-digi que contém as 22 peças do OS HubTime, onde o técnico seleciona peças e marca sintomas, e o componente devolve a seleção estruturada.

**Architecture:** Vite + React + TS. A lógica (peças, configuração, seleção, picking) é TypeScript puro e testado. A cena é React Three Fiber: cada peça é um componente procedural envolvido por `PartGroup` (ID, deslocamento da vista explodida, destaque). A UI (lista, sintomas, toolbar) é DOM e conversa com a cena por um reducer.

**Tech Stack:** React 19, TypeScript, Vite, three ^0.186, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing 3, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-07-relogio-geral-3d-design.md`

## Global Constraints

- Uso somente desktop (mouse + teclado); React.
- Unidade de cena: 1 unidade = 1 mm. Medidas do sheet: caixa Ø42, espessura 12,5, lug to lug 48, largura entre asas 20, bezel 2, vidro 1,8, coroa Ø6,5, pulseira 180 aberta, espessura da pulseira 3,5.
- Paleta: `#1F4EBC` azul, `#C7CCD4` aço claro, `#7E8794` aço escuro/sombra, `#F7F8FA` branco, `#1B1F24` preto, `#C7A44B` dourado.
- Textos de peças e sintomas exatamente como no apêndice A da spec.
- Saída: `{ modelo: 'geral', config: { pulseira: 'aco' | 'couro', capaResina: boolean }, pecas: [{ id, nome, sintomas }] }`, só peças com ≥1 sintoma, na ordem 01→22 e sintomas na ordem do PDF.
- Configuração padrão: pulseira de aço, capa de resina desligada.
- Trocar configuração nunca apaga sintomas já marcados.
- Tone mapping Neutral; câmera FOV 28.
- Gerenciador de pacotes: npm. Raiz do repositório git: `simontime/`. App: `simontime/watch-test/`.

## Review Focus

1. **Clique através do vidro**: clicar no mostrador/ponteiros com o vidro na frente deve selecionar o que está atrás, não o vidro (vidro só quando é o único alvo). → `pickPart` em Task 2.
2. **Peça ausente pela lista**: clicar "16 — Passador" com pulseira de aço deve trocar para couro e selecionar; peça interna deve explodir a vista. → reducer em Task 2 e fluxo em Task 8.
3. **Trocar configuração mantém sintomas**: marcar sintoma no 16, voltar para aço → 16 continua na saída. → Task 2 e Task 8.
4. **Desmarcar o último sintoma**: a peça sai de `pecas` mas continua ativa no painel. → Task 2.
5. **`initial` inválido**: IDs desconhecidos ou sintomas que não existem são descartados sem quebrar. → Task 2.

---

### Task 1: Projeto, dados das 22 peças e regras de configuração

**Files:**
- Create: `watch-test/` (scaffold Vite react-ts)
- Modify: `watch-test/vite.config.ts`, `watch-test/package.json`, `watch-test/index.html`, `watch-test/.gitignore`
- Create: `watch-test/src/test/setup.ts`
- Create: `watch-test/src/data/parts.ts`, `watch-test/src/data/config.ts`
- Test: `watch-test/src/data/parts.test.ts`, `watch-test/src/data/config.test.ts`

**Interfaces:**
- Produces:
  - `PART_IDS: readonly ['01', …, '22']`, `type PartId`, `isPartId(v: unknown): v is PartId`
  - `interface PartDef { id: PartId; nome: string; grupo: PartGrupo; interna: boolean; sintomas: readonly string[] }`
  - `PARTS: readonly PartDef[]`, `PART_BY_ID: Record<PartId, PartDef>`
  - `type Pulseira = 'aco' | 'couro'`, `interface WatchConfig { pulseira: Pulseira; capaResina: boolean }`, `DEFAULT_CONFIG`
  - `isPresent(id: PartId, c: WatchConfig): boolean`, `configWith(id: PartId, c: WatchConfig): WatchConfig`

- [ ] **Step 1: Git e scaffold**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git init
npm create vite@latest watch-test -- --template react-ts
```
(Se o create-vite perguntar se deve instalar e iniciar agora, responda **No**.)

```bash
cd watch-test
npm install
npm install three@^0.186 @react-three/fiber@^9 @react-three/drei@^10 @react-three/postprocessing@^3 postprocessing@^6
npm install -D @types/three vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 2: Configuração de teste e scripts**

`watch-test/vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
```

`watch-test/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

Em `watch-test/package.json`, dentro de `"scripts"`, adicione:
```json
"test": "vitest run",
"typecheck": "tsc -b"
```

Em `watch-test/index.html`, troque o `<title>` por `<title>Relógio geral — teste</title>` e remova o `<link rel="icon" …>`.

Acrescente ao final de `watch-test/.gitignore`:
```
shots/
```

- [ ] **Step 3: Teste dos dados das peças (falhando)**

`watch-test/src/data/parts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { PARTS, PART_BY_ID, PART_IDS, isPartId } from './parts';

describe('parts', () => {
  it('tem as 22 peças com IDs 01–22 únicos e em ordem', () => {
    expect(PARTS).toHaveLength(22);
    expect(PARTS.map((p) => p.id)).toEqual([...PART_IDS]);
    expect(new Set(PART_IDS).size).toBe(22);
  });

  it('toda peça tem pelo menos 4 sintomas sem duplicatas', () => {
    for (const p of PARTS) {
      expect(p.sintomas.length).toBeGreaterThanOrEqual(4);
      expect(new Set(p.sintomas).size).toBe(p.sintomas.length);
    }
  });

  it('transcreve nomes e sintomas do PDF', () => {
    expect(PART_BY_ID['07'].nome).toBe('Coroa');
    expect(PART_BY_ID['07'].sintomas).toEqual([
      'Solta / Saindo na mão', 'Travada / Duro de girar', 'Amassada / Gastado o estriado', 'Não rosqueia', 'Ausente',
    ]);
    expect(PART_BY_ID['11'].sintomas).toEqual([
      'Solto dentro do mostrador', 'Ausente / Faltando', 'Desbotado / Oxidado', 'Desalinhado',
    ]);
    expect(PART_BY_ID['22'].sintomas).toEqual([
      'Arranhado', 'Trincado / Quebrado', 'Riscado no tratamento antirreflexo', 'Embaçado (Umidade interna)', 'Descolado / Solto',
    ]);
    expect(PART_BY_ID['06'].nome).toBe('Cinta (Monitor Cardíaco / Sensor)');
  });

  it('marca como internas 01, 12, 13, 14 e 21', () => {
    expect(PARTS.filter((p) => p.interna).map((p) => p.id)).toEqual(['01', '12', '13', '14', '21']);
  });

  it('isPartId valida', () => {
    expect(isPartId('05')).toBe(true);
    expect(isPartId('23')).toBe(false);
    expect(isPartId(5)).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `cd watch-test && npx vitest run src/data/parts.test.ts`
Expected: FAIL — `Failed to resolve import "./parts"`.

- [ ] **Step 5: Implementar `parts.ts`**

`watch-test/src/data/parts.ts`:
```ts
export const PART_IDS = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11',
  '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22',
] as const;

export type PartId = (typeof PART_IDS)[number];
export type PartGrupo = 'cabeca' | 'laterais' | 'interno' | 'traseira' | 'capa' | 'pulseira' | 'acessorio';

export interface PartDef {
  id: PartId;
  nome: string;
  grupo: PartGrupo;
  interna: boolean;
  sintomas: readonly string[];
}

export const isPartId = (v: unknown): v is PartId =>
  typeof v === 'string' && (PART_IDS as readonly string[]).includes(v);

export const PARTS: readonly PartDef[] = [
  { id: '01', nome: 'Anel de Vedação', grupo: 'interno', interna: true,
    sintomas: ['Ressecado', 'Rompido / Cortado', 'Deformado / Fora de medida', 'Ausente'] },
  { id: '02', nome: 'Aro / Bezel', grupo: 'cabeca', interna: false,
    sintomas: ['Arranhado', 'Amassado / Desgastado', 'Travado / Não gira', 'Solto / Desencaixado', 'Ausente'] },
  { id: '03', nome: 'Botão / Pulsador', grupo: 'laterais', interna: false,
    sintomas: ['Travado / Empacado', 'Duro de pressionar', 'Solto / Caído', 'Sem pressão / Sem retorno (Mola fraca)', 'Ausente'] },
  { id: '04', nome: 'Caixa', grupo: 'cabeca', interna: false,
    sintomas: ['Arranhada', 'Amassada', 'Oxidada / Com corrosão', 'Quebrada / Trincada', 'Rosca espanada (Caixa ou Tubo)'] },
  { id: '05', nome: 'Capa da Caixa / Proteção de Resina', grupo: 'capa', interna: false,
    sintomas: ['Arranhada', 'Racha / Trincada', 'Ressecada / Quebradiça', 'Desbotada / Manchada', 'Solta / Ausente'] },
  { id: '06', nome: 'Cinta (Monitor Cardíaco / Sensor)', grupo: 'acessorio', interna: false,
    sintomas: ['Rompida / Rasgada', 'Sem sinal / Falha de leitura do sensor', 'Conector danificado / Oxidado', 'Trava quebrada', 'Desgastada'] },
  { id: '07', nome: 'Coroa', grupo: 'laterais', interna: false,
    sintomas: ['Solta / Saindo na mão', 'Travada / Duro de girar', 'Amassada / Gastado o estriado', 'Não rosqueia', 'Ausente'] },
  { id: '08', nome: 'Display LCD / LED', grupo: 'cabeca', interna: false,
    sintomas: ['Com dígitos apagados / Segmentos falhando', 'Trincado / Quebrado', 'Vazado (Mancha preta interna)', 'Fraco / Sem contraste', 'Apagado / Não acende'] },
  { id: '09', nome: 'Fecho / Fivela', grupo: 'pulseira', interna: false,
    sintomas: ['Desarmando / Soltando sozinho', 'Amassado / Deformado', 'Pino da fivela quebrado', 'Mola do fecho fraca', 'Oxidado / Desgastado'] },
  { id: '10', nome: 'Fundo / Tampa Traseira', grupo: 'traseira', interna: false,
    sintomas: ['Arranhado', 'Amassado', 'Rosca espanada', 'Oxidado / Com corrosão', 'Sem vedação / Mal encaixado'] },
  { id: '11', nome: 'Índex / Pedras / Strass', grupo: 'cabeca', interna: false,
    sintomas: ['Solto dentro do mostrador', 'Ausente / Faltando', 'Desbotado / Oxidado', 'Desalinhado'] },
  { id: '12', nome: 'Junta de Vedação', grupo: 'interno', interna: true,
    sintomas: ['Ressecada', 'Murcha / Pressionada demais', 'Rompida', 'Ausente'] },
  { id: '13', nome: 'Máquina (Movimento Analógico/Mecânico)', grupo: 'interno', interna: true,
    sintomas: ['Parada / Não funciona', 'Adiantando / Atrasando (Desregulada)', 'Trabalhando fraca / Travando ponteiro', 'Com umidade / Ferrugem interna', 'Barulho interno anormal'] },
  { id: '14', nome: 'Módulo (Circuito Digital)', grupo: 'interno', interna: true,
    sintomas: ['Não liga', 'Consumo alto de bateria (Descarrega rápido)', 'Funções travadas / Resetando sozinho', 'Com umidade / Oxidação no circuito', 'Bip / Alarme não funciona'] },
  { id: '15', nome: 'Mostrador', grupo: 'cabeca', interna: false,
    sintomas: ['Manchado / Amarelado', 'Risca / Arranhado', 'Descascando / Pintura soltando', 'Pés do mostrador quebrados (Girando na caixa)', 'Oxidado'] },
  { id: '16', nome: 'Passador da Pulseira', grupo: 'pulseira', interna: false,
    sintomas: ['Rasgado / Rompido', 'Largo / Fora de medida', 'Ressecado', 'Ausente'] },
  { id: '17', nome: 'Pinos / Tubos da Pulseira', grupo: 'pulseira', interna: false,
    sintomas: ['Torto / Empacado', 'Quebrado', 'Enferrujado / Encravado', 'Mola fraca (Pino de mola)', 'Ausente'] },
  { id: '18', nome: 'Ponteiros', grupo: 'cabeca', interna: false,
    sintomas: ['Soltos / Caídos', 'Raspando no vidro ou no mostrador', 'Desalinhados', 'Torto (Ponteiro dobrado)', 'Sem massa luminosa / Desbotados'] },
  { id: '19', nome: 'Pulseira', grupo: 'pulseira', interna: false,
    sintomas: ['Partida / Rasgada / Quebrada', 'Arranhada / Desgastada', 'Ressecada (Borracha/Resina)', 'Elo laceado / Com folga (Aço)', 'Manchada / Suja'] },
  { id: '20', nome: 'Terminal / End Link', grupo: 'pulseira', interna: false,
    sintomas: ['Amassado / Com folga', 'Risca / Desgastado', 'Desencaixado da caixa', 'Ausente'] },
  { id: '21', nome: 'Tige', grupo: 'interno', interna: true,
    sintomas: ['Quebrada / Partida', 'Torta', 'Enfeada / Ferrugem', 'Não engata as posições (Hora/Data)', 'Ausente'] },
  { id: '22', nome: 'Vidro / Visor', grupo: 'cabeca', interna: false,
    sintomas: ['Arranhado', 'Trincado / Quebrado', 'Riscado no tratamento antirreflexo', 'Embaçado (Umidade interna)', 'Descolado / Solto'] },
];

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartDef>;
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/data/parts.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 7: Teste das regras de configuração (falhando)**

`watch-test/src/data/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { PART_IDS } from './parts';
import { DEFAULT_CONFIG, configWith, isPresent, type WatchConfig } from './config';

const ALL: WatchConfig[] = [
  { pulseira: 'aco', capaResina: false }, { pulseira: 'aco', capaResina: true },
  { pulseira: 'couro', capaResina: false }, { pulseira: 'couro', capaResina: true },
];

describe('config', () => {
  it('padrão é aço sem capa', () => {
    expect(DEFAULT_CONFIG).toEqual({ pulseira: 'aco', capaResina: false });
  });

  it('toda peça existe em pelo menos uma configuração', () => {
    for (const id of PART_IDS) expect(ALL.some((c) => isPresent(id, c))).toBe(true);
  });

  it('05 depende da capa, 16 só no couro, 20 só no aço', () => {
    expect(isPresent('05', { pulseira: 'aco', capaResina: false })).toBe(false);
    expect(isPresent('05', { pulseira: 'aco', capaResina: true })).toBe(true);
    expect(isPresent('16', { pulseira: 'aco', capaResina: false })).toBe(false);
    expect(isPresent('16', { pulseira: 'couro', capaResina: false })).toBe(true);
    expect(isPresent('20', { pulseira: 'couro', capaResina: false })).toBe(false);
    expect(isPresent('09', { pulseira: 'couro', capaResina: false })).toBe(true);
  });

  it('configWith devolve a mesma referência quando a peça já está presente', () => {
    expect(configWith('04', DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG);
  });

  it('configWith troca só o necessário', () => {
    expect(configWith('16', DEFAULT_CONFIG)).toEqual({ pulseira: 'couro', capaResina: false });
    expect(configWith('20', { pulseira: 'couro', capaResina: true })).toEqual({ pulseira: 'aco', capaResina: true });
    expect(configWith('05', DEFAULT_CONFIG)).toEqual({ pulseira: 'aco', capaResina: true });
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `npx vitest run src/data/config.test.ts`
Expected: FAIL — `Failed to resolve import "./config"`.

- [ ] **Step 9: Implementar `config.ts`**

`watch-test/src/data/config.ts`:
```ts
import type { PartId } from './parts';

export type Pulseira = 'aco' | 'couro';
export interface WatchConfig { pulseira: Pulseira; capaResina: boolean }

export const DEFAULT_CONFIG: WatchConfig = { pulseira: 'aco', capaResina: false };

/** Parts that only exist in some configurations; every other part is always present. */
export function isPresent(id: PartId, c: WatchConfig): boolean {
  if (id === '05') return c.capaResina;
  if (id === '16') return c.pulseira === 'couro';
  if (id === '20') return c.pulseira === 'aco';
  return true;
}

/** The closest configuration that contains the part (same reference if it is already present). */
export function configWith(id: PartId, c: WatchConfig): WatchConfig {
  if (isPresent(id, c)) return c;
  if (id === '05') return { ...c, capaResina: true };
  if (id === '16') return { ...c, pulseira: 'couro' };
  return { ...c, pulseira: 'aco' }; // '20'
}
```

- [ ] **Step 10: Rodar tudo**

Run: `npm test`
Expected: PASS (10 testes).

- [ ] **Step 11: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add docs watch-test
git commit -m "feat(watch-test): scaffold, 22 peças do OS HubTime e regras de configuração"
```

---

### Task 2: Estado da seleção e picking

**Files:**
- Create: `watch-test/src/state/selection.ts`, `watch-test/src/state/picking.ts`
- Test: `watch-test/src/state/selection.test.ts`, `watch-test/src/state/picking.test.ts`

**Interfaces:**
- Consumes: `PART_IDS`, `PART_BY_ID`, `isPartId`, `PartId` (parts.ts); `WatchConfig`, `DEFAULT_CONFIG`, `configWith` (config.ts)
- Produces:
  - `interface SelectedPart { id: PartId; nome: string; sintomas: string[] }`
  - `interface Selection { modelo: 'geral'; config: WatchConfig; pecas: SelectedPart[] }`
  - `interface SelectionState { config: WatchConfig; explode: boolean; activeId: PartId | null; sintomas: Partial<Record<PartId, string[]>> }`
  - `type Action = { type: 'select'; id: PartId | null } | { type: 'selectFromList'; id: PartId } | { type: 'toggleSymptom'; id: PartId; sintoma: string } | { type: 'setConfig'; config: Partial<WatchConfig> } | { type: 'setExplode'; value: boolean } | { type: 'clear' }`
  - `initState(initial?: Selection): SelectionState`, `reducer(s: SelectionState, a: Action): SelectionState`, `toSelection(s: SelectionState): Selection`
  - `interface Hit { partId: string | undefined; distance: number }`, `PASS_THROUGH: ReadonlySet<PartId>`, `pickPart(hits: readonly Hit[]): PartId | null`
  - `type PartState = 'normal' | 'hover' | 'selected' | 'defect' | 'dimmed'`, `partState(id: PartId, activeId: PartId | null, hoverId: PartId | null, hasDefect: boolean): PartState`

- [ ] **Step 1: Testes do reducer (falhando)**

`watch-test/src/state/selection.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { initState, reducer, toSelection, type Selection } from './selection';

describe('selection', () => {
  it('estado inicial: aço, sem capa, montado, nada ativo', () => {
    expect(initState()).toEqual({
      config: { pulseira: 'aco', capaResina: false }, explode: false, activeId: null, sintomas: {},
    });
  });

  it('marca e desmarca sintomas mantendo a ordem do PDF', () => {
    let s = initState();
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Ausente' });
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Solta / Saindo na mão' });
    expect(s.sintomas['07']).toEqual(['Solta / Saindo na mão', 'Ausente']);
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Ausente' });
    expect(s.sintomas['07']).toEqual(['Solta / Saindo na mão']);
  });

  it('ignora sintoma que não pertence à peça', () => {
    const s0 = initState();
    expect(reducer(s0, { type: 'toggleSymptom', id: '07', sintoma: 'Não liga' })).toBe(s0);
  });

  it('desmarcar o último sintoma remove a peça da saída mas mantém ativa', () => {
    let s = reducer(initState(), { type: 'select', id: '18' });
    s = reducer(s, { type: 'toggleSymptom', id: '18', sintoma: 'Desalinhados' });
    s = reducer(s, { type: 'toggleSymptom', id: '18', sintoma: 'Desalinhados' });
    expect(s.activeId).toBe('18');
    expect(s.sintomas['18']).toBeUndefined();
    expect(toSelection(s).pecas).toEqual([]);
  });

  it('selecionar pela lista uma peça ausente troca a configuração', () => {
    const s = reducer(initState(), { type: 'selectFromList', id: '16' });
    expect(s.activeId).toBe('16');
    expect(s.config.pulseira).toBe('couro');
  });

  it('selecionar pela lista uma peça interna explode a vista', () => {
    expect(reducer(initState(), { type: 'selectFromList', id: '13' }).explode).toBe(true);
    expect(reducer(initState(), { type: 'selectFromList', id: '04' }).explode).toBe(false);
  });

  it('trocar configuração mantém sintomas de peças que saíram', () => {
    let s = reducer(initState(), { type: 'selectFromList', id: '16' });
    s = reducer(s, { type: 'toggleSymptom', id: '16', sintoma: 'Ressecado' });
    s = reducer(s, { type: 'setConfig', config: { pulseira: 'aco' } });
    expect(toSelection(s)).toEqual({
      modelo: 'geral',
      config: { pulseira: 'aco', capaResina: false },
      pecas: [{ id: '16', nome: 'Passador da Pulseira', sintomas: ['Ressecado'] }],
    });
  });

  it('clear zera sintomas e peça ativa, mantém configuração e explosão', () => {
    let s = reducer(initState(), { type: 'selectFromList', id: '13' });
    s = reducer(s, { type: 'toggleSymptom', id: '13', sintoma: 'Parada / Não funciona' });
    s = reducer(s, { type: 'clear' });
    expect(s.activeId).toBeNull();
    expect(s.sintomas).toEqual({});
    expect(s.explode).toBe(true);
  });

  it('toSelection ordena peças por ID', () => {
    let s = initState();
    s = reducer(s, { type: 'toggleSymptom', id: '22', sintoma: 'Arranhado' });
    s = reducer(s, { type: 'toggleSymptom', id: '02', sintoma: 'Arranhado' });
    expect(toSelection(s).pecas.map((p) => p.id)).toEqual(['02', '22']);
  });

  it('initState descarta IDs e sintomas inválidos', () => {
    const initial = {
      modelo: 'geral',
      config: { pulseira: 'couro', capaResina: true },
      pecas: [
        { id: '99', nome: 'x', sintomas: ['Arranhado'] },
        { id: '04', nome: 'Caixa', sintomas: ['Amassada', 'Inexistente'] },
        { id: '10', nome: 'Fundo', sintomas: ['Inexistente'] },
      ],
    } as unknown as Selection;
    const s = initState(initial);
    expect(s.config).toEqual({ pulseira: 'couro', capaResina: true });
    expect(s.sintomas).toEqual({ '04': ['Amassada'] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd watch-test && npx vitest run src/state/selection.test.ts`
Expected: FAIL — `Failed to resolve import "./selection"`.

- [ ] **Step 3: Implementar `selection.ts`**

`watch-test/src/state/selection.ts`:
```ts
import { PART_BY_ID, PART_IDS, isPartId, type PartId } from '../data/parts';
import { DEFAULT_CONFIG, configWith, type WatchConfig } from '../data/config';

export interface SelectedPart { id: PartId; nome: string; sintomas: string[] }
export interface Selection { modelo: 'geral'; config: WatchConfig; pecas: SelectedPart[] }

export interface SelectionState {
  config: WatchConfig;
  explode: boolean;
  activeId: PartId | null;
  sintomas: Partial<Record<PartId, string[]>>;
}

export type Action =
  | { type: 'select'; id: PartId | null }
  | { type: 'selectFromList'; id: PartId }
  | { type: 'toggleSymptom'; id: PartId; sintoma: string }
  | { type: 'setConfig'; config: Partial<WatchConfig> }
  | { type: 'setExplode'; value: boolean }
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
  return { config, explode: false, activeId: null, sintomas };
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
        explode: s.explode || PART_BY_ID[a.id].interna,
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
    case 'setExplode':
      return s.explode === a.value ? s : { ...s, explode: a.value };
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/state/selection.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Testes de picking (falhando)**

`watch-test/src/state/picking.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { partState, pickPart } from './picking';

describe('pickPart', () => {
  it('ignora o vidro quando há uma peça atrás dele', () => {
    expect(pickPart([
      { partId: '22', distance: 300 }, { partId: '15', distance: 305 }, { partId: '10', distance: 310 },
    ])).toBe('15');
  });
  it('seleciona o vidro quando ele é o único alvo', () => {
    expect(pickPart([{ partId: '22', distance: 300 }])).toBe('22');
  });
  it('usa a distância, não a ordem recebida', () => {
    expect(pickPart([{ partId: '10', distance: 320 }, { partId: '18', distance: 301 }])).toBe('18');
  });
  it('descarta objetos sem peça e devolve null sem alvos', () => {
    expect(pickPart([{ partId: undefined, distance: 1 }, { partId: 'xx', distance: 2 }])).toBeNull();
    expect(pickPart([])).toBeNull();
  });
});

describe('partState', () => {
  it('prioridade: selecionada > hover > defeito > esmaecida > normal', () => {
    expect(partState('07', '07', '07', true)).toBe('selected');
    expect(partState('07', '04', '07', true)).toBe('hover');
    expect(partState('07', '04', null, true)).toBe('defect');
    expect(partState('07', '04', null, false)).toBe('dimmed');
    expect(partState('07', null, null, false)).toBe('normal');
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run src/state/picking.test.ts`
Expected: FAIL — `Failed to resolve import "./picking"`.

- [ ] **Step 7: Implementar `picking.ts`**

`watch-test/src/state/picking.ts`:
```ts
import { isPartId, type PartId } from '../data/parts';

export interface Hit { partId: string | undefined; distance: number }

/** Transparent parts that only catch the pointer when nothing else is behind them. */
export const PASS_THROUGH: ReadonlySet<PartId> = new Set<PartId>(['22']);

export function pickPart(hits: readonly Hit[]): PartId | null {
  const valid = hits
    .filter((h): h is { partId: PartId; distance: number } => isPartId(h.partId))
    .sort((a, b) => a.distance - b.distance);
  return (valid.find((h) => !PASS_THROUGH.has(h.partId)) ?? valid[0])?.partId ?? null;
}

export type PartState = 'normal' | 'hover' | 'selected' | 'defect' | 'dimmed';

export function partState(id: PartId, activeId: PartId | null, hoverId: PartId | null, hasDefect: boolean): PartState {
  if (id === activeId) return 'selected';
  if (id === hoverId) return 'hover';
  if (hasDefect) return 'defect';
  if (activeId) return 'dimmed';
  return 'normal';
}
```

- [ ] **Step 8: Rodar tudo**

Run: `npm test`
Expected: PASS (25 testes).

- [ ] **Step 9: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test/src/state
git commit -m "feat(watch-test): reducer da seleção, saída estruturada e picking"
```

---

### Task 3: Fundação 3D — parâmetros, geometria, materiais, contrato de peça, cena com caixa e fundo

**Files:**
- Create: `watch-test/src/data/watchParams.ts`
- Create: `watch-test/src/three/geom.ts`, `watch-test/src/three/textures.ts`, `watch-test/src/three/materials.ts`, `watch-test/src/three/view.tsx`
- Create: `watch-test/src/three/parts/head.tsx`, `watch-test/src/three/parts/index.ts`
- Create: `watch-test/src/three/Stage.tsx`, `watch-test/src/three/CameraRig.tsx`, `watch-test/src/three/Watch.tsx`, `watch-test/src/three/WatchScene.tsx`
- Modify: `watch-test/src/App.tsx`, `watch-test/src/main.tsx`, `watch-test/src/index.css`
- Test: `watch-test/src/three/geom.test.ts`

**Interfaces:**
- Consumes: Task 1 e 2 (`PartId`, `PART_IDS`, `WatchConfig`, `isPresent`, `SelectionState`, `Action`, `pickPart`, `partState`, `PartState`)
- Produces:
  - `watchParams.ts`: `type Vec3 = [number, number, number]`; `DIM`, `R`, `Z`, `BAND`, `COLORS`, `EXPLODE: Record<PartId, Vec3>`, `VIEWS: { assembled: View; exploded: View }` com `View = { position: Vec3; target: Vec3 }`
  - `geom.ts`: `lathe(profile: [number, number][], segments?: number): THREE.BufferGeometry` (eixo Z, perfil `[raio, z]`); `cylinderZ(r, z0, z1, segments?)`; `cylinderX(r, x0, x1, segments?)`; `bandFrame(s: number, sign: 1 | -1): { pos: THREE.Vector3; angle: number }`; `sweepBand(sign, s0, s1, w0, w1, h, steps?, ring?): THREE.BufferGeometry`
  - `textures.ts`: `bezelTexture(inner, outer)`, `dialTexture(radius)`, `lcdTexture()` → `THREE.CanvasTexture`
  - `materials.ts`: `createMaterials()`, `type Mats`, `useMats(): Mats` (um conjunto por peça)
  - `view.tsx`: `WatchView`, `WatchViewContext`, `useWatchView()`, `PartGroup`, `ExplodeShift`, `HitProxy`, `findPartId(o)`
  - `parts/index.ts`: `type PartComponentProps = { config: WatchConfig }`, `PART_COMPONENTS: Partial<Record<PartId, (p: PartComponentProps) => React.JSX.Element>>`
  - `WatchScene` props: `{ state: SelectionState; dispatch: React.Dispatch<Action>; hoverId: PartId | null; onHover: (id: PartId | null, at?: { x: number; y: number }) => void }`

- [ ] **Step 1: Teste de geometria (falhando)**

`watch-test/src/three/geom.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bandFrame, cylinderX, cylinderZ, lathe, sweepBand } from './geom';
import { BAND, R, Z } from '../data/watchParams';

const box = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return g.boundingBox!; };

describe('geom', () => {
  it('lathe gira o perfil [raio, z] em torno do eixo Z', () => {
    const b = box(lathe([[0, 2], [10, 2], [10, 5], [0, 5]]));
    expect(b.min.z).toBeCloseTo(2); expect(b.max.z).toBeCloseTo(5);
    expect(b.max.x).toBeCloseTo(10, 0); expect(b.max.y).toBeCloseTo(10, 0);
  });
  it('cylinderZ e cylinderX ficam nos intervalos pedidos', () => {
    const z = box(cylinderZ(3, 1, 4));
    expect([z.min.z, z.max.z]).toEqual([expect.closeTo(1), expect.closeTo(4)]);
    const x = box(cylinderX(1, 8, 22));
    expect([x.min.x, x.max.x]).toEqual([expect.closeTo(8), expect.closeTo(22)]);
  });
  it('bandFrame começa na ponta da alça e curva para trás', () => {
    const top = bandFrame(0, 1);
    expect(top.pos.toArray()).toEqual([0, R.lugEndY, Z.lugCenter]);
    expect(top.angle).toBeCloseTo(0);
    expect(bandFrame(0, -1).angle).toBeCloseTo(Math.PI);
    const far = bandFrame(60, 1);
    expect(far.pos.z).toBeCloseTo(Z.lugCenter - BAND.k * 3600);
    expect(far.angle).toBeLessThan(0);
  });
  it('sweepBand gera malha fechada com tampas', () => {
    const g = sweepBand(1, 0, 40, 20, 18, 3.5, 60, 24);
    expect(g.getIndex()!.count).toBe(60 * 24 * 6 + 2 * 24 * 3);
    const pos = g.getAttribute('position').array as Float32Array;
    expect(Array.from(pos).every(Number.isFinite)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd watch-test && npx vitest run src/three/geom.test.ts`
Expected: FAIL — `Failed to resolve import "./geom"`.

- [ ] **Step 3: Parâmetros do relógio**

`watch-test/src/data/watchParams.ts`:
```ts
import type { PartId } from './parts';

export type Vec3 = [number, number, number];
export interface View { position: Vec3; target: Vec3 }

/** Sheet measurements (mm). */
export const DIM = {
  caseDiameter: 42, caseThickness: 12.5, lugToLug: 48, lugWidth: 20,
  bezelThickness: 2, crystalThickness: 1.8, crownDiameter: 6.5,
  braceletLength: 180, braceletThickness: 3.5,
} as const;

/** Radii (mm). Dial faces +Z, 12h is +Y, 3h is +X. */
export const R = {
  case: 20.5, caseInner: 16.8, back: 17.5,
  bezelInner: 16, bezelOuter: DIM.caseDiameter / 2,
  insertInner: 16.3, insertOuter: 20.1,
  crystal: 16.3, dial: 15.6, crown: DIM.crownDiameter / 2,
  lugEndY: DIM.lugToLug / 2,
} as const;

/** Heights along Z (mm), back of the caseback = 0, top of the crystal = 12.5. */
export const Z = {
  backTop: 1.5, caseTop: 8.7, bezelTop: 8.7 + DIM.bezelThickness, crystalTop: DIM.caseThickness,
  dial: 7.0, movement: [2.6, 6.2] as const, module: [1.6, 2.1] as const,
  lugCenter: 4.5, sideCenter: 5.1,
} as const;

/** Bracelet path: z = lugCenter − k·s², s along the band from the lug end. */
export const BAND = { k: 0.009, endLink: 5, pitch: 7, linksTop: 11, linksBottom: 8, width: DIM.lugWidth } as const;

export const COLORS = {
  blue: '#1F4EBC', steelLight: '#C7CCD4', steelDark: '#7E8794', white: '#F7F8FA', black: '#1B1F24', gold: '#C7A44B',
  hover: '#9ccaff', selected: '#3d8bff', defect: '#ff6a2b',
} as const;

/** Exploded-view offset per part (mm), applied × explode (0–1). Side parts move toward the exploded camera (+X). */
export const EXPLODE: Record<PartId, Vec3> = {
  '01': [0, 0, -28], '02': [0, 0, 22], '03': [9, 0, 0], '04': [0, 0, 0], '05': [0, 0, 48], '06': [0, 0, 0],
  '07': [14, 0, 0], '08': [0, 0, 10], '09': [0, 0, 0], '10': [0, 0, -34], '11': [0, 0, 8], '12': [0, 0, 28],
  '13': [0, 0, -14], '14': [0, 0, -22], '15': [0, 0, 5], '16': [0, 0, 0], '17': [18, 0, 0], '18': [0, 0, 15],
  '19': [0, 0, 0], '20': [0, 0, 0], '21': [6, 0, 0], '22': [0, 0, 34],
};

export const VIEWS: { assembled: View; exploded: View } = {
  assembled: { position: [150, 55, 320], target: [0, -8, -12] },
  exploded: { position: [330, 110, 120], target: [0, 0, 4] },
};
```

- [ ] **Step 4: Geometria**

`watch-test/src/three/geom.ts`:
```ts
import * as THREE from 'three';
import { BAND, R, Z } from '../data/watchParams';

/** Revolve a [radius, z] profile around the Z axis. */
export function lathe(profile: [number, number][], segments = 128): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2); // lathe height (Y) → Z
  return g;
}

export function cylinderZ(r: number, z0: number, z1: number, segments = 96): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, segments);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

export function cylinderX(r: number, x0: number, x1: number, segments = 32): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, segments);
  g.rotateZ(Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}

/** Point and tilt (rotation about X) of the bracelet path; sign 1 = 12h side, −1 = 6h side. */
export function bandFrame(s: number, sign: 1 | -1): { pos: THREE.Vector3; angle: number } {
  const ty = sign, tz = 0 - 2 * BAND.k * s; // "0 −" keeps +0 at s = 0, so atan2 gives π (not −π) on the 6h side
  return {
    pos: new THREE.Vector3(0, sign * (R.lugEndY + s), Z.lugCenter - BAND.k * s * s),
    angle: Math.atan2(tz, ty),
  };
}

/** Strap swept along bandFrame with a rounded-rectangle section (width along X, thickness along the path normal). */
export function sweepBand(
  sign: 1 | -1, s0: number, s1: number, w0: number, w1: number, h: number, steps = 60, ring = 24,
): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, f = bandFrame(s0 + (s1 - s0) * t, sign), w = w0 + (w1 - w0) * t;
    const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** 0.35 * (w / 2);
      const d = Math.sign(sn) * Math.abs(sn) ** 0.35 * (h / 2);
      pos.push(x, f.pos.y + ny * d, f.pos.z + nz * d);
      uv.push(j / ring, t);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + ((j + 1) % ring);
    idx.push(a, a + ring, b, b, a + ring, b + ring);
  }
  for (const [row, flip] of [[0, true], [steps, false]] as const) {
    const f = bandFrame(s0 + (s1 - s0) * (row / steps), sign);
    const center = pos.length / 3;
    pos.push(0, f.pos.y, f.pos.z); uv.push(0.5, row / steps);
    for (let j = 0; j < ring; j++) {
      const a = row * ring + j, b = row * ring + ((j + 1) % ring);
      if (flip) idx.push(center, b, a); else idx.push(center, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/three/geom.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Texturas de canvas**

`watch-test/src/three/textures.ts`:
```ts
import * as THREE from 'three';
import { COLORS } from '../data/watchParams';

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

/** Bezel insert artwork for a RingGeometry(inner, outer): planar UVs span [−outer, outer]. */
export function bezelTexture(inner: number, outer: number) {
  return canvasTexture(`bezel:${inner}:${outer}`, 1024, 1024, (g) => {
    const k = 1024 / (2 * outer);
    g.translate(512, 512);
    g.fillStyle = COLORS.blue;
    g.beginPath(); g.arc(0, 0, outer * k, 0, Math.PI * 2); g.arc(0, 0, inner * k, 0, Math.PI * 2, true); g.fill();
    g.fillStyle = COLORS.white;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round((outer - inner) * 0.5 * k)}px Inter, Arial, sans-serif`;
    const mid = (inner + outer) / 2;
    for (let m = 0; m < 60; m++) {
      g.save();
      g.rotate((m / 60) * Math.PI * 2);
      if (m === 0) {
        g.beginPath();
        g.moveTo(0, -(inner + 0.7) * k); g.lineTo(-1.5 * k, -(outer - 0.6) * k); g.lineTo(1.5 * k, -(outer - 0.6) * k);
        g.fill();
      } else if (m % 10 === 0) {
        g.translate(0, -mid * k);
        g.fillText(String(m), 0, 0);
      } else if (m % 5 === 0) {
        g.fillRect(-0.45 * k, -(outer - 0.7) * k, 0.9 * k, (outer - inner - 1.6) * k);
      } else if (m < 15) {
        g.fillRect(-0.2 * k, -(outer - 0.7) * k, 0.4 * k, 1.2 * k);
      }
      g.restore();
    }
  });
}

/** Sunburst blue dial with a white minute track, for a CircleGeometry(radius). */
export function dialTexture(radius: number) {
  return canvasTexture(`dial:${radius}`, 1024, 1024, (g) => {
    const k = 1024 / (2 * radius);
    g.translate(512, 512);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 512);
    grad.addColorStop(0, '#3366d6'); grad.addColorStop(0.7, COLORS.blue); grad.addColorStop(1, '#173c93');
    g.fillStyle = grad; g.fillRect(-512, -512, 1024, 1024);
    for (let i = 0; i < 720; i++) {
      g.save(); g.rotate((i / 720) * Math.PI * 2);
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
      g.fillRect(-1, 0, 2, 512);
      g.restore();
    }
    g.fillStyle = 'rgba(247,248,250,0.85)';
    for (let m = 0; m < 60; m++) {
      g.save(); g.rotate((m / 60) * Math.PI * 2);
      const len = m % 5 === 0 ? 0.9 : 0.5;
      g.fillRect(-0.12 * k, -(radius - 0.25) * k, 0.24 * k, len * k);
      g.restore();
    }
  });
}

/** Grey-green LCD with dark segments, for a 9 × 4.4 mm plane. */
export function lcdTexture() {
  return canvasTexture('lcd', 512, 250, (g) => {
    g.fillStyle = '#a9b39a'; g.fillRect(0, 0, 512, 250);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 150px "DSEG7 Classic", ui-monospace, monospace';
    g.fillStyle = 'rgba(34,38,31,0.08)'; g.fillText('88:88', 256, 135);
    g.fillStyle = '#22261f'; g.fillText('10:10', 256, 135);
  });
}
```

- [ ] **Step 7: Materiais**

`watch-test/src/three/materials.ts`:
```ts
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, DIM, R } from '../data/watchParams';
import { bezelTexture, dialTexture, lcdTexture } from './textures';

export function createMaterials() {
  return {
    steelBrushed: new THREE.MeshPhysicalMaterial({ color: COLORS.steelLight, metalness: 1, roughness: 0.34, anisotropy: 0.7 }),
    steelPolished: new THREE.MeshPhysicalMaterial({ color: COLORS.steelLight, metalness: 1, roughness: 0.07 }),
    steelDark: new THREE.MeshPhysicalMaterial({ color: COLORS.steelDark, metalness: 1, roughness: 0.4 }),
    bezelInsert: new THREE.MeshPhysicalMaterial({
      map: bezelTexture(R.insertInner, R.insertOuter), metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08,
    }),
    dial: new THREE.MeshPhysicalMaterial({ map: dialTexture(R.dial), metalness: 0.45, roughness: 0.32, clearcoat: 0.5 }),
    lume: new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 0.5, emissive: '#dfe9e2', emissiveIntensity: 0.08 }),
    sapphire: new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: DIM.crystalThickness, ior: 1.77, specularIntensity: 1,
    }),
    resin: new THREE.MeshPhysicalMaterial({ color: COLORS.black, roughness: 0.72, clearcoat: 0.15 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9 }),
    leather: new THREE.MeshPhysicalMaterial({
      color: '#5b3a26', roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color('#a3765a'), sheenRoughness: 0.6, side: THREE.DoubleSide,
    }),
    lcd: new THREE.MeshStandardMaterial({ map: lcdTexture(), roughness: 0.45 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#1f5a3c', roughness: 0.6 }),
    chip: new THREE.MeshStandardMaterial({ color: COLORS.black, roughness: 0.5 }),
    brass: new THREE.MeshPhysicalMaterial({ color: COLORS.gold, metalness: 1, roughness: 0.28 }),
    jewel: new THREE.MeshPhysicalMaterial({ color: '#b01e3c', roughness: 0.1, clearcoat: 1 }),
    silicone: new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: 0.85 }),
  };
}

export type Mats = ReturnType<typeof createMaterials>;

/** One material set per part, so highlighting a part never tints another. Textures are shared (cached). */
export function useMats(): Mats {
  const m = useMemo(createMaterials, []);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}
```

- [ ] **Step 8: Contrato de peça (`view.tsx`)**

`watch-test/src/three/view.tsx`:
```tsx
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
```

- [ ] **Step 9: Primeiras peças — caixa (04) e fundo (10)**

`watch-test/src/three/parts/head.tsx`:
```tsx
import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { lathe } from '../geom';
import { useMats } from '../materials';
import { PartGroup } from '../view';

export function Case04() {
  const m = useMats();
  const body = useMemo(() => lathe([
    [R.caseInner, Z.backTop], [R.case - 0.8, Z.backTop], [R.case, Z.backTop + 0.8],
    [R.case, Z.caseTop - 0.8], [R.case - 0.8, Z.caseTop], [R.caseInner, Z.caseTop], [R.caseInner, Z.backTop],
  ]), []);
  const lugs: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  return (
    <PartGroup id="04" offset={EXPLODE['04']}>
      <mesh geometry={body} material={m.steelPolished} />
      {lugs.map(([sx, sy]) => (
        <RoundedBox key={`${sx}${sy}`} args={[3.4, 10, 5.2]} radius={1} smoothness={4}
          position={[sx * 11.7, sy * 19.4, Z.lugCenter]} rotation={[-sy * 0.12, 0, 0]} material={m.steelBrushed} />
      ))}
    </PartGroup>
  );
}

export function Caseback10() {
  const m = useMats();
  const geo = useMemo(() => lathe([[0, 0], [R.back - 1.2, 0], [R.back, 0.6], [R.back, Z.backTop], [0, Z.backTop]]), []);
  return (
    <PartGroup id="10" offset={EXPLODE['10']}>
      <mesh geometry={geo} material={m.steelBrushed} />
    </PartGroup>
  );
}
```

`watch-test/src/three/parts/index.ts`:
```ts
import type { JSX } from 'react';
import type { PartId } from '../../data/parts';
import type { WatchConfig } from '../../data/config';
import { Case04, Caseback10 } from './head';

export interface PartComponentProps { config: WatchConfig }
export type PartComponent = (p: PartComponentProps) => JSX.Element | null;

export const PART_COMPONENTS: Partial<Record<PartId, PartComponent>> = {
  '04': Case04,
  '10': Caseback10,
};
```

- [ ] **Step 10: Palco, câmera, relógio e cena**

`watch-test/src/three/Stage.tsx`:
```tsx
import type { ReactNode } from 'react';
import { ContactShadows, Environment } from '@react-three/drei';

export function Stage({ children }: { children: ReactNode }) {
  return (
    <>
      <Environment preset="studio" environmentIntensity={0.9} />
      <directionalLight position={[-120, 160, 140]} intensity={2.4} color="#fff3e6" />
      <directionalLight position={[160, 70, -170]} intensity={2.2} color="#e3ecff" />
      <hemisphereLight args={['#eef3ff', '#cdbfae', 0.35]} />
      {children}
      <ContactShadows position={[0, -112, -20]} scale={360} far={80} blur={2.6} opacity={0.38} color="#1b2433" resolution={1024} />
    </>
  );
}
```

`watch-test/src/three/CameraRig.tsx`:
```tsx
import { useEffect, useRef, type ComponentRef, type MutableRefObject } from 'react';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PartId } from '../data/parts';
import { VIEWS } from '../data/watchParams';

const EXPLODE_MS = 950;

export function CameraRig({ groups, activeId, explode }: {
  groups: MutableRefObject<Map<PartId, THREE.Object3D>>; activeId: PartId | null; explode: boolean;
}) {
  const ref = useRef<ComponentRef<typeof CameraControls>>(null);
  const prevExplode = useRef(explode);
  useEffect(() => {
    const explodeChanged = prevExplode.current !== explode;
    prevExplode.current = explode;
    const focus = () => {
      const c = ref.current;
      if (!c) return;
      const view = explode ? VIEWS.exploded : VIEWS.assembled;
      const obj = activeId ? groups.current.get(activeId) : undefined;
      if (!obj) { void c.setLookAt(...view.position, ...view.target, true); return; }
      const s = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
      void c.setTarget(s.center.x, s.center.y, s.center.z, true);
      void c.dollyTo(THREE.MathUtils.clamp(s.radius * 7, 70, 260), true);
    };
    // wait for the explode animation so the part's box is measured where it ends up
    const t = window.setTimeout(focus, explodeChanged && activeId ? EXPLODE_MS : 0);
    return () => window.clearTimeout(t);
  }, [activeId, explode, groups]);
  return <CameraControls ref={ref} makeDefault minDistance={50} maxDistance={600} smoothTime={0.35} />;
}
```

`watch-test/src/three/Watch.tsx`:
```tsx
import { useCallback, useMemo, useRef, type Dispatch, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { PART_IDS, type PartId } from '../data/parts';
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
    const dir = state.explode ? 1 : -1;
    raw.current = Math.min(1, Math.max(0, raw.current + (dir * dt) / EXPLODE_SECONDS));
    explode.current = easeInOut(raw.current);
  });

  const register = useCallback((id: PartId, obj: THREE.Object3D | null) => {
    if (obj) groups.current.set(id, obj); else groups.current.delete(id);
  }, [groups]);

  const view = useMemo<WatchView>(() => ({
    explode, register,
    stateOf: (id) => partState(id, state.activeId, hoverId, !!state.sintomas[id]?.length),
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
        {PART_IDS.filter((id) => isPresent(id, state.config)).map((id) => {
          const C = PART_COMPONENTS[id];
          return C ? <C key={id} config={state.config} /> : null;
        })}
      </group>
    </WatchViewContext.Provider>
  );
}
```

`watch-test/src/three/WatchScene.tsx`:
```tsx
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
            <Outline blur visibleEdgeColor={parseInt(COLORS.hover.slice(1), 16)} hiddenEdgeColor={parseInt(COLORS.hover.slice(1), 16)} edgeStrength={6} width={1200} />
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
```

- [ ] **Step 11: Página provisória**

`watch-test/src/index.css` (substitua todo o conteúdo):
```css
html, body, #root { height: 100%; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; color: #1b1f24; background: #dfe4ec; }
```

`watch-test/src/App.tsx` (substitua todo o conteúdo):
```tsx
import { useReducer } from 'react';
import { initState, reducer } from './state/selection';
import { WatchScene } from './three/WatchScene';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  return (
    <div style={{ height: '100vh', background: 'radial-gradient(80% 90% at 50% 40%, #f4f6f9, #dfe4ec)' }}>
      <WatchScene state={state} dispatch={dispatch} hoverId={null} onHover={() => {}} />
    </div>
  );
}
```

Em `watch-test/src/main.tsx`, mantenha o import de `./index.css` e o render de `<App />` (o template já faz isso).

- [ ] **Step 12: Verificar**

Run: `npm run typecheck && npm test`
Expected: sem erros de tipo; PASS (29 testes).

Run: `npm run dev` e abra `http://localhost:5173`.
Expected: caixa de aço polida com 4 alças e o fundo, em vista 3/4, fundo claro, sombra de contato embaixo, sem erros no console. Clicar na caixa a destaca (contorno + tom azul). Clicar no fundo vazio desseleciona.

- [ ] **Step 13: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test
git commit -m "feat(watch-test): fundação 3D, contrato de peça, caixa e fundo"
```

---

### Task 4: Frente do relógio — bezel, vidro, mostrador, índices, LCD, ponteiros

**Files:**
- Modify: `watch-test/src/three/parts/head.tsx` (acrescentar componentes)
- Modify: `watch-test/src/three/parts/index.ts`

**Interfaces:**
- Consumes: `lathe`, `cylinderZ` (geom), `useMats`, `PartGroup`, `R`, `Z`, `EXPLODE`
- Produces: `Bezel02`, `Lcd08`, `Indices11`, `Dial15`, `Hands18`, `Crystal22` registrados em `PART_COMPONENTS`

- [ ] **Step 1: Acrescentar ao topo de `head.tsx` os imports adicionais**

Substitua a linha de imports de `head.tsx` por:
```tsx
import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { cylinderZ, lathe } from '../geom';
import { useMats } from '../materials';
import { PartGroup } from '../view';
```

- [ ] **Step 2: Acrescentar os componentes ao final de `head.tsx`**

```tsx
export function Bezel02() {
  const m = useMats();
  const ring = useMemo(() => lathe([
    [R.bezelInner, Z.caseTop], [R.bezelOuter, Z.caseTop], [R.bezelOuter, Z.caseTop + 1.4],
    [R.bezelOuter - 0.6, Z.bezelTop], [R.bezelInner, Z.bezelTop], [R.bezelInner, Z.caseTop],
  ]), []);
  const insert = useMemo(() => new THREE.RingGeometry(R.insertInner, R.insertOuter, 128), []);
  return (
    <PartGroup id="02" offset={EXPLODE['02']}>
      <mesh geometry={ring} material={m.steelPolished} />
      <mesh geometry={insert} material={m.bezelInsert} position={[0, 0, Z.bezelTop + 0.02]} />
    </PartGroup>
  );
}

export function Crystal22() {
  const m = useMats();
  const geo = useMemo(() => lathe([
    [0, Z.bezelTop - 0.6], [R.crystal, Z.bezelTop - 0.6], [R.crystal, Z.crystalTop - 0.4],
    [R.crystal - 0.5, Z.crystalTop], [0, Z.crystalTop],
  ]), []);
  return (
    <PartGroup id="22" offset={EXPLODE['22']}>
      <mesh geometry={geo} material={m.sapphire} />
    </PartGroup>
  );
}

export function Dial15() {
  const m = useMats();
  const face = useMemo(() => new THREE.CircleGeometry(R.dial, 128), []);
  const plate = useMemo(() => cylinderZ(R.dial, Z.dial - 0.4, Z.dial - 0.01), []);
  return (
    <PartGroup id="15" offset={EXPLODE['15']}>
      <mesh geometry={face} material={m.dial} position={[0, 0, Z.dial]} />
      <mesh geometry={plate} material={m.steelDark} />
    </PartGroup>
  );
}

/** Applied hour markers; 6h is left out for the LCD window, 12h is doubled. */
export function Indices11() {
  const m = useMats();
  const marks = useMemo(() => {
    const out: { x: number; y: number; rot: number }[] = [];
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * Math.PI * 2;
      const offsets = h === 0 ? [-0.9, 0.9] : [0];
      for (const o of offsets) out.push({ x: Math.sin(a) * 12.2 + Math.cos(a) * o, y: Math.cos(a) * 12.2 - Math.sin(a) * o, rot: -a });
    }
    return out;
  }, []);
  return (
    <PartGroup id="11" offset={EXPLODE['11']}>
      {marks.map((k, i) => (
        <group key={i} position={[k.x, k.y, Z.dial + 0.25]} rotation={[0, 0, k.rot]}>
          <RoundedBox args={[1.3, 3.8, 0.5]} radius={0.15} smoothness={2} material={m.steelPolished} />
          <mesh position={[0, 0, 0.28]} material={m.lume}><boxGeometry args={[0.8, 3.2, 0.12]} /></mesh>
        </group>
      ))}
    </PartGroup>
  );
}

export function Lcd08() {
  const m = useMats();
  const W = 9, H = 4.4, t = 0.5;
  return (
    <PartGroup id="08" offset={EXPLODE['08']}>
      <group position={[0, -7.6, Z.dial + 0.05]}>
        <mesh material={m.lcd} position={[0, 0, 0.02]}><planeGeometry args={[W, H]} /></mesh>
        <mesh material={m.steelPolished} position={[0, (H + t) / 2, 0.15]}><boxGeometry args={[W + 2 * t, t, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[0, -(H + t) / 2, 0.15]}><boxGeometry args={[W + 2 * t, t, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[(W + t) / 2, 0, 0.15]}><boxGeometry args={[t, H, 0.3]} /></mesh>
        <mesh material={m.steelPolished} position={[-(W + t) / 2, 0, 0.15]}><boxGeometry args={[t, H, 0.3]} /></mesh>
      </group>
    </PartGroup>
  );
}

function swordShape(len: number, w: number, tail: number) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.35, -tail); s.lineTo(w * 0.35, -tail); s.lineTo(w / 2, len * 0.75);
  s.lineTo(0, len); s.lineTo(-w / 2, len * 0.75); s.closePath();
  return s;
}

const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });

/** Hands set to 10:10:35. */
export function Hands18() {
  const m = useMats();
  const g = useMemo(() => ({
    hour: extrude(swordShape(8.5, 1.8, 1.5), 0.25),
    hourLume: extrude(swordShape(6.2, 0.9, -1.2), 0.05),
    minute: extrude(swordShape(13, 1.4, 2), 0.25),
    minuteLume: extrude(swordShape(10, 0.7, -1.5), 0.05),
    cap: cylinderZ(1.1, 0, 0.35, 32),
  }), []);
  const turn = (f: number) => -f * Math.PI * 2;
  return (
    <PartGroup id="18" offset={EXPLODE['18']}>
      <group position={[0, 0, Z.dial + 0.7]} rotation={[0, 0, turn((10 + 10 / 60) / 12)]}>
        <mesh geometry={g.hour} material={m.steelPolished} />
        <mesh geometry={g.hourLume} material={m.lume} position={[0, 0, 0.3]} />
      </group>
      <group position={[0, 0, Z.dial + 1.05]} rotation={[0, 0, turn(10 / 60)]}>
        <mesh geometry={g.minute} material={m.steelPolished} />
        <mesh geometry={g.minuteLume} material={m.lume} position={[0, 0, 0.3]} />
      </group>
      <group position={[0, 0, Z.dial + 1.4]} rotation={[0, 0, turn(35 / 60)]}>
        <mesh material={m.steelPolished} position={[0, 4, 0]}><boxGeometry args={[0.3, 16, 0.15]} /></mesh>
        <mesh material={m.lume} position={[0, 9, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.8, 0.8, 0.15, 24]} /></mesh>
      </group>
      <mesh geometry={g.cap} material={m.steelPolished} position={[0, 0, Z.dial + 1.55]} />
    </PartGroup>
  );
}
```

- [ ] **Step 3: Registrar no índice**

`watch-test/src/three/parts/index.ts` — troque o import e o objeto por:
```ts
import { Bezel02, Case04, Caseback10, Crystal22, Dial15, Hands18, Indices11, Lcd08 } from './head';

export const PART_COMPONENTS: Partial<Record<PartId, PartComponent>> = {
  '02': Bezel02, '04': Case04, '08': Lcd08, '10': Caseback10, '11': Indices11, '15': Dial15, '18': Hands18, '22': Crystal22,
};
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm test`
Expected: sem erros; PASS (29).

Run: `npm run dev`.
Expected: cabeça completa como o render do sheet: bezel azul com numerais 10–50 e triângulo às 12h, mostrador azul sunburst, índices com lume, janela LCD às 6h mostrando "10:10", ponteiros em 10:10:35, vidro com reflexo. Clicar no mostrador (através do vidro) seleciona o **mostrador**, não o vidro.

- [ ] **Step 5: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test/src/three/parts
git commit -m "feat(watch-test): bezel, vidro, mostrador, índices, LCD e ponteiros"
```

---

### Task 5: Interno e laterais — anel, junta, máquina, módulo, coroa, tige, pulsadores, capa de resina

**Files:**
- Create: `watch-test/src/three/parts/interior.tsx`, `watch-test/src/three/parts/sides.tsx`
- Modify: `watch-test/src/three/parts/index.ts`

**Interfaces:**
- Consumes: `lathe`, `cylinderZ`, `cylinderX`, `useMats`, `PartGroup`, `HitProxy`, `R`, `Z`, `EXPLODE`
- Produces: `Anel01`, `Junta12`, `Movement13`, `Module14`, `Pushers03`, `ResinCover05`, `Crown07`, `Tige21`

- [ ] **Step 1: `interior.tsx`**

```tsx
import { useMemo } from 'react';
import { EXPLODE, Z } from '../../data/watchParams';
import { cylinderZ, lathe } from '../geom';
import { useMats } from '../materials';
import { HitProxy, PartGroup } from '../view';

/** O-ring sealing the caseback. */
export function Anel01() {
  const m = useMats();
  return (
    <PartGroup id="01" offset={EXPLODE['01']}
      proxy={<HitProxy position={[0, 0, Z.backTop]}><torusGeometry args={[16.9, 1.6, 8, 64]} /></HitProxy>}>
      <mesh material={m.rubber} position={[0, 0, Z.backTop]}><torusGeometry args={[16.9, 0.45, 12, 128]} /></mesh>
    </PartGroup>
  );
}

/** Crystal gasket under the bezel. */
export function Junta12() {
  const m = useMats();
  const geo = useMemo(() => lathe([[16.3, 9.9], [16.9, 9.9], [16.9, 10.7], [16.3, 10.7], [16.3, 9.9]]), []);
  return (
    <PartGroup id="12" offset={EXPLODE['12']}
      proxy={<HitProxy position={[0, 0, 10.3]}><torusGeometry args={[16.6, 1.6, 8, 64]} /></HitProxy>}>
      <mesh geometry={geo} material={m.rubber} />
    </PartGroup>
  );
}

export function Movement13() {
  const m = useMats();
  const [z0, z1] = Z.movement;
  const body = useMemo(() => cylinderZ(13, z0, z1), [z0, z1]);
  const jewels: [number, number][] = [[-6, 5], [3, 7], [7, -1], [-2, -8]];
  return (
    <PartGroup id="13" offset={EXPLODE['13']}>
      <mesh geometry={body} material={m.brass} />
      <mesh material={m.steelPolished} position={[0, 4, z1 + 0.3]}><boxGeometry args={[18, 5, 0.6]} /></mesh>
      <mesh material={m.steelPolished} position={[-5, -5, z1 + 0.3]} rotation={[0, 0, 0.5]}><boxGeometry args={[10, 6, 0.6]} /></mesh>
      <mesh material={m.steelPolished} position={[6, -5, z1 + 0.5]}><torusGeometry args={[3.2, 0.35, 12, 48]} /></mesh>
      <mesh material={m.steelPolished} position={[6, -5, z1 + 0.5]}><boxGeometry args={[6.4, 0.5, 0.3]} /></mesh>
      {jewels.map(([x, y]) => (
        <mesh key={`${x}${y}`} material={m.jewel} position={[x, y, z1 + 0.65]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.2, 16]} />
        </mesh>
      ))}
    </PartGroup>
  );
}

export function Module14() {
  const m = useMats();
  const [z0, z1] = Z.module;
  const board = useMemo(() => cylinderZ(14.5, z0, z1), [z0, z1]);
  return (
    <PartGroup id="14" offset={EXPLODE['14']}>
      <mesh geometry={board} material={m.pcb} />
      <mesh material={m.chip} position={[4, 3, z1 + 0.2]}><boxGeometry args={[5, 5, 0.4]} /></mesh>
      <mesh material={m.chip} position={[-6, 2, z1 + 0.15]}><boxGeometry args={[3, 2, 0.3]} /></mesh>
      <mesh material={m.steelPolished} position={[0, -7.6, z1 + 0.15]}><boxGeometry args={[9, 1.2, 0.3]} /></mesh>
    </PartGroup>
  );
}
```

- [ ] **Step 2: `sides.tsx`**

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EXPLODE, R, Z } from '../../data/watchParams';
import { cylinderX, lathe } from '../geom';
import { useMats } from '../materials';
import { HitProxy, PartGroup } from '../view';

const CROWN_X0 = R.case + 1.2;     // crown starts just outside the case, after the tube
const CROWN_LEN = 3.4;

export function Crown07() {
  const m = useMats();
  const g = useMemo(() => ({
    body: cylinderX(R.crown, CROWN_X0, CROWN_X0 + CROWN_LEN, 48),
    tube: cylinderX(1.6, R.case - 0.2, CROWN_X0, 24),
    ridge: new THREE.BoxGeometry(CROWN_LEN - 0.4, 0.7, 0.5),
  }), []);
  const ridges = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const n = 30, mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      e.set(a, 0, 0);
      q.setFromEuler(e);
      mtx.compose(new THREE.Vector3(CROWN_X0 + CROWN_LEN / 2, Math.cos(a) * R.crown, Math.sin(a) * R.crown), q, new THREE.Vector3(1, 1, 1));
      ridges.current.setMatrixAt(i, mtx);
    }
    ridges.current.instanceMatrix.needsUpdate = true;
    ridges.current.computeBoundingSphere();
  }, []);
  return (
    <PartGroup id="07" offset={EXPLODE['07']}>
      <group position={[0, 0, Z.sideCenter]}>
        <mesh geometry={g.body} material={m.steelPolished} />
        <mesh geometry={g.tube} material={m.steelBrushed} />
        <instancedMesh ref={ridges} args={[g.ridge, m.steelPolished, 30]} />
      </group>
    </PartGroup>
  );
}

export function Tige21() {
  const m = useMats();
  const rod = useMemo(() => cylinderX(0.45, 8, CROWN_X0 + 0.5, 16), []);
  return (
    <PartGroup id="21" offset={EXPLODE['21']}
      proxy={<HitProxy position={[(8 + CROWN_X0) / 2, 0, Z.sideCenter]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.4, 1.4, CROWN_X0 - 8, 8]} />
      </HitProxy>}>
      <mesh geometry={rod} material={m.steelPolished} position={[0, 0, Z.sideCenter]} />
    </PartGroup>
  );
}

/** Two chronograph pushers at 2h and 4h. */
export function Pushers03() {
  const m = useMats();
  const angles = [Math.PI / 6, -Math.PI / 6];
  const r = R.case + 2.2;
  return (
    <PartGroup id="03" offset={EXPLODE['03']}>
      {angles.map((a) => (
        <group key={a} position={[Math.cos(a) * r, Math.sin(a) * r, Z.sideCenter]} rotation={[0, 0, a - Math.PI / 2]}>
          <mesh material={m.steelPolished}><cylinderGeometry args={[1.7, 1.7, 3.2, 32]} /></mesh>
          <mesh material={m.steelBrushed} position={[0, -2.2, 0]}><cylinderGeometry args={[1.2, 1.2, 1.6, 24]} /></mesh>
        </group>
      ))}
    </PartGroup>
  );
}

/** Resin bumper around the case (toggle). */
export function ResinCover05() {
  const m = useMats();
  const geo = useMemo(() => lathe([
    [20.7, 0.6], [22.4, 0.6], [23.4, 1.8], [23.6, 8.0], [22.6, 9.8], [20.7, 9.8], [20.7, 0.6],
  ]), []);
  return (
    <PartGroup id="05" offset={EXPLODE['05']}>
      <mesh geometry={geo} material={m.resin} />
    </PartGroup>
  );
}
```

- [ ] **Step 3: Registrar no índice**

`watch-test/src/three/parts/index.ts` — acrescente os imports e entradas:
```ts
import { Anel01, Junta12, Module14, Movement13 } from './interior';
import { Crown07, Pushers03, ResinCover05, Tige21 } from './sides';
```
e no objeto:
```ts
  '01': Anel01, '03': Pushers03, '05': ResinCover05, '07': Crown07, '12': Junta12, '13': Movement13, '14': Module14, '21': Tige21,
```

- [ ] **Step 4: Verificar a vista explodida**

Para testar sem a UI (que vem na Task 8), troque temporariamente em `App.tsx` o estado inicial por `useReducer(reducer, undefined, () => ({ ...initState(), explode: true }))`, rode `npm run dev`, confira e **desfaça a troca**.
Expected: câmera vai para a vista lateral; as camadas se separam ao longo de Z (vidro, junta, bezel, ponteiros, LCD, índices, mostrador | caixa | máquina com rubis, módulo verde, anel de vedação, fundo); coroa, tige e pulsadores saem para +X; a capa de resina não aparece (desligada por padrão).

Run: `npm run typecheck && npm test`
Expected: sem erros; PASS (29).

- [ ] **Step 5: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test/src/three/parts
git commit -m "feat(watch-test): peças internas, coroa, tige, pulsadores e capa de resina"
```

---

### Task 6: Pulseiras (aço e couro), fecho/fivela, passador, pinos, terminais e cinta com sensor

**Files:**
- Create: `watch-test/src/three/parts/bracelet.tsx`, `watch-test/src/three/parts/accessory.tsx`
- Modify: `watch-test/src/three/parts/index.ts`
- Test: `watch-test/src/three/parts/index.test.ts`

**Interfaces:**
- Consumes: `bandFrame`, `sweepBand`, `cylinderX`, `useMats`, `PartGroup`, `ExplodeShift`, `HitProxy`, `BAND`, `R`, `Z`, `EXPLODE`, `PartComponentProps`
- Produces: `Bracelet19`, `Clasp09`, `Keeper16`, `Pins17`, `EndLinks20`, `ChestStrap06`; `PART_COMPONENTS` completo (22)

- [ ] **Step 1: Teste de completude (falhando)**

`watch-test/src/three/parts/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../../data/parts';
import { PART_COMPONENTS } from './index';

describe('PART_COMPONENTS', () => {
  it('tem um componente 3D para cada uma das 22 peças', () => {
    expect(PART_IDS.filter((id) => !PART_COMPONENTS[id])).toEqual([]);
  });
});
```

Run: `cd watch-test && npx vitest run src/three/parts/index.test.ts`
Expected: FAIL — lista com `['06', '09', '16', '17', '19', '20']`.

- [ ] **Step 2: `bracelet.tsx`**

```tsx
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BAND, EXPLODE, R, Z } from '../../data/watchParams';
import { bandFrame, sweepBand } from '../geom';
import { useMats } from '../materials';
import { ExplodeShift, HitProxy, PartGroup } from '../view';
import type { PartComponentProps } from './index';

type Sign = 1 | -1;
const SIDES: Sign[] = [1, -1];
const links = (sign: Sign) => (sign === 1 ? BAND.linksTop : BAND.linksBottom);
const linkS = (i: number) => BAND.endLink + i * BAND.pitch + BAND.pitch / 2;
const CLASP_S = BAND.endLink + BAND.linksBottom * BAND.pitch + 13;
const leatherLen = (sign: Sign) => (sign === 1 ? 95 : 62); // long tail side at 12h, buckle side at 6h
const KEEPER_S = 52;
const BUCKLE_S = 63;

/** Places something on the band path: local Y = along the band, local Z = band normal. */
function OnBand({ s, sign, lift = 0, children }: { s: number; sign: Sign; lift?: number; children: ReactNode }) {
  const f = bandFrame(s, sign);
  const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
  return <group position={[0, f.pos.y + ny * lift, f.pos.z + nz * lift]} rotation={[f.angle, 0, 0]}>{children}</group>;
}

function fillInstances(mesh: THREE.InstancedMesh, items: { s: number; sign: Sign; x: number; lift: number }[]) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  items.forEach((it, i) => {
    const f = bandFrame(it.s, it.sign);
    const ny = -Math.sin(f.angle), nz = Math.cos(f.angle);
    q.setFromEuler(e.set(f.angle, 0, 0));
    m.compose(new THREE.Vector3(it.x, f.pos.y + ny * it.lift, f.pos.z + nz * it.lift), q, one);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function SteelLinks({ sign }: { sign: Sign }) {
  const m = useMats();
  const g = useMemo(() => ({
    outer: new RoundedBoxGeometry(6, BAND.pitch - 0.4, 3.5, 3, 0.8),
    center: new RoundedBoxGeometry(8, BAND.pitch - 0.4, 3.0, 3, 0.8),
  }), []);
  const outer = useRef<THREE.InstancedMesh>(null!);
  const center = useRef<THREE.InstancedMesh>(null!);
  const n = links(sign);
  useLayoutEffect(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    fillInstances(outer.current, idx.flatMap((i) => [-7, 7].map((x) => ({ s: linkS(i), sign, x, lift: 0 }))));
    fillInstances(center.current, idx.map((i) => ({ s: linkS(i), sign, x: 0, lift: 0.2 })));
  }, [n, sign]);
  return (
    <>
      <instancedMesh ref={outer} args={[g.outer, m.steelBrushed, n * 2]} />
      <instancedMesh ref={center} args={[g.center, m.steelPolished, n]} />
    </>
  );
}

function LeatherSide({ sign }: { sign: Sign }) {
  const m = useMats();
  const geo = useMemo(() => sweepBand(sign, 0, leatherLen(sign), BAND.width, BAND.width - 2, 3.2), [sign]);
  return <mesh geometry={geo} material={m.leather} />;
}

/** 19 — steel bracelet or leather strap, both sides. */
export function Bracelet19({ config }: PartComponentProps) {
  return (
    <PartGroup id="19" offset={EXPLODE['19']}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 16, 0]}>
          {config.pulseira === 'aco' ? <SteelLinks sign={sign} /> : <LeatherSide sign={sign} />}
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}

/** 20 — end links between the lugs and the first link (steel only). */
export function EndLinks20() {
  const m = useMats();
  return (
    <PartGroup id="20" offset={EXPLODE['20']}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 8, 0]}>
          <OnBand s={BAND.endLink / 2} sign={sign}>
            <RoundedBox args={[BAND.width, BAND.endLink, 4.2]} radius={1} smoothness={3} material={m.steelPolished} />
          </OnBand>
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}

/** 09 — folding clasp (steel) or tang buckle (leather), on the 6h side. */
export function Clasp09({ config }: PartComponentProps) {
  const m = useMats();
  return (
    <PartGroup id="09" offset={EXPLODE['09']}>
      {config.pulseira === 'aco' ? (
        <ExplodeShift offset={[0, -30, 0]}>
          <OnBand s={CLASP_S} sign={-1} lift={0.6}>
            <RoundedBox args={[21, 26, 5.5]} radius={1.5} smoothness={4} material={m.steelBrushed} />
            <mesh material={m.steelPolished} position={[0, 0, 2.85]}><boxGeometry args={[10, 12, 0.3]} /></mesh>
          </OnBand>
        </ExplodeShift>
      ) : (
        <ExplodeShift offset={[0, -26, 0]}>
          <OnBand s={BUCKLE_S} sign={-1}>
            <mesh material={m.steelPolished} position={[11, 0, 0]}><boxGeometry args={[2, 16, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[-11, 0, 0]}><boxGeometry args={[2, 16, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, 7, 0]}><boxGeometry args={[24, 2, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, -7, 0]}><boxGeometry args={[24, 2, 2.5]} /></mesh>
            <mesh material={m.steelPolished} position={[0, 0, 1.6]} rotation={[0.15, 0, 0]}><boxGeometry args={[1.2, 14, 1.2]} /></mesh>
          </OnBand>
        </ExplodeShift>
      )}
    </PartGroup>
  );
}

/** 16 — leather keeper loop (leather only). */
export function Keeper16() {
  const m = useMats();
  return (
    <PartGroup id="16" offset={EXPLODE['16']}>
      <ExplodeShift offset={[0, -24, 0]}>
        <OnBand s={KEEPER_S} sign={-1}>
          <mesh material={m.leather} position={[0, 0, 2.4]}><boxGeometry args={[22, 4, 1]} /></mesh>
          <mesh material={m.leather} position={[0, 0, -2.4]}><boxGeometry args={[22, 4, 1]} /></mesh>
          <mesh material={m.leather} position={[10.5, 0, 0]}><boxGeometry args={[1, 4, 5.8]} /></mesh>
          <mesh material={m.leather} position={[-10.5, 0, 0]}><boxGeometry args={[1, 4, 5.8]} /></mesh>
        </OnBand>
      </ExplodeShift>
    </PartGroup>
  );
}

function LinkPins({ sign }: { sign: Sign }) {
  const m = useMats();
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.55, 0.55, BAND.width + 1.2, 12); g.rotateZ(Math.PI / 2); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = links(sign) + 1;
  useLayoutEffect(() => {
    fillInstances(ref.current, Array.from({ length: n }, (_, i) => ({ s: BAND.endLink + i * BAND.pitch, sign, x: 0, lift: 0 })));
  }, [n, sign]);
  return <instancedMesh ref={ref} args={[geo, m.steelPolished, n]} />;
}

/** 17 — link pins (steel) or spring bars at the lugs (leather). */
export function Pins17({ config }: PartComponentProps) {
  const m = useMats();
  if (config.pulseira === 'aco') {
    return (
      <PartGroup id="17" offset={EXPLODE['17']}>
        {SIDES.map((sign) => (
          <ExplodeShift key={sign} offset={[0, sign * 16, 0]}><LinkPins sign={sign} /></ExplodeShift>
        ))}
      </PartGroup>
    );
  }
  return (
    <PartGroup id="17" offset={EXPLODE['17']}
      proxy={SIDES.map((sign) => (
        <HitProxy key={sign} position={[0, sign * (R.lugEndY - 2.2), Z.lugCenter]}><boxGeometry args={[BAND.width, 3, 3]} /></HitProxy>
      ))}>
      {SIDES.map((sign) => (
        <ExplodeShift key={sign} offset={[0, sign * 8, 0]}>
          <mesh material={m.steelPolished} position={[0, sign * (R.lugEndY - 2.2), Z.lugCenter]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.75, 0.75, BAND.width + 0.4, 16]} />
          </mesh>
        </ExplodeShift>
      ))}
    </PartGroup>
  );
}
```

- [ ] **Step 3: `accessory.tsx`**

```tsx
import { RoundedBox } from '@react-three/drei';
import { EXPLODE } from '../../data/watchParams';
import { useMats } from '../materials';
import { PartGroup } from '../view';

const ARC = Math.PI * 1.3;
const RADIUS = 55;

/** 06 — chest strap with sensor pod, lying beside the watch. */
export function ChestStrap06() {
  const m = useMats();
  const mid = ARC / 2;
  return (
    <PartGroup id="06" offset={EXPLODE['06']}>
      <group position={[120, -103, -10]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <mesh material={m.silicone} scale={[1, 1, 3.5]}><torusGeometry args={[RADIUS, 2.6, 12, 120, ARC]} /></mesh>
        <group position={[Math.cos(mid) * RADIUS, Math.sin(mid) * RADIUS, 0]} rotation={[0, 0, mid + Math.PI / 2]}>
          <RoundedBox args={[36, 9, 26]} radius={3} smoothness={4} material={m.resin} />
          <mesh material={m.steelPolished} position={[-12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2, 2, 10, 24]} /></mesh>
          <mesh material={m.steelPolished} position={[12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2, 2, 10, 24]} /></mesh>
        </group>
      </group>
    </PartGroup>
  );
}
```

- [ ] **Step 4: Registrar no índice**

`watch-test/src/three/parts/index.ts` — acrescente:
```ts
import { Bracelet19, Clasp09, EndLinks20, Keeper16, Pins17 } from './bracelet';
import { ChestStrap06 } from './accessory';
```
e no objeto:
```ts
  '06': ChestStrap06, '09': Clasp09, '16': Keeper16, '17': Pins17, '19': Bracelet19, '20': EndLinks20,
```

- [ ] **Step 5: Rodar o teste de completude**

Run: `npx vitest run src/three/parts/index.test.ts`
Expected: PASS.

Run: `npm run typecheck && npm test`
Expected: sem erros; PASS (30).

- [ ] **Step 6: Verificar visualmente as duas pulseiras**

Rode `npm run dev`. Confira a pulseira de aço (elos escovados com centro polido, terminais, fecho às 6h, cinta com sensor no chão à direita). Depois troque temporariamente em `App.tsx` o estado para `{ ...initState(), config: { pulseira: 'couro', capaResina: true } }`, confira (couro marrom, fivela, passador, barras de mola visíveis entre as alças, capa de resina preta) e **desfaça a troca**.

- [ ] **Step 7: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test/src/three/parts
git commit -m "feat(watch-test): pulseiras aço/couro, fecho, passador, pinos, terminais e cinta"
```

---

### Task 7: UI — toolbar, painel de sintomas, lista de peças e `<WatchSelector>`

**Files:**
- Create: `watch-test/src/ui/Toolbar.tsx`, `watch-test/src/ui/SymptomPanel.tsx`, `watch-test/src/ui/PartList.tsx`, `watch-test/src/ui/styles.css`
- Create: `watch-test/src/WatchSelector.tsx`
- Modify: `watch-test/src/App.tsx`
- Test: `watch-test/src/ui/SymptomPanel.test.tsx`, `watch-test/src/WatchSelector.test.tsx`

**Interfaces:**
- Consumes: `SelectionState`, `Action`, `initState`, `reducer`, `toSelection`, `Selection` (Task 2); `PARTS`, `PART_BY_ID` (Task 1); `isPresent` (Task 1); `WatchScene`, `WatchSceneProps` (Task 3)
- Produces: `WatchSelector({ initial?: Selection; onChange?: (s: Selection) => void })` — API pública da spec

- [ ] **Step 1: Teste do painel de sintomas (falhando)**

`watch-test/src/ui/SymptomPanel.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initState } from '../state/selection';
import { SymptomPanel } from './SymptomPanel';

describe('SymptomPanel', () => {
  it('mostra instrução quando nada está ativo', () => {
    render(<SymptomPanel state={initState()} dispatch={vi.fn()} />);
    expect(screen.getByText('Selecione uma peça no relógio ou na lista.')).toBeInTheDocument();
  });

  it('lista os sintomas da peça ativa e despacha ao marcar', async () => {
    const dispatch = vi.fn();
    render(<SymptomPanel state={{ ...initState(), activeId: '07' }} dispatch={dispatch} />);
    expect(screen.getByRole('heading', { name: '07 — Coroa' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Não rosqueia' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleSymptom', id: '07', sintoma: 'Não rosqueia' });
  });

  it('avisa quando a peça ativa não está na configuração atual', () => {
    render(<SymptomPanel state={{ ...initState(), activeId: '16' }} dispatch={vi.fn()} />);
    expect(screen.getByText('Peça não visível na configuração atual.')).toBeInTheDocument();
  });
});
```

Run: `cd watch-test && npx vitest run src/ui/SymptomPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./SymptomPanel"`.

- [ ] **Step 2: Implementar os componentes de UI**

`watch-test/src/ui/SymptomPanel.tsx`:
```tsx
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
```

`watch-test/src/ui/PartList.tsx`:
```tsx
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
```

`watch-test/src/ui/Toolbar.tsx`:
```tsx
import type { Dispatch } from 'react';
import type { Action, SelectionState } from '../state/selection';

export function Toolbar({ state, dispatch }: { state: SelectionState; dispatch: Dispatch<Action> }) {
  const { config } = state;
  return (
    <div className="toolbar" role="toolbar" aria-label="Visualização">
      <button type="button" aria-pressed={state.explode} onClick={() => dispatch({ type: 'setExplode', value: !state.explode })}>
        {state.explode ? 'Montar' : 'Explodir'}
      </button>
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
```

`watch-test/src/ui/styles.css`:
```css
.ws { display: grid; grid-template-columns: minmax(0, 1fr) 380px; height: 100vh; }
.ws-stage { position: relative; background: radial-gradient(80% 90% at 50% 40%, #f4f6f9, #dfe4ec); }
.ws-stage canvas { display: block; }
.ws-side { border-left: 1px solid #d5dbe3; background: #fff; overflow: auto; padding: 16px; display: grid; gap: 16px; align-content: start; }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.toolbar button, .seg button { border: 1px solid #d5dbe3; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; font: inherit; }
.seg { display: inline-flex; }
.seg button { border-radius: 0; }
.seg button:first-child { border-radius: 8px 0 0 8px; }
.seg button:last-child { border-radius: 0 8px 8px 0; }
button[aria-pressed="true"] { background: #1f4ebc; border-color: #1f4ebc; color: #fff; }
.panel h2 { font-size: 16px; margin: 0 0 8px; }
.panel fieldset { border: 0; margin: 0; padding: 0; }
.panel label { display: flex; gap: 8px; padding: 4px 0; }
.note { color: #5b6472; font-size: 13px; margin: 0 0 6px; }
.parts { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.parts button { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; border: 0; background: transparent; padding: 6px 8px; border-radius: 6px; cursor: pointer; font: inherit; }
.parts button:hover { background: #f1f4f9; }
.parts button[aria-current="true"] { background: #e8eefb; }
.badge { background: #ff6a2b; color: #fff; border-radius: 999px; padding: 0 7px; font-size: 12px; }
.tooltip { position: fixed; pointer-events: none; background: #1b1f24; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 13px; z-index: 10; }
.json { position: fixed; left: 12px; bottom: 12px; max-width: min(520px, 50vw); max-height: 220px; overflow: auto; margin: 0; padding: 12px; border-radius: 8px; background: #0f1217; color: #cfe3ff; font: 12px/1.4 ui-monospace, monospace; }
```

- [ ] **Step 3: Rodar o teste do painel**

Run: `npx vitest run src/ui/SymptomPanel.test.tsx`
Expected: PASS (3).

- [ ] **Step 4: Teste do fluxo completo (falhando)**

`watch-test/src/WatchSelector.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WatchSelector } from './WatchSelector';

vi.mock('./three/WatchScene', () => ({ WatchScene: () => <div data-testid="scene" /> }));

describe('WatchSelector', () => {
  it('seleciona peça ausente pela lista, marca sintoma e mantém ao trocar a pulseira', async () => {
    const onChange = vi.fn();
    render(<WatchSelector onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /16 — Passador da Pulseira/ }));
    expect(screen.getByRole('button', { name: 'Couro' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Largo / Fora de medida' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aço' }));
    expect(onChange).toHaveBeenLastCalledWith({
      modelo: 'geral',
      config: { pulseira: 'aco', capaResina: false },
      pecas: [{ id: '16', nome: 'Passador da Pulseira', sintomas: ['Largo / Fora de medida'] }],
    });
  });

  it('peça interna pela lista explode a vista', async () => {
    render(<WatchSelector />);
    await userEvent.click(screen.getByRole('button', { name: /13 — Máquina/ }));
    expect(screen.getByRole('button', { name: 'Montar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Esc limpa a peça ativa', async () => {
    render(<WatchSelector />);
    await userEvent.click(screen.getByRole('button', { name: /07 — Coroa/ }));
    expect(screen.getByRole('heading', { name: '07 — Coroa' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Selecione uma peça no relógio ou na lista.')).toBeInTheDocument();
  });

  it('não chama onChange só por selecionar', async () => {
    const onChange = vi.fn();
    render(<WatchSelector onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /04 — Caixa/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('aceita seleção inicial', () => {
    render(<WatchSelector initial={{ modelo: 'geral', config: { pulseira: 'aco', capaResina: false },
      pecas: [{ id: '22', nome: 'Vidro / Visor', sintomas: ['Arranhado'] }] }} />);
    expect(screen.getByLabelText('1 sintoma(s)')).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/WatchSelector.test.tsx`
Expected: FAIL — `Failed to resolve import "./WatchSelector"`.

- [ ] **Step 5: Implementar `WatchSelector.tsx`**

`watch-test/src/WatchSelector.tsx`:
```tsx
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
  onChangeRef.current = onChange;
  const selection = useMemo(() => toSelection(state), [state.config, state.sintomas]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChangeRef.current?.(selection);
  }, [selection]);

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
```

- [ ] **Step 6: Página de teste final**

`watch-test/src/App.tsx` (substitua todo o conteúdo):
```tsx
import { useState } from 'react';
import type { Selection } from './state/selection';
import { WatchSelector } from './WatchSelector';

export default function App() {
  const [selection, setSelection] = useState<Selection | null>(null);
  return (
    <>
      <WatchSelector onChange={setSelection} />
      <pre className="json" aria-label="Saída da seleção">{JSON.stringify(selection, null, 2) ?? 'null'}</pre>
    </>
  );
}
```

- [ ] **Step 7: Rodar tudo**

Run: `npm run typecheck && npm test`
Expected: sem erros; PASS (38).

Se o lint do template reclamar do comentário `eslint-disable-line` por regra inexistente, rode `npm run lint` e mantenha só se a regra `react-hooks/exhaustive-deps` estiver ativa (o template react-ts a inclui).

- [ ] **Step 8: Verificar no navegador**

Run: `npm run dev`.
Expected:
- hover em qualquer peça mostra contorno e tooltip `ID — nome`; cursor vira mão;
- clicar seleciona, centraliza a câmera e abre os sintomas; as demais peças ficam esmaecidas;
- marcar sintoma pinta a peça de laranja quando ela não está ativa e atualiza o JSON no canto;
- "Explodir" separa as camadas e move a câmera para a vista lateral; "Montar" volta;
- "Couro", "Capa de resina" e "Limpar seleção" funcionam; Esc desseleciona.

- [ ] **Step 9: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test
git commit -m "feat(watch-test): WatchSelector com lista, sintomas, toolbar e saída para a OS"
```

---

### Task 8: QA visual contra o sheet e build

**Files:**
- Create: `watch-test/scripts/preview.py` (cópia da skill threejs-builder)
- Modify: só arquivos de peças, `watchParams.ts`, `materials.ts` e `Stage.tsx` conforme a crítica

**Interfaces:**
- Consumes: tudo acima; `window.__app.ready` (WatchScene)
- Produces: screenshots em `watch-test/shots/` e um build que passa

- [ ] **Step 1: Ferramenta de screenshots**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime/watch-test
mkdir -p scripts
cp /private/tmp/claude-501/-Users-filipe-Documents-Claude-Projects-simontime/5ddd0d67-93f4-4c44-8464-ace8bdc75519/scratchpad/handoff/handoff/skill/threejs-builder/scripts/preview.py scripts/
python3 -c "import playwright" 2>/dev/null || (pip3 install playwright && python3 -m playwright install chromium)
```
(Se a skill já estiver instalada em `~/.claude/skills/threejs-builder/`, copie de lá.)

- [ ] **Step 2: Screenshots montado**

Com `npm run dev` rodando em outro terminal:
```bash
python3 scripts/preview.py http://localhost:5173/ --gpu --viewports desktop,wide --out shots/assembled
```
Expected: `ready flag: True`, `console errors: 0`; arquivos `shots/assembled/desktop.png` e `wide.png`.

- [ ] **Step 3: Crítica e correção (mínimo 2 rodadas)**

Abra cada PNG ao lado da imagem de referência do sheet e anote, item a item da rubrica da skill (silhueta e valores, aterramento, separação de borda, imperfeição, material crível, composição, combina com o host, aspectos):
- proporções: caixa Ø42 vs. alças 48 vs. pulseira 20 batem com a vista frontal do sheet;
- cores: azul `#1F4EBC` do bezel/mostrador reconhecível depois do tone mapping; aço sem virar cinza chapado;
- vidro: reflexo visível sem esconder o mostrador;
- composição: relógio inteiro no quadro com respiro, painel lateral não cobre nada.

Corrija os 2–3 piores pontos por rodada mexendo em `watchParams.ts` (VIEWS, medidas não-sheet), `materials.ts` (roughness, envMap) e `Stage.tsx` (intensidades), repita o Step 2. Pare quando todos os itens estiverem ok ou forem escolhas conscientes.

- [ ] **Step 4: Screenshots dos estados**

O preview headless abre a página do zero, então cliques manuais não valem para ele. Gere cada estado alterando temporariamente o código e rodando o Step 2 com outro `--out`:
1. em `App.tsx`, `<WatchSelector initial={{ modelo: 'geral', config: { pulseira: 'couro', capaResina: true }, pecas: [] }} … />` → `--out shots/couro-capa`;
2. explodido: troque `useReducer(reducer, initial, initState)` em `WatchSelector.tsx` por `useReducer(reducer, initial, (i) => ({ ...initState(i), explode: true }))` → `--out shots/exploded`.
Desfaça as duas trocas ao terminar.

- [ ] **Step 5: Build e testes finais**

```bash
npm run typecheck && npm test && npm run build
```
Expected: sem erros de tipo; PASS (38); `dist/` gerado.

- [ ] **Step 6: Commit**

```bash
cd /Users/filipe/Documents/Claude/Projects/simontime
git add watch-test
git commit -m "chore(watch-test): ajustes de QA visual e script de preview"
```
