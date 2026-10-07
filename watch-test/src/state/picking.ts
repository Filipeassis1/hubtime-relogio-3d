import { isPartId, type PartId } from '../data/parts';

export interface Hit { partId: string | undefined; distance: number }

/** Transparent parts that only catch the pointer when nothing else is behind them. */
export const PASS_THROUGH: ReadonlySet<PartId> = new Set<PartId>(['22']);

export function pickPart(hits: readonly Hit[]): PartId | null {
  const valid = hits
    .filter((h): h is { partId: PartId; distance: number } => isPartId(h.partId))
    .sort((a, b) => a.distance - b.distance);
  return (valid.find((h) => !PASS_THROUGH.has(h.partId)) ?? valid[0])?.partId ?? null;
}

export type PartState = 'normal' | 'hover' | 'selected' | 'defect' | 'dimmed';

export function partState(id: PartId, activeId: PartId | null, hoverId: PartId | null, hasDefect: boolean): PartState {
  if (id === activeId) return 'selected';
  if (id === hoverId) return 'hover';
  if (hasDefect) return 'defect';
  if (activeId) return 'dimmed';
  return 'normal';
}
