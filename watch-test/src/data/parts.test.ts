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
