# Pontos de retorno do relógio 3D

Cada etapa grande começa com uma tag no git. Se o resultado novo não agradar, dá para voltar ao estado anterior sem perder nada.

## Checkpoints

| Tag | Data | Estado |
|---|---|---|
| `v1-relogio-base` | 2026-10-19 | Relógio geral com as 22 peças, vistas Frente / Traseira / Explodido, seleção com isolamento, pulseira fechada, renders em `watch-test/renders/` (frente, traseira, explodido, zoom na coroa, com e sem peça ativa). Antes do procedural refinado. |

O trabalho novo (procedural refinado) acontece no branch `feat/procedural-refinado`. O `main` continua igual ao `v1-relogio-base` até a mudança ser aprovada.

## O que nunca muda entre versões

- As 22 peças, com os mesmos IDs (01–22), nomes e sintomas (`watch-test/src/data/parts.ts`).
- O contrato de cada peça no 3D: ID, deslocamento na vista explodida, destaque e registro para foco da câmera (`PartGroup`).
- A saída para a OS: `{ modelo, config, pecas: [{ id, nome, sintomas }] }`.
- Os testes garantem isso: as 22 peças com sintomas do PDF e um componente 3D para cada uma.

## Como comparar

Ver a versão antiga rodando, sem perder a nova:

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime switch --detach v1-relogio-base
```

Voltar para a versão nova:

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime switch feat/procedural-refinado
```

Com o servidor de desenvolvimento rodando, a página recarrega sozinha ao trocar.

## Como desistir da versão nova

Volta para o `main`, que está no checkpoint, e apaga o branch novo:

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime switch main
```

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime branch -D feat/procedural-refinado
```

## Como aprovar a versão nova

Leva o branch para o `main` e marca um checkpoint novo:

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime switch main
```

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime merge feat/procedural-refinado
```

```bash
git -C /Users/filipe/Documents/Claude/Projects/simontime tag -a v2-procedural-refinado -m "Procedural refinado aprovado"
```
