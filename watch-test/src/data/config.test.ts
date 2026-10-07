import { describe, expect, it } from 'vitest';
import { PART_IDS } from './parts';
import { DEFAULT_CONFIG, configWith, isPresent, type WatchConfig } from './config';

const ALL: WatchConfig[] = [
  { pulseira: 'aco', capaResina: false }, { pulseira: 'aco', capaResina: true },
  { pulseira: 'couro', capaResina: false }, { pulseira: 'couro', capaResina: true },
];

describe('config', () => {
  it('padrão é aço sem capa', () => {
    expect(DEFAULT_CONFIG).toEqual({ pulseira: 'aco', capaResina: false });
  });

  it('toda peça existe em pelo menos uma configuração', () => {
    for (const id of PART_IDS) expect(ALL.some((c) => isPresent(id, c))).toBe(true);
  });

  it('05 depende da capa, 16 só no couro, 20 só no aço', () => {
    expect(isPresent('05', { pulseira: 'aco', capaResina: false })).toBe(false);
    expect(isPresent('05', { pulseira: 'aco', capaResina: true })).toBe(true);
    expect(isPresent('16', { pulseira: 'aco', capaResina: false })).toBe(false);
    expect(isPresent('16', { pulseira: 'couro', capaResina: false })).toBe(true);
    expect(isPresent('20', { pulseira: 'couro', capaResina: false })).toBe(false);
    expect(isPresent('09', { pulseira: 'couro', capaResina: false })).toBe(true);
  });

  it('configWith devolve a mesma referência quando a peça já está presente', () => {
    expect(configWith('04', DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG);
  });

  it('configWith troca só o necessário', () => {
    expect(configWith('16', DEFAULT_CONFIG)).toEqual({ pulseira: 'couro', capaResina: false });
    expect(configWith('20', { pulseira: 'couro', capaResina: true })).toEqual({ pulseira: 'aco', capaResina: true });
    expect(configWith('05', DEFAULT_CONFIG)).toEqual({ pulseira: 'aco', capaResina: true });
  });
});
