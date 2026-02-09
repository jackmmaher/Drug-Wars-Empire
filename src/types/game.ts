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
  rare?: boolean;
  spawnChance?: number; // 0-1, default 0.88
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
  gangCollector?: boolean;
  gangLoan?: GangLoan;
}

export interface Offer {
  type: 'gun' | 'coat' | 'rat' | 'territory' | 'consignment' | 'mission';
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
  mission?: GangMission;
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
  type: 'info' | 'danger' | 'spike' | 'crash' | 'tip' | 'customs' | 'consignment' | 'gangLoan' | 'mission';
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

// ── Persona Types ────────────────────────────────────────
export type PersonaId = 'chemist' | 'housewife' | 'student' | 'enforcer' | 'connected' | 'ghost';

export interface PersonaModifiers {
  startingCashMultiplier: number;
  startingDebtMultiplier: number;
  startingSpaceOffset: number;
  startingHP: number;
  startingRep: number;
  startingGun: boolean;
  startingLocation: string;
  startingGangRelationOffset: number;
  startingGangOverrides: Record<string, number>;
  preHiredRat: boolean;
  ratIntelBonus: number;
  heatGainMultiplier: number;
  heatDecayBonus: number;
  repGainMultiplier: number;
  sellPriceBonus: number;
  copRunChanceBonus: number;
  copFightKillBonus: number;
  fightDamageReduction: number;
  bribeCostMultiplier: number;
  copEncounterReduction: number;
  customsEvasionBonus: number;
  eventChanceBonus: number;
  gangRelGainMultiplier: number;
  consignmentMarkupMultiplier: number;
  territoryDiscountMultiplier: number;
  muggingChanceMultiplier: number;
}

export interface Persona {
  id: PersonaId;
  name: string;
  emoji: string;
  backstory: string;
  tagline: string;
  modifiers: PersonaModifiers;
}

// ── Gang Loan Types ──────────────────────────────────────
export interface GangLoan {
  gangId: string;
  principal: number;
  amountOwed: number;
  amountPaid: number;
  turnsLeft: number;
  originLocation: string;
  interestRate: number;
}

// ── Gang Mission Types ───────────────────────────────────
export interface GangMission {
  type: 'delivery' | 'tribute' | 'muscle' | 'supply';
  gangId: string;
  description: string;
  targetLocation?: string;
  drugId?: string;
  quantity?: number;
  cashAmount?: number;
  turnsLeft: number;
  originLocation: string;
  sellTarget?: number;
  sellProgress?: number;
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
  personaId: PersonaId | null;
  gangLoan: GangLoan | null;
  gangLoansRepaid: number;
  gangMission: GangMission | null;
  gangMissionsCompleted: number;
}

export type GamePhase = 'title' | 'playing' | 'cop' | 'win' | 'end';
export type TabId = 'market' | 'map' | 'intel';
export type Difficulty = 'conservative' | 'standard' | 'highroller';

export interface TradeInfo {
  type: 'buy' | 'sell';
  drugId: string;
}
