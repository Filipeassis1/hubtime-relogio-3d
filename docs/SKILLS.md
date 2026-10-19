# Skills usadas para construir o relógio 3D

O relógio foi construído com o **Claude Code** usando skills: pacotes de instruções que o Claude carrega quando a tarefa pede. Para o dev, elas são opcionais: o código funciona sem elas. Servem para quem for evoluir o 3D com o Claude Code e quiser o mesmo padrão de qualidade e processo.

## 1. `threejs-builder` (incluída neste repositório)

**Onde está:** [`.claude/skills/threejs-builder/`](../.claude/skills/threejs-builder/)

**Para que serve:** construir 3D com qualidade de portfólio em three.js / React Three Fiber. Ela começa lendo o projeto (stack, versões, tokens de design) e cobre direção de arte, luz, materiais, procedural, pós-processamento, performance e uma revisão por screenshots.

**Referências mais usadas no relógio:**

| Referência | Uso no relógio |
|---|---|
| `references/selectable-parts.md` | peças com ID, seleção com isolamento, vista explodida, marcadores de sintoma, cinta só quando selecionada |
| `references/modeling.md` §4 | procedural refinado: caixa extrudada com alças, bezel serrilhado, ponteiros facetados, elos desencontrados, rehaut |
| `references/project-integration.md` | como encaixar o 3D num app React existente (lazy load, ciclo de vida, tokens) |
| `references/lighting.md`, `materials.md`, `postfx.md` | estúdio com lightformers, aço escovado/polido, sunburst anisotrópico, AO e contorno |
| `references/critique.md` | rubrica para revisar screenshots e a tabela sintoma → causa → correção |
| `scripts/preview.py` | screenshots automáticos de uma URL (`--gpu`) |

**Como usar no Claude Code:** abra o Claude Code na raiz do repositório. Skills em `.claude/skills/` do projeto são carregadas automaticamente quando a tarefa combina com a descrição; também dá para pedir explicitamente: "use a skill threejs-builder".

**Como usar no claude.ai:** envie o pacote pronto [`docs/skills/threejs-builder.skill`](skills/threejs-builder.skill) em Settings → Capabilities → Skills. Se editar a skill, gere o pacote de novo: `cd .claude/skills && zip -r ../../docs/skills/threejs-builder.skill threejs-builder`.

**Dependências opcionais dos scripts:**

```bash
pip install playwright && python3 -m playwright install chromium
```

(só para `scripts/preview.py`; o `fetch_asset.py` com `--optimize` usa `npx @gltf-transform/cli`, que precisa de Node.)

## 2. Skills de processo (plugin `superpowers`)

Usadas para conduzir o trabalho, não para o 3D em si. Vêm do plugin **superpowers**, do marketplace oficial de plugins do Claude Code (`claude-plugins-official`). Para instalar, no Claude Code:

```
/plugin install superpowers@claude-plugins-official
```

| Skill | Usada para |
|---|---|
| `superpowers:brainstorming` | levantar requisitos (22 peças, tipos de relógio, fluxo da OS) e aprovar o design antes de codar |
| `superpowers:writing-plans` | gerar o plano em `docs/superpowers/plans/` |
| `superpowers:executing-plans` | executar o plano tarefa a tarefa |
| `superpowers:test-driven-development` | escrever o teste antes do código (dados, seleção, picking, geometria, visibilidade) |
| `superpowers:verification-before-completion` | só declarar pronto depois de rodar testes, typecheck e conferir no navegador |

## 3. Outras ferramentas usadas

| Ferramenta | Uso |
|---|---|
| `skill-creator` (marketplace oficial) | lapidar a `threejs-builder` para servir a qualquer projeto |
| Navegador do Claude Code | preview ao vivo, screenshots e captura dos renders |
| `watch-test/scripts/export-svg.ts` | pacote de desenhos 1:1 gerado dos mesmos perfis do 3D (`npm run export:svg`) |
| `watch-test/scripts/png-receiver.py` | recebe as capturas do canvas e grava os PNGs dos renders |

## 4. Contexto do projeto para o Claude

O arquivo [`CLAUDE.md`](../CLAUDE.md) na raiz traz as regras do projeto (as 22 peças fixas, checkpoints, comandos). O Claude Code lê esse arquivo em toda sessão aberta no repositório.
