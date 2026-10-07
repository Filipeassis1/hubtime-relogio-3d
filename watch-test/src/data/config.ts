import type { PartId } from './parts';

export type Pulseira = 'aco' | 'couro';
export interface WatchConfig { pulseira: Pulseira; capaResina: boolean }

export const DEFAULT_CONFIG: WatchConfig = { pulseira: 'aco', capaResina: false };

/** Parts that only exist in some configurations; every other part is always present. */
export function isPresent(id: PartId, c: WatchConfig): boolean {
  if (id === '05') return c.capaResina;
  if (id === '16') return c.pulseira === 'couro';
  if (id === '20') return c.pulseira === 'aco';
  return true;
}

/** The closest configuration that contains the part (same reference if it is already present). */
export function configWith(id: PartId, c: WatchConfig): WatchConfig {
  if (isPresent(id, c)) return c;
  if (id === '05') return { ...c, capaResina: true };
  if (id === '16') return { ...c, pulseira: 'couro' };
  return { ...c, pulseira: 'aco' }; // '20'
}
