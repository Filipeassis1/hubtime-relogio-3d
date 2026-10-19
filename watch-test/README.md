# Relógio geral 3D — seletor de peças e sintomas (OS HubTime)

Componente React com um relógio 3D onde o técnico, ao abrir uma ordem de serviço, clica nas peças com defeito e marca os sintomas. O componente devolve a seleção estruturada que vai para a OS.

- 22 peças fixas do OS HubTime (IDs 01–22, nomes e sintomas do PDF "Partes, Sintomas"), em `src/data/parts.ts`.
- Vistas Frente, Traseira e Explodido; seleção com isolamento (a peça fica em destaque, o resto vira contexto atenuado).
- Tudo procedural em three.js: nenhum arquivo de modelo, textura ou HDRI para baixar.

Spec e plano originais: `../docs/superpowers/specs/2026-10-07-relogio-geral-3d-design.md` e `../docs/superpowers/plans/2026-10-07-relogio-geral-3d.md`.

## Rodar

Requer Node 20+.

```bash
npm install
```

```bash
npm run dev
```

| Script | Faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm test` | testes (Vitest, 41 casos) |
| `npm run typecheck` | checagem de tipos |
| `npm run build` | build de produção em `dist/` |
| `npm run export:svg` | regenera o pacote SVG de referência em `../docs/referencias-3d/svg/` |

## API pública

```tsx
import { WatchSelector } from './WatchSelector';

<WatchSelector
  initial={selecaoSalva}            // opcional: retoma uma OS
  onChange={(s) => salvarNaOS(s)}   // dispara a cada sintoma marcado ou configuração trocada
/>
```

Formato da seleção (`src/state/selection.ts`):

```ts
type Selection = {
  modelo: 'geral';
  config: { pulseira: 'aco' | 'couro'; capaResina: boolean };
  pecas: { id: PartId; nome: string; sintomas: string[] }[]; // só peças com sintoma, ordem 01→22
};
```

`initial` com IDs ou sintomas que não existem é limpo sem erro.

## Arquitetura

```
src/
  data/
    parts.ts         as 22 peças e sintomas (fonte da verdade)
    config.ts        quais peças existem em cada configuração (aço/couro, capa)
    watchParams.ts   medidas (mm), cores, deslocamentos do explodido, câmeras por vista
    profiles.ts      perfis 2D (contorno da caixa, cortes, elo, ponteiros) — usados pelo 3D e pelo export SVG
  state/
    selection.ts     reducer da seleção e saída para a OS
    picking.ts       qual peça o clique pegou (o vidro deixa passar o clique) e estado visual
    visibility.ts    quais peças desenhar por vista/seleção (internas só no explodido; cinta 06 só quando selecionada)
  three/
    WatchScene.tsx   Canvas, pós-processamento (AO, contorno, tone mapping)
    Watch.tsx        monta as peças, animação do explodido, hover/clique
    view.tsx         contrato de peça: PartGroup, ExplodeShift, HitProxy
    parts/*.tsx      um componente por peça, procedural
    materials.ts     materiais PBR (aço escovado/polido, sunburst, safira…)
    textures.ts      texturas geradas em canvas/DataTexture (bezel, mostrador, LCD, rugosidade)
    Stage.tsx        estúdio de luz (lightformers), sombra de contato
    CameraRig.tsx    câmera por vista e foco na peça selecionada
  ui/                toolbar, lista de peças, painel de sintomas (layout de teste)
  WatchSelector.tsx  componente público
```

### Contrato de peça

Toda peça 3D é envolvida por `PartGroup` (`src/three/view.tsx`) com:
- `id` (01–22): usado no clique, no destaque e no foco da câmera;
- `offset`: deslocamento em mm na vista explodida;
- `proxy` opcional: volume invisível para facilitar o clique em peças pequenas.

Para trocar uma peça procedural por um modelo GLB no futuro, basta renderizar o GLB dentro do mesmo `PartGroup` com o mesmo `id`; seleção, sintomas e OS não mudam. O teste `src/three/parts/index.test.ts` garante que existe um componente para cada uma das 22 peças.

### Integrar no layout do HubTime

O `WatchSelector` traz uma UI de teste (`src/ui/`). Para usar o layout do Figma:
1. Use `WatchScene` (só o canvas) e o reducer de `state/selection.ts` diretamente.
2. Monte toolbar, busca, lista e painel com os componentes do design system do HubTime, despachando as mesmas ações (`setView`, `select`, `selectFromList`, `toggleSymptom`, `setConfig`, `clear`).
3. Mapeie "Frente / Verso / Expandida" para `frente / traseira / explodido`.

## Performance

Medido no navegador de desenvolvimento (desktop, 1016 × 837 px, DPR 1, relógio montado):

| Métrica | Valor |
|---|---|
| Draw calls por quadro (inclui passes de pós) | 149 |
| Triângulos por quadro | ~191 mil |
| Malhas / instanciadas | 63 / 7 |
| Programas de shader | 32 |
| Geometrias / texturas na GPU | 105 / 31 |
| Tempo de CPU por quadro (mediana) | ~3 ms |
| Bundle de produção (JS) | 1,53 MB minificado, ~458 KB gzip, um único arquivo |
| Downloads de assets 3D | nenhum (tudo procedural) |

### O que já está otimizado
- Elos, pinos e estrias da coroa são `InstancedMesh` (um draw call por tipo).
- Sem arquivos de modelo nem HDRI: o 3D não depende de rede depois do JS.
- Texturas geradas uma vez e reutilizadas por todas as peças (cache em `textures.ts`).
- Peças internas só são desenhadas na vista explodida.

### Recomendado antes de produção
1. **Carregar o 3D sob demanda.** `React.lazy(() => import('./WatchSelector'))` e um PNG da vista frontal como capa enquanto carrega. Separar `three` em chunk próprio (`build.rollupOptions.output.manualChunks`), para não pesar nas outras telas da OS.
2. **Seleção sem recompilar shaders.** Hoje o modo "fantasma" troca `transparent`/`map` dos materiais e marca `needsUpdate`, o que recompila shaders no primeiro clique em cada peça. Trocar por uniforms (cor, opacidade, mistura) ou pré-compilar com `renderer.compileAsync` ao carregar.
3. **Materiais compartilhados.** `useMats()` cria um conjunto de materiais por peça (para o destaque não vazar entre peças). Com o item 2 resolvido via uniforms por instância, dá para compartilhar materiais e reduzir memória.
4. **Renderizar só quando muda.** `frameloop="demand"` no `Canvas` e `invalidate()` em animações e interações; a cena é estática quase o tempo todo.
5. **Resolução adaptativa.** `PerformanceMonitor` (drei) para baixar DPR e a qualidade do N8AO em máquinas fracas; o AO é o passe mais caro.
6. **Remover ganchos de teste em produção.** `window.__app` (`WatchScene.tsx`, `WatchSelector.tsx`) e `preserveDrawingBuffer: true` existem só para gerar os renders; tirar ou condicionar a `import.meta.env.DEV`.

### Se um dia trocar por modelos GLB
- Exportar com nomes iguais aos IDs, compressão meshopt e texturas KTX2 (`gltf-transform optimize`).
- Orçamento: cabeça + pulseira até ~250 mil triângulos, texturas de 2K.
- Assar oclusão (AO) na textura e desligar o N8AO.

## Referências e pontos de retorno
- Pacote SVG (1:1, mm) gerado dos mesmos perfis: `../docs/referencias-3d/svg/`.
- Checklist das 22 peças com fontes: `../docs/referencias-3d/index.html`.
- Checkpoints de versão (tags git): `../docs/CHECKPOINTS.md`.
- Renders e comparação antes/depois: `renders/`.
