# Guia de implementação no HubTime

Passo a passo para levar o relógio 3D do protótipo (`watch-test/`) para a tela **Nova Ordem de Serviço → Diagnóstico e Serviços** do HubTime, com o layout do Figma.

Faça as etapas na ordem; cada uma termina com uma verificação. Tempo estimado: 4 a 6 dias de um dev front-end.

> **Regra que não muda:** as 22 peças (IDs 01–22, nomes e sintomas) vêm do documento "Partes, Sintomas — OS HubTime" e ficam em `src/data/parts.ts`. Nenhuma etapa deste guia renomeia, renumera ou remove peças. Os testes garantem isso.

---

## Etapa 0 — Acesso e ambiente

1. Aceite o convite do repositório privado `Filipeassis1/hubtime-relogio-3d` no GitHub.
2. Instale Node 20 ou superior.
3. Clone o repositório:

```bash
git clone https://github.com/Filipeassis1/hubtime-relogio-3d.git
```

**Verificação:** `git tag` mostra `v1-relogio-base` e `v2-procedural-refinado`. O `main` está no v2.

---

## Etapa 1 — Rodar e conhecer o protótipo

```bash
cd hubtime-relogio-3d/watch-test && npm install
```

```bash
npm run dev
```

Abra o endereço que o Vite mostrar e teste:
- **Frente / Traseira / Explodido:** as 3 posições.
- **Clique numa peça:** a peça fica isolada com contorno azul e o resto vira fantasma; os sintomas aparecem no painel.
- **Marcar sintomas:** surge um marcador laranja com o número sobre a peça, e o JSON da OS atualiza no canto.
- **Aço/Couro e Capa de resina:** trocam a configuração.
- **06 — Cinta na lista:** a cinta aparece sozinha. Ela não é desenhada junto do relógio.

Depois rode as verificações:

```bash
npm test
```

```bash
npm run typecheck
```

**Verificação:** 41 testes passando e checagem de tipos sem erros. Leia o [`watch-test/README.md`](../watch-test/README.md): ele tem a API, o mapa de pastas e os números de performance.

---

## Etapa 2 — Trazer o código para o HubTime

Recomendado: copiar como uma **feature** dentro do front do HubTime, sem criar pacote separado.

1. Crie `src/features/relogio-3d/` no HubTime (ajuste ao padrão de pastas de vocês).
2. Copie de `watch-test/src/` para lá: `data/`, `state/`, `three/` e `WatchSelector.tsx`.
3. **Não copie** `ui/`, `App.tsx`, `main.tsx` nem `index.css`: são a tela de teste. A tela real vem do Figma (Etapa 5).
4. Copie também os testes (`*.test.ts`, `*.test.tsx`) junto dos arquivos correspondentes.
5. Instale as dependências **com o gerenciador de pacotes do HubTime**, nas mesmas versões do protótipo:

| Pacote | Versão do protótipo | Observação |
|---|---|---|
| `three` | ^0.186.1 | Se o HubTime já tiver three, use a versão dele e veja a tabela "Old → Current" da skill (`references/ecosystem.md`). |
| `@react-three/fiber` | ^9.8.1 | Exige React 19. Com React 18, use R3F 8 + drei 9. |
| `@react-three/drei` | ^10.7.9 | |
| `@react-three/postprocessing` | ^3.1.3 | |
| `postprocessing` | ^6.39.5 | |
| `@types/three` (dev) | ^0.186.0 | |

6. **Ajuste os imports com extensão `.ts`.** `data/profiles.ts` importa `./watchParams.ts` com extensão, para o script de SVG rodar direto no Node. Se o `tsconfig` do HubTime não tiver `allowImportingTsExtensions`, troque para `./watchParams` (sem extensão). O export de SVG continua funcionando no repositório do protótipo.

**Verificação:** os testes copiados passam no runner do HubTime (Vitest ou Jest com jsdom). Se for Jest, os testes de geometria (`three/geom.test.ts`, `data/profiles.test.ts`) precisam do `transformIgnorePatterns` liberando `three`.

---

## Etapa 3 — Remover os ganchos de teste

Três coisas existem só para gerar renders e screenshots. Em produção, elas devem sair ou ficar restritas ao modo de desenvolvimento:

1. **`three/WatchScene.tsx`, componente `Ready`:** grava `window.__app` (renderer, cena, câmera, `advance`).
2. **`three/WatchScene.tsx`, `preserveDrawingBuffer: true`:** custa memória de vídeo; serve só para capturar o canvas.
3. **`WatchSelector.tsx`:** grava `window.__app.dispatch`.

Use o modo de desenvolvimento como condição:

```tsx
// WatchScene.tsx
gl={{ antialias: false, preserveDrawingBuffer: import.meta.env.DEV }}
// …
{import.meta.env.DEV && <Ready />}
```

```tsx
// WatchSelector.tsx
useEffect(() => {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as { __app?: Record<string, unknown> };
  w.__app = Object.assign(w.__app ?? {}, { dispatch });
}, []);
```

(Com outro bundler, troque `import.meta.env.DEV` pelo equivalente, por exemplo `process.env.NODE_ENV !== 'production'`.)

**Verificação:** no build de produção, `window.__app` é `undefined`.

---

## Etapa 4 — Ligar à ordem de serviço

O componente devolve a seleção pronta para a OS:

```ts
type Selection = {
  modelo: 'geral';
  config: { pulseira: 'aco' | 'couro'; capaResina: boolean };
  pecas: { id: PartId; nome: string; sintomas: string[] }[]; // só peças com sintoma, ordem 01→22
};
```

1. **Salvar:** grave o objeto inteiro na OS, por exemplo no campo `diagnostico3d` (JSON). Guarde o `id` da peça e os textos dos sintomas exatamente como vêm.
2. **Retomar:** ao reabrir uma OS, passe o que foi salvo como `initial`. IDs ou sintomas que não existam mais são descartados sem erro.
3. **Validar no backend:** confira que cada `id` está entre `01` e `22` e que cada sintoma pertence à peça. A lista oficial está em `data/parts.ts`; exponha a mesma lista no backend ou gere um JSON a partir dela.

Exemplo de payload:

```json
{
  "modelo": "geral",
  "config": { "pulseira": "aco", "capaResina": false },
  "pecas": [
    { "id": "02", "nome": "Aro / Bezel", "sintomas": ["Arranhado", "Solto / Desencaixado"] },
    { "id": "07", "nome": "Coroa", "sintomas": ["Não rosqueia"] }
  ]
}
```

**Verificação:** marcar sintomas, salvar, recarregar a OS e ver os mesmos sintomas e marcadores no 3D.

---

## Etapa 5 — Montar a tela do Figma

A tela do Figma tem: o canvas 3D à esquerda com o seletor **Frente / Verso / Expandida**; à direita, a busca, a lista "Partes", os sintomas da peça, as **observações do técnico** e uma miniatura da peça.

### 5.1 Usar o canvas e o estado, sem a UI de teste

```tsx
import { useReducer, useState } from 'react';
import { WatchScene } from './three/WatchScene';
import { initState, reducer, toSelection, type Selection } from './state/selection';
import type { PartId } from './data/parts';

export function DiagnosticoRelogio({ initial, onChange }: { initial?: Selection; onChange: (s: Selection) => void }) {
  const [state, dispatch] = useReducer(reducer, initial, initState);
  const [hover, setHover] = useState<PartId | null>(null);
  // chame onChange(toSelection(state)) quando state.config ou state.sintomas mudarem (veja WatchSelector.tsx)
  return (
    <Layout>  {/* grid do Figma, com os componentes do design system do HubTime */}
      <SegmentedControl
        options={[['frente', 'Frente'], ['traseira', 'Verso'], ['explodido', 'Expandida']]}
        value={state.view}
        onChange={(view) => dispatch({ type: 'setView', view })}
      />
      <WatchScene state={state} dispatch={dispatch} hoverId={hover} onHover={(id) => setHover(id)} />
      {/* painel lateral: 5.2 a 5.5 */}
    </Layout>
  );
}
```

`SegmentedControl`, `Layout` e os demais são os componentes de vocês; os nomes acima são ilustrativos.

### 5.2 Ações disponíveis

| Elemento do Figma | Ação |
|---|---|
| Frente / Verso / Expandida | `dispatch({ type: 'setView', view: 'frente' \| 'traseira' \| 'explodido' })` |
| Clique numa peça no 3D | já tratado dentro do `WatchScene` (`select`) |
| Item da lista "Partes" ou resultado da busca | `dispatch({ type: 'selectFromList', id })`. Troca a configuração se precisar e explode a vista para peças internas. |
| Checkbox de sintoma | `dispatch({ type: 'toggleSymptom', id, sintoma })` |
| Pulseira aço/couro, capa de resina | `dispatch({ type: 'setConfig', config: { … } })` |
| Limpar | `dispatch({ type: 'clear' })` |
| Esc / clicar fora | `dispatch({ type: 'select', id: null })` |

### 5.3 Busca "Buscar peça ou código"

Filtre `PARTS` (de `data/parts.ts`) por ID ou nome, sem diferenciar maiúsculas e acentos. Ao escolher um resultado, use `selectFromList`.

### 5.4 Observações do técnico (campo novo)

O protótipo ainda não tem observações por peça. Para incluir:
1. **Em `state/selection.ts`:** acrescente `observacoes: Partial<Record<PartId, string>>` ao estado e uma ação `{ type: 'setObservacao'; id: PartId; texto: string }`.
2. **Em `toSelection`:** inclua `observacao` em cada peça e também as peças que só têm observação.
3. **Testes** em `selection.test.ts`:
   - salvar e retomar a observação;
   - uma peça com observação e sem sintoma aparece na saída;
   - texto vazio remove a observação.

### 5.5 Miniatura da peça

Use imagens prontas em vez de um segundo canvas 3D: é mais leve.
1. Gere uma imagem por peça no protótipo, em modo de desenvolvimento: rode `python3 scripts/png-receiver.py renders/pecas`, cole `watch-test/scripts/capture-snippet.js` no console do navegador e chame `await take('02.png', 'frente', '02')` para cada peça. As instruções estão no topo do arquivo.
2. Salve como `public/relogio-3d/pecas/<id>.webp`, com cerca de 240 × 240 px.

**Verificação:** comparar a tela com o frame do Figma em 1440 px de largura e em 1280 px.

---

## Etapa 6 — Performance

Números atuais e metas (desktop):

| Métrica | Atual | Meta |
|---|---|---|
| Draw calls por quadro | 149 | ≤ 200 |
| Triângulos | ~191 mil | ≤ 300 mil |
| Bundle JS do 3D | 458 KB gzip (junto do app) | chunk separado, carregado só nesta tela |
| Travada no primeiro clique em cada peça | sim (recompila shaders) | nenhuma |

Faça nesta ordem:

### 6.1 Carregar sob demanda

```tsx
const DiagnosticoRelogio = lazy(() => import('@/features/relogio-3d/DiagnosticoRelogio'));
// …
<Suspense fallback={<img src="/relogio-3d/poster-frente.webp" alt="Relógio" />}>
  <DiagnosticoRelogio … />
</Suspense>
```

Se o HubTime usa Vite, separe o three num arquivo próprio:

```ts
// vite.config.ts
build: { rollupOptions: { output: { manualChunks: { three: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'] } } } }
```

Use como poster `watch-test/renders/v2/relogio-frente.png`, convertido para webp. Para gerar outro enquadramento, use `watch-test/scripts/capture-snippet.js`.

### 6.2 Seleção sem travada

O modo fantasma (`three/view.tsx`, `applyState`) troca `transparent`, `map` e outras propriedades e marca `needsUpdate`, o que recompila shaders no primeiro uso. Escolha uma solução:
- **Mais simples:** pré-compilar na carga. Aplique o estado fantasma em todas as peças, chame `await gl.compileAsync(scene, camera)` e volte ao normal, tudo antes de mostrar o canvas.
- **Definitiva:** deixar os materiais sempre `transparent` com `opacity` 1 e controlar fantasma, cor e brilho só por valores numéricos (uniforms), sem trocar `map`.

### 6.3 Renderizar só quando algo muda

- Use `<Canvas frameloop="demand">`.
- Chame `invalidate()` (de `useThree`) quando:
  - a seleção, a vista, o hover ou os sintomas mudam;
  - a câmera se move (evento `update` do `CameraControls`);
  - a animação do explodido roda (em `Watch.tsx`, chame `invalidate()` dentro do `useFrame` enquanto `raw` não chegou a 0 ou 1).

### 6.4 Resolução adaptativa

Use o `<PerformanceMonitor>` do drei para baixar o `dpr` de 2 para 1 e o `quality` do `<N8AO>` (oclusão) de `"high"` para `"medium"` em máquinas fracas. O AO é o passe mais caro.

**Verificação:** abra a aba Performance do Chrome, clique em 5 peças diferentes e confira que nenhum quadro passa de 50 ms. Pela aba Network, o chunk do three só carrega ao abrir a tela de diagnóstico.

---

## Etapa 7 — Testes e aceite

1. Rode os testes copiados no CI do HubTime.
2. Acrescente um teste da tela nova simulando o `WatchScene` com `vi.mock` (há um exemplo pronto na Task 7 de [`docs/superpowers/plans/2026-10-07-relogio-geral-3d.md`](superpowers/plans/2026-10-07-relogio-geral-3d.md)) e testando: busca → seleção → sintoma → `onChange`.
3. Checklist de aceite:
   - [ ] As 22 peças selecionáveis pela lista; as externas também pelo 3D.
   - [ ] Peças internas (01, 12, 13, 14, 21) aparecem só em "Expandida".
   - [ ] A cinta (06) aparece sozinha ao ser selecionada e some ao desselecionar.
   - [ ] Clicar no mostrador através do vidro seleciona o mostrador (15), não o vidro (22).
   - [ ] Trocar aço ↔ couro mantém os sintomas já marcados.
   - [ ] Salvar e reabrir a OS restaura a seleção.
   - [ ] Sem `window.__app` em produção.
   - [ ] Metas de performance da Etapa 6 atingidas.

---

## Etapa 8 — Manutenção

| Quero… | Como |
|---|---|
| Mudar uma medida (ex.: Ø da caixa) | `data/watchParams.ts` e, se for contorno ou perfil, `data/profiles.ts`. No repositório do protótipo, rode `npm run export:svg` para atualizar os desenhos em `docs/referencias-3d/svg/`. |
| Ajustar cor ou acabamento | `three/materials.ts` (paleta em `COLORS`, `data/watchParams.ts`). |
| Ajustar luz | `three/Stage.tsx`. |
| Trocar uma peça procedural por um modelo GLB | Renderize o GLB dentro do mesmo `PartGroup` com o mesmo `id`, em `three/parts/`. Exporte do Blender com o nome igual ao ID, compressão meshopt e texturas KTX2. |
| Ajustar a câmera de uma vista | `VIEWS` em `data/watchParams.ts`. |
| Voltar a uma versão anterior | [`docs/CHECKPOINTS.md`](CHECKPOINTS.md). |

---

## Etapa 9 — Usar o Claude Code (opcional)

O repositório já traz a skill usada para construir o relógio. Com o Claude Code aberto na raiz do repositório, ela é carregada sozinha quando o assunto for 3D. Detalhes em [`docs/SKILLS.md`](SKILLS.md).
