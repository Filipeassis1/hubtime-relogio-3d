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
