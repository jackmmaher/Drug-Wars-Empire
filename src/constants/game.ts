import type { Drug, Location, Gang, Rank, MarketEvent, Milestone, PlayerState, Region, RegionLaw, Persona, PersonaModifiers, PersonaId, CampaignLevel } from '../types/game';

// ── CONFIG ─────────────────────────────────────────────────
export const DAYS = 30;
export const STARTING_CASH = 3500;
export const STARTING_DEBT = 4000;
export const STARTING_SPACE = 100;
export const DEBT_INTEREST = 0.04;
export const BANK_INTEREST = 0.008;
export const HEAT_CAP = 100;
export const CONSIGNMENT_TURNS = 5;
export const CONSIGNMENT_MARKUP = 2.0;
export const STASH_CAPACITY = 50;

// ── GANG LOAN CONSTANTS ──────────────────────────────────
export const GANG_LOAN_TURNS = 4;
export const GANG_LOAN_INTEREST = 0.15;
export const GANG_LOAN_BASE_CAP = 2000;
export const GANG_LOAN_CAP_PER_REL = 500;
export const GANG_LOAN_MAX_CAP = 12000;
export const GANG_LOAN_MIN_RELATIONS = 0;

// ── GANG FAVOR THRESHOLDS ────────────────────────────────
export const FAVOR_FRIENDLY = 5;
export const FAVOR_TRUSTED = 15;
export const FAVOR_BLOOD = 25;

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
  { id: 'bluesky', name: 'Blue Sky', emoji: '🧊', min: 12000, max: 35000, tier: 4, rare: true, spawnChance: 0.18 },
  { id: 'opioids', name: 'Opioids', emoji: '☠️', min: 8000, max: 25000, tier: 4, rare: true, spawnChance: 0.22 },
  { id: 'ozempic', name: 'Ozempic', emoji: '🧬', min: 6000, max: 18000, tier: 4, rare: true, spawnChance: 0.20 },
  { id: 'ecstasy', name: 'Ecstasy', emoji: '💎', min: 2000, max: 8000, tier: 2 },
  { id: 'acid', name: 'Acid', emoji: '🌈', min: 1000, max: 4500, tier: 2 },
  { id: 'weed', name: 'Weed', emoji: '🌿', min: 300, max: 900, tier: 1 },
  { id: 'speed', name: 'Speed', emoji: '⚡', min: 70, max: 250, tier: 1 },
  { id: 'ludes', name: 'Quaaludes', emoji: '💊', min: 10, max: 60, tier: 1 },
];

// ── LAW PROFILES ─────────────────────────────────────────
const NYC_LAW: RegionLaw = {
  forceName: 'NYPD',
  forceEmoji: '🚔',
  bribeMultiplier: 1.0,
  aggressionBase: 0,
  heatDecayBonus: 0,
  encounterModifier: 0,
  behavior: 'brutal',
};

const COLOMBIA_LAW: RegionLaw = {
  forceName: 'Policia Nacional',
  forceEmoji: '🇨🇴',
  bribeMultiplier: 0.5,
  aggressionBase: -1,
  heatDecayBonus: 3,
  encounterModifier: -0.05,
  behavior: 'corrupt',
};

const NETHERLANDS_LAW: RegionLaw = {
  forceName: 'Politie',
  forceEmoji: '🇳🇱',
  bribeMultiplier: 1.8,
  aggressionBase: -1,
  heatDecayBonus: 5,
  encounterModifier: -0.08,
  behavior: 'methodical',
};

const THAILAND_LAW: RegionLaw = {
  forceName: 'Royal Thai Police',
  forceEmoji: '🇹🇭',
  bribeMultiplier: 0.6,
  aggressionBase: 0,
  heatDecayBonus: 2,
  encounterModifier: 0,
  behavior: 'corrupt',
};

const FRANCE_LAW: RegionLaw = {
  forceName: 'Gendarmerie',
  forceEmoji: '🇫🇷',
  bribeMultiplier: 1.5,
  aggressionBase: 1,
  heatDecayBonus: 1,
  encounterModifier: 0.03,
  behavior: 'methodical',
};

export const DEFAULT_LAW: RegionLaw = NYC_LAW;

// ── REGIONS ───────────────────────────────────────────────
export const REGIONS: Region[] = [
  {
    id: 'nyc', name: 'New York', emoji: '🗽', color: '#ef4444',
    rep: 0, flyCost: 0, travelDays: 0, priceMultipliers: {}, gangId: '',
    law: NYC_LAW, customsStrictness: 0.35, contraband: ['cocaine', 'heroin'],
  },
  {
    id: 'colombia', name: 'Colombia', emoji: '🇨🇴', color: '#dc2626',
    rep: 45, flyCost: 3000, travelDays: 2, priceMultipliers: { cocaine: 0.55, heroin: 0.8, bluesky: 0.6, opioids: 0.5 }, gangId: 'car',
    law: COLOMBIA_LAW, customsStrictness: 0.30, contraband: ['heroin', 'opioids'],
  },
  {
    id: 'netherlands', name: 'Netherlands', emoji: '🇳🇱', color: '#f97316',
    rep: 50, flyCost: 5000, travelDays: 2, priceMultipliers: { ecstasy: 0.55, weed: 0.5, acid: 0.55, ozempic: 0.55 }, gangId: 'pen',
    law: NETHERLANDS_LAW, customsStrictness: 0.25, contraband: ['ecstasy', 'weed', 'acid', 'ozempic'],
  },
  {
    id: 'thailand', name: 'Thailand', emoji: '🇹🇭', color: '#14b8a6',
    rep: 40, flyCost: 4000, travelDays: 2, priceMultipliers: { heroin: 0.5, speed: 0.45, opioids: 0.45, bluesky: 0.55 }, gangId: 'jao',
    law: THAILAND_LAW, customsStrictness: 0.40, contraband: ['heroin', 'speed', 'bluesky', 'opioids'],
  },
  {
    id: 'france', name: 'France', emoji: '🇫🇷', color: '#6366f1',
    rep: 60, flyCost: 4500, travelDays: 2, priceMultipliers: { heroin: 0.55, cocaine: 0.65, ozempic: 0.55 }, gangId: 'cor',
    law: FRANCE_LAW, customsStrictness: 0.40, contraband: ['cocaine', 'heroin', 'ozempic'],
  },
];

// ── LOCATIONS ──────────────────────────────────────────────
// NYC (kept as named export for backward compat)
export const NYC: Location[] = [
  { id: 'bronx', name: 'The Bronx', emoji: '🏚️', color: '#ef4444', bank: true, shark: true, region: 'nyc', modifier: { type: 'repGain', value: 0.05, label: 'Street Cred — +5% rep from trades' }, arrivalText: 'Sirens in the distance. Business as usual.' },
  { id: 'ghetto', name: 'The Ghetto', emoji: '🔥', color: '#a855f7', region: 'nyc', modifier: { type: 'buyDiscount', value: 0.10, label: 'Black Market — 10% off buys' }, arrivalText: 'Broken glass crunches underfoot. Eyes watch from every window.' },
  { id: 'central_park', name: 'Central Park', emoji: '🌳', color: '#22c55e', region: 'nyc', modifier: { type: 'sellBonus', value: 0.15, drugs: ['acid', 'ecstasy'], label: 'Tourist Trap — +15% on party drugs' }, arrivalText: 'Joggers, tourists, and $50K worth of product in your coat.' },
  { id: 'manhattan', name: 'Manhattan', emoji: '🏙️', color: '#3b82f6', region: 'nyc', modifier: { type: 'sellBonus', value: 0.10, drugs: ['cocaine', 'heroin', 'bluesky', 'opioids', 'ozempic'], label: 'High Rollers — +10% on premium drugs' }, arrivalText: 'Money moves fast here. So do the cops.' },
  { id: 'coney', name: 'Coney Island', emoji: '🎡', color: '#f59e0b', region: 'nyc', modifier: { type: 'heatReduction', value: 5, label: 'Off the Radar — -5 heat on arrival' }, arrivalText: 'Cotton candy and corruption. The boardwalk remembers.' },
  { id: 'brooklyn', name: 'Brooklyn', emoji: '🌉', color: '#ec4899', region: 'nyc', modifier: { type: 'raidDefense', value: 0.10, label: 'Fortified — +10% territory defense' }, arrivalText: 'Brick and steel. This neighborhood doesn\'t forget.' },
];

// Colombia
const COLOMBIA: Location[] = [
  { id: 'bogota', name: 'Bogot\u00e1', emoji: '🏛️', color: '#dc2626', bank: true, shark: true, region: 'colombia', modifier: { type: 'buyDiscount', value: 0.08, label: 'Cartel Connections — 8% off buys' }, arrivalText: 'Altitude and attitude. The capital runs on both.' },
  { id: 'medellin', name: 'Medell\u00edn', emoji: '💀', color: '#991b1b', region: 'colombia', modifier: { type: 'copReduction', value: 0.05, label: 'Cartel Controlled — -5% cop encounters' }, arrivalText: 'Pablo\'s ghost still runs these streets.' },
  { id: 'cali', name: 'Cali', emoji: '🌴', color: '#b91c1c', region: 'colombia', modifier: { type: 'sellBonus', value: 0.10, drugs: ['cocaine'], label: 'Cali Cartel — +10% cocaine sells' }, arrivalText: 'The salsa never stops. Neither does the trade.' },
  { id: 'cartagena', name: 'Cartagena', emoji: '⚓', color: '#ef4444', region: 'colombia', modifier: { type: 'heatDecay', value: 3, label: 'Port City — +3 heat decay' }, arrivalText: 'Colonial walls hide modern sins. The port takes all comers.' },
  { id: 'barranquilla', name: 'Barranquilla', emoji: '🏖️', color: '#f87171', region: 'colombia', modifier: { type: 'heatReduction', value: 4, label: 'Low Profile — -4 heat on arrival' }, arrivalText: 'River city. Things wash in and out without a trace.' },
  { id: 'bucaramanga', name: 'Bucaramanga', emoji: '⛰️', color: '#fca5a5', region: 'colombia', modifier: { type: 'repGain', value: 0.08, label: 'Mountain Respect — +8% rep from trades' }, arrivalText: 'Mountain air. Mountain rules. Earn your respect or leave.' },
];

// Netherlands
const NETHERLANDS: Location[] = [
  { id: 'amsterdam', name: 'Amsterdam', emoji: '🌷', color: '#f97316', bank: true, shark: true, region: 'netherlands', modifier: { type: 'sellBonus', value: 0.12, drugs: ['ecstasy', 'weed'], label: 'Coffee Shop Culture — +12% on party drugs' }, arrivalText: 'Bicycles, canals, and a tolerance for everything.' },
  { id: 'rotterdam', name: 'Rotterdam', emoji: '🚢', color: '#ea580c', region: 'netherlands', modifier: { type: 'sellBonus', value: 0.10, label: 'Shipping Hub — +10% on all sells' }, arrivalText: 'Container ships as far as you can see. Anything can be moved.' },
  { id: 'the_hague', name: 'The Hague', emoji: '⚖️', color: '#c2410c', region: 'netherlands', modifier: { type: 'copReduction', value: 0.06, label: 'Diplomatic Zone — -6% cop encounters' }, arrivalText: 'Diplomats and dealers. Hard to tell the difference.' },
  { id: 'utrecht', name: 'Utrecht', emoji: '🏰', color: '#fb923c', region: 'netherlands', modifier: { type: 'buyDiscount', value: 0.07, label: 'University Town — 7% off buys' }, arrivalText: 'University town. The students buy. The professors don\'t ask.' },
  { id: 'eindhoven', name: 'Eindhoven', emoji: '💡', color: '#fdba74', region: 'netherlands', modifier: { type: 'repGain', value: 0.06, label: 'Tech Hub — +6% rep from trades' }, arrivalText: 'Tech money and loose morals. Innovation takes all forms.' },
  { id: 'groningen', name: 'Groningen', emoji: '🌾', color: '#fed7aa', region: 'netherlands', modifier: { type: 'heatDecay', value: 4, label: 'Countryside — +4 heat decay' }, arrivalText: 'Flat fields, fewer cops. The countryside keeps its secrets.' },
];

// Thailand
const THAILAND: Location[] = [
  { id: 'bangkok', name: 'Bangkok', emoji: '🛕', color: '#14b8a6', bank: true, shark: true, region: 'thailand', modifier: { type: 'buyDiscount', value: 0.12, drugs: ['speed', 'heroin'], label: 'Supply Hub — 12% off speed & heroin' }, arrivalText: 'The heat hits you first. Then the smell. Then the opportunity.' },
  { id: 'chiang_mai', name: 'Chiang Mai', emoji: '🏔️', color: '#0d9488', region: 'thailand', modifier: { type: 'heatDecay', value: 5, label: 'Mountain Hideout — +5 heat decay' }, arrivalText: 'Temple bells and thin mountain air. A good place to disappear.' },
  { id: 'phuket', name: 'Phuket', emoji: '🏝️', color: '#0f766e', region: 'thailand', modifier: { type: 'sellBonus', value: 0.12, drugs: ['ecstasy', 'acid', 'weed'], label: 'Tourist Paradise — +12% on party drugs' }, arrivalText: 'Paradise for tourists. Marketplace for everyone else.' },
  { id: 'pattaya', name: 'Pattaya', emoji: '🌃', color: '#2dd4bf', region: 'thailand', modifier: { type: 'heatReduction', value: 4, label: 'Neon Anonymity — -4 heat on arrival' }, arrivalText: 'Neon signs reflect off wet streets. Everything has a price.' },
  { id: 'chiang_rai', name: 'Chiang Rai', emoji: '🔺', color: '#5eead4', region: 'thailand', modifier: { type: 'buyDiscount', value: 0.10, drugs: ['heroin', 'opioids'], label: 'Golden Triangle — 10% off opiates' }, arrivalText: 'The Golden Triangle. Where borders blur and product flows.' },
  { id: 'hat_yai', name: 'Hat Yai', emoji: '🌧️', color: '#99f6e4', region: 'thailand', modifier: { type: 'raidDefense', value: 0.12, label: 'Border Fortress — +12% territory defense' }, arrivalText: 'Border town. Smugglers\' highway. Keep your head down.' },
];

// France
const FRANCE: Location[] = [
  { id: 'marseille', name: 'Marseille', emoji: '🚢', color: '#6366f1', bank: true, shark: true, region: 'france', modifier: { type: 'heatDecay', value: 3, label: 'Port City — +3 heat decay' }, arrivalText: 'Salt air and diesel. The port never sleeps.' },
  { id: 'paris', name: 'Paris', emoji: '🗼', color: '#4f46e5', region: 'france', modifier: { type: 'sellBonus', value: 0.12, drugs: ['cocaine', 'ozempic'], label: 'High Society — +12% on luxury drugs' }, arrivalText: 'The City of Light has very dark corners.' },
  { id: 'lyon', name: 'Lyon', emoji: '🍷', color: '#4338ca', region: 'france', modifier: { type: 'repGain', value: 0.07, label: 'Underground Scene — +7% rep from trades' }, arrivalText: 'Old money, old grudges. The underground runs deep.' },
  { id: 'nice', name: 'Nice', emoji: '🌊', color: '#818cf8', region: 'france', modifier: { type: 'copReduction', value: 0.05, label: 'Riviera Blind Eye — -5% cop encounters' }, arrivalText: 'Yachts and Riviera sun. The police look the other way.' },
  { id: 'toulouse', name: 'Toulouse', emoji: '🌹', color: '#a5b4fc', region: 'france', modifier: { type: 'buyDiscount', value: 0.08, label: 'Southern Pipeline — 8% off buys' }, arrivalText: 'Southern pipeline. Product flows north like the wine.' },
  { id: 'bordeaux', name: 'Bordeaux', emoji: '🍇', color: '#c7d2fe', region: 'france', modifier: { type: 'heatReduction', value: 5, label: 'Wine Country — -5 heat on arrival' }, arrivalText: 'Vineyards and vaults. Not everything aged here is wine.' },
];

export const LOCATIONS: Location[] = [...NYC, ...COLOMBIA, ...NETHERLANDS, ...THAILAND, ...FRANCE];

// ── GANGS ──────────────────────────────────────────────────
export const GANGS: Gang[] = [
  // NYC
  { id: 'col', name: 'The Colombians', emoji: '🐍', color: '#dc2626', turf: ['ghetto'],
    leader: 'El Patr\u00f3n', description: "NYC's cocaine kings. Brutal, loyal, and deeply connected to Medell\u00edn.",
    specialty: ['cocaine'], rival: 'tri',
    bloodBrotherPerk: { type: 'sellBonus', value: 0.15, label: '+15% cocaine sell', drugIds: ['cocaine'] } },
  { id: 'tri', name: 'The Triads', emoji: '🐉', color: '#f59e0b', turf: ['manhattan'],
    leader: 'Dragon Head', description: "Chinatown's shadow empire. Heroin flows through their restaurants and massage parlors.",
    specialty: ['heroin'], rival: 'col',
    bloodBrotherPerk: { type: 'buyDiscount', value: 0.08, label: '-8% all buy prices' } },
  { id: 'bra', name: 'The Bratva', emoji: '🐻', color: '#6366f1', turf: ['brooklyn'],
    leader: 'The Vor', description: 'Russian muscle. They run protection, gambling, and the opioid pipeline.',
    specialty: ['opioids'], rival: 'lcn',
    bloodBrotherPerk: { type: 'fightBonus', value: 0.20, label: '+20% fight win chance' } },
  { id: 'lcn', name: 'La Cosa Nostra', emoji: '🎰', color: '#059669', turf: ['coney'],
    leader: 'The Don', description: "The old guard. They don't have the streets anymore, but they have the politicians.",
    specialty: ['ecstasy'], rival: 'bra',
    bloodBrotherPerk: { type: 'territoryDiscount', value: 0.30, label: '-30% territory cost' } },
  // International
  { id: 'car', name: 'Medell\u00edn Cartel', emoji: '☠️', color: '#991b1b', turf: ['medellin', 'cali'],
    leader: 'El Jefe', description: 'The source. Everything starts in Medell\u00edn.',
    specialty: ['cocaine'], rival: 'cor',
    bloodBrotherPerk: { type: 'customsEvasion', value: 0.25, label: '+25% customs evasion' } },
  { id: 'pen', name: 'The Penose', emoji: '🌑', color: '#ea580c', turf: ['amsterdam', 'rotterdam'],
    leader: 'De Baas', description: "Amsterdam's underworld. Quiet, professional, and very well connected.",
    specialty: ['ecstasy', 'weed'], rival: 'jao',
    bloodBrotherPerk: { type: 'regionSellBonus', value: 0.15, label: '+15% sell in Netherlands', regionId: 'netherlands' } },
  { id: 'jao', name: 'Jao Pho', emoji: '🐅', color: '#0d9488', turf: ['bangkok', 'chiang_rai'],
    leader: 'The Godfather', description: "Thai godfathers. They control the Golden Triangle's output.",
    specialty: ['heroin', 'speed'], rival: 'pen',
    bloodBrotherPerk: { type: 'regionBuyDiscount', value: 0.10, label: '-10% buy in Thailand', regionId: 'thailand' } },
  { id: 'cor', name: 'The Corsicans', emoji: '🗡️', color: '#4f46e5', turf: ['marseille', 'nice'],
    leader: 'Le Patron', description: 'The French Connection reborn. Marseille to Paris, they own the pipeline.',
    specialty: ['cocaine', 'ozempic'], rival: 'car',
    bloodBrotherPerk: { type: 'customsEvasion', value: 0.20, label: '+20% customs evasion everywhere' } },
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

// ── MARKET EVENTS (~30 region-tagged) ─────────────────────
// Spike cap: 3.5x | Crash floor: 0.3x (rebalanced from 4-7x / 0.15-0.25x)
export const EVENTS: MarketEvent[] = [
  // ── Global (null regionId = fires anywhere) ──
  { message: 'Cops busted a shipment! Prices skyrocketed!', drugId: 'cocaine', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Cheap heroin flooding in from overseas!', drugId: 'heroin', multiplier: 0.35, type: 'crash', regionId: null },
  { message: 'Acid factory raided! Prices soaring!', drugId: 'acid', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Market flooded with cheap acid!', drugId: 'acid', multiplier: 0.3, type: 'crash', regionId: null },
  { message: 'Weed drought — prices skyrocketed!', drugId: 'weed', multiplier: 3, type: 'spike', regionId: null },
  { message: 'Dealers dumping weed everywhere!', drugId: 'weed', multiplier: 0.3, type: 'crash', regionId: null },
  { message: 'Jordan Belfort cleaned out the Quaalude supply!', drugId: 'ludes', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Warehouse of Quaaludes found! Prices crashing!', drugId: 'ludes', multiplier: 0.3, type: 'crash', regionId: null },

  // ── NYC ──
  { message: 'DEA raid in the Bronx! Heroin supply dried up!', drugId: 'heroin', multiplier: 3.5, type: 'spike', regionId: 'nyc' },
  { message: 'Wall Street party weekend — cocaine demand insane!', drugId: 'cocaine', multiplier: 3.5, type: 'spike', regionId: 'nyc' },
  { message: 'Junkies desperate in the subway — heroin prices insane!', drugId: 'heroin', multiplier: 3.5, type: 'spike', regionId: 'nyc' },
  { message: 'Colombian shipment arrives in NYC!', drugId: 'cocaine', multiplier: 0.3, type: 'crash', regionId: 'nyc' },
  { message: 'Dutch ecstasy floods the US market!', drugId: 'ecstasy', multiplier: 0.3, type: 'crash', regionId: 'nyc' },
  { message: 'Speed addicts paying premium in Brooklyn!', drugId: 'speed', multiplier: 3.5, type: 'spike', regionId: 'nyc' },

  // ── Colombia ──
  { message: 'Cartel lab discovered — cocaine flooding streets!', drugId: 'cocaine', multiplier: 0.3, type: 'crash', regionId: 'colombia' },
  { message: 'Government airstrike on coca fields!', drugId: 'cocaine', multiplier: 3.5, type: 'spike', regionId: 'colombia' },
  { message: 'Rival cartel war — supply cut off!', drugId: 'cocaine', multiplier: 3, type: 'spike', regionId: 'colombia' },
  { message: 'New coca harvest — prices plummeting!', drugId: 'cocaine', multiplier: 0.3, type: 'crash', regionId: 'colombia' },

  // ── Netherlands ──
  { message: 'Rave festival in Amsterdam — ecstasy demand insane!', drugId: 'ecstasy', multiplier: 3.5, type: 'spike', regionId: 'netherlands' },
  { message: 'Coffee shop surplus — weed dirt cheap!', drugId: 'weed', multiplier: 0.3, type: 'crash', regionId: 'netherlands' },
  { message: 'Dutch lab bust — ecstasy prices soaring!', drugId: 'ecstasy', multiplier: 3, type: 'spike', regionId: 'netherlands' },
  { message: 'Acid flooding Amsterdam clubs!', drugId: 'acid', multiplier: 0.3, type: 'crash', regionId: 'netherlands' },

  // ── Thailand ──
  { message: 'Golden Triangle pipeline opened — cheap heroin!', drugId: 'heroin', multiplier: 0.3, type: 'crash', regionId: 'thailand' },
  { message: 'Thai police crackdown on ya ba!', drugId: 'speed', multiplier: 3.5, type: 'spike', regionId: 'thailand' },
  { message: 'Full moon party demand — ecstasy prices insane!', drugId: 'ecstasy', multiplier: 3.5, type: 'spike', regionId: 'thailand' },
  { message: 'Opium surplus from the hills!', drugId: 'heroin', multiplier: 0.3, type: 'crash', regionId: 'thailand' },

  // ── France ──
  { message: 'Corsican connection intercepted!', drugId: 'heroin', multiplier: 3.5, type: 'spike', regionId: 'france' },
  { message: 'Marseille port smuggling ring busted!', drugId: 'cocaine', multiplier: 3, type: 'spike', regionId: 'france' },
  { message: 'Riviera party season — cocaine demand surging!', drugId: 'cocaine', multiplier: 3.5, type: 'spike', regionId: 'france' },
  { message: 'New pipeline from Morocco — cheap speed!', drugId: 'speed', multiplier: 0.3, type: 'crash', regionId: 'france' },

  // ── Blue Sky ──
  { message: "A chemistry teacher's lab just flooded the market with Blue Sky!", drugId: 'bluesky', multiplier: 0.3, type: 'crash', regionId: null },
  { message: 'DEA shut down a superlab! Blue Sky prices through the roof!', drugId: 'bluesky', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Crystal blue persuasion... Blue Sky demand insane in NYC!', drugId: 'bluesky', multiplier: 3.5, type: 'spike', regionId: 'nyc' },
  { message: 'New meth pipeline from Thailand flooding the streets!', drugId: 'bluesky', multiplier: 0.3, type: 'crash', regionId: 'thailand' },

  // ── Opioids ──
  { message: 'Fentanyl shortage! Street opioid prices skyrocketing!', drugId: 'opioids', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Pharma warehouse heist! Cheap opioids everywhere!', drugId: 'opioids', multiplier: 0.3, type: 'crash', regionId: null },
  { message: 'Border seizure failed — opioid shipment got through!', drugId: 'opioids', multiplier: 0.3, type: 'crash', regionId: 'nyc' },
  { message: 'Crackdown on pill mills! Opioid supply dried up!', drugId: 'opioids', multiplier: 3.5, type: 'spike', regionId: 'nyc' },

  // ── Ozempic ──
  { message: 'Hollywood awards season! Everyone wants Ozempic!', drugId: 'ozempic', multiplier: 3.5, type: 'spike', regionId: null },
  { message: 'Counterfeit Ozempic flooding the black market!', drugId: 'ozempic', multiplier: 0.3, type: 'crash', regionId: null },
  { message: 'European pharma shipment diverted — cheap Ozempic!', drugId: 'ozempic', multiplier: 0.3, type: 'crash', regionId: 'netherlands' },
  { message: 'Influencer endorsement goes viral! Ozempic demand insane!', drugId: 'ozempic', multiplier: 3.5, type: 'spike', regionId: 'france' },
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
  { id: 'smug', condition: (s) => s.customsEvasions >= 3, label: 'Smuggler', emoji: '🧳' },
  { id: 'debtor', condition: (s) => s.consignment === null && s.fingers < 10, label: 'Scarred', emoji: '✂️' },
  { id: 'dealer', condition: (s) => s.consignmentsCompleted >= 1, label: 'Deal Maker', emoji: '🤝' },
  { id: 'gangpaid', condition: (s) => s.gangLoansRepaid >= 1, label: 'Loan Shark', emoji: '💸' },
  { id: 'merc', condition: (s) => s.gangMissionsCompleted >= 1, label: 'Mercenary', emoji: '🎖️' },
  { id: 'blood', condition: (s) => Object.values(s.gangRelations).some(v => v >= 25), label: 'Blood Brother', emoji: '🩸' },
  { id: 'rare', condition: (s) => DRUGS.some(d => d.rare && (s.inventory[d.id] || 0) > 0), label: 'Rare Find', emoji: '🌟' },
];

export function getRank(rep: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (rep >= x.rep) r = x;
  return r;
}

// ── GANG FAVOR HELPER ────────────────────────────────────
export function getGangFavorTier(relations: number): 0 | 1 | 2 | 3 {
  if (relations >= FAVOR_BLOOD) return 3;
  if (relations >= FAVOR_TRUSTED) return 2;
  if (relations >= FAVOR_FRIENDLY) return 1;
  return 0;
}

// ── PERSONAS ─────────────────────────────────────────────
export const DEFAULT_MODIFIERS: PersonaModifiers = {
  startingCashMultiplier: 1.0,
  startingDebtMultiplier: 1.0,
  startingSpaceOffset: 0,
  startingHP: 100,
  startingRep: 0,
  startingGun: false,
  startingLocation: 'bronx',
  startingGangRelationOffset: 0,
  startingGangOverrides: {},
  preHiredRat: false,
  ratIntelBonus: 0,
  heatGainMultiplier: 1.0,
  heatDecayBonus: 0,
  repGainMultiplier: 1.0,
  sellPriceBonus: 0,
  copRunChanceBonus: 0,
  copFightKillBonus: 0,
  fightDamageReduction: 0,
  bribeCostMultiplier: 1.0,
  copEncounterReduction: 0,
  customsEvasionBonus: 0,
  eventChanceBonus: 0,
  gangRelGainMultiplier: 1.0,
  consignmentMarkupMultiplier: 1.0,
  territoryDiscountMultiplier: 1.0,
  muggingChanceMultiplier: 1.0,
};

export const PERSONAS: Persona[] = [
  {
    id: 'chemist', name: 'The Chemist', emoji: '🧪',
    backstory: 'Once a respected chemistry teacher with a mortgage and a pension plan. A cancer diagnosis and a broken insurance system changed the equation. Now the only formula that matters is the one that keeps the money flowing.',
    motivation: 'The formula is everything.',
    tagline: '+8% sell, +20 space, high heat',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      sellPriceBonus: 0.08,
      startingSpaceOffset: 20,
      heatGainMultiplier: 1.25,
      startingGangRelationOffset: -5,
      startingLocation: 'manhattan',
    },
  },
  {
    id: 'housewife', name: 'The Housewife', emoji: '👩\u200D🍳',
    backstory: 'Suburban mom with a mortgage, two kids, and a husband who lost his job. The PTA fundraisers were never going to cover it. Turns out a minivan full of soccer gear has room for a lot more than anyone suspects.',
    motivation: 'Nobody suspects the minivan.',
    tagline: '50% less heat, +15% run, less space',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      heatGainMultiplier: 0.5,
      copRunChanceBonus: 0.15,
      customsEvasionBonus: 0.10,
      startingSpaceOffset: -20,
      repGainMultiplier: 0.7,
      startingLocation: 'central_park',
    },
  },
  {
    id: 'student', name: 'The Student', emoji: '🎓',
    backstory: 'Engineering sophomore drowning in student loans with a talent for pattern recognition. Started by selling study drugs to classmates, then realized the real money was in knowing who needs what and when. The campus network became a city-wide information web.',
    motivation: 'Knowledge is the real currency.',
    tagline: '+30% rep, free rat, less cash',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      repGainMultiplier: 1.3,
      preHiredRat: true,
      ratIntelBonus: 1,
      eventChanceBonus: 0.05,
      startingCashMultiplier: 0.5,
      startingDebtMultiplier: 0.5,
      startingLocation: 'bronx',
    },
  },
  {
    id: 'enforcer', name: 'The Enforcer', emoji: '💪',
    backstory: 'Started as a bouncer at a Colombian nightclub in Queens, collecting debts on the side. The cartel noticed his work ethic and offered him a promotion. Now at 6\'4" and 260 lbs, he\'s the reason people pay on time — and the reason they started dealing in the first place.',
    motivation: 'Respect is earned with fists.',
    tagline: 'Gun + 130HP, combat bonuses',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      startingGun: true,
      startingHP: 130,
      fightDamageReduction: 0.30,
      copFightKillBonus: 0.10,
      heatGainMultiplier: 1.15,
      bribeCostMultiplier: 1.30,
      sellPriceBonus: -0.05,
      startingLocation: 'ghetto',
      startingGangOverrides: { col: 10 },
    },
  },
  {
    id: 'connected', name: 'The Connected', emoji: '🤵',
    backstory: 'Third-generation in the family business. Grandfather ran numbers, father ran crews, and now the name alone gets you a seat at any table in the city. But a legacy only carries you so far — the rest you have to take for yourself.',
    motivation: 'The family name opens doors. I kick them down.',
    tagline: '+10 gang relations, cheap territory',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      startingGangRelationOffset: 10,
      gangRelGainMultiplier: 1.5,
      consignmentMarkupMultiplier: 0.75,
      territoryDiscountMultiplier: 0.7,
      startingRep: 15,
      startingSpaceOffset: -10,
      bribeCostMultiplier: 0.7,
      startingLocation: 'coney',
    },
  },
  {
    id: 'ghost', name: 'The Ghost', emoji: '🥷',
    backstory: 'No one knows where they came from. No records, no history, no name that checks out. They move through the city like smoke — by the time anyone realizes what happened, the product is gone and so are they.',
    motivation: 'You were never here.',
    tagline: 'Zero debt, stealth bonuses, low cash',
    modifiers: {
      ...DEFAULT_MODIFIERS,
      startingDebtMultiplier: 0,
      heatDecayBonus: 5,
      copEncounterReduction: 0.05,
      customsEvasionBonus: 0.15,
      startingCashMultiplier: 0.3,
      repGainMultiplier: 0.6,
      muggingChanceMultiplier: 1.5,
      startingLocation: 'brooklyn',
    },
  },
];

export function getPersonaModifiers(id: PersonaId | null): PersonaModifiers {
  if (!id) return DEFAULT_MODIFIERS;
  const persona = PERSONAS.find(p => p.id === id);
  return persona?.modifiers || DEFAULT_MODIFIERS;
}

// ── PERSONA MISSIONS ────────────────────────────────────
export const PERSONA_MISSIONS: Record<PersonaId, { id: string; name: string; description: string; objective: string; target: number; rewardDescription: string }> = {
  chemist: { id: 'chemist_batch', name: 'Cook the Perfect Batch', description: 'Sell 20+ units of the same drug at 50%+ profit margin in a single trade.', objective: 'Make one big profitable sale', target: 1, rewardDescription: '+5% permanent sell bonus' },
  housewife: { id: 'housewife_invisible', name: 'Invisible Woman', description: 'Earn $30,000 in trading profit without triggering a single cop encounter.', objective: 'Profit $30K with zero cop encounters', target: 30000, rewardDescription: 'Heat multiplier drops to 0.4x' },
  student: { id: 'student_thesis', name: 'Thesis Defense', description: 'Reach Shot Caller rank (35 rep) within the first 15 days.', objective: 'Hit 35 rep by day 15', target: 35, rewardDescription: 'Debt wiped + rat intel upgrade' },
  enforcer: { id: 'enforcer_scores', name: 'Settle All Scores', description: 'Win 5 fights against cops or bounty hunters.', objective: 'Win 5 fights', target: 5, rewardDescription: '+15% permanent fight win chance' },
  connected: { id: 'connected_family', name: 'Family Business', description: 'Complete 3 gang missions for any single gang.', objective: 'Complete 3 missions for one gang', target: 3, rewardDescription: 'All gang relations +5, free territory' },
  ghost: { id: 'ghost_footprint', name: 'Zero Footprint', description: 'Visit 3+ regions without heat ever exceeding 25.', objective: 'Visit 3 regions, keep heat under 25', target: 3, rewardDescription: '+20% permanent customs evasion' },
};

// ── CAMPAIGN LEVEL CONFIGS ──────────────────────────────
export const DAYS_PER_LEVEL = 30;

export interface LevelConfig {
  level: CampaignLevel;
  name: string;
  subtitle: string;
  emoji: string;
  copBaseModifier: number;
  customsModifier: number;
  eventVolatility: number;
  startingDebt: number;
  debtSource: string;
  rareSpawnMultiplier: number;
  consignmentCapMultiplier: number;
  gangLoanCapMultiplier: number;
  territoryTributeMultiplier: number;
  internationalRegions: string[];
  gangConsignment: boolean;
  gangLoans: boolean;
  gangMissions: boolean;
  territoryPurchase: boolean;
  gangWars: boolean;
  winCondition: {
    minNetWorth: number;
    debtFree: boolean;
    minRep?: number;
    minTerritories?: number;
    bloodBrother?: boolean;
    rankName?: string;
    defeatedGangs?: number;
  };
}

export const LEVEL_CONFIGS: Record<CampaignLevel, LevelConfig> = {
  1: {
    level: 1, name: 'Solo Dealer', subtitle: 'Survive the streets. Pay off the shark.', emoji: '🧢',
    copBaseModifier: 0, customsModifier: 0, eventVolatility: 1.0,
    startingDebt: STARTING_DEBT, debtSource: 'shark',
    rareSpawnMultiplier: 0.5,
    consignmentCapMultiplier: 1, gangLoanCapMultiplier: 1, territoryTributeMultiplier: 1,
    internationalRegions: [],
    gangConsignment: false, gangLoans: false, gangMissions: false, territoryPurchase: false, gangWars: false,
    winCondition: { minNetWorth: 50000, debtFree: true },
  },
  2: {
    level: 2, name: 'Join a Gang', subtitle: 'Build connections. Go international.', emoji: '🤝',
    copBaseModifier: 0.03, customsModifier: 0, eventVolatility: 1.0,
    startingDebt: 8000, debtSource: 'gang protection fee',
    rareSpawnMultiplier: 1.0,
    consignmentCapMultiplier: 1, gangLoanCapMultiplier: 1, territoryTributeMultiplier: 1,
    internationalRegions: ['colombia', 'thailand'],
    gangConsignment: true, gangLoans: true, gangMissions: true, territoryPurchase: true, gangWars: false,
    winCondition: { minNetWorth: 125000, debtFree: false, bloodBrother: true, minTerritories: 2 },
  },
  3: {
    level: 3, name: 'Gang Takeover', subtitle: 'Dominate the empire. Crush the competition.', emoji: '👑',
    copBaseModifier: 0.05, customsModifier: 0.05, eventVolatility: 1.2,
    startingDebt: 0, debtSource: '',
    rareSpawnMultiplier: 1.0,
    consignmentCapMultiplier: 1.5, gangLoanCapMultiplier: 1.5, territoryTributeMultiplier: 1.5,
    internationalRegions: ['colombia', 'thailand', 'netherlands', 'france'],
    gangConsignment: true, gangLoans: true, gangMissions: true, territoryPurchase: true, gangWars: true,
    winCondition: { minNetWorth: 0, debtFree: false, minRep: 250, minTerritories: 5, defeatedGangs: 2 },
  },
};

export function getLevelConfig(level: CampaignLevel): LevelConfig {
  return LEVEL_CONFIGS[level];
}

export type CampaignFeature = 'gangConsignment' | 'gangLoans' | 'gangMissions' | 'territoryPurchase' | 'gangWars';

export function isFeatureEnabled(level: CampaignLevel, feature: CampaignFeature, mode: 'campaign' | 'classic'): boolean {
  if (mode === 'classic') return true;
  return LEVEL_CONFIGS[level][feature];
}

export function isRegionAvailable(level: CampaignLevel, regionId: string, mode: 'campaign' | 'classic'): boolean {
  if (mode === 'classic') return true;
  if (regionId === 'nyc') return true;
  return LEVEL_CONFIGS[level].internationalRegions.includes(regionId);
}
