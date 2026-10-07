import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../../data/parts';
import { PART_COMPONENTS } from './index';

describe('PART_COMPONENTS', () => {
  it('tem um componente 3D para cada uma das 22 peças', () => {
    expect(PART_IDS.filter((id) => !PART_COMPONENTS[id])).toEqual([]);
  });
});
