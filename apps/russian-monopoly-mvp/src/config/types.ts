export type CellType =
  | 'start'
  | 'property'
  | 'transport'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'trial'
  | 'micro-event'
  | 'contract'
  | 'goto-jail'
  | 'jail'
  | 'parking';

export interface RentDetails {
  base?: number;
  multiplier?: number;
  fixed?: number;
  withSet?: number;
  withImprovements?: number;
}

export interface BoardCell {
  id: string;
  name: string;
  type: CellType;
  price?: number;
  rent?: number | RentDetails;
  category?: string;
  tax?: number;
  amount?: number;
  description?: string;
  order?: number;
  color?: string;
}

export interface CardEffect {
  money?: number;
  move?: number;
  moveTo?: number;
  goTo?: string;
  jail?: boolean;
  freeJail?: boolean;
  repairs?: { perHouse: number; perHotel: number };
  incomeMultiplier?: number;
}

export interface Card {
  id: string;
  type: string;
  title?: string;
  text: string;
  effect: CardEffect;
}

export interface MicroEvent {
  id: string;
  name: string;
  type: 'bonus' | 'penalty' | 'global';
  trigger: string;
  effect: CardEffect;
}

export interface Contract {
  id: string;
  name: string;
  type: 'lease' | 'service';
  description: string;
  reward: number;
  upkeep: number;
}

export interface GamePreset {
  name: string;
  description: string;
  salary: number;
  taxRate: number;
  luxuryTax: number;
  jailFine: number;
  bailout: number;
}

export interface LocaleStrings {
  [key: string]: string;
}

export interface GameData {
  board: BoardCell[];
  chance: Card[];
  trial: Card[];
  presets: Record<string, GamePreset>;
  locales: Record<string, LocaleStrings>;
  microEvents: MicroEvent[];
  contracts: Contract[];
}
