import type { PlayerState, MarketEvent, Rat, Milestone, NearMiss, EventLog, RatTip, RegionLaw, Region, Consignment } from '../types/game';
import {
  DRUGS, LOCATIONS, GANGS, EVENTS, MILESTONES, REGIONS,
  RAT_NAMES, RAT_TYPES,
  DAYS, STARTING_CASH, STARTING_DEBT, STARTING_SPACE,
  DEBT_INTEREST, BANK_INTEREST, HEAT_CAP,
  CONSIGNMENT_TURNS, CONSIGNMENT_MARKUP,
  R, C, getRegionForLocation, DEFAULT_LAW,
} from '../constants/game';

// ── Price Generation ───────────────────────────────────────
export function generatePrices(locationId: string, event: MarketEvent | null): Record<string, number | null> {
  const region = getRegionForLocation(locationId);
  const mults = region?.priceMultipliers || {};
  const prices: Record<string, number | null> = {};
  DRUGS.forEach(d => {
    const isEventDrug = event && event.drugId === d.id;
    if (!isEventDrug && C(0.12)) { prices[d.id] = null; return; }
    let pr = R(d.min, d.max);
    if (mults[d.id]) pr = Math.round(pr * mults[d.id]);
    if (isEventDrug) {
      pr = Math.round(d.min * event!.multiplier + Math.random() * d.min * 0.15);
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
    pendingTip: null,
  };
}

// ── Player Init ────────────────────────────────────────────
export function createPlayerState(locationId = 'bronx'): PlayerState {
  const regionId = getRegionForLocation(locationId)?.id || 'nyc';
  const ev = selectEvent(regionId, null, 0.35);
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
    customsEvasions: 0,
    customsCaught: 0,
    consignment: null,
    fingers: 10,
    consignmentsCompleted: 0,
  };
}

// ── Event Selection (region-filtered, rat-biased) ──────────
export function selectEvent(regionId: string, ratTip: RatTip | null, baseChance: number): MarketEvent | null {
  if (!C(baseChance)) {
    // No event roll succeeded — but rat tip can force one
    if (ratTip && ratTip.accurate && ratTip.turnsUntil <= 0 && C(0.55)) {
      return findMatchingEvent(regionId, ratTip);
    }
    return null;
  }

  // Normal event roll — filter by region
  const eligible = EVENTS.filter(e => !e.regionId || e.regionId === regionId);
  if (eligible.length === 0) return null;

  // Rat tip bias: 55% chance to match tip direction/drug
  if (ratTip && ratTip.accurate && ratTip.turnsUntil <= 0 && C(0.55)) {
    const match = findMatchingEvent(regionId, ratTip);
    if (match) return match;
  }

  return eligible[R(0, eligible.length - 1)];
}

function findMatchingEvent(regionId: string, tip: RatTip): MarketEvent | null {
  const matches = EVENTS.filter(e =>
    (!e.regionId || e.regionId === regionId) &&
    e.drugId === tip.drugId &&
    e.type === tip.direction
  );
  if (matches.length === 0) return null;
  return matches[R(0, matches.length - 1)];
}

// ── Rat Tip Generation ─────────────────────────────────────
export function generateRatTip(rat: Rat, regionId: string): RatTip | null {
  const accuracy = 0.35 + rat.intel * 0.15;
  const isAccurate = C(accuracy);

  if (isAccurate) {
    // Pick a real event that could fire in this region
    const eligible = EVENTS.filter(e => !e.regionId || e.regionId === regionId);
    if (eligible.length === 0) return null;
    const ev = eligible[R(0, eligible.length - 1)];
    return {
      drugId: ev.drugId,
      direction: ev.type,
      confidence: rat.intel,
      turnsUntil: R(1, 2),
      accurate: true,
    };
  } else {
    // Inaccurate: random drug + random direction
    const drug = DRUGS[R(0, DRUGS.length - 1)];
    return {
      drugId: drug.id,
      direction: C(0.5) ? 'spike' : 'crash',
      confidence: rat.intel,
      turnsUntil: R(1, 2),
      accurate: false,
    };
  }
}

// ── Customs Check ──────────────────────────────────────────
export interface CustomsResult {
  caught: boolean;
  confiscatedDrug: string | null;
  confiscatedQty: number;
  fine: number;
  heatGain: number;
  message: string;
}

export function customsCheck(player: PlayerState, destRegion: Region): CustomsResult | null {
  const totalUnits = inventoryCount(player.inventory);
  if (totalUnits <= 0) return null;

  // Detection chance
  let detectChance = destRegion.customsStrictness
    + totalUnits * 0.002
    + player.heat * 0.002
    - (player.space > STARTING_SPACE ? 0.05 : 0); // "hasCoat" = expanded space
  detectChance = Math.max(0.05, Math.min(0.75, detectChance));

  if (!C(detectChance)) return null; // Evaded customs

  // Caught — find a drug to confiscate (contraband first)
  const carried = Object.entries(player.inventory).filter(([, q]) => q > 0);
  if (carried.length === 0) return null;

  // Prioritize contraband
  let targetDrug: string;
  const contrabandCarried = carried.filter(([id]) => destRegion.contraband.includes(id));
  if (contrabandCarried.length > 0) {
    targetDrug = contrabandCarried[R(0, contrabandCarried.length - 1)][0];
  } else {
    targetDrug = carried[R(0, carried.length - 1)][0];
  }

  const qty = player.inventory[targetDrug];
  const confiscatePercent = R(30, 80) / 100;
  const confiscatedQty = Math.max(1, Math.ceil(qty * confiscatePercent));

  // Fine = 10-30% of street value
  const drug = DRUGS.find(d => d.id === targetDrug)!;
  const streetValue = confiscatedQty * R(drug.min, drug.max);
  const finePercent = R(10, 30) / 100;
  const fine = Math.min(Math.round(streetValue * finePercent), player.cash);

  const heatGain = R(8, 20);

  return {
    caught: true,
    confiscatedDrug: targetDrug,
    confiscatedQty,
    fine,
    heatGain,
    message: `Customs seized ${confiscatedQty} ${drug.emoji} ${drug.name} and fined you $${fine.toLocaleString()}!`,
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

// ── Effective Space (with finger penalty) ─────────────────
export function effectiveSpace(p: PlayerState): number {
  return Math.max(0, p.space - getFingerSpacePenalty(p.fingers));
}

// ── Net Worth ──────────────────────────────────────────────
export function netWorth(p: PlayerState): number {
  return p.cash + p.bank - p.debt + Object.entries(p.inventory).reduce((s, [id, q]) => {
    const d = DRUGS.find(x => x.id === id);
    return s + q * ((p.prices[id] as number) || d!.min);
  }, 0);
}

// ── Side Effects Queue ─────────────────────────────────────
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
    const returnCost = Math.round(srcRegion.flyCost / 2);
    if (p.cash < returnCost) {
      notifications.push({ message: `Return flight costs $${returnCost.toLocaleString()}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
  }

  // Calculate travel days (finger penalty adds +1 day at <= 6 fingers)
  let td = isInterRegion ? (dest.region === 'nyc' ? srcRegion.travelDays : destRegion.travelDays) : 1;
  td += getFingerMovePenalty(p.fingers);
  p.day += td;

  // Deduct flight cost
  if (isInterRegion) {
    if (dest.region === 'nyc') {
      p.cash -= Math.round(srcRegion.flyCost / 2);
    } else {
      p.cash -= destRegion.flyCost;
    }
    p.hasGoneInternational = true;
  }

  // When flying to a region, land at its capital
  if (isInterRegion) {
    const regionLocs = LOCATIONS.filter(l => l.region === dest.region);
    p.location = regionLocs[0].id;
  } else {
    p.location = destinationId;
  }

  // Determine the region we're NOW in (after landing)
  const currentRegion = getRegionForLocation(p.location) || destRegion;
  const law = currentRegion.law || DEFAULT_LAW;

  p.debt = Math.round(p.debt * Math.pow(1 + DEBT_INTEREST, td));
  p.bank = Math.round(p.bank * Math.pow(1 + BANK_INTEREST, td));

  // ── Heat Decay (rebalanced) ──
  let heatDecay = R(5, 12) + law.heatDecayBonus;
  if (p.heat > 60) heatDecay += Math.floor((p.heat - 60) * 0.15);
  p.heat = Math.max(0, p.heat - heatDecay);

  // Tribute
  const trib = Object.values(p.territories).reduce((s, d) => s + (d.tribute || 0), 0);
  p.tributePerDay = trib;
  p.cash += trib * td;

  // ── Customs Check (inter-region with inventory) ──
  if (isInterRegion) {
    const customsResult = customsCheck(p, destRegion);
    if (customsResult && customsResult.caught) {
      // Apply confiscation
      if (customsResult.confiscatedDrug) {
        const newInv = { ...p.inventory };
        newInv[customsResult.confiscatedDrug] = (newInv[customsResult.confiscatedDrug] || 0) - customsResult.confiscatedQty;
        if (newInv[customsResult.confiscatedDrug] <= 0) delete newInv[customsResult.confiscatedDrug];
        p.inventory = newInv;
      }
      p.cash -= customsResult.fine;
      p.heat = Math.min(HEAT_CAP, p.heat + customsResult.heatGain);
      p.customsCaught++;
      p.eventLog = [...p.eventLog, { day: p.day, message: `🛃 ${customsResult.message}`, type: 'customs' as const }];
      effects.push({ type: 'shake' }, { type: 'haptic', style: 'warning' });
      notifications.push({ message: customsResult.message, type: 'danger' });
    } else if (inventoryCount(p.inventory) > 0) {
      // Evaded customs
      p.customsEvasions++;
    }
  }

  // ── Rat tip management ──
  // Tick down pending tip
  if (p.rat.pendingTip) {
    p.rat = { ...p.rat, pendingTip: { ...p.rat.pendingTip, turnsUntil: p.rat.pendingTip.turnsUntil - 1 } };
  }

  // ── Market (region-filtered events with rat bias) ──
  const ev = selectEvent(currentRegion.id, p.rat.pendingTip, 0.38);
  p.currentEvent = ev;
  p.previousPrices = { ...p.prices };
  p.prices = generatePrices(p.location, ev);
  if (ev) {
    const regionEmoji = currentRegion.id !== 'nyc' ? `${currentRegion.emoji} ` : '';
    p.eventLog = [...p.eventLog, { day: p.day, message: `${regionEmoji}${ev.message}`, type: ev.type }];
  }

  // Clear rat tip after event resolution if it was due
  if (p.rat.pendingTip && p.rat.pendingTip.turnsUntil <= 0) {
    p.rat = { ...p.rat, pendingTip: null };
  }

  // Near misses
  const nms: NearMiss[] = [];
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

  // ── Consignment countdown & settlement ──
  if (p.consignment) {
    p.consignment = { ...p.consignment, turnsLeft: p.consignment.turnsLeft - 1 };

    // Warning notifications
    if (p.consignment.turnsLeft === 2) {
      const cGang = GANGS.find(g => g.id === p.consignment!.gangId);
      notifications.push({ message: `⏰ 2 turns to repay ${cGang?.name || 'the gang'}!`, type: 'danger' });
    } else if (p.consignment.turnsLeft === 1) {
      const cGang = GANGS.find(g => g.id === p.consignment!.gangId);
      notifications.push({ message: `⏰ LAST TURN to repay ${cGang?.name || 'the gang'}!`, type: 'danger' });
    }

    // Auto-settlement if on gang's origin location
    if (p.location === p.consignment.originLocation) {
      const isOverdue = p.consignment.turnsLeft < 0;
      const settlement = settleConsignment(p, isOverdue);
      // Apply settlement — return early since settlement may end game
      const sp = settlement.player;
      sp.cops = null; // Ensure no cop encounter on settlement turn

      if (sp.fingers <= 0 || sp.hp <= 0) {
        return { player: sp, phase: 'end', effects: [...effects, ...settlement.effects], notifications };
      }

      // Continue with settled player
      Object.assign(p, sp);
      effects.push(...settlement.effects);
    }
    // Bounty hunter check if overdue and NOT on origin turf
    else if (p.consignment && p.consignment.turnsLeft < 0) {
      const overdueTurns = Math.abs(p.consignment.turnsLeft);
      const bountyChance = Math.min(0.65, 0.25 + overdueTurns * 0.08);
      if (C(bountyChance)) {
        const con = p.consignment;
        const bGang = GANGS.find(g => g.id === con.gangId);
        const law = currentRegion.law || DEFAULT_LAW;
        p.cops = {
          count: 1,
          bribeCost: Math.round((con.amountOwed - con.amountPaid) * 1.5),
          regionLaw: law,
          bountyHunter: true,
          consignment: con,
        };
        effects.push({ type: 'haptic', style: 'heavy' });
        return { player: p, phase: 'cop', effects, notifications };
      }
    }
  }

  // Gang tax
  const lg = GANGS.find(g => g.turf.includes(p.location));
  if (lg && !p.territories[p.location] && (p.gangRelations[lg.id] ?? 0) < -15 && C(0.3)) {
    const tax = Math.round(p.cash * R(5, 18) / 100);
    p.cash -= tax;
    p.eventLog = [...p.eventLog, { day: p.day, message: `${lg.emoji} ${lg.name} taxed you $${tax}!`, type: 'danger' }];
    effects.push({ type: 'shake' });
  }

  // ── Rat (predictive tips) ──
  if (p.rat.hired && p.rat.alive) {
    p.rat = { ...p.rat, loyalty: p.rat.loyalty + R(-3, 4) };
    if (p.rat.loyalty < 20 && C(0.03 + (50 - p.rat.loyalty) / 400)) {
      p.rat = { ...p.rat, alive: false };
      p.heat = Math.min(HEAT_CAP, p.heat + 40);
      p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 ${p.rat.name} RATTED YOU OUT! Heat surging!`, type: 'danger' }];
      effects.push({ type: 'shake' }, { type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'error' });
    } else if (C(0.22 + p.rat.intel * 0.07)) {
      // Generate a predictive tip (replaces old random flavor text)
      if (!p.rat.pendingTip) {
        const tip = generateRatTip(p.rat, currentRegion.id);
        if (tip) {
          p.rat = { ...p.rat, tips: p.rat.tips + 1, pendingTip: tip };
          const drug = DRUGS.find(d => d.id === tip.drugId)!;
          const dirText = tip.direction === 'spike' ? 'explode' : 'crash';
          const stars = '⭐'.repeat(tip.confidence);
          p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 ${p.rat.name}: "${drug.name} gonna ${dirText} soon..." ${stars}`, type: 'tip' }];
        }
      }
    }
  }

  // ── Cops (rebalanced: capped probability, regional law) ──
  const curUsed = inventoryCount(p.inventory);
  const copBase = 0.08 + (p.heat / 200) * 0.35 + law.encounterModifier;
  const copChance = Math.min(0.65, copBase);
  if (C(copChance) && curUsed > 0) {
    const maxOfficers = Math.min(6, 2 + Math.floor(p.heat / 35) + law.aggressionBase);
    const count = R(1, Math.max(1, maxOfficers));
    const baseBribe = R(300, 1000);
    const bribeCost = Math.round(baseBribe * law.bribeMultiplier);
    p.cops = { count, bribeCost, regionLaw: law };
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
  const conOffer = generateConsignmentOffer(p, p.location);
  if (conOffer) {
    const conDrug = DRUGS.find(d => d.id === conOffer.drugId)!;
    const conGang = GANGS.find(g => g.id === conOffer.gangId)!;
    p.offer = {
      type: 'consignment',
      drugId: conOffer.drugId,
      quantity: conOffer.quantity,
      amountOwed: conOffer.amountOwed,
      originLocation: p.location,
      gangId: conOffer.gangId,
    };
  } else if (!p.gun && C(0.14)) p.offer = { type: 'gun', price: R(300, 600) };
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
  if (p.hp <= 0 || p.fingers <= 0) {
    if (p.fingers <= 0) p.eventLog = [...p.eventLog, { day: p.day, message: `You have nothing left.`, type: 'danger' }];
    return { player: p, phase: 'end', effects, notifications };
  }

  return { player: p, phase: 'playing', effects, notifications };
}

// ── Trade (rebalanced heat) ───────────────────────────────
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
  const effectiveSpace = p.space - getFingerSpacePenalty(p.fingers);
  const free = effectiveSpace - used;

  if (tradeType === 'buy') {
    const mx = Math.min(Math.floor(p.cash / price), free);
    const q = quantity === 'max' ? mx : Math.min(quantity, mx);
    if (q <= 0) return { player, effects };

    p.cash -= q * price;
    p.inventory = { ...p.inventory, [drug.id]: (p.inventory[drug.id] || 0) + q };
    const prevQty = player.inventory[drug.id] || 0;
    const prevAvg = player.averageCosts[drug.id] || 0;
    p.averageCosts = { ...p.averageCosts, [drug.id]: (prevAvg * prevQty + price * q) / (prevQty + q) };
    // Rebalanced buy heat: ceil(qty * price / 25000) capped at 8
    p.heat = Math.min(HEAT_CAP, p.heat + Math.min(8, Math.ceil(q * price / 25000)));
    p.trades++;
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'light' });
  } else {
    const own = p.inventory[drug.id] || 0;
    const q = quantity === 'max' ? own : Math.min(quantity, own);
    if (q <= 0) return { player, effects };

    const fingerPenalty = getFingerSellPenalty(p.fingers);
    const rev = Math.round(q * price * (1 - fingerPenalty));
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
    // Rebalanced sell heat: ceil(rev / 30000) capped at 6
    p.heat = Math.min(HEAT_CAP, p.heat + Math.min(6, Math.ceil(rev / 30000)));
  }

  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;
  if (newMilestone) effects.push({ type: 'sfx', sound: 'level' });

  return { player: p, effects };
}

// ── Cop Actions (regional behavior) ───────────────────────
export interface CopResult {
  player: PlayerState;
  phase: 'playing' | 'end';
  effects: SideEffect[];
}

export function copAction(player: PlayerState, action: 'run' | 'fight' | 'bribe'): CopResult {
  // Delegate to bounty hunter logic if applicable
  if (player.cops?.bountyHunter) {
    const bhAction = action === 'bribe' ? 'pay' : action;
    return bountyHunterAction(player, bhAction as 'pay' | 'fight' | 'run');
  }

  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const c = p.cops!;
  const law = c.regionLaw || DEFAULT_LAW;

  if (action === 'run') {
    // Regional behavior modifiers
    let runChance = p.gun ? 0.55 : 0.38;
    if (law.behavior === 'corrupt') runChance += 0.05;
    if (law.behavior === 'methodical') runChance -= 0.10;

    if (C(runChance)) {
      p.eventLog = [...p.eventLog, { day: p.day, message: `Escaped the ${law.forceName}! Heart pounding!`, type: 'info' }];
      p.closeCallCount++;
      p.heat = Math.min(HEAT_CAP, p.heat + 3);
    } else {
      const l = Math.round(p.cash * (law.behavior === 'methodical' ? 0.3 : 0.2));
      p.cash -= l;
      const dk = Object.keys(p.inventory);
      if (dk.length) {
        const k = dk[R(0, dk.length - 1)];
        const confiscateMax = law.behavior === 'methodical' ? 70 : 60;
        const lq = Math.ceil(p.inventory[k] * R(30, confiscateMax) / 100);
        const newInv = { ...p.inventory, [k]: p.inventory[k] - lq };
        if (newInv[k] <= 0) delete newInv[k];
        p.inventory = newInv;
      }
      p.hp -= R(5, 18);
      p.heat = Math.min(HEAT_CAP, p.heat + 5);
      p.closeCallCount++;
      effects.push({ type: 'shake' });
      p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} ${law.forceName} caught you! Lost $${l} and product.`, type: 'danger' }];
    }
  } else if (action === 'fight') {
    let kl = 0, dm = 0;
    for (let i = 0; i < c.count; i++) {
      // Corrupt: lower fight damage. Methodical: harder fight.
      let killChance = p.gun ? 0.45 : 0.15;
      let dmMin = p.gun ? 5 : 12;
      let dmMax = p.gun ? 15 : 30;
      if (law.behavior === 'corrupt') { dmMin = Math.max(1, dmMin - 3); dmMax -= 5; }
      if (law.behavior === 'methodical') { killChance -= 0.05; dmMin += 3; dmMax += 5; }

      if (C(killChance)) kl++;
      else dm += R(dmMin, dmMax);
    }
    p.hp -= dm;
    // Rebalanced: 5 + kills * 3, capped at 15
    p.heat = Math.min(HEAT_CAP, p.heat + Math.min(15, 5 + kl * 3));
    p.rep += kl * 8;
    // Brutal: bonus rep for winning fights
    if (law.behavior === 'brutal' && kl > 0) p.rep += kl * 3;
    p.closeCallCount++;
    effects.push({ type: 'shake' });
    p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} Shootout with ${law.forceName}! ${kl}/${c.count} down.${dm > 20 ? ' Hurt bad.' : ''}`, type: 'danger' }];
  } else {
    // Bribe
    const amt = c.bribeCost * c.count;
    if (p.cash >= amt) {
      p.cash -= amt;
      // Methodical: bribe reduces more heat (-15), others: -12
      const heatReduce = law.behavior === 'methodical' ? 15 : 12;
      p.heat = Math.max(0, p.heat - heatReduce);
      p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} Bribed ${law.forceName} for $${amt}.`, type: 'info' }];
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
  } else if (o.type === 'consignment') {
    const drug = DRUGS.find(d => d.id === o.drugId!)!;
    const gang = GANGS.find(g => g.id === o.gangId!)!;
    // Add drugs to inventory
    p.inventory = { ...p.inventory, [o.drugId!]: (p.inventory[o.drugId!] || 0) + o.quantity! };
    // Create consignment
    p.consignment = {
      gangId: o.gangId!,
      drugId: o.drugId!,
      quantity: o.quantity!,
      amountOwed: o.amountOwed!,
      amountPaid: 0,
      turnsLeft: CONSIGNMENT_TURNS,
      originLocation: o.originLocation!,
      accepted: true,
    };
    // Relation boost for trust
    p.gangRelations = { ...p.gangRelations, [o.gangId!]: (p.gangRelations[o.gangId!] ?? 0) + 3 };
    p.eventLog = [...p.eventLog, {
      day: p.day,
      message: `☠️ Took ${o.quantity} ${drug.emoji} ${drug.name} from ${gang.name}. Owe $${o.amountOwed!.toLocaleString()} in ${CONSIGNMENT_TURNS} turns.`,
      type: 'consignment' as const,
    }];
    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'medium' });
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

// ── Pay Rat (upgraded: can generate immediate tip) ─────────
export function payRat(player: PlayerState): { player: PlayerState; effects: SideEffect[]; tipGenerated: boolean } {
  if (player.cash < 150 || !player.rat.hired || !player.rat.alive) {
    return { player, effects: [], tipGenerated: false };
  }
  const p = { ...player };
  p.cash -= 150;
  p.rat = { ...p.rat, loyalty: Math.min(100, p.rat.loyalty + R(5, 12)) };

  // New: 30% + intel*10% chance to immediately generate a tip if none pending
  let tipGenerated = false;
  if (!p.rat.pendingTip && C(0.30 + p.rat.intel * 0.10)) {
    const regionId = getRegionForLocation(p.location)?.id || 'nyc';
    const tip = generateRatTip(p.rat, regionId);
    if (tip) {
      p.rat = { ...p.rat, tips: p.rat.tips + 1, pendingTip: tip };
      const drug = DRUGS.find(d => d.id === tip.drugId)!;
      const dirText = tip.direction === 'spike' ? 'explode' : 'crash';
      const stars = '⭐'.repeat(tip.confidence);
      p.eventLog = [...p.eventLog, { day: p.day, message: `🐀 ${p.rat.name}: "${drug.name} gonna ${dirText} soon..." ${stars}`, type: 'tip' }];
      tipGenerated = true;
    }
  }

  return { player: p, effects: [{ type: 'haptic', style: 'light' }], tipGenerated };
}

// ── Consignment: Generate Offer ──────────────────────────
export function generateConsignmentOffer(player: PlayerState, location: string): { drugId: string; quantity: number; amountOwed: number; gangId: string } | null {
  if (player.consignment) return null;
  if (player.rep < 15) return null;

  const gang = GANGS.find(g => g.turf.includes(location));
  if (!gang) return null;
  if ((player.gangRelations[gang.id] ?? 0) < -5) return null;
  if (!C(0.15)) return null;

  // Pick drugs available in this gang's region
  const region = getRegionForLocation(location);
  if (!region) return null;

  // Weight toward expensive drugs
  const weights = DRUGS.map(d => ({ drug: d, weight: d.tier * d.tier }));
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = weights[0].drug;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) { picked = w.drug; break; }
  }

  // Quantity based on tier
  let quantity: number;
  if (picked.tier === 3) quantity = R(3, 8);
  else if (picked.tier === 2) quantity = R(5, 15);
  else quantity = R(10, 30);

  const wholesale = Math.round((picked.min + picked.max) / 2);
  const amountOwed = wholesale * CONSIGNMENT_MARKUP * quantity;

  return { drugId: picked.id, quantity, amountOwed: Math.round(amountOwed), gangId: gang.id };
}

// ── Consignment: Settlement ──────────────────────────────
export interface SettlementResult {
  player: PlayerState;
  effects: SideEffect[];
  outcome: 'full' | 'partial' | 'poor' | 'none';
  percentPaid: number;
}

export function settleConsignment(player: PlayerState, isOverdue: boolean): SettlementResult {
  const effects: SideEffect[] = [];
  const p = { ...player };
  const con = p.consignment!;
  const gang = GANGS.find(g => g.id === con.gangId);
  const gangName = gang?.name || 'The gang';
  const gangEmoji = gang?.emoji || '☠️';

  let remaining = con.amountOwed - con.amountPaid;

  // Deduct cash first
  const cashPayment = Math.min(p.cash, remaining);
  p.cash -= cashPayment;
  remaining -= cashPayment;

  // Then deduct drugs at current street value (consignment drug first, then others)
  if (remaining > 0) {
    const drugOrder = Object.keys(p.inventory).sort((a, b) => {
      if (a === con.drugId) return -1;
      if (b === con.drugId) return 1;
      return 0;
    });
    for (const drugId of drugOrder) {
      if (remaining <= 0) break;
      const qty = p.inventory[drugId] || 0;
      if (qty <= 0) continue;
      const price = (p.prices[drugId] as number) || DRUGS.find(d => d.id === drugId)!.min;
      const unitsNeeded = Math.ceil(remaining / price);
      const unitsToTake = Math.min(qty, unitsNeeded);
      const value = unitsToTake * price;
      const newInv = { ...p.inventory, [drugId]: qty - unitsToTake };
      if (newInv[drugId] <= 0) delete newInv[drugId];
      p.inventory = newInv;
      remaining -= value;
    }
  }

  const totalPaid = con.amountOwed - Math.max(0, remaining);
  const percentPaid = totalPaid / con.amountOwed;

  // Determine effective thresholds (overdue shifts one category worse)
  const fullThreshold = isOverdue ? 999 : 1.0;   // overdue: can never get "full" clean pass
  const partialThreshold = isOverdue ? 1.0 : 0.7; // overdue + 100% = partial
  const poorThreshold = isOverdue ? 0.7 : 0;

  let outcome: 'full' | 'partial' | 'poor';

  if (percentPaid >= fullThreshold) {
    // Full payment on time
    outcome = 'full';
    p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) + 8 };
    p.rep += 5;
    p.consignmentsCompleted++;
    p.eventLog = [...p.eventLog, { day: p.day, message: `${gangEmoji} ${gangName} pleased! 'You're alright.'`, type: 'consignment' as const }];
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
  } else if (percentPaid >= partialThreshold) {
    // Partial payment
    outcome = 'partial';
    p.fingers = Math.max(0, p.fingers - 1);
    const relationPenalty = isOverdue ? -6 : -3;
    p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) + relationPenalty };
    p.eventLog = [...p.eventLog, { day: p.day, message: `✂️ ${gangName} took a finger. 'Next time, have it ALL.'`, type: 'consignment' as const }];
    effects.push({ type: 'shake' }, { type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'error' });
  } else {
    // Poor payment
    outcome = 'poor';
    p.fingers = Math.max(0, p.fingers - 2);
    const relationPenalty = isOverdue ? -16 : -8;
    p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) + relationPenalty };
    p.hp -= R(15, 30);
    p.eventLog = [...p.eventLog, { day: p.day, message: `✂️✂️ ${gangName} took TWO fingers and beat you. 'Pathetic.'`, type: 'consignment' as const }];
    effects.push({ type: 'shake' }, { type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'error' });
  }

  // Apply finger consequences
  if (p.fingers <= 4) p.gun = false;

  // Clear consignment
  p.consignment = null;

  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;

  return { player: p, effects, outcome, percentPaid };
}

// ── Consignment: Bounty Hunter CopAction ─────────────────
export function bountyHunterAction(player: PlayerState, action: 'pay' | 'fight' | 'run'): CopResult {
  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const con = p.consignment!;
  const gang = GANGS.find(g => g.id === con.gangId);
  const gangName = gang?.name || 'The gang';

  if (action === 'pay') {
    // Pay 1.5x remaining debt
    const remaining = con.amountOwed - con.amountPaid;
    const penalty = Math.round(remaining * 1.5);
    let toPay = penalty;

    // Cash first
    const cashPay = Math.min(p.cash, toPay);
    p.cash -= cashPay;
    toPay -= cashPay;

    // Then drugs
    if (toPay > 0) {
      const drugOrder = Object.keys(p.inventory);
      for (const drugId of drugOrder) {
        if (toPay <= 0) break;
        const qty = p.inventory[drugId] || 0;
        if (qty <= 0) continue;
        const price = (p.prices[drugId] as number) || DRUGS.find(d => d.id === drugId)!.min;
        const unitsNeeded = Math.ceil(toPay / price);
        const unitsToTake = Math.min(qty, unitsNeeded);
        const value = unitsToTake * price;
        const newInv = { ...p.inventory, [drugId]: qty - unitsToTake };
        if (newInv[drugId] <= 0) delete newInv[drugId];
        p.inventory = newInv;
        toPay -= value;
      }
    }

    p.consignment = null;
    p.consignmentsCompleted++;
    p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) - 2 };
    p.eventLog = [...p.eventLog, { day: p.day, message: `🤝 Paid off ${gangName}'s bounty hunter. Debt settled.`, type: 'consignment' as const }];
  } else if (action === 'fight') {
    // Harder than cops: gun = 35% kill chance, no gun = 10%
    const killChance = p.gun ? 0.35 : 0.10;
    if (C(killChance)) {
      // Win — bounty hunter gone, but consignment still active (just safe for a while)
      // We mark turnsLeft to give 3 turns of breathing room
      p.consignment = { ...con, turnsLeft: -3 }; // negative = grace turns
      p.heat = Math.min(HEAT_CAP, p.heat + 12);
      p.rep += 10;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Fought off ${gangName}'s bounty hunter! They'll be back...`, type: 'consignment' as const }];
    } else {
      // Lose — finger + HP + they take some goods
      p.fingers = Math.max(0, p.fingers - 1);
      p.hp -= R(15, 30);
      const dk = Object.keys(p.inventory);
      if (dk.length) {
        const k = dk[R(0, dk.length - 1)];
        const lq = Math.ceil((p.inventory[k] || 0) * R(30, 60) / 100);
        const newInv = { ...p.inventory, [k]: (p.inventory[k] || 0) - lq };
        if (newInv[k] <= 0) delete newInv[k];
        p.inventory = newInv;
      }
      if (p.fingers <= 4) p.gun = false;
      p.eventLog = [...p.eventLog, { day: p.day, message: `✂️ ${gangName}'s bounty hunter took a finger and beat you down.`, type: 'consignment' as const }];
      effects.push({ type: 'shake' });
    }
  } else {
    // Run — 35% success (no gun bonus)
    if (C(0.35)) {
      p.eventLog = [...p.eventLog, { day: p.day, message: `Escaped ${gangName}'s bounty hunter! For now...`, type: 'consignment' as const }];
      p.closeCallCount++;
    } else {
      // Fail — lose a finger
      p.fingers = Math.max(0, p.fingers - 1);
      p.hp -= R(5, 15);
      if (p.fingers <= 4) p.gun = false;
      p.eventLog = [...p.eventLog, { day: p.day, message: `✂️ Caught by ${gangName}'s bounty hunter! Lost a finger.`, type: 'consignment' as const }];
      effects.push({ type: 'shake' });
    }
  }

  p.cops = null;

  // Check finger death
  if (p.fingers <= 0) {
    p.hp = 0;
    p.eventLog = [...p.eventLog, { day: p.day, message: `You have nothing left.`, type: 'danger' }];
  }

  if (p.hp <= 0) return { player: p, phase: 'end', effects };
  return { player: p, phase: 'playing', effects };
}

// ── Finger Impairment Helpers ────────────────────────────
export function getFingerSpacePenalty(fingers: number): number {
  return (10 - fingers) * 5;
}

export function getFingerSellPenalty(fingers: number): number {
  return (10 - fingers) * 0.03;
}

export function getFingerMovePenalty(fingers: number): number {
  return fingers <= 6 ? 1 : 0;
}
