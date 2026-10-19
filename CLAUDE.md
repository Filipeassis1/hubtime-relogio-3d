# OS HubTime — Relógio geral 3D

Seletor 3D de peças e sintomas para a ordem de serviço. App em `watch-test/` (React 19, three.js, React Three Fiber).

## Regras fixas
- As 22 peças (IDs 01–22, nomes e sintomas do documento "Partes, Sintomas — OS HubTime") são requisito da empresa e vivem em `watch-test/src/data/parts.ts`. Nunca renomear, renumerar ou remover. Mudanças visuais mantêm o contrato `PartGroup` e a saída `{ modelo, config, pecas }`.
- A cinta (06) não é desenhada com o relógio; aparece sozinha só quando selecionada (`state/visibility.ts`).
- Peças internas (01, 12, 13, 14, 21) só aparecem na vista explodida.
- Antes de qualquer mudança grande: criar uma tag git e registrar em `docs/CHECKPOINTS.md`.
- Medidas e contornos: `src/data/watchParams.ts` e `src/data/profiles.ts` são a fonte única do 3D e dos desenhos SVG; depois de mudar, rodar `npm run export:svg`.

## Comandos (em `watch-test/`)
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run export:svg`

## Para trabalho 3D
Use a skill do projeto em `.claude/skills/threejs-builder/` (em especial `references/selectable-parts.md` e `references/modeling.md` §4). Guia de implementação: `docs/IMPLEMENTACAO.md`.

## Idioma
Responder em português. Comentários de código em inglês, como no restante do código.
