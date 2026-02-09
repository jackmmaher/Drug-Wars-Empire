import type { PlayerState, MarketEvent, Rat, Milestone, NearMiss, EventLog } from '../types/game';
import {
  DRUGS, LOCATIONS, GANGS, EVENTS, MILESTONES, REGIONS,
  RAT_NAMES, RAT_TYPES,
  DAYS, STARTING_CASH, STARTING_DEBT, STARTING_SPACE,
  DEBT_INTEREST, BANK_INTEREST,
  R, C, getRegionForLocation,
} from '../constants/game';

// ── Price Generation ───────────────────────────────────────
export function generatePrices(locationId: string, event: MarketEvent | null): Record<string, number | null> {
  const region = getRegionForLocation(locationId);
  const mults = region?.priceMultipliers || {};
  const prices: Record<string, number | null> = {};
  DRUGS.forEach(d => {
    if (C(0.12)) { prices[d.id] = null; return; }
    let pr = R(d.min, d.max);
    if (mults[d.id]) pr = Math.round(pr * mults[d.id]);
    if (event && event.drugId === d.id) {
      pr = Math.round(d.min * event.multiplier + Math.random() * d.min * 0.15);
      if (mults[d.id]) pr = Math.round(pr * mults[d.id]);
    }
    prices[d.id] = Math.max(1, pr);
  });
  return prices;
}

// ── Rat Generation ─────────────────────────────────────────
export function makeRat(): Rat {
  return {
    name: RAT_NAMES[R(0, RAT_NAMES.length - 1)],
    personality: RAT_TYPES[R(0, 3)],
    loyalty: 50 + R(-15, 15),
    intel: R(1, 3),
    alive: true,
    hired: false,
    cost: R(200, 800),
    tips: 0,
  };
}

// ── Player Init ────────────────────────────────────────────
export function createPlayerState(locationId = 'bronx'): PlayerState {
  const ev = C(0.35) ? EVENTS[R(0, EVENTS.length - 1)] : null;
  return {
    day: 1,
    cash: STARTING_CASH,
    debt: STARTING_DEBT,
    bank: 0,
    location: locationId,
    inventory: {},
    space: STARTING_SPACE,
    prices: generatePrices(locationId, ev),
    previousPrices: {},
    gun: false,
    hp: 100,
    heat: 0,
    rep: 0,
    profit: 0,
    bestTrade: 0,
    trades: 0,
    streak: 0,
    maxStreak: 0,
    combo: 1,
    averageCosts: {},
    territories: {},
    gangRelations: Object.fromEntries(GANGS.map(g => [g.id, 0])),
    rat: makeRat(),
    currentEvent: ev,
    eventLog: ev ? [{ day: 1, message: ev.message, type: ev.type }] : [],
    nearMisses: [],
    offer: null,
    cops: null,
    tributePerDay: 0,
    hasGoneInternational: false,
    closeCallCount: 0,
    milestones: [],
    newMilestone: null,
    recentSold: [],
  };
}

// ── Milestone Check ────────────────────────────────────────
export function checkMilestones(s: PlayerState): { milestones: string[]; newMilestone: Milestone | null } {
  const ms = [...(s.milestones || [])];
  let nm: Milestone | null = null;
  for (const m of MILESTONES) {
    if (m.condition(s) && !ms.includes(m.id)) {
      ms.push(m.id);
      nm = m;
    }
  }
  return { milestones: ms, newMilestone: nm };
}

// ── Inventory Count ────────────────────────────────────────
export function inventoryCount(inv: Record<string, number>): number {
  return Object.values(inv).reduce((a, b) => a + b, 0);
}

// ── Net Worth ──────────────────────────────────────────────
export function netWorth(p: PlayerState): number {
  return p.cash + p.bank - p.debt + Object.entries(p.inventory).reduce((s, [id, q]) => {
    const d = DRUGS.find(x => x.id === id);
    return s + q * ((p.prices[id] as number) || d!.min);
  }, 0);
}

// ── Side Effects Queue ─────────────────────────────────────
// These are returned from game actions so the UI layer can play them
export type SideEffect =
  | { type: 'sfx'; sound: 'buy' | 'sell' | 'big' | 'bad' | 'miss' | 'level' | 'tick' }
  | { type: 'shake' }
  | { type: 'haptic'; style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' };

// ── Travel ─────────────────────────────────────────────────
export interface TravelResult {
  player: PlayerState;
  phase: 'playing' | 'cop' | 'end' | 'win';
  effects: SideEffect[];
  notifications: Array<{ message: string; type: string }>;
}

export function travel(player: PlayerState, destinationId: string): TravelResult {
  const effects: SideEffect[] = [];
  const notifications: Array<{ message: string; type: string }> = [];

  if (destinationId === player.location) {
    return { player, phase: 'playing', effects, notifications };
  }

  effects.push({ type: 'sfx', sound: 'tick' });

  const dest = LOCATIONS.find(l => l.id === destinationId)!;
  const srcLoc = LOCATIONS.find(l => l.id === player.location)!;
  const srcRegion = REGIONS.find(r => r.id === srcLoc.region)!;
  const destRegion = REGIONS.find(r => r.id === dest.region)!;
  const isInterRegion = srcLoc.region !== dest.region;
  const p = { ...player };

  // Inter-region flight checks
  if (isInterRegion && dest.region !== 'nyc') {
    if (p.rep < destRegion.rep) {
      notifications.push({ message: `Need ${destRegion.rep} rep to unlock ${destRegion.name}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
    if (p.cash < destRegion.flyCost) {
      notifications.push({ message: `Flight costs $${destRegion.flyCost.toLocaleString()}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
  } else if (isInterRegion && dest.region === 'nyc' && srcRegion.id !== 'nyc') {
    // Return to NYC costs half of the region you're leaving
    const returnCost = Math.round(srcRegion.flyCost / 2);
    if (p.cash < returnCost) {
      notifications.push({ message: `Return flight costs $${returnCost.toLocaleString()}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
  }

  // Calculate travel days: inter-region uses flight days, intra-region = 1
  const td = isInterRegion ? (dest.region === 'nyc' ? srcRegion.travelDays : destRegion.travelDays) : 1;
  p.day += td;

  // Deduct flight cost for inter-region travel
  if (isInterRegion) {
    if (dest.region === 'nyc') {
      p.cash -= Math.round(srcRegion.flyCost / 2);
    } else {
      p.cash -= destRegion.flyCost;
    }
    p.hasGoneInternational = true;
  }

  // When flying to a region, land at its capital (first city)
  if (isInterRegion) {
    const regionLocs = LOCATIONS.filter(l => l.region === dest.region);
    p.location = regionLocs[0].id;
  } else {
    p.location = destinationId;
  }

  p.debt = Math.round(p.debt * Math.pow(1 + DEBT_INTEREST, td));
  p.bank = Math.round(p.bank * Math.pow(1 + BANK_INTEREST, td));
  p.heat = Math.max(0, p.heat - R(3, 10));

  // Tribute
  const trib = Object.values(p.territories).reduce((s, d) => s + (d.tribute || 0), 0);
  p.tributePerDay = trib;
  p.cash += trib * td;

  // Market
  const ev = C(0.38) ? EVENTS[R(0, EVENTS.length - 1)] : null;
  p.currentEvent = ev;
  p.previousPrices = { ...p.prices };
  p.prices = generatePrices(p.location, ev);
  if (ev) p.eventLog = [...p.eventLog, { day: p.day, message: ev.message, type: ev.type }];

  // Near misses — only for drugs you NO LONGER hold (sold too early)
  const nms: NearMiss[] = [];
  // Sold-too-early near miss
  if (p.recentSold && p.recentSold.length > 0) {
    for (const rs of p.recentSold) {
      const now = p.prices[rs.id] as number;
      if (now && now > rs.price * 2) {
        nms.push({ drug: DRUGS.find(x => x.id === rs.id)!, previousPrice: rs.price, currentPrice: now, quantity: rs.qty, missedProfit: rs.qty * (now - rs.price), type: 'sold_early' });
      }
    }
  }
  p.nearMisses = nms;
  p.recentSold = [];

  // Gang tax
  const lg = GANGS.find(g => g.turf.includes(p.location));
  if (lg && !p.territories[p.location] && (p.gangRelations[lg.id] ?? 0) < -15 && C(0.3)) {
    const tax = Math.round(p.cash * R(5, 18) / 100);
    p.cash -= tax;
    p.eventLog = [...p.eventLog, { day: p.day, message: `${lg.emoji} ${lg.name} taxed you $${tax}!`, type: 'danger' }];
    effects.push({ type: 'shake' });
  }

  // Rat
  if (p.rat.hired && p.rat.alive) {
    p.rat = { ...p.rat, loyalty: p.rat.loyalty + R(-3, 4) };
    if (p.rat.loyalty < 20 && C(0.03 + (50 - p.rat.loyalty) / 400)) {
      p.rat = { ...p.rat, alive: false };
      p.heat += 40;
      p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 ${p.rat.name} RATTED YOU OUT! Heat surging!`, type: 'danger' }];
      effects.push({ type: 'shake' }, { type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'error' });
    } else if (C(0.22 + p.rat.intel * 0.07)) {
      const td2 = DRUGS[R(0, DRUGS.length - 1)];
      const tt = C(0.5) ? 'spike' : 'crash';
      p.rat = { ...p.rat, tips: p.rat.tips + 1 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 ${p.rat.name}: "${td2.name} gonna ${tt === 'spike' ? 'explode' : 'crash'} soon..."`, type: 'tip' }];
    }
  }

  // Cops
  const curUsed = inventoryCount(p.inventory);
  const cc = 0.12 + p.heat / 350 + (isInterRegion ? 0.1 : 0);
  if (C(cc) && curUsed > 0) {
    p.cops = { count: R(1, 2 + Math.floor(p.heat / 30)), bribeCost: R(400, 1500) };
    effects.push({ type: 'haptic', style: 'heavy' });
    return { player: p, phase: 'cop', effects, notifications };
  }

  // Mugging
  if (C(0.07)) {
    const s = Math.round(p.cash * R(8, 28) / 100);
    p.cash -= s;
    p.eventLog = [...p.eventLog, { day: p.day, message: `Mugged! Lost $${s}!`, type: 'danger' }];
    effects.push({ type: 'shake' }, { type: 'haptic', style: 'warning' });
  }

  // Offers
  p.offer = null;
  if (!p.gun && C(0.14)) p.offer = { type: 'gun', price: R(300, 600) };
  else if (C(0.12)) { const sp = R(20, 35); p.offer = { type: 'coat', price: R(150, 400), space: sp }; }
  else if (!p.rat.hired && C(0.08) && p.rep >= 10) p.offer = { type: 'rat', rat: makeRat() };
  else if (p.rep >= 25 && C(0.1) && !p.territories[p.location]) {
    const lg2 = GANGS.find(g => g.turf.includes(p.location));
    if (!lg2 || (p.gangRelations[lg2.id] ?? 0) > 5) p.offer = { type: 'territory', locationId: p.location, cost: R(3000, 12000), tribute: R(100, 500) };
  }

  // Milestones
  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;
  if (newMilestone) effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });

  // End check
  if (p.day > DAYS) {
    const phase = p.cash + p.bank >= p.debt ? 'win' : 'end';
    return { player: p, phase, effects, notifications };
  }
  if (p.hp <= 0) {
    return { player: p, phase: 'end', effects, notifications };
  }

  return { player: p, phase: 'playing', effects, notifications };
}

// ── Trade ──────────────────────────────────────────────────
export interface TradeResult {
  player: PlayerState;
  effects: SideEffect[];
}

export function executeTrade(player: PlayerState, drugId: string, tradeType: 'buy' | 'sell', quantity: number | 'max'): TradeResult {
  const effects: SideEffect[] = [];
  const drug = DRUGS.find(d => d.id === drugId)!;
  const price = player.prices[drug.id] as number;
  if (!price) return { player, effects };

  const p = { ...player };
  const used = inventoryCount(p.inventory);
  const free = p.space - used;

  if (tradeType === 'buy') {
    const mx = Math.min(Math.floor(p.cash / price), free);
    const q = quantity === 'max' ? mx : Math.min(quantity, mx);
    if (q <= 0) return { player, effects };

    p.cash -= q * price;
    p.inventory = { ...p.inventory, [drug.id]: (p.inventory[drug.id] || 0) + q };
    const prevQty = player.inventory[drug.id] || 0;
    const prevAvg = player.averageCosts[drug.id] || 0;
    p.averageCosts = { ...p.averageCosts, [drug.id]: (prevAvg * prevQty + price * q) / (prevQty + q) };
    p.heat += Math.ceil(q * price / 12000);
    p.trades++;
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'light' });
  } else {
    const own = p.inventory[drug.id] || 0;
    const q = quantity === 'max' ? own : Math.min(quantity, own);
    if (q <= 0) return { player, effects };

    const rev = q * price;
    const ab = p.averageCosts[drug.id] || price;
    const pnl = rev - q * ab;

    p.cash += rev;
    const newInv = { ...p.inventory, [drug.id]: own - q };
    if (newInv[drug.id] <= 0) {
      delete newInv[drug.id];
      const na = { ...p.averageCosts };
      delete na[drug.id];
      p.averageCosts = na;
    }
    p.inventory = newInv;
    p.profit += pnl;
    if (pnl > p.bestTrade) p.bestTrade = pnl;
    p.recentSold = [...(p.recentSold || []), { id: drug.id, price, qty: q }];

    if (pnl > 0) {
      p.streak++;
      if (p.streak > p.maxStreak) p.maxStreak = p.streak;
      p.combo = Math.min(5, 1 + p.streak * 0.15);
      p.rep += Math.ceil((pnl / 4000) * p.combo);
      const g = GANGS.find(x => x.turf.includes(p.location));
      if (g) p.gangRelations = { ...p.gangRelations, [g.id]: (p.gangRelations[g.id] ?? 0) + 1 };
      effects.push({ type: 'sfx', sound: pnl > 5000 ? 'big' : 'sell' }, { type: 'haptic', style: 'success' });
    } else {
      p.streak = 0;
      p.combo = 1;
      effects.push({ type: 'sfx', sound: 'miss' }, { type: 'haptic', style: 'warning' });
    }
    p.trades++;
    p.heat += Math.ceil(rev / 15000);
  }

  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;
  if (newMilestone) effects.push({ type: 'sfx', sound: 'level' });

  return { player: p, effects };
}

// ── Cop Actions ────────────────────────────────────────────
export interface CopResult {
  player: PlayerState;
  phase: 'playing' | 'end';
  effects: SideEffect[];
}

export function copAction(player: PlayerState, action: 'run' | 'fight' | 'bribe'): CopResult {
  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const c = p.cops!;

  if (action === 'run') {
    if (C(p.gun ? 0.55 : 0.38)) {
      p.eventLog = [...p.eventLog, { day: p.day, message: 'Escaped! Heart pounding!', type: 'info' }];
      p.closeCallCount++;
      p.heat += 12;
    } else {
      const l = Math.round(p.cash * 0.2);
      p.cash -= l;
      const dk = Object.keys(p.inventory);
      if (dk.length) {
        const k = dk[R(0, dk.length - 1)];
        const lq = Math.ceil(p.inventory[k] * R(30, 60) / 100);
        const newInv = { ...p.inventory, [k]: p.inventory[k] - lq };
        if (newInv[k] <= 0) delete newInv[k];
        p.inventory = newInv;
      }
      p.hp -= R(5, 18);
      p.heat += 18;
      p.closeCallCount++;
      effects.push({ type: 'shake' });
      p.eventLog = [...p.eventLog, { day: p.day, message: `Caught! Lost $${l} and product.`, type: 'danger' }];
    }
  } else if (action === 'fight') {
    let kl = 0, dm = 0;
    for (let i = 0; i < c.count; i++) {
      if (C(p.gun ? 0.45 : 0.15)) kl++;
      else dm += R(p.gun ? 5 : 12, p.gun ? 15 : 30);
    }
    p.hp -= dm;
    p.heat += 25 + kl * 12;
    p.rep += kl * 8;
    p.closeCallCount++;
    effects.push({ type: 'shake' });
    p.eventLog = [...p.eventLog, { day: p.day, message: `Shootout! ${kl}/${c.count} down.${dm > 20 ? ' Hurt bad.' : ''}`, type: 'danger' }];
  } else {
    const amt = c.bribeCost * c.count;
    if (p.cash >= amt) {
      p.cash -= amt;
      p.heat -= 8;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Bribed cops for $${amt}.`, type: 'info' }];
    } else {
      return { player, phase: 'playing', effects: [] };
    }
  }

  p.cops = null;
  if (p.hp <= 0) return { player: p, phase: 'end', effects };
  return { player: p, phase: 'playing', effects };
}

// ── Offer Accept/Decline ───────────────────────────────────
export function handleOffer(player: PlayerState, accept: boolean): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  const p = { ...player };

  if (!accept) {
    p.offer = null;
    return { player: p, effects };
  }

  const o = p.offer!;
  if (o.type === 'gun' && p.cash >= (o.price || 0)) {
    p.cash -= o.price!;
    p.gun = true;
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'medium' });
  } else if (o.type === 'coat' && p.cash >= (o.price || 0)) {
    p.cash -= o.price!;
    p.space += o.space!;
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'light' });
  } else if (o.type === 'rat' && o.rat && p.cash >= o.rat.cost) {
    p.cash -= o.rat.cost;
    p.rat = { ...o.rat, hired: true };
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'medium' });
    p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 Hired ${o.rat.name}.`, type: 'info' }];
  } else if (o.type === 'territory' && p.cash >= (o.cost || 0)) {
    p.cash -= o.cost!;
    p.territories = { ...p.territories, [o.locationId!]: { tribute: o.tribute!, acquiredDay: p.day } };
    p.rep += 15;
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
    const loc = LOCATIONS.find(l => l.id === o.locationId);
    p.eventLog = [...p.eventLog, { day: p.day, message: `🏴 Claimed ${loc?.name}! +$${o.tribute}/day`, type: 'info' }];
  }

  p.offer = null;
  const { milestones } = checkMilestones(p);
  p.milestones = milestones;
  return { player: p, effects };
}

// ── Banking ────────────────────────────────────────────────
export function bankAction(player: PlayerState, action: 'deposit' | 'withdraw', amount: number | 'all'): PlayerState {
  const p = { ...player };
  if (action === 'deposit') {
    const v = amount === 'all' ? p.cash : Math.max(0, amount);
    const x = Math.min(v, p.cash);
    p.cash -= x;
    p.bank += x;
  } else {
    const v = amount === 'all' ? p.bank : Math.max(0, amount);
    const x = Math.min(v, p.bank);
    p.cash += x;
    p.bank -= x;
  }
  return p;
}

// ── Shark ──────────────────────────────────────────────────
export function payShark(player: PlayerState, amount: number | 'all'): PlayerState {
  const p = { ...player };
  const v = amount === 'all' ? Math.min(p.cash, p.debt) : Math.min(amount, p.cash, p.debt);
  p.cash -= v;
  p.debt -= v;
  const { milestones } = checkMilestones(p);
  p.milestones = milestones;
  return p;
}

export function borrowShark(player: PlayerState, amount: number): PlayerState {
  const p = { ...player };
  const v = Math.max(0, amount);
  p.cash += v;
  p.debt += v;
  return p;
}

// ── Pay Rat ────────────────────────────────────────────────
export function payRat(player: PlayerState): { player: PlayerState; effects: SideEffect[] } {
  if (player.cash < 150 || !player.rat.hired || !player.rat.alive) {
    return { player, effects: [] };
  }
  const p = { ...player };
  p.cash -= 150;
  p.rat = { ...p.rat, loyalty: Math.min(100, p.rat.loyalty + R(5, 12)) };
  return { player: p, effects: [{ type: 'haptic', style: 'light' }] };
}
