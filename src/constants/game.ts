import type { Drug, Location, Gang, Rank, MarketEvent, Milestone, PlayerState, Region } from '../types/game';

// ── CONFIG ─────────────────────────────────────────────────
export const DAYS = 30;
export const STARTING_CASH = 2000;
export const STARTING_DEBT = 5500;
export const STARTING_SPACE = 100;
export const DEBT_INTEREST = 0.10;
export const BANK_INTEREST = 0.05;

// ── HELPERS ────────────────────────────────────────────────
export const R = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
export const C = (p: number) => Math.random() < p;
export const $ = (n: number): string => {
  if (n < 0) return `-${$(-n)}`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
};

// ── DRUGS ──────────────────────────────────────────────────
export const DRUGS: Drug[] = [
  { id: 'cocaine', name: 'Cocaine', emoji: '❄️', min: 15000, max: 29000, tier: 3 },
  { id: 'heroin', name: 'Heroin', emoji: '💉', min: 5000, max: 14000, tier: 3 },
  { id: 'ecstasy', name: 'Ecstasy', emoji: '💎', min: 2000, max: 8000, tier: 2 },
  { id: 'acid', name: 'Acid', emoji: '🌈', min: 1000, max: 4500, tier: 2 },
  { id: 'weed', name: 'Weed', emoji: '🌿', min: 300, max: 900, tier: 1 },
  { id: 'speed', name: 'Speed', emoji: '⚡', min: 70, max: 250, tier: 1 },
  { id: 'ludes', name: 'Ludes', emoji: '💊', min: 10, max: 60, tier: 1 },
];

// ── REGIONS ───────────────────────────────────────────────
export const REGIONS: Region[] = [
  { id: 'nyc', name: 'New York', emoji: '🗽', color: '#ef4444', rep: 0, flyCost: 0, travelDays: 0, priceMultipliers: {}, gangId: '' },
  { id: 'colombia', name: 'Colombia', emoji: '🇨🇴', color: '#dc2626', rep: 30, flyCost: 3000, travelDays: 2, priceMultipliers: { cocaine: 0.3, heroin: 0.8 }, gangId: 'car' },
  { id: 'netherlands', name: 'Netherlands', emoji: '🇳🇱', color: '#f97316', rep: 50, flyCost: 5000, travelDays: 2, priceMultipliers: { ecstasy: 0.35, weed: 0.4, acid: 0.5 }, gangId: 'pen' },
  { id: 'thailand', name: 'Thailand', emoji: '🇹🇭', color: '#14b8a6', rep: 40, flyCost: 4000, travelDays: 2, priceMultipliers: { heroin: 0.3, speed: 0.35 }, gangId: 'jao' },
  { id: 'france', name: 'France', emoji: '🇫🇷', color: '#6366f1', rep: 60, flyCost: 4500, travelDays: 2, priceMultipliers: { heroin: 0.45, cocaine: 0.65 }, gangId: 'cor' },
];

// ── LOCATIONS ──────────────────────────────────────────────
// NYC (kept as named export for backward compat)
export const NYC: Location[] = [
  { id: 'bronx', name: 'The Bronx', emoji: '🏚️', color: '#ef4444', bank: true, shark: true, region: 'nyc' },
  { id: 'ghetto', name: 'The Ghetto', emoji: '🔥', color: '#a855f7', region: 'nyc' },
  { id: 'central_park', name: 'Central Park', emoji: '🌳', color: '#22c55e', region: 'nyc' },
  { id: 'manhattan', name: 'Manhattan', emoji: '🏙️', color: '#3b82f6', region: 'nyc' },
  { id: 'coney', name: 'Coney Island', emoji: '🎡', color: '#f59e0b', region: 'nyc' },
  { id: 'brooklyn', name: 'Brooklyn', emoji: '🌉', color: '#ec4899', region: 'nyc' },
];

// Colombia
const COLOMBIA: Location[] = [
  { id: 'bogota', name: 'Bogot\u00e1', emoji: '🏛️', color: '#dc2626', bank: true, shark: true, region: 'colombia' },
  { id: 'medellin', name: 'Medell\u00edn', emoji: '💀', color: '#991b1b', region: 'colombia' },
  { id: 'cali', name: 'Cali', emoji: '🌴', color: '#b91c1c', region: 'colombia' },
  { id: 'cartagena', name: 'Cartagena', emoji: '⚓', color: '#ef4444', region: 'colombia' },
  { id: 'barranquilla', name: 'Barranquilla', emoji: '🏖️', color: '#f87171', region: 'colombia' },
  { id: 'bucaramanga', name: 'Bucaramanga', emoji: '⛰️', color: '#fca5a5', region: 'colombia' },
];

// Netherlands
const NETHERLANDS: Location[] = [
  { id: 'amsterdam', name: 'Amsterdam', emoji: '🌷', color: '#f97316', bank: true, shark: true, region: 'netherlands' },
  { id: 'rotterdam', name: 'Rotterdam', emoji: '🚢', color: '#ea580c', region: 'netherlands' },
  { id: 'the_hague', name: 'The Hague', emoji: '⚖️', color: '#c2410c', region: 'netherlands' },
  { id: 'utrecht', name: 'Utrecht', emoji: '🏰', color: '#fb923c', region: 'netherlands' },
  { id: 'eindhoven', name: 'Eindhoven', emoji: '💡', color: '#fdba74', region: 'netherlands' },
  { id: 'groningen', name: 'Groningen', emoji: '🌾', color: '#fed7aa', region: 'netherlands' },
];

// Thailand
const THAILAND: Location[] = [
  { id: 'bangkok', name: 'Bangkok', emoji: '🛕', color: '#14b8a6', bank: true, shark: true, region: 'thailand' },
  { id: 'chiang_mai', name: 'Chiang Mai', emoji: '🏔️', color: '#0d9488', region: 'thailand' },
  { id: 'phuket', name: 'Phuket', emoji: '🏝️', color: '#0f766e', region: 'thailand' },
  { id: 'pattaya', name: 'Pattaya', emoji: '🌃', color: '#2dd4bf', region: 'thailand' },
  { id: 'chiang_rai', name: 'Chiang Rai', emoji: '🔺', color: '#5eead4', region: 'thailand' },
  { id: 'hat_yai', name: 'Hat Yai', emoji: '🌧️', color: '#99f6e4', region: 'thailand' },
];

// France
const FRANCE: Location[] = [
  { id: 'marseille', name: 'Marseille', emoji: '🚢', color: '#6366f1', bank: true, shark: true, region: 'france' },
  { id: 'paris', name: 'Paris', emoji: '🗼', color: '#4f46e5', region: 'france' },
  { id: 'lyon', name: 'Lyon', emoji: '🍷', color: '#4338ca', region: 'france' },
  { id: 'nice', name: 'Nice', emoji: '🌊', color: '#818cf8', region: 'france' },
  { id: 'toulouse', name: 'Toulouse', emoji: '🌹', color: '#a5b4fc', region: 'france' },
  { id: 'bordeaux', name: 'Bordeaux', emoji: '🍇', color: '#c7d2fe', region: 'france' },
];

export const LOCATIONS: Location[] = [...NYC, ...COLOMBIA, ...NETHERLANDS, ...THAILAND, ...FRANCE];

// ── GANGS ──────────────────────────────────────────────────
export const GANGS: Gang[] = [
  // NYC
  { id: 'col', name: 'The Colombians', emoji: '🐍', color: '#dc2626', turf: ['ghetto'] },
  { id: 'tri', name: 'The Triads', emoji: '🐉', color: '#f59e0b', turf: ['manhattan'] },
  { id: 'bra', name: 'The Bratva', emoji: '🐻', color: '#6366f1', turf: ['brooklyn'] },
  { id: 'lcn', name: 'La Cosa Nostra', emoji: '🎰', color: '#059669', turf: ['coney'] },
  // International
  { id: 'car', name: 'Medell\u00edn Cartel', emoji: '☠️', color: '#991b1b', turf: ['medellin', 'cali'] },
  { id: 'pen', name: 'The Penose', emoji: '🌑', color: '#ea580c', turf: ['amsterdam', 'rotterdam'] },
  { id: 'jao', name: 'Jao Pho', emoji: '🐅', color: '#0d9488', turf: ['bangkok', 'chiang_rai'] },
  { id: 'cor', name: 'The Corsicans', emoji: '🗡️', color: '#4f46e5', turf: ['marseille', 'nice'] },
];

// ── REGION HELPERS ─────────────────────────────────────────
export function getRegion(regionId: string): Region | undefined {
  return REGIONS.find(r => r.id === regionId);
}

export function getRegionLocations(regionId: string): Location[] {
  return LOCATIONS.filter(l => l.region === regionId);
}

export function getRegionForLocation(locationId: string): Region | undefined {
  const loc = LOCATIONS.find(l => l.id === locationId);
  if (!loc) return undefined;
  return REGIONS.find(r => r.id === loc.region);
}

// ── RANKS ──────────────────────────────────────────────────
export const RANKS: Rank[] = [
  { name: 'Corner Boy', rep: 0, emoji: '🧢' },
  { name: 'Street Dealer', rep: 15, emoji: '🔑' },
  { name: 'Shot Caller', rep: 35, emoji: '📱' },
  { name: 'Lieutenant', rep: 60, emoji: '💼' },
  { name: 'Underboss', rep: 100, emoji: '🎯' },
  { name: 'Kingpin', rep: 160, emoji: '👑' },
  { name: 'Drug Lord', rep: 250, emoji: '🏆' },
  { name: 'Ghost', rep: 400, emoji: '👻' },
];

// ── MARKET EVENTS ──────────────────────────────────────────
export const EVENTS: MarketEvent[] = [
  { message: 'Cops busted a cocaine shipment! Prices skyrocketed!', drugId: 'cocaine', multiplier: 4, type: 'spike' },
  { message: 'Addicts buying coke at insane prices!', drugId: 'cocaine', multiplier: 7, type: 'spike' },
  { message: 'Colombian freighter unloaded cheap coke!', drugId: 'cocaine', multiplier: 0.3, type: 'crash' },
  { message: 'Heroin bust! Supply dried up!', drugId: 'heroin', multiplier: 4, type: 'spike' },
  { message: 'Junkies desperate — heroin prices insane!', drugId: 'heroin', multiplier: 7, type: 'spike' },
  { message: 'Cheap heroin flooding in from overseas!', drugId: 'heroin', multiplier: 0.35, type: 'crash' },
  { message: 'Acid factory raided! Prices soaring!', drugId: 'acid', multiplier: 4, type: 'spike' },
  { message: 'Market flooded with cheap acid!', drugId: 'acid', multiplier: 0.25, type: 'crash' },
  { message: 'Weed drought — prices skyrocketed!', drugId: 'weed', multiplier: 3.5, type: 'spike' },
  { message: 'Dealers dumping weed everywhere!', drugId: 'weed', multiplier: 0.25, type: 'crash' },
  { message: 'Speed addicts paying premium!', drugId: 'speed', multiplier: 5, type: 'spike' },
  { message: 'Cheap speed flooding the streets!', drugId: 'speed', multiplier: 0.2, type: 'crash' },
  { message: 'Quaalude factory raided!', drugId: 'ludes', multiplier: 6, type: 'spike' },
  { message: 'Ludes dirt cheap everywhere!', drugId: 'ludes', multiplier: 0.15, type: 'crash' },
  { message: 'Rave scene exploded — ecstasy demand insane!', drugId: 'ecstasy', multiplier: 5, type: 'spike' },
  { message: 'Dutch ecstasy shipment arrived — dirt cheap!', drugId: 'ecstasy', multiplier: 0.3, type: 'crash' },
];

// ── RAT NAMES / TYPES ─────────────────────────────────────
export const RAT_NAMES = ['Jimmy Two-Shoes', 'Skinny Pete', 'Maria Espinoza', 'Dice', 'Nails', 'Whisper', 'Tina Blade', 'Switchblade Sam'];
export const RAT_TYPES = ['nervous', 'cocky', 'loyal', 'greedy'];

// ── MILESTONES ─────────────────────────────────────────────
export const MILESTONES: Milestone[] = [
  { id: 'ft', condition: (s) => s.trades >= 1, label: 'First Trade', emoji: '🎯' },
  { id: 'df', condition: (s) => s.debt <= 0, label: 'Debt Free', emoji: '🦈' },
  { id: '10k', condition: (s) => s.cash + s.bank >= 10000, label: '$10K Club', emoji: '💰' },
  { id: '50k', condition: (s) => s.cash + s.bank >= 50000, label: '$50K', emoji: '💎' },
  { id: '100k', condition: (s) => s.cash + s.bank >= 100000, label: '$100K', emoji: '🏆' },
  { id: 'ter', condition: (s) => Object.keys(s.territories).length >= 1, label: 'First Territory', emoji: '🏴' },
  { id: 'emp', condition: (s) => Object.keys(s.territories).length >= 3, label: 'Empire', emoji: '👑' },
  { id: 's5', condition: (s) => s.maxStreak >= 5, label: '5x Streak', emoji: '🔥' },
  { id: 's10', condition: (s) => s.maxStreak >= 10, label: '10x Streak', emoji: '🔥' },
  { id: 'surv', condition: (s) => s.closeCallCount >= 3, label: 'Survivor', emoji: '💀' },
  { id: 'intl', condition: (s) => s.hasGoneInternational, label: 'International', emoji: '✈️' },
  { id: 'gun', condition: (s) => s.gun, label: 'Armed', emoji: '🔫' },
  { id: 'big', condition: (s) => s.bestTrade >= 50000, label: 'Big Score', emoji: '💥' },
  { id: 'rat', condition: (s) => s.rat && s.rat.hired, label: 'Connected', emoji: '🐀' },
];

export function getRank(rep: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (rep >= x.rep) r = x;
  return r;
}
