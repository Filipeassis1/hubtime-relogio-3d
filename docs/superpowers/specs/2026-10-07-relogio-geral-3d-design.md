# Relógio geral 3D — seletor de peças e sintomas (OS HubTime)

Data: 2026-10-07 · Status: aprovada

## 1. Objetivo

Um componente React com um relógio 3D onde o técnico, ao abrir uma ordem de serviço no HubTime, **clica nas peças
com defeito e marca os sintomas** de cada uma. O componente devolve uma seleção estruturada que alimenta a OS.

Este primeiro marco entrega um **relógio "geral"** que contém as **22 peças** do documento "Partes, Sintomas — OS
HubTime". Os 5 tipos (analógico, digital, cronógrafo, smartwatch, resina) virão depois como configurações da mesma
biblioteca de peças.

## 2. Contexto e restrições

- HubTime: front em **React**, uso **somente desktop** (mouse + teclado).
- Referência visual e de medidas: sheet técnico "Relógio analógico — sheet técnico 3D" (modelo genérico sem marca).
- Peças e sintomas: PDF "PARTES, SINTOMAS - OS HUBTIME" (22 peças, apêndice A).
- Este marco é uma **pasta de teste** isolada (`watch-test/`); a integração no HubTime vem depois, importando o
  componente `<WatchSelector>`.

## 3. Escopo

**Dentro**
- Relógio geral ana-digi com as 22 peças, modeladas proceduralmente em código, em escala real (mm).
- Seleção por clique no 3D e pela lista de peças; painel de sintomas com múltipla escolha.
- Vista explodida (para alcançar peças internas).
- Alternâncias de configuração: pulseira **aço ↔ couro**, **capa de resina** liga/desliga.
- Cinta com sensor como acessório ao lado do relógio.
- Saída `onChange` com a seleção estruturada.
- Direção de arte fiel ao sheet (aço 316L, bezel e mostrador azuis, safira).

**Fora (marcos seguintes)**
- Os 5 tipos de relógio como configurações separadas.
- Substituição de peças por GLB modelados no Blender.
- Integração real com o HubTime (API, persistência da OS), tablet/celular, i18n.

## 4. O relógio geral

Um ana-digi esportivo de aço com as medidas do sheet.

| Grupo | Peças (ID) | Observação |
|---|---|---|
| Cabeça | 04 Caixa, 02 Aro/Bezel, 22 Vidro, 15 Mostrador, 11 Índex/Pedras, 18 Ponteiros, 08 Display LCD | LCD como janela retangular no mostrador (posição 6h) |
| Laterais | 07 Coroa, 21 Tige, 03 Botão/Pulsador | coroa às 3h; 2 pulsadores (2h e 4h) |
| Interno | 13 Máquina, 14 Módulo digital, 12 Junta de vedação, 01 Anel de vedação | visíveis na vista explodida |
| Traseira | 10 Fundo/Tampa | escovado |
| Capa | 05 Capa de resina | bumper que envolve a caixa; alternável |
| Pulseira aço | 19 Pulseira, 20 Terminal/End link, 09 Fecho (dobrável), 17 Pinos/Tubos | configuração padrão |
| Pulseira couro | 19 Pulseira, 09 Fivela, 16 Passador, 17 Pinos/Tubos | ao alternar para couro |
| Acessório | 06 Cinta (monitor cardíaco/sensor) | cinta peitoral com módulo, ao lado do relógio |

Cobertura: com pulseira de aço e capa ligada, 21 peças ficam presentes (todas menos 16). Com couro, 16 aparece e
20 sai. Toda peça é alcançável em pelo menos uma configuração; a peça 09 existe nas duas
(fecho ou fivela).

### Medidas (do sheet, mm)

| Medida | Valor |
|---|---|
| Diâmetro da caixa | 42 |
| Espessura total da caixa | 12,5 |
| Lug to lug | 48 |
| Largura entre as asas (pulseira) | 20 |
| Espessura do bezel | 2 |
| Espessura do vidro | 1,8 |
| Coroa | Ø 6,5 |
| Comprimento da pulseira aberta | 180 |
| Espessura média da pulseira | 3,5 |

Medidas que o sheet não traz (pulsadores, LCD, máquina, módulo, juntas, capa, couro, cinta) são definidas em
`watchParams.ts` com valores plausíveis, num só lugar, para ajuste.

## 5. Arquitetura

Stack do teste: **Vite + React + TypeScript + three + @react-three/fiber + @react-three/drei**. Vitest para
testes. Unidade de cena: **1 unidade = 1 mm**.

```
watch-test/
  src/data/parts.ts            22 peças: id, nome, grupo, sintomas (apêndice A)
  src/data/watchParams.ts      medidas (mm) e paleta/materiais do relógio geral
  src/data/config.ts           regras de presença: peça × configuração (pulseira, capa)
  src/state/selection.ts       reducer da seleção (puro, testável)
  src/three/materials.ts       materiais PBR compartilhados
  src/three/parts/*.tsx        um componente por peça (ou pequeno grupo)
  src/three/Watch.tsx          monta as peças, vista explodida, hover/seleção
  src/three/Stage.tsx          luz, HDRI, sombras, câmera, pós
  src/ui/PartList.tsx          lista das 22 peças (seleciona também peças escondidas)
  src/ui/SymptomPanel.tsx      sintomas da peça ativa (checkboxes)
  src/ui/Toolbar.tsx           explodir, pulseira aço/couro, capa de resina
  src/WatchSelector.tsx        API pública
  src/App.tsx                  página de teste que mostra o JSON de saída
```

### Contrato de cada peça

Todo componente de peça:
- recebe `{ params, explode: number (0–1), state: 'normal' | 'hover' | 'selected' | 'dimmed' }`;
- tem pivô na posição montada; a vista explodida soma `explodeOffset` (mm, definido por peça) × `explode`;
- marca seus meshes com `userData.partId` (ex.: `"07"`), usado no raycast;
- usa materiais de `materials.ts`, e o destaque é aplicado por cima (contorno + leve emissivo), sem trocar material.

Esse contrato permite trocar qualquer peça por um GLB depois sem mexer em seleção, UI ou saída.

### API pública

```ts
type PartId = '01' | '02' | … | '22';
type WatchConfig = { pulseira: 'aco' | 'couro'; capaResina: boolean };
type Selection = {
  modelo: 'geral';
  config: WatchConfig;
  pecas: { id: PartId; nome: string; sintomas: string[] }[];   // só peças com ≥1 sintoma
};

<WatchSelector
  initial?: Selection
  onChange?: (s: Selection) => void
/>
```

Uma peça clicada sem sintomas marcados fica "ativa" mas não entra em `pecas`.

## 6. Interação

Layout desktop: canvas 3D à esquerda (~65%), painel à direita (lista de peças + sintomas + resumo).

1. **Hover** numa peça: contorno + nome em tooltip; cursor pointer.
2. **Clique**: a peça vira ativa; o painel mostra seus sintomas; a câmera faz um enquadramento suave nela.
3. **Sintomas**: checkboxes; peças com sintoma marcado ganham um marcador permanente no 3D (cor de alerta) e na lista.
4. **Lista de peças**: clicar seleciona igual ao 3D. Se a peça é interna, a vista explode automaticamente; se não
   existe na configuração atual (ex.: 16 com pulseira de aço), a configuração troca para uma que a contenha.
5. **Explodir**: animação 0 → 1 ao longo do eixo do relógio (vidro e bezel sobem; mostrador, ponteiros, máquina e
   módulo se separam; fundo desce; pulseira se afasta).
6. **Toolbar**: explodir/montar · pulseira aço/couro · capa de resina on/off · limpar seleção.
7. Órbita com limites (sem pan); Esc limpa a peça ativa; a lista é navegável por teclado.

Ao trocar de configuração, sintomas de peças que saem da cena **são mantidos** na seleção (a peça continua
defeituosa) e continuam visíveis na lista.

## 7. Direção de arte (LOOK)

- **Preset**: product studio (hero de produto).
- **Paleta do sheet**: azul mostrador/bezel `#1F4EBC`, aço claro `#C7CCD4`, aço escuro/sombra `#7E8794` (o sheet
  imprime `#7EB794`, corrigido para o cinza da amostra), branco
  `#F7F8FA`, preto/detalhes `#1B1F24`, dourado opcional `#C7A44B`. Fundo neutro claro (gradiente CSS), sombra tingida.
- **Materiais**:
  - aço 316L: escovado (anisotropia) na caixa, fundo e elos centrais; polido nas laterais e chanfros;
  - bezel: inserto azul acetinado (clearcoat);
  - mostrador: azul sunburst (anisotropia radial);
  - vidro: safira (transmission, IOR ≈ 1,77);
  - índices e ponteiros: metal polido + lume branco;
  - coroa serrilhada;
  - couro, resina e silicone com rugosidade alta.
- **Luz**: HDRI de estúdio + key lateral + rim; contact shadow sob o relógio.
- **Câmera**: FOV ~25–30°, vista 3/4 frontal como o render do sheet; tone mapping Neutral (cores fiéis).
- **Destaque**: contorno azul-claro no hover; laranja/vermelho para peças com sintoma; demais peças levemente
  esmaecidas quando uma está ativa.

## 8. Testes e critérios de aceite

**Automatizados (Vitest)**
- `parts.ts` tem exatamente 22 peças, IDs 01–22 únicos, cada uma com ≥1 sintoma, texto igual ao PDF.
- Toda peça está presente em pelo menos uma configuração (`config.ts`).
- Reducer: marcar/desmarcar sintoma, trocar configuração mantém sintomas, limpar, formato de `Selection`.

**Visuais** (`preview.py` com a URL do dev server, desktop 1280×800 e 1600×900)
- Screenshots montado, explodido, aço e couro, capa ligada, comparadas ao sheet e à rubrica da skill threejs-builder.

**Aceite do marco**
1. As 22 peças são selecionáveis (3D ou lista) e mostram seus sintomas do PDF.
2. A saída `onChange` reflete exatamente o que está marcado.
3. O relógio montado lembra o render 3/4 do sheet (proporções, cores, materiais).
4. Sem erros no console; `tsc`, testes e `vite build` passam.

## 9. Riscos

- **Peças pequenas difíceis de clicar** (pinos, tige, anel de vedação): mitigado pela lista e pela vista explodida;
  hit area ampliada (proxy invisível) nas menores.
- **Realismo procedural** de pulseira e coroa: aceitável no marco 1; troca por GLB prevista pelo contrato de peça.
- **Desempenho** com transmission + muitas peças: um só material de vidro com transmission; demais sem.

## Apêndice A — Peças e sintomas (do PDF)

| ID | Peça | Sintomas |
|---|---|---|
| 01 | Anel de Vedação | Ressecado · Rompido / Cortado · Deformado / Fora de medida · Ausente |
| 02 | Aro / Bezel | Arranhado · Amassado / Desgastado · Travado / Não gira · Solto / Desencaixado · Ausente |
| 03 | Botão / Pulsador | Travado / Empacado · Duro de pressionar · Solto / Caído · Sem pressão / Sem retorno (Mola fraca) · Ausente |
| 04 | Caixa | Arranhada · Amassada · Oxidada / Com corrosão · Quebrada / Trincada · Rosca espanada (Caixa ou Tubo) |
| 05 | Capa da Caixa / Proteção de Resina | Arranhada · Racha / Trincada · Ressecada / Quebradiça · Desbotada / Manchada · Solta / Ausente |
| 06 | Cinta (Monitor Cardíaco / Sensor) | Rompida / Rasgada · Sem sinal / Falha de leitura do sensor · Conector danificado / Oxidado · Trava quebrada · Desgastada |
| 07 | Coroa | Solta / Saindo na mão · Travada / Duro de girar · Amassada / Gastado o estriado · Não rosqueia · Ausente |
| 08 | Display LCD / LED | Com dígitos apagados / Segmentos falhando · Trincado / Quebrado · Vazado (Mancha preta interna) · Fraco / Sem contraste · Apagado / Não acende |
| 09 | Fecho / Fivela | Desarmando / Soltando sozinho · Amassado / Deformado · Pino da fivela quebrado · Mola do fecho fraca · Oxidado / Desgastado |
| 10 | Fundo / Tampa Traseira | Arranhado · Amassado · Rosca espanada · Oxidado / Com corrosão · Sem vedação / Mal encaixado |
| 11 | Índex / Pedras / Strass | Solto dentro do mostrador · Ausente / Faltando · Desbotado / Oxidado · Desalinhado |
| 12 | Junta de Vedação | Ressecada · Murcha / Pressionada demais · Rompida · Ausente |
| 13 | Máquina (Movimento Analógico/Mecânico) | Parada / Não funciona · Adiantando / Atrasando (Desregulada) · Trabalhando fraca / Travando ponteiro · Com umidade / Ferrugem interna · Barulho interno anormal |
| 14 | Módulo (Circuito Digital) | Não liga · Consumo alto de bateria (Descarrega rápido) · Funções travadas / Resetando sozinho · Com umidade / Oxidação no circuito · Bip / Alarme não funciona |
| 15 | Mostrador | Manchado / Amarelado · Risca / Arranhado · Descascando / Pintura soltando · Pés do mostrador quebrados (Girando na caixa) · Oxidado |
| 16 | Passador da Pulseira | Rasgado / Rompido · Largo / Fora de medida · Ressecado · Ausente |
| 17 | Pinos / Tubos da Pulseira | Torto / Empacado · Quebrado · Enferrujado / Encravado · Mola fraca (Pino de mola) · Ausente |
| 18 | Ponteiros | Soltos / Caídos · Raspando no vidro ou no mostrador · Desalinhados · Torto (Ponteiro dobrado) · Sem massa luminosa / Desbotados |
| 19 | Pulseira | Partida / Rasgada / Quebrada · Arranhada / Desgastada · Ressecada (Borracha/Resina) · Elo laceado / Com folga (Aço) · Manchada / Suja |
| 20 | Terminal / End Link | Amassado / Com folga · Risca / Desgastado · Desencaixado da caixa · Ausente |
| 21 | Tige | Quebrada / Partida · Torta · Enfeada / Ferrugem · Não engata as posições (Hora/Data) · Ausente |
| 22 | Vidro / Visor | Arranhado · Trincado / Quebrado · Riscado no tratamento antirreflexo · Embaçado (Umidade interna) · Descolado / Solto |

Grafia mantida como no PDF (ex.: "Enfeada", "Gastado o estriado") — corrigir só se o HubTime usar outra grafia.
