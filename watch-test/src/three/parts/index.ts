import type { JSX } from 'react';
import type { PartId } from '../../data/parts';
import type { WatchConfig } from '../../data/config';
import { Bezel02, Case04, Caseback10, Crystal22, Dial15, Hands18, Indices11, Lcd08 } from './head';
import { Anel01, Junta12, Module14, Movement13 } from './interior';
import { Crown07, Pushers03, ResinCover05, Tige21 } from './sides';
import { Bracelet19, Clasp09, EndLinks20, Keeper16, Pins17 } from './bracelet';
import { ChestStrap06 } from './accessory';

export interface PartComponentProps { config: WatchConfig }
export type PartComponent = (p: PartComponentProps) => JSX.Element | null;

export const PART_COMPONENTS: Partial<Record<PartId, PartComponent>> = {
  '01': Anel01, '02': Bezel02, '03': Pushers03, '04': Case04, '05': ResinCover05, '06': ChestStrap06,
  '07': Crown07, '08': Lcd08, '09': Clasp09, '10': Caseback10, '11': Indices11, '12': Junta12,
  '13': Movement13, '14': Module14, '15': Dial15, '16': Keeper16, '17': Pins17, '18': Hands18,
  '19': Bracelet19, '20': EndLinks20, '21': Tige21, '22': Crystal22,
};
