import { describe, expect, it } from 'vitest';
import { initState, reducer, toSelection, type Selection } from './selection';

describe('selection', () => {
  it('estado inicial: aço, sem capa, montado, nada ativo', () => {
    expect(initState()).toEqual({
      config: { pulseira: 'aco', capaResina: false }, explode: false, activeId: null, sintomas: {},
    });
  });

  it('marca e desmarca sintomas mantendo a ordem do PDF', () => {
    let s = initState();
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Ausente' });
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Solta / Saindo na mão' });
    expect(s.sintomas['07']).toEqual(['Solta / Saindo na mão', 'Ausente']);
    s = reducer(s, { type: 'toggleSymptom', id: '07', sintoma: 'Ausente' });
    expect(s.sintomas['07']).toEqual(['Solta / Saindo na mão']);
  });

  it('ignora sintoma que não pertence à peça', () => {
    const s0 = initState();
    expect(reducer(s0, { type: 'toggleSymptom', id: '07', sintoma: 'Não liga' })).toBe(s0);
  });

  it('desmarcar o último sintoma remove a peça da saída mas mantém ativa', () => {
    let s = reducer(initState(), { type: 'select', id: '18' });
    s = reducer(s, { type: 'toggleSymptom', id: '18', sintoma: 'Desalinhados' });
    s = reducer(s, { type: 'toggleSymptom', id: '18', sintoma: 'Desalinhados' });
    expect(s.activeId).toBe('18');
    expect(s.sintomas['18']).toBeUndefined();
    expect(toSelection(s).pecas).toEqual([]);
  });

  it('selecionar pela lista uma peça ausente troca a configuração', () => {
    const s = reducer(initState(), { type: 'selectFromList', id: '16' });
    expect(s.activeId).toBe('16');
    expect(s.config.pulseira).toBe('couro');
  });

  it('selecionar pela lista uma peça interna explode a vista', () => {
    expect(reducer(initState(), { type: 'selectFromList', id: '13' }).explode).toBe(true);
    expect(reducer(initState(), { type: 'selectFromList', id: '04' }).explode).toBe(false);
  });

  it('trocar configuração mantém sintomas de peças que saíram', () => {
    let s = reducer(initState(), { type: 'selectFromList', id: '16' });
    s = reducer(s, { type: 'toggleSymptom', id: '16', sintoma: 'Ressecado' });
    s = reducer(s, { type: 'setConfig', config: { pulseira: 'aco' } });
    expect(toSelection(s)).toEqual({
      modelo: 'geral',
      config: { pulseira: 'aco', capaResina: false },
      pecas: [{ id: '16', nome: 'Passador da Pulseira', sintomas: ['Ressecado'] }],
    });
  });

  it('clear zera sintomas e peça ativa, mantém configuração e explosão', () => {
    let s = reducer(initState(), { type: 'selectFromList', id: '13' });
    s = reducer(s, { type: 'toggleSymptom', id: '13', sintoma: 'Parada / Não funciona' });
    s = reducer(s, { type: 'clear' });
    expect(s.activeId).toBeNull();
    expect(s.sintomas).toEqual({});
    expect(s.explode).toBe(true);
  });

  it('toSelection ordena peças por ID', () => {
    let s = initState();
    s = reducer(s, { type: 'toggleSymptom', id: '22', sintoma: 'Arranhado' });
    s = reducer(s, { type: 'toggleSymptom', id: '02', sintoma: 'Arranhado' });
    expect(toSelection(s).pecas.map((p) => p.id)).toEqual(['02', '22']);
  });

  it('initState descarta IDs e sintomas inválidos', () => {
    const initial = {
      modelo: 'geral',
      config: { pulseira: 'couro', capaResina: true },
      pecas: [
        { id: '99', nome: 'x', sintomas: ['Arranhado'] },
        { id: '04', nome: 'Caixa', sintomas: ['Amassada', 'Inexistente'] },
        { id: '10', nome: 'Fundo', sintomas: ['Inexistente'] },
      ],
    } as unknown as Selection;
    const s = initState(initial);
    expect(s.config).toEqual({ pulseira: 'couro', capaResina: true });
    expect(s.sintomas).toEqual({ '04': ['Amassada'] });
  });
});
