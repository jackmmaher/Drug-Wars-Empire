// ── Core Game Types ──────────────────────────────────────

export interface Drug {
  id: string;
  name: string;
  emoji: string;
  min: number;
  max: number;
  tier: number;
}

export interface Location {
  id: string;
  name: string;
  emoji: string;
  color: string;
  region: 'nyc' | 'intl';
  bank?: boolean;
  shark?: boolean;
  rep?: number;
  flyCost?: number;
  travelDays?: number;
  priceMultipliers?: Record<string, number>;
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
}

export interface Milestone {
  id: string;
  condition: (s: PlayerState) => boolean;
  label: string;
  emoji: string;
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
}

export interface CopEncounter {
  count: number;
  bribeCost: number;
}

export interface Offer {
  type: 'gun' | 'coat' | 'rat' | 'territory';
  price?: number;
  space?: number;
  rat?: Rat;
  locationId?: string;
  cost?: number;
  tribute?: number;
}

export interface Territory {
  tribute: number;
  acquiredDay: number;
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
  type: 'info' | 'danger' | 'spike' | 'crash' | 'tip';
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
}

export type GamePhase = 'title' | 'playing' | 'cop' | 'win' | 'end';
export type GameMode = 'solo' | '2p';
export type TabId = 'market' | 'map' | 'intel';

export interface TradeInfo {
  type: 'buy' | 'sell';
  drugId: string;
}
