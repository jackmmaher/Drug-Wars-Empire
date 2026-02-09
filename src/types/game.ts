// ── Core Game Types ──────────────────────────────────────

export interface Consignment {
  gangId: string;
  drugId: string;
  quantity: number;
  amountOwed: number;
  amountPaid: number;
  turnsLeft: number;
  originLocation: string;
  accepted: boolean;
}

export interface Drug {
  id: string;
  name: string;
  emoji: string;
  min: number;
  max: number;
  tier: number;
}

export interface RegionLaw {
  forceName: string;
  forceEmoji: string;
  bribeMultiplier: number;
  aggressionBase: number;
  heatDecayBonus: number;
  encounterModifier: number;
  behavior: 'corrupt' | 'brutal' | 'methodical';
}

export interface Region {
  id: string;
  name: string;
  emoji: string;
  color: string;
  rep: number;
  flyCost: number;
  travelDays: number;
  priceMultipliers: Record<string, number>;
  gangId: string;
  law: RegionLaw;
  customsStrictness: number;
  contraband: string[];
}

export interface Location {
  id: string;
  name: string;
  emoji: string;
  color: string;
  region: string;
  bank?: boolean;
  shark?: boolean;
}

export interface Gang {
  id: string;
  name: string;
  emoji: string;
  color: string;
  turf: string[];
}

export interface Rank {
  name: string;
  rep: number;
  emoji: string;
}

export interface MarketEvent {
  message: string;
  drugId: string;
  multiplier: number;
  type: 'spike' | 'crash';
  regionId?: string | null;
}

export interface Milestone {
  id: string;
  condition: (s: PlayerState) => boolean;
  label: string;
  emoji: string;
}

export interface RatTip {
  drugId: string;
  direction: 'spike' | 'crash';
  confidence: number;
  turnsUntil: number;
  accurate: boolean;
}

export interface Rat {
  name: string;
  personality: string;
  loyalty: number;
  intel: number;
  alive: boolean;
  hired: boolean;
  cost: number;
  tips: number;
  pendingTip: RatTip | null;
}

export interface CopEncounter {
  count: number;
  bribeCost: number;
  regionLaw: RegionLaw;
  bountyHunter?: boolean;
  consignment?: Consignment;
}

export interface Offer {
  type: 'gun' | 'coat' | 'rat' | 'territory' | 'consignment';
  price?: number;
  space?: number;
  rat?: Rat;
  locationId?: string;
  cost?: number;
  tribute?: number;
  drugId?: string;
  quantity?: number;
  amountOwed?: number;
  originLocation?: string;
  gangId?: string;
}

export interface Territory {
  tribute: number;
  acquiredDay: number;
  stash: Record<string, number>;
}

export interface NearMiss {
  drug: Drug;
  previousPrice: number;
  currentPrice: number;
  quantity: number;
  missedProfit: number;
  type?: 'sold_early';
}

export interface EventLog {
  day: number;
  message: string;
  type: 'info' | 'danger' | 'spike' | 'crash' | 'tip' | 'customs' | 'consignment';
}

export interface Forecast {
  regionId: string;
  type: 'spike' | 'crash';
}

export interface RecentSold {
  id: string;
  price: number;
  qty: number;
}

export interface PlayerState {
  day: number;
  cash: number;
  debt: number;
  bank: number;
  location: string;
  inventory: Record<string, number>;
  space: number;
  prices: Record<string, number | null>;
  previousPrices: Record<string, number | null>;
  gun: boolean;
  hp: number;
  heat: number;
  rep: number;
  profit: number;
  bestTrade: number;
  trades: number;
  streak: number;
  maxStreak: number;
  combo: number;
  averageCosts: Record<string, number>;
  territories: Record<string, Territory>;
  gangRelations: Record<string, number>;
  rat: Rat;
  currentEvent: MarketEvent | null;
  eventLog: EventLog[];
  nearMisses: NearMiss[];
  offer: Offer | null;
  cops: CopEncounter | null;
  tributePerDay: number;
  hasGoneInternational: boolean;
  closeCallCount: number;
  milestones: string[];
  newMilestone: Milestone | null;
  recentSold: RecentSold[];
  customsEvasions: number;
  customsCaught: number;
  consignment: Consignment | null;
  fingers: number;
  consignmentsCompleted: number;
  forecast: Forecast | null;
}

export interface SharedMarket {
  day: number;
  prices: Record<string, Record<string, number | null>>; // locationId -> drugId -> price
  regionEvents: Record<string, MarketEvent | null>; // regionId -> event for the day
}

export type GamePhase = 'title' | 'playing' | 'cop' | 'win' | 'end';
export type GameMode = 'solo' | '2p';
export type TabId = 'market' | 'map' | 'intel';
export type Difficulty = 'conservative' | 'standard' | 'highroller';

export interface TradeInfo {
  type: 'buy' | 'sell';
  drugId: string;
}
