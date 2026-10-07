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
