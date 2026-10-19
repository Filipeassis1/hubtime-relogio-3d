import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../data/parts';
import { DEFAULT_CONFIG } from '../data/config';
import { partsToRender } from './visibility';

describe('partsToRender', () => {
  it('a cinta (06) não aparece enquanto não for selecionada', () => {
    expect(partsToRender('frente', DEFAULT_CONFIG, null)).not.toContain('06');
    expect(partsToRender('explodido', DEFAULT_CONFIG, '04')).not.toContain('06');
  });

  it('selecionar a cinta mostra só a cinta', () => {
    expect(partsToRender('frente', DEFAULT_CONFIG, '06')).toEqual(['06']);
    expect(partsToRender('explodido', DEFAULT_CONFIG, '06')).toEqual(['06']);
  });

  it('peças internas só aparecem na vista explodida', () => {
    expect(partsToRender('frente', DEFAULT_CONFIG, null)).not.toContain('13');
    expect(partsToRender('explodido', DEFAULT_CONFIG, null)).toContain('13');
  });

  it('respeita a configuração (05 só com capa, 16 só com couro)', () => {
    expect(partsToRender('frente', DEFAULT_CONFIG, null)).not.toContain('05');
    expect(partsToRender('frente', { pulseira: 'couro', capaResina: true }, null)).toEqual(expect.arrayContaining(['05', '16']));
  });

  it('o relógio montado mostra todas as peças externas presentes', () => {
    const shown = partsToRender('frente', DEFAULT_CONFIG, null);
    expect(shown).toEqual(PART_IDS.filter((id) => !['01', '05', '06', '12', '13', '14', '16', '21'].includes(id)));
  });
});
