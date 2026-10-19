import { PART_BY_ID, PART_IDS, type PartId } from '../data/parts';
import { isPresent, type WatchConfig } from '../data/config';
import type { ViewMode } from './selection';

/** Accessories that are not part of the watch: drawn only, and alone, while selected. */
const STANDALONE: ReadonlySet<PartId> = new Set<PartId>(['06']);

/** Which parts the scene draws for a view, configuration and selection. */
export function partsToRender(view: ViewMode, config: WatchConfig, activeId: PartId | null): PartId[] {
  if (activeId && STANDALONE.has(activeId)) return [activeId];
  return PART_IDS.filter((id) =>
    !STANDALONE.has(id)
    && isPresent(id, config)
    && (view === 'explodido' || !PART_BY_ID[id].interna));
}
