import type { PlayerState, MarketEvent, Rat, Milestone, NearMiss, EventLog, RatTip, RegionLaw, Region, Consignment, Forecast, PersonaId, GangLoan, GangMission, CampaignLevel, CampaignState, GangWarState } from '../types/game';
import {
  DRUGS, LOCATIONS, GANGS, EVENTS, MILESTONES, REGIONS,
  RAT_NAMES, RAT_TYPES,
  DAYS, STARTING_CASH, STARTING_DEBT, STARTING_SPACE,
  DEBT_INTEREST, BANK_INTEREST, HEAT_CAP,
  CONSIGNMENT_TURNS, CONSIGNMENT_MARKUP, STASH_CAPACITY,
  GANG_LOAN_TURNS, GANG_LOAN_INTEREST, GANG_LOAN_BASE_CAP,
  GANG_LOAN_CAP_PER_REL, GANG_LOAN_MAX_CAP, GANG_LOAN_MIN_RELATIONS,
  FAVOR_FRIENDLY, FAVOR_TRUSTED, FAVOR_BLOOD,
  R, C, $, getRegionForLocation, DEFAULT_LAW,
  getPersonaModifiers, getGangFavorTier,
  DAYS_PER_LEVEL, getLevelConfig, isFeatureEnabled, isRegionAvailable,
  type CampaignFeature,
} from '../constants/game';

// ── Price Generation ───────────────────────────────────────
export function generatePrices(locationId: string, event: MarketEvent | null, campaignLevel: CampaignLevel = 1, mode: 'campaign' | 'classic' = 'classic'): Record<string, number | null> {
  const region = getRegionForLocation(locationId);
  const mults = region?.priceMultipliers || {};
  const prices: Record<string, number | null> = {};
  const levelConfig = mode === 'campaign' ? getLevelConfig(campaignLevel) : null;
  const rareMultiplier = levelConfig?.rareSpawnMultiplier ?? 1.0;
  const volatility = levelConfig?.eventVolatility ?? 1.0;

  DRUGS.forEach(d => {
    const isEventDrug = event && event.drugId === d.id;
    if (!isEventDrug) {
      let availChance = d.spawnChance ?? 0.88;
      if (d.rare) availChance *= rareMultiplier;
      if (!C(availChance)) { prices[d.id] = null; return; }
    }
    let pr = R(d.min, d.max);
    if (mults[d.id]) pr = Math.round(pr * mults[d.id]);
    if (isEventDrug) {
      const adjustedMultiplier = event!.multiplier > 1
        ? 1 + (event!.multiplier - 1) * volatility
        : event!.multiplier / volatility;
      pr = Math.round(d.min * adjustedMultiplier + Math.random() * d.min * 0.15);
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
export function createPlayerState(locationId = 'bronx', difficulty: 'conservative' | 'standard' | 'highroller' = 'standard', personaId: PersonaId | null = null, campaignLevel: CampaignLevel = 1, mode: 'campaign' | 'classic' = 'classic'): PlayerState {
  const difficultySettings = {
    conservative: { cash: 500, debt: 2000 },
    standard: { cash: STARTING_CASH, debt: STARTING_DEBT },
    highroller: { cash: 6000, debt: 12000 },
  };
  const settings = difficultySettings[difficulty];
  const mods = getPersonaModifiers(personaId);

  const startLoc = personaId ? mods.startingLocation : locationId;
  const cash = Math.round(settings.cash * mods.startingCashMultiplier);
  const debt = mode === 'campaign'
    ? Math.round(getLevelConfig(campaignLevel).startingDebt * mods.startingDebtMultiplier)
    : Math.round(settings.debt * mods.startingDebtMultiplier);
  const space = STARTING_SPACE + mods.startingSpaceOffset;

  // Gang relations with persona offsets
  const gangRelations: Record<string, number> = {};
  for (const g of GANGS) {
    gangRelations[g.id] = mods.startingGangRelationOffset + (mods.startingGangOverrides[g.id] ?? 0);
  }

  // Rat — pre-hire if persona says so
  const rat = makeRat();
  if (mods.preHiredRat) {
    rat.hired = true;
    rat.intel = Math.min(3, rat.intel + mods.ratIntelBonus);
  }

  const regionId = getRegionForLocation(startLoc)?.id || 'nyc';
  const ev = selectEvent(regionId, null, 0.35);
  return {
    day: 1,
    cash,
    debt,
    bank: 0,
    location: startLoc,
    inventory: {},
    space,
    prices: generatePrices(startLoc, ev, campaignLevel, mode),
    previousPrices: {},
    gun: mods.startingGun,
    hp: mods.startingHP,
    heat: 0,
    rep: mods.startingRep,
    profit: 0,
    bestTrade: 0,
    trades: 0,
    streak: 0,
    maxStreak: 0,
    combo: 1,
    averageCosts: {},
    territories: {},
    gangRelations,
    rat,
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
    forecast: null,
    personaId,
    gangLoan: null,
    gangLoansRepaid: 0,
    gangMission: null,
    gangMissionsCompleted: 0,
    campaignLevel,
    recentTrades: [],
    priceHistory: {},
    tradeLog: [],
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
  let stashValue = 0;
  for (const terr of Object.values(p.territories)) {
    const stash = terr.stash || {};
    for (const [id, q] of Object.entries(stash)) {
      const d = DRUGS.find(x => x.id === id);
      stashValue += q * ((p.prices[id] as number) || d!.min);
    }
  }
  const gangLoanDebt = p.gangLoan ? (p.gangLoan.amountOwed - p.gangLoan.amountPaid) : 0;
  const consignmentDebt = p.consignment ? (p.consignment.amountOwed - p.consignment.amountPaid) : 0;
  return p.cash + p.bank - p.debt - gangLoanDebt - consignmentDebt + stashValue + Object.entries(p.inventory).reduce((s, [id, q]) => {
    const d = DRUGS.find(x => x.id === id);
    return s + q * ((p.prices[id] as number) || d!.min);
  }, 0);
}

// ── Side Effects Queue ─────────────────────────────────────
export type SideEffect =
  | { type: 'sfx'; sound: 'buy' | 'sell' | 'big' | 'bad' | 'miss' | 'level' | 'tick' | 'cop' | 'finger' | 'bounty' | 'streak' }
  | { type: 'shake' }
  | { type: 'haptic'; style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' };

// ── Travel ─────────────────────────────────────────────────
export interface TravelResult {
  player: PlayerState;
  phase: 'playing' | 'cop' | 'end' | 'win' | 'levelComplete';
  effects: SideEffect[];
  notifications: Array<{ message: string; type: string }>;
}

export function travel(player: PlayerState, destinationId: string, campaign?: CampaignState): TravelResult {
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

  const gameMode = campaign?.mode || 'classic';

  // Campaign region gating
  if (isInterRegion && dest.region !== 'nyc' && !isRegionAvailable(p.campaignLevel, dest.region, gameMode)) {
    const neededLevel = dest.region === 'colombia' || dest.region === 'thailand' ? 2 : 3;
    notifications.push({ message: `${destRegion.name} unlocks in Level ${neededLevel}.`, type: 'danger' });
    return { player, phase: 'playing', effects, notifications };
  }

  // Inter-region flight checks (cost scales with net worth)
  const preFlightNW = netWorth(player);
  const flyScale = Math.max(1, Math.floor(preFlightNW / 500_000) + 1);
  if (isInterRegion && dest.region !== 'nyc') {
    if (p.rep < destRegion.rep) {
      notifications.push({ message: `Need ${destRegion.rep} rep to unlock ${destRegion.name}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
    const scaledCost = destRegion.flyCost * flyScale;
    if (p.cash < scaledCost) {
      notifications.push({ message: `Flight costs $${scaledCost.toLocaleString()}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
  } else if (isInterRegion && dest.region === 'nyc' && srcRegion.id !== 'nyc') {
    const returnCost = Math.round(srcRegion.flyCost / 2 * flyScale);
    if (p.cash < returnCost) {
      notifications.push({ message: `Return flight costs $${returnCost.toLocaleString()}.`, type: 'danger' });
      return { player, phase: 'playing', effects, notifications };
    }
  }

  // Calculate travel days (finger penalty adds +1 day at <= 6 fingers)
  let td = isInterRegion ? (dest.region === 'nyc' ? srcRegion.travelDays : destRegion.travelDays) : 1;
  td += getFingerMovePenalty(p.fingers);
  p.day += td;

  // Deduct flight cost (scales with net worth — known kingpins pay more)
  if (isInterRegion) {
    if (dest.region === 'nyc') {
      p.cash -= Math.round(srcRegion.flyCost / 2 * flyScale);
    } else {
      p.cash -= destRegion.flyCost * flyScale;
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

  // ── Heat Decay (reduced) + Wealth-scaled heat floor ──
  const mods = getPersonaModifiers(p.personaId);
  // Location modifier: heatDecay bonus when traveling FROM this location
  const srcLocModifier = srcLoc.modifier?.type === 'heatDecay' ? srcLoc.modifier.value : 0;
  let heatDecay = R(3, 7) + law.heatDecayBonus + mods.heatDecayBonus + srcLocModifier;
  // No high-heat bonus — rich players shouldn't shed heat faster
  p.heat = Math.max(0, p.heat - heatDecay);

  // Wealth-scaled heat floor: rich dealers attract attention
  const nw = netWorth(p);
  const heatFloor = Math.min(30, Math.floor(nw / 100_000) * 3);
  if (p.heat < heatFloor) p.heat = heatFloor;

  // ── Location modifier: heatReduction on arrival ──
  const destLocObj = LOCATIONS.find(l => l.id === p.location);
  if (destLocObj?.modifier?.type === 'heatReduction') {
    p.heat = Math.max(0, p.heat - destLocObj.modifier.value);
  }

  // Tribute (L3 campaign: +50%)
  const tributeMultiplier = (gameMode === 'campaign' && p.campaignLevel === 3) ? getLevelConfig(3).territoryTributeMultiplier : 1;
  const trib = Math.round(Object.values(p.territories).reduce((s, d) => s + (d.tribute || 0), 0) * tributeMultiplier);
  p.tributePerDay = trib;
  p.cash += trib * td;

  // ── Customs Check (inter-region with inventory, persona evasion bonus) ──
  // France: Schengen zone — no customs checks. Makes France the safe transit hub for drug shipments.
  if (isInterRegion && destRegion.id !== 'france') {
    const customsResult = mods.customsEvasionBonus > 0
      ? (C(mods.customsEvasionBonus) ? null : customsCheck(p, destRegion))
      : customsCheck(p, destRegion);
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
      // Track customs confiscation in trade log
      if (customsResult.confiscatedDrug) {
        p.tradeLog = [...(p.tradeLog || []), { day: p.day, action: 'customs', drug: customsResult.confiscatedDrug, qty: customsResult.confiscatedQty, price: -customsResult.fine, location: p.location }].slice(-50);
      }
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

  // ── Market (region-filtered events with rat bias + persona) ──
  const ev = selectEvent(currentRegion.id, p.rat.pendingTip, 0.28 + mods.eventChanceBonus);
  p.currentEvent = ev;
  p.previousPrices = { ...p.prices };
  p.prices = generatePrices(p.location, ev, p.campaignLevel, gameMode);

  // ── Price Memory: recent heavy trading adjusts prices ──
  const destRegionId = currentRegion.id;
  const recentForRegion = (p.recentTrades || []).filter(t => t.region === destRegionId && t.day >= p.day - 3);
  for (const drugId of Object.keys(p.prices)) {
    if (p.prices[drugId] == null) continue;
    const buyQty = recentForRegion.filter(t => t.drug === drugId && t.type === 'buy').reduce((s, t) => s + t.qty, 0);
    const sellQty = recentForRegion.filter(t => t.drug === drugId && t.type === 'sell').reduce((s, t) => s + t.qty, 0);
    let priceAdj = 1.0;
    if (buyQty > 10) priceAdj *= 1.08;  // Supply drying up — buy price goes up
    if (sellQty > 10) priceAdj *= 0.92; // Market flooded — sell price goes down
    if (priceAdj !== 1.0) {
      p.prices[drugId] = Math.max(1, Math.round((p.prices[drugId] as number) * priceAdj));
    }
  }

  // ── Price History: track last 10 prices per drug for sparklines ──
  const ph = { ...(p.priceHistory || {}) };
  for (const drugId of Object.keys(p.prices)) {
    if (p.prices[drugId] == null) continue;
    const arr = [...(ph[drugId] || []), p.prices[drugId] as number];
    ph[drugId] = arr.slice(-10);
  }
  p.priceHistory = ph;

  if (ev) {
    const regionEmoji = currentRegion.id !== 'nyc' ? `${currentRegion.emoji} ` : '';
    p.eventLog = [...p.eventLog, { day: p.day, message: `${regionEmoji}${ev.message}`, type: ev.type }];
  }

  // Clear rat tip after event resolution if it was due
  if (p.rat.pendingTip && p.rat.pendingTip.turnsUntil <= 0) {
    p.rat = { ...p.rat, pendingTip: null };
  }

  // ── Forecast (vague hint about next turn's activity) ──
  p.forecast = null;
  if (C(0.40)) {
    const forecastRegion = REGIONS[R(0, REGIONS.length - 1)];
    const accurate = C(0.60);
    if (accurate) {
      const eligible = EVENTS.filter(e => !e.regionId || e.regionId === forecastRegion.id);
      if (eligible.length > 0) {
        const fev = eligible[R(0, eligible.length - 1)];
        p.forecast = { regionId: forecastRegion.id, type: fev.type };
      }
    } else {
      p.forecast = { regionId: forecastRegion.id, type: C(0.5) ? 'spike' : 'crash' };
    }
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

    // Settlement at gang's origin location
    if (p.location === p.consignment.originLocation) {
      if (p.consignment.turnsLeft <= 0) {
        // Overdue — forced settlement, no choice
        const isOverdue = true;
        const settlement = settleConsignment(p, isOverdue);
        const sp = settlement.player;
        sp.cops = null;
        if (sp.fingers <= 0 || sp.hp <= 0) {
          return { player: sp, phase: 'end', effects: [...effects, ...settlement.effects], notifications };
        }
        Object.assign(p, sp);
        effects.push(...settlement.effects);
      } else {
        // On time — offer settlement as a choice
        const con = p.consignment;
        const remaining = con.amountOwed - con.amountPaid;
        const gang = GANGS.find(g => g.id === con.gangId);
        notifications.push({
          message: `${gang?.emoji || '🤝'} ${gang?.name || 'The gang'} is here. You owe $${remaining.toLocaleString()}. Settle via consignment panel.`,
          type: 'info',
        });
      }
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

  // ── Gang Loan countdown & interest ──
  if (p.gangLoan) {
    p.gangLoan = { ...p.gangLoan };
    // Interest compounds on remaining balance only
    const glRemaining = p.gangLoan.amountOwed - p.gangLoan.amountPaid;
    p.gangLoan.amountOwed = Math.round(p.gangLoan.amountOwed + glRemaining * p.gangLoan.interestRate);
    p.gangLoan.turnsLeft--;

    if (p.gangLoan.turnsLeft === 1) {
      const lGang = GANGS.find(g => g.id === p.gangLoan!.gangId);
      notifications.push({ message: `${lGang?.emoji || '💰'} LAST TURN to repay ${lGang?.name || 'the gang'}!`, type: 'danger' });
    }

    // Deadline day — warn player, let them pay manually this turn
    if (p.gangLoan.turnsLeft === 0) {
      const lGang = GANGS.find(g => g.id === p.gangLoan!.gangId);
      notifications.push({ message: `${lGang?.emoji || '💰'} ${lGang?.name || 'The gang'} loan is DUE NOW! Pay today or face consequences.`, type: 'danger' });
    }

    // Overdue — collector encounter or forced settlement
    if (p.gangLoan.turnsLeft < 0) {
      const overdueTurns = Math.abs(p.gangLoan.turnsLeft);
      const collectorChance = Math.min(0.50, 0.20 + overdueTurns * 0.10);
      if (C(collectorChance)) {
        const lGang = GANGS.find(g => g.id === p.gangLoan!.gangId);
        p.cops = {
          count: 1,
          bribeCost: Math.round((p.gangLoan.amountOwed - p.gangLoan.amountPaid) * 1.3),
          regionLaw: law,
          gangCollector: true,
          gangLoan: p.gangLoan,
        };
        effects.push({ type: 'haptic', style: 'heavy' });
        return { player: p, phase: 'cop', effects, notifications };
      }
      // No collector — auto-settle after grace period
      if (overdueTurns >= 3) {
        const settlement = settleGangLoan(p, true);
        Object.assign(p, settlement.player);
        effects.push(...settlement.effects);
        if (p.hp <= 0) return { player: p, phase: 'end', effects, notifications };
      }
    }
  }

  // ── Gang Mission tick ──
  if (p.gangMission) {
    p.gangMission = { ...p.gangMission, turnsLeft: p.gangMission.turnsLeft - 1 };
    // Check completion for delivery/supply at target
    if (p.gangMission.type === 'delivery' && p.gangMission.targetLocation === p.location && p.gangMission.drugId) {
      const mQty = p.gangMission.quantity || 0;
      const carried = p.inventory[p.gangMission.drugId] || 0;
      if (carried >= mQty) {
        // Complete delivery
        const newInv = { ...p.inventory, [p.gangMission.drugId]: carried - mQty };
        if (newInv[p.gangMission.drugId] <= 0) delete newInv[p.gangMission.drugId];
        p.inventory = newInv;
        p.gangRelations = { ...p.gangRelations, [p.gangMission.gangId]: (p.gangRelations[p.gangMission.gangId] ?? 0) + 5 };
        p.cash += R(1000, 3000);
        p.rep += 3;
        p.gangMissionsCompleted++;
        p.eventLog = [...p.eventLog, { day: p.day, message: `🎖️ Delivery complete! Gang pleased.`, type: 'mission' as const }];
        effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
        p.gangMission = null;
      }
    } else if (p.gangMission.type === 'supply' && p.gangMission.originLocation === p.location && p.gangMission.drugId) {
      const mQty = p.gangMission.quantity || 0;
      const carried = p.inventory[p.gangMission.drugId] || 0;
      if (carried >= mQty) {
        const drug = DRUGS.find(d => d.id === p.gangMission!.drugId);
        const drugValue = drug ? Math.round((drug.min + drug.max) / 2 * mQty * 1.5) : 3000;
        const newInv = { ...p.inventory, [p.gangMission.drugId]: carried - mQty };
        if (newInv[p.gangMission.drugId] <= 0) delete newInv[p.gangMission.drugId];
        p.inventory = newInv;
        p.gangRelations = { ...p.gangRelations, [p.gangMission.gangId]: (p.gangRelations[p.gangMission.gangId] ?? 0) + 5 };
        p.cash += drugValue;
        p.rep += 3;
        p.gangMissionsCompleted++;
        p.eventLog = [...p.eventLog, { day: p.day, message: `🎖️ Supply delivered! Got ${$(drugValue)}.`, type: 'mission' as const }];
        effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
        p.gangMission = null;
      }
    }
    // Fail check
    if (p.gangMission && p.gangMission.turnsLeft <= 0) {
      p.gangRelations = { ...p.gangRelations, [p.gangMission.gangId]: (p.gangRelations[p.gangMission.gangId] ?? 0) - 4 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `Mission failed. Gang disappointed.`, type: 'mission' as const }];
      effects.push({ type: 'haptic', style: 'warning' });
      p.gangMission = null;
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

  // ── Cops (rebalanced: capped probability, regional law, persona + gang favor + campaign) ──
  const curUsed = inventoryCount(p.inventory);
  const levelCopMod = gameMode === 'campaign' ? getLevelConfig(p.campaignLevel).copBaseModifier : 0;
  let copBase = 0.08 + (p.heat / 200) * 0.35 + law.encounterModifier - mods.copEncounterReduction + levelCopMod;
  // Gang favor: Trusted (-5% on their turf)
  const localGangForCops = GANGS.find(g => g.turf.includes(p.location));
  if (localGangForCops && getGangFavorTier(p.gangRelations[localGangForCops.id] ?? 0) >= 2) {
    copBase -= 0.05;
  }
  // Location modifier: copReduction
  const copLocObj = LOCATIONS.find(l => l.id === p.location);
  if (copLocObj?.modifier?.type === 'copReduction') {
    copBase -= copLocObj.modifier.value;
  }
  const copChance = Math.min(0.65, Math.max(0, copBase));
  if (C(copChance) && curUsed > 0) {
    const maxOfficers = Math.min(6, 2 + Math.floor(p.heat / 35) + law.aggressionBase);
    const count = R(1, Math.max(1, maxOfficers));
    const baseBribe = R(300, 1000);
    // Bribe cost scales logarithmically with wealth
    const wealthBribeScale = Math.max(1, Math.log10(Math.max(1, netWorth(p)) / 10_000));
    const bribeCost = Math.round(baseBribe * law.bribeMultiplier * wealthBribeScale);
    p.cops = { count, bribeCost, regionLaw: law };
    effects.push({ type: 'haptic', style: 'heavy' });
    return { player: p, phase: 'cop', effects, notifications };
  }

  // Mugging (persona + gang favor: Blood Brother = no mugging on turf)
  const localGangForMug = GANGS.find(g => g.turf.includes(p.location));
  const noMugging = localGangForMug && getGangFavorTier(p.gangRelations[localGangForMug.id] ?? 0) >= 3;
  if (!noMugging && C(0.07 * mods.muggingChanceMultiplier)) {
    const s = Math.round(p.cash * R(8, 28) / 100);
    p.cash -= s;
    p.eventLog = [...p.eventLog, { day: p.day, message: `Mugged! Lost $${s}!`, type: 'danger' }];
    effects.push({ type: 'shake' }, { type: 'haptic', style: 'warning' });
  }

  // Offers (consignment > mission > equipment), gated by campaign level
  p.offer = null;
  const conOffer = isFeatureEnabled(p.campaignLevel, 'gangConsignment', gameMode) ? generateConsignmentOffer(p, p.location) : null;
  if (conOffer) {
    p.offer = {
      type: 'consignment',
      drugId: conOffer.drugId,
      quantity: conOffer.quantity,
      amountOwed: conOffer.amountOwed,
      originLocation: p.location,
      gangId: conOffer.gangId,
    };
  } else {
    // Gang mission offer (lower priority than consignment)
    const missionOffer = isFeatureEnabled(p.campaignLevel, 'gangMissions', gameMode) ? generateGangMission(p, p.location, gameMode) : null;
    if (missionOffer) {
      p.offer = { type: 'mission', mission: missionOffer, gangId: missionOffer.gangId };
    } else if (!p.gun && C(0.14)) p.offer = { type: 'gun', price: R(300, 600) };
    else if (C(0.12)) { const sp = R(20, 35); p.offer = { type: 'coat', price: R(150, 400), space: sp }; }
    else if (!p.rat.hired && C(0.08) && p.rep >= 10) p.offer = { type: 'rat', rat: makeRat() };
    else if (isFeatureEnabled(p.campaignLevel, 'territoryPurchase', gameMode) && p.rep >= 25 && C(0.1) && !p.territories[p.location]) {
      const lg2 = GANGS.find(g => g.turf.includes(p.location));
      const terrCost = Math.round(R(3000, 12000) * mods.territoryDiscountMultiplier);
      if (!lg2 || (p.gangRelations[lg2.id] ?? 0) > 5) p.offer = { type: 'territory', locationId: p.location, cost: terrCost, tribute: R(100, 500) };
    }
  }

  // Milestones
  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;
  if (newMilestone) effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });

  // End check
  const daysLimit = DAYS_PER_LEVEL;
  if (p.day > daysLimit) {
    // Force-settle any active consignment (treated as overdue)
    if (p.consignment) {
      const cSettle = settleConsignment(p, true);
      Object.assign(p, cSettle.player);
      effects.push(...cSettle.effects);
    }
    // Force-settle any active gang loan (treated as overdue)
    if (p.gangLoan) {
      const lSettle = settleGangLoan(p, true);
      Object.assign(p, lSettle.player);
      effects.push(...lSettle.effects);
    }
    // Death check after forced settlements
    if (p.hp <= 0 || p.fingers <= 0) {
      if (p.fingers <= 0) p.eventLog = [...p.eventLog, { day: p.day, message: `You have nothing left.`, type: 'danger' }];
      return { player: p, phase: 'end', effects, notifications };
    }

    if (gameMode === 'campaign' && campaign) {
      const won = checkLevelWinCondition(p, campaign);
      if (won && p.campaignLevel < 3) {
        return { player: p, phase: 'levelComplete', effects, notifications };
      } else if (won && p.campaignLevel === 3) {
        return { player: p, phase: 'win', effects, notifications };
      } else {
        return { player: p, phase: 'end', effects, notifications };
      }
    } else {
      // Classic mode
      const phase = p.cash + p.bank >= p.debt ? 'win' : 'end';
      return { player: p, phase, effects, notifications };
    }
  }
  if (p.hp <= 0 || p.fingers <= 0) {
    if (p.fingers <= 0) p.eventLog = [...p.eventLog, { day: p.day, message: `You have nothing left.`, type: 'danger' }];
    return { player: p, phase: 'end', effects, notifications };
  }

  // Clamp gang relations to [-30, 40]
  for (const gid of Object.keys(p.gangRelations)) {
    p.gangRelations[gid] = Math.max(-30, Math.min(40, p.gangRelations[gid]));
  }

  return { player: p, phase: 'playing', effects, notifications };
}

// ── Hostile Gang Trade Block ──────────────────────────────
export function getBlockingGang(player: PlayerState, locationId: string): {name: string, id: string} | null {
  for (const gang of GANGS) {
    if (gang.turf.includes(locationId) && (player.gangRelations[gang.id] ?? 0) < -10) {
      return { name: gang.name, id: gang.id };
    }
  }
  return null;
}

// ── Trade (rebalanced heat) ───────────────────────────────
export interface TradeResult {
  player: PlayerState;
  effects: SideEffect[];
  blocked?: boolean;
  blockMessage?: string;
}

export function executeTrade(player: PlayerState, drugId: string, tradeType: 'buy' | 'sell', quantity: number | 'max'): TradeResult {
  const effects: SideEffect[] = [];
  const drug = DRUGS.find(d => d.id === drugId)!;
  const price = player.prices[drug.id] as number;
  if (!price) return { player, effects };

  // ── Hostile gang blocks trading on their turf ──
  const blocker = getBlockingGang(player, player.location);
  if (blocker) {
    return { player, effects, blocked: true, blockMessage: `${blocker.name} won't let you trade here. Pay tribute or build relations first.` };
  }

  const p = { ...player };
  const used = inventoryCount(p.inventory);
  const effectiveSpace = p.space - getFingerSpacePenalty(p.fingers);
  const free = effectiveSpace - used;

  // ── Location modifier lookup ──
  const tradeLoc = LOCATIONS.find(l => l.id === p.location);
  const locMod = tradeLoc?.modifier;

  if (tradeType === 'buy') {
    // Location modifier: buyDiscount
    let buyPrice = price;
    if (locMod?.type === 'buyDiscount') {
      const applies = !locMod.drugs || locMod.drugs.includes(drug.id);
      if (applies) buyPrice = Math.max(1, Math.round(price * (1 - locMod.value)));
    }

    const mx = Math.min(Math.floor(p.cash / buyPrice), free);
    const q = quantity === 'max' ? mx : Math.min(quantity, mx);
    if (q <= 0) return { player, effects };

    p.cash -= q * buyPrice;
    p.inventory = { ...p.inventory, [drug.id]: (p.inventory[drug.id] || 0) + q };
    const prevQty = player.inventory[drug.id] || 0;
    const prevAvg = player.averageCosts[drug.id] || 0;
    p.averageCosts = { ...p.averageCosts, [drug.id]: (prevAvg * prevQty + buyPrice * q) / (prevQty + q) };
    // Buy heat: ceil(qty * price / 15000) capped at 15 + persona
    const bMods = getPersonaModifiers(p.personaId);
    p.heat = Math.min(HEAT_CAP, p.heat + Math.round(Math.min(15, Math.ceil(q * buyPrice / 15000)) * bMods.heatGainMultiplier));
    p.trades++;

    // Track recent trades for price memory
    const buyRegion = getRegionForLocation(p.location)?.id || 'nyc';
    p.recentTrades = [...(p.recentTrades || []).filter(t => t.day >= p.day - 3), { day: p.day, drug: drug.id, qty: q, type: 'buy', region: buyRegion }];

    // Track trade log
    p.tradeLog = [...(p.tradeLog || []), { day: p.day, action: 'buy', drug: drug.id, qty: q, price: buyPrice, location: p.location }].slice(-50);

    effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'light' });
  } else {
    const own = p.inventory[drug.id] || 0;
    const q = quantity === 'max' ? own : Math.min(quantity, own);
    if (q <= 0) return { player, effects };

    const tMods = getPersonaModifiers(p.personaId);
    const fingerPenalty = getFingerSellPenalty(p.fingers);
    // Gang favor: Blood Brother = +10% sell on turf
    const localGangForSell = GANGS.find(g => g.turf.includes(p.location));
    const favorSellBonus = localGangForSell && getGangFavorTier(p.gangRelations[localGangForSell.id] ?? 0) >= 3 ? 0.10 : 0;
    // Location modifier: sellBonus
    let locSellBonus = 0;
    if (locMod?.type === 'sellBonus') {
      const applies = !locMod.drugs || locMod.drugs.includes(drug.id);
      if (applies) locSellBonus = locMod.value;
    }
    const rev = Math.round(q * price * (1 - fingerPenalty) * (1 + tMods.sellPriceBonus + favorSellBonus + locSellBonus));
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
      // Location modifier: repGain
      const locRepMult = locMod?.type === 'repGain' ? (1 + locMod.value) : 1;
      p.rep += Math.ceil((pnl / 4000) * p.combo * tMods.repGainMultiplier * locRepMult);
      const g = GANGS.find(x => x.turf.includes(p.location));
      if (g) p.gangRelations = { ...p.gangRelations, [g.id]: (p.gangRelations[g.id] ?? 0) + Math.round(1 * tMods.gangRelGainMultiplier) };
      // Track muscle mission progress
      if (p.gangMission && p.gangMission.type === 'muscle' && p.gangMission.targetLocation === p.location) {
        p.gangMission = { ...p.gangMission, sellProgress: (p.gangMission.sellProgress || 0) + rev };
        if (p.gangMission.sellProgress! >= (p.gangMission.sellTarget || 0)) {
          p.gangRelations = { ...p.gangRelations, [p.gangMission.gangId]: (p.gangRelations[p.gangMission.gangId] ?? 0) + 6 };
          p.rep += 5;
          // Damage target gang relations
          const targetGang = GANGS.find(x => x.turf.includes(p.gangMission!.targetLocation!));
          if (targetGang) p.gangRelations = { ...p.gangRelations, [targetGang.id]: (p.gangRelations[targetGang.id] ?? 0) - 8 };
          p.gangMissionsCompleted++;
          p.eventLog = [...p.eventLog, { day: p.day, message: `🎖️ Muscle mission complete! Caused enough trouble.`, type: 'mission' as const }];
          p.gangMission = null;
        }
      }
      effects.push({ type: 'sfx', sound: pnl > 5000 ? 'big' : 'sell' }, { type: 'haptic', style: 'success' });
    } else {
      p.streak = 0;
      p.combo = 1;
      effects.push({ type: 'sfx', sound: 'miss' }, { type: 'haptic', style: 'warning' });
    }
    p.trades++;
    // Sell heat: ceil(rev / 20000) capped at 12 + persona
    p.heat = Math.min(HEAT_CAP, p.heat + Math.round(Math.min(12, Math.ceil(rev / 20000)) * tMods.heatGainMultiplier));

    // Track recent trades for price memory
    const sellRegion = getRegionForLocation(p.location)?.id || 'nyc';
    p.recentTrades = [...(p.recentTrades || []).filter(t => t.day >= p.day - 3), { day: p.day, drug: drug.id, qty: q, type: 'sell', region: sellRegion }];

    // Track trade log (with profit for sells)
    p.tradeLog = [...(p.tradeLog || []), { day: p.day, action: 'sell', drug: drug.id, qty: q, price, location: p.location, profit: pnl }].slice(-50);
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
  phase: 'playing' | 'cop' | 'end';
  effects: SideEffect[];
}

export function copAction(player: PlayerState, action: 'run' | 'fight' | 'bribe'): CopResult {
  // Delegate to bounty hunter logic if applicable
  if (player.cops?.bountyHunter) {
    const bhAction = action === 'bribe' ? 'pay' : action;
    return bountyHunterAction(player, bhAction as 'pay' | 'fight' | 'run');
  }
  // Delegate to gang collector logic if applicable
  if (player.cops?.gangCollector) {
    const gcAction = action === 'bribe' ? 'pay' : action;
    return gangCollectorAction(player, gcAction as 'pay' | 'fight' | 'run');
  }

  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const c = p.cops!;
  const law = c.regionLaw || DEFAULT_LAW;
  const cMods = getPersonaModifiers(p.personaId);

  if (action === 'run') {
    // Regional behavior modifiers + persona
    let runChance = p.gun ? 0.55 : 0.38;
    runChance += cMods.copRunChanceBonus;
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
    // Multi-round: resolve ONE cop per round
    let killChance = (p.gun ? 0.45 : 0.15) + cMods.copFightKillBonus;
    let dmMin = p.gun ? 5 : 12;
    let dmMax = p.gun ? 15 : 30;
    if (law.behavior === 'corrupt') { dmMin = Math.max(1, dmMin - 3); dmMax -= 5; }
    if (law.behavior === 'methodical') { killChance -= 0.05; dmMin += 3; dmMax += 5; }

    const roundNum = (c.roundsCompleted || 0) + 1;

    if (C(killChance)) {
      // Killed one cop
      const newCount = c.count - 1;
      p.heat = Math.min(HEAT_CAP, p.heat + Math.min(15, 5 + 3));
      p.rep += 8;
      if (law.behavior === 'brutal') p.rep += 3;
      p.closeCallCount++;
      effects.push({ type: 'shake' });

      if (newCount <= 0) {
        // All cops down
        p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} Took down all ${law.forceName}!`, type: 'danger' }];
        p.cops = null;
        if (p.hp <= 0) return { player: p, phase: 'end', effects };
        return { player: p, phase: 'playing', effects };
      } else {
        // Cops remain — stay in combat
        const lastResult = `Took down 1 officer! ${newCount} remaining.`;
        p.cops = { ...c, count: newCount, lastResult, roundsCompleted: roundNum };
        p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} Took down 1 ${law.forceName}! ${newCount} left.`, type: 'danger' }];
        if (p.hp <= 0) return { player: p, phase: 'end', effects };
        return { player: p, phase: 'cop', effects };
      }
    } else {
      // Took damage
      let dm = R(dmMin, dmMax);
      dm = Math.round(dm * (1 - cMods.fightDamageReduction));
      p.hp -= dm;
      p.heat = Math.min(HEAT_CAP, p.heat + 5);
      p.closeCallCount++;
      effects.push({ type: 'shake' });

      const lastResult = `Took ${dm} damage! ${c.count} officer${c.count > 1 ? 's' : ''} still standing.`;
      p.cops = { ...c, lastResult, roundsCompleted: roundNum };
      p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} ${law.forceName} hit you for ${dm} damage!${dm > 20 ? ' Hurt bad.' : ''}`, type: 'danger' }];
      if (p.hp <= 0) return { player: p, phase: 'end', effects };
      return { player: p, phase: 'cop', effects };
    }
  } else {
    // Bribe (persona modifier on cost)
    const amt = Math.round(c.bribeCost * c.count * cMods.bribeCostMultiplier);
    if (p.cash >= amt) {
      p.cash -= amt;
      // Methodical: bribe reduces more heat (-15), others: -12
      const heatReduce = law.behavior === 'methodical' ? 15 : 12;
      p.heat = Math.max(0, p.heat - heatReduce);
      p.eventLog = [...p.eventLog, { day: p.day, message: `${law.forceEmoji} Bribed ${law.forceName} for $${amt}.`, type: 'info' }];
    } else {
      // Can't afford bribe — stay in encounter
      return { player: p, phase: 'cop', effects: [] };
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
    p.territories = { ...p.territories, [o.locationId!]: { tribute: o.tribute!, acquiredDay: p.day, stash: {} } };
    p.rep += 15;
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
    const loc = LOCATIONS.find(l => l.id === o.locationId);
    p.eventLog = [...p.eventLog, { day: p.day, message: `🏴 Claimed ${loc?.name}! +$${o.tribute}/day`, type: 'info' }];
  } else if (o.type === 'consignment') {
    // Guard: cannot accept if already have active consignment
    if (p.consignment) return { player: p, effects };
    const drug = DRUGS.find(d => d.id === o.drugId!)!;
    const gang = GANGS.find(g => g.id === o.gangId!)!;
    // Space check — cap at available space
    const conFree = effectiveSpace(p) - inventoryCount(p.inventory);
    const conQty = Math.min(o.quantity!, Math.max(0, conFree));
    if (conQty <= 0) return { player: p, effects };
    // Add drugs to inventory (capped at available space)
    p.inventory = { ...p.inventory, [o.drugId!]: (p.inventory[o.drugId!] || 0) + conQty };
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
  } else if (o.type === 'mission' && o.mission) {
    const gang = GANGS.find(g => g.id === o.gangId!)!;
    // For tribute missions, check affordability BEFORE assigning
    if (o.mission.type === 'tribute' && o.mission.cashAmount) {
      if (p.cash >= o.mission.cashAmount) {
        p.cash -= o.mission.cashAmount;
        p.gangRelations = { ...p.gangRelations, [o.gangId!]: (p.gangRelations[o.gangId!] ?? 0) + 4 };
        p.rep += 2;
        p.gangMissionsCompleted++;
        p.eventLog = [...p.eventLog, { day: p.day, message: `🎖️ Paid tribute to ${gang.name}. Respect earned.`, type: 'mission' as const }];
        effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
      }
      // If can't afford, don't assign — just decline silently
    } else if (o.mission.type === 'delivery' && o.mission.drugId && o.mission.quantity) {
      p.gangMission = { ...o.mission };
      // Gang gives you the drugs for delivery (capped at available space)
      const mFree = effectiveSpace(p) - inventoryCount(p.inventory);
      const mQty = Math.min(o.mission.quantity, Math.max(0, mFree));
      if (mQty <= 0) return { player: p, effects }; // No space — decline
      p.inventory = { ...p.inventory, [o.mission.drugId]: (p.inventory[o.mission.drugId] || 0) + mQty };
      p.eventLog = [...p.eventLog, { day: p.day, message: `📦 ${gang.name} gave you ${o.mission.quantity} ${DRUGS.find(d => d.id === o.mission!.drugId)?.emoji || ''} to deliver.`, type: 'mission' as const }];
      effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'medium' });
    } else {
      p.gangMission = { ...o.mission };
      p.eventLog = [...p.eventLog, { day: p.day, message: `🎖️ Accepted mission from ${gang.name}.`, type: 'mission' as const }];
      effects.push({ type: 'haptic', style: 'medium' });
    }
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
  // Cap total shark debt at 3x starting debt (minimum $12K)
  const maxDebt = Math.max(12000, p.debt * 3);
  const room = Math.max(0, maxDebt - p.debt);
  const v = Math.min(Math.max(0, amount), room);
  if (v <= 0) return player;
  p.cash += v;
  p.debt += v;
  return p;
}

// ── Consignment: Manual Payment ─────────────────────────
export function payConsignment(player: PlayerState, amount: number | 'all'): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  if (!player.consignment) return { player, effects };

  const p = { ...player };
  const con = { ...p.consignment! };
  const remaining = con.amountOwed - con.amountPaid;
  const payment = amount === 'all' ? Math.min(p.cash, remaining) : Math.min(amount, p.cash, remaining);

  if (payment <= 0) return { player, effects };

  p.cash -= payment;
  con.amountPaid += payment;

  if (con.amountPaid >= con.amountOwed) {
    // Fully paid remotely — clean settlement
    p.consignment = null;
    p.consignmentsCompleted++;
    const gang = GANGS.find(g => g.id === con.gangId);
    p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) + 5 };
    p.eventLog = [...p.eventLog, { day: p.day, message: `${gang?.emoji || '🤝'} Paid off ${gang?.name || 'the gang'} in full.`, type: 'consignment' as const }];
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });

    const { milestones, newMilestone } = checkMilestones(p);
    p.milestones = milestones;
    p.newMilestone = newMilestone;
  } else {
    p.consignment = con;
    effects.push({ type: 'haptic', style: 'light' });
  }

  return { player: p, effects };
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

// ── Stash Operations ─────────────────────────────────────
export function stashDrug(player: PlayerState, drugId: string, quantity: number): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  const p = { ...player };
  const territory = p.territories[p.location];
  if (!territory) return { player, effects };

  const stash = territory.stash || {};
  const currentStashCount = Object.values(stash).reduce((a, b) => a + b, 0);
  const available = STASH_CAPACITY - currentStashCount;
  const owned = p.inventory[drugId] || 0;
  const qty = Math.min(quantity, owned, available);
  if (qty <= 0) return { player, effects };

  const newInv = { ...p.inventory, [drugId]: owned - qty };
  if (newInv[drugId] <= 0) delete newInv[drugId];
  p.inventory = newInv;

  const newStash = { ...stash, [drugId]: (stash[drugId] || 0) + qty };
  p.territories = { ...p.territories, [p.location]: { ...territory, stash: newStash } };

  effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'light' });
  return { player: p, effects };
}

export function retrieveDrug(player: PlayerState, drugId: string, quantity: number): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  const p = { ...player };
  const territory = p.territories[p.location];
  if (!territory) return { player, effects };

  const stash = territory.stash || {};
  const stashed = stash[drugId] || 0;
  const freeSpace = effectiveSpace(p) - inventoryCount(p.inventory);
  const qty = Math.min(quantity, stashed, freeSpace);
  if (qty <= 0) return { player, effects };

  p.inventory = { ...p.inventory, [drugId]: (p.inventory[drugId] || 0) + qty };

  const newStash = { ...stash, [drugId]: stashed - qty };
  if (newStash[drugId] <= 0) delete newStash[drugId];
  p.territories = { ...p.territories, [p.location]: { ...territory, stash: newStash } };

  effects.push({ type: 'sfx', sound: 'sell' }, { type: 'haptic', style: 'light' });
  return { player: p, effects };
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

  // Weight toward expensive drugs (exclude rare)
  const normalDrugs = DRUGS.filter(d => !d.rare);
  const weights = normalDrugs.map(d => ({ drug: d, weight: d.tier * d.tier }));
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = weights[0].drug;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) { picked = w.drug; break; }
  }

  // Quantity based on tier (L3 campaign: +50%)
  const conCapMult = player.campaignLevel === 3 ? getLevelConfig(3).consignmentCapMultiplier : 1;
  let quantity: number;
  if (picked.tier === 3) quantity = Math.round(R(3, 8) * conCapMult);
  else if (picked.tier === 2) quantity = Math.round(R(5, 15) * conCapMult);
  else quantity = Math.round(R(10, 30) * conCapMult);

  const wholesale = Math.round((picked.min + picked.max) / 2);
  const pMods = getPersonaModifiers(player.personaId);
  // Gang favor: Friendly = 10% off consignment markup on their turf
  const favorDiscount = getGangFavorTier(player.gangRelations[gang.id] ?? 0) >= 1 ? 0.9 : 1.0;
  const markup = CONSIGNMENT_MARKUP * pMods.consignmentMarkupMultiplier * favorDiscount;
  const amountOwed = wholesale * markup * quantity;

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

    // Check if player covered enough (at least 50% of penalty via cash + drugs)
    const totalPaid = penalty - Math.max(0, toPay);
    if (totalPaid >= penalty * 0.5) {
      p.consignment = null;
      p.consignmentsCompleted++;
      p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) - 2 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `🤝 Paid off ${gangName}'s bounty hunter. Debt settled.`, type: 'consignment' as const }];
    } else {
      // Not enough — they take what you have AND a finger
      p.fingers = Math.max(0, p.fingers - 1);
      if (p.fingers <= 4) p.gun = false;
      p.gangRelations = { ...p.gangRelations, [con.gangId]: (p.gangRelations[con.gangId] ?? 0) - 5 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `✂️ ${gangName}'s hunter took what you had and a finger. Still owe them.`, type: 'consignment' as const }];
      effects.push({ type: 'shake' });
    }
  } else if (action === 'fight') {
    // Harder than cops: gun = 35% kill chance, no gun = 10% (+ persona bonus)
    const bhMods = getPersonaModifiers(p.personaId);
    const killChance = (p.gun ? 0.35 : 0.10) + bhMods.copFightKillBonus;
    if (C(killChance)) {
      // Win — bounty hunter gone, but consignment still active (just safe for a while)
      // We mark turnsLeft to give 3 turns of breathing room
      p.consignment = { ...con, turnsLeft: 3 }; // grace turns before overdue again
      p.heat = Math.min(HEAT_CAP, p.heat + 12);
      p.rep += 10;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Fought off ${gangName}'s bounty hunter! They'll be back...`, type: 'consignment' as const }];
    } else {
      // Lose — finger + HP + they take some goods
      p.fingers = Math.max(0, p.fingers - 1);
      p.hp -= Math.round(R(15, 30) * (1 - bhMods.fightDamageReduction));
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
    // Run — 35% success (+ persona bonus)
    const bhRunMods = getPersonaModifiers(p.personaId);
    if (C(0.35 + bhRunMods.copRunChanceBonus)) {
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

// ── Gang Loan: Borrowing Cap ─────────────────────────────
export function getGangLoanCap(player: PlayerState, gangId: string): number {
  const rel = player.gangRelations[gangId] ?? 0;
  if (rel < GANG_LOAN_MIN_RELATIONS) return 0;
  // Gang favor: Trusted = +$3K cap
  const favorBonus = getGangFavorTier(rel) >= 2 ? 3000 : 0;
  const baseCap = Math.min(GANG_LOAN_MAX_CAP, GANG_LOAN_BASE_CAP + Math.max(0, rel) * GANG_LOAN_CAP_PER_REL + favorBonus);
  // L3 campaign: +50% loan cap
  const levelMultiplier = player.campaignLevel === 3 ? getLevelConfig(3).gangLoanCapMultiplier : 1;
  return Math.round(baseCap * levelMultiplier);
}

// ── Gang Loan: Borrow ────────────────────────────────────
export function borrowFromGang(player: PlayerState, gangId: string, amount: number): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  if (player.gangLoan) return { player, effects };
  const cap = getGangLoanCap(player, gangId);
  const v = Math.min(amount, cap);
  if (v <= 0) return { player, effects };

  const p = { ...player };
  p.cash += v;
  p.gangLoan = {
    gangId,
    principal: v,
    amountOwed: v,
    amountPaid: 0,
    turnsLeft: GANG_LOAN_TURNS,
    originLocation: p.location,
    interestRate: GANG_LOAN_INTEREST,
  };
  const gang = GANGS.find(g => g.id === gangId);
  p.eventLog = [...p.eventLog, { day: p.day, message: `💰 Borrowed ${$(v)} from ${gang?.name || 'gang'}. 15%/turn interest, 4 turns.`, type: 'gangLoan' as const }];
  effects.push({ type: 'sfx', sound: 'buy' }, { type: 'haptic', style: 'medium' });
  return { player: p, effects };
}

// ── Gang Loan: Pay ───────────────────────────────────────
export function payGangLoan(player: PlayerState, amount: number | 'all'): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  if (!player.gangLoan) return { player, effects };

  const p = { ...player };
  const loan = { ...p.gangLoan! };
  const remaining = loan.amountOwed - loan.amountPaid;
  const payment = amount === 'all' ? Math.min(p.cash, remaining) : Math.min(amount, p.cash, remaining);

  if (payment <= 0) return { player, effects };

  p.cash -= payment;
  loan.amountPaid += payment;

  if (loan.amountPaid >= loan.amountOwed) {
    // Fully paid — early full payment bonus
    const gang = GANGS.find(g => g.id === loan.gangId);
    p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) + (loan.turnsLeft > 0 ? 5 : 3) };
    p.gangLoan = null;
    p.gangLoansRepaid++;
    p.eventLog = [...p.eventLog, { day: p.day, message: `💸 Paid off ${gang?.name || 'gang'} loan in full.`, type: 'gangLoan' as const }];
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });

    const { milestones, newMilestone } = checkMilestones(p);
    p.milestones = milestones;
    p.newMilestone = newMilestone;
  } else {
    p.gangLoan = loan;
    effects.push({ type: 'haptic', style: 'light' });
  }

  return { player: p, effects };
}

// ── Gang Loan: Settlement ────────────────────────────────
export function settleGangLoan(player: PlayerState, isOverdue: boolean): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  const p = { ...player };
  const loan = p.gangLoan!;
  const gang = GANGS.find(g => g.id === loan.gangId);
  const gangName = gang?.name || 'The gang';

  // Auto-pay what we can
  const remaining = loan.amountOwed - loan.amountPaid;
  const cashPay = Math.min(p.cash, remaining);
  p.cash -= cashPay;
  const totalPaid = loan.amountPaid + cashPay;
  const percentPaid = totalPaid / loan.amountOwed;

  if (percentPaid >= 1.0 && !isOverdue) {
    p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) + 5 };
    p.eventLog = [...p.eventLog, { day: p.day, message: `💸 ${gangName} satisfied. Loan cleared.`, type: 'gangLoan' as const }];
    effects.push({ type: 'sfx', sound: 'level' }, { type: 'haptic', style: 'success' });
  } else if (percentPaid >= 0.7) {
    const relPenalty = isOverdue ? -8 : -5;
    p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) + relPenalty };
    // Lose inventory value
    const invLossPercent = isOverdue ? 0.15 : 0.10;
    const invKeys = Object.keys(p.inventory);
    for (const k of invKeys) {
      const lose = Math.ceil((p.inventory[k] || 0) * invLossPercent);
      if (lose > 0) {
        p.inventory = { ...p.inventory, [k]: (p.inventory[k] || 0) - lose };
        if (p.inventory[k] <= 0) delete p.inventory[k];
      }
    }
    p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName} took some product. 'Close enough.'`, type: 'gangLoan' as const }];
    effects.push({ type: 'shake' }, { type: 'haptic', style: 'warning' });
  } else {
    const relPenalty = isOverdue ? -15 : -10;
    p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) + relPenalty };
    const cashLossPercent = isOverdue ? 0.40 : 0.25;
    p.cash = Math.round(p.cash * (1 - cashLossPercent));
    const hpLoss = isOverdue ? R(15, 30) : R(10, 20);
    p.hp -= hpLoss;
    if (isOverdue) p.heat = Math.min(HEAT_CAP, p.heat + 15);
    p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName} beat you down. 'You're pathetic.'`, type: 'gangLoan' as const }];
    effects.push({ type: 'shake' }, { type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'error' });
  }

  p.gangLoan = null;
  // Only count as "repaid" if at least 70% was covered
  if (percentPaid >= 0.7) p.gangLoansRepaid++;

  const { milestones, newMilestone } = checkMilestones(p);
  p.milestones = milestones;
  p.newMilestone = newMilestone;

  return { player: p, effects };
}

// ── Gang Collector Action ────────────────────────────────
export function gangCollectorAction(player: PlayerState, action: 'pay' | 'fight' | 'run'): CopResult {
  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const loan = p.gangLoan!;
  const gang = GANGS.find(g => g.id === loan.gangId);
  const gangName = gang?.name || 'The gang';
  const cMods = getPersonaModifiers(p.personaId);

  if (action === 'pay') {
    // Pay 1.3x remaining — cash first, then inventory
    const remaining = loan.amountOwed - loan.amountPaid;
    const penalty = Math.round(remaining * 1.3);
    let toPay = penalty;

    const cashPay = Math.min(p.cash, toPay);
    p.cash -= cashPay;
    toPay -= cashPay;

    // Take inventory if cash insufficient
    if (toPay > 0) {
      for (const drugId of Object.keys(p.inventory)) {
        if (toPay <= 0) break;
        const qty = p.inventory[drugId] || 0;
        if (qty <= 0) continue;
        const price = (p.prices[drugId] as number) || DRUGS.find(d => d.id === drugId)!.min;
        const unitsNeeded = Math.ceil(toPay / price);
        const unitsToTake = Math.min(qty, unitsNeeded);
        const newInv = { ...p.inventory, [drugId]: qty - unitsToTake };
        if (newInv[drugId] <= 0) delete newInv[drugId];
        p.inventory = newInv;
        toPay -= unitsToTake * price;
      }
    }

    p.gangLoan = null;
    p.gangLoansRepaid++;
    p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) - 2 };
    p.eventLog = [...p.eventLog, { day: p.day, message: `💸 Paid off ${gangName}'s collector. Debt settled.`, type: 'gangLoan' as const }];
  } else if (action === 'fight') {
    const killChance = (p.gun ? 0.30 : 0.10) + cMods.copFightKillBonus;
    if (C(killChance)) {
      // Win — 2 turn grace
      p.gangLoan = { ...loan, turnsLeft: 2 };
      p.heat = Math.min(HEAT_CAP, p.heat + 8);
      p.rep += 5;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Fought off ${gangName}'s collector! They'll be back...`, type: 'gangLoan' as const }];
    } else {
      // Lose
      const dm = Math.round(R(10, 25) * (1 - cMods.fightDamageReduction));
      p.hp -= dm;
      const cashLoss = Math.round(p.cash * R(30, 50) / 100);
      p.cash -= cashLoss;
      p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) - 5 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName}'s collector beat you down. Lost $${cashLoss.toLocaleString()}.`, type: 'gangLoan' as const }];
      effects.push({ type: 'shake' });
    }
  } else {
    // Run — 30%
    const runChance = 0.30 + cMods.copRunChanceBonus;
    if (C(runChance)) {
      p.eventLog = [...p.eventLog, { day: p.day, message: `Escaped ${gangName}'s collector! For now...`, type: 'gangLoan' as const }];
      p.closeCallCount++;
    } else {
      const cashLoss = Math.round(p.cash * 0.20);
      p.cash -= cashLoss;
      p.gangRelations = { ...p.gangRelations, [loan.gangId]: (p.gangRelations[loan.gangId] ?? 0) - 3 };
      p.eventLog = [...p.eventLog, { day: p.day, message: `Caught by ${gangName}'s collector! Lost $${cashLoss.toLocaleString()}.`, type: 'gangLoan' as const }];
      effects.push({ type: 'shake' });
    }
  }

  p.cops = null;
  if (p.hp <= 0) return { player: p, phase: 'end', effects };
  return { player: p, phase: 'playing', effects };
}

// ── Gang Mission Generation ──────────────────────────────
export function generateGangMission(player: PlayerState, location: string, gameMode: 'campaign' | 'classic' = 'classic'): GangMission | null {
  if (player.gangMission) return null;
  if (player.rep < 10) return null;

  const gang = GANGS.find(g => g.turf.includes(location));
  if (!gang) return null;
  if ((player.gangRelations[gang.id] ?? 0) < -5) return null;
  if (!C(0.20)) return null;

  const types: Array<'delivery' | 'tribute' | 'muscle' | 'supply'> = ['delivery', 'tribute', 'muscle', 'supply'];
  const mType = types[R(0, types.length - 1)];

  // Pick a random target city (different from current, in available regions)
  const otherLocs = LOCATIONS.filter(l => l.id !== location && isRegionAvailable(player.campaignLevel, getRegionForLocation(l.id)?.id || 'nyc', gameMode));
  if (otherLocs.length === 0) return null;
  const targetLoc = otherLocs[R(0, otherLocs.length - 1)];

  // Pick a non-rare drug
  const normalDrugs = DRUGS.filter(d => !d.rare);
  const drug = normalDrugs[R(0, normalDrugs.length - 1)];

  switch (mType) {
    case 'delivery': {
      const dQty = R(3, 8);
      return {
        type: 'delivery', gangId: gang.id,
        description: `Deliver ${dQty} ${drug.emoji} ${drug.name} to ${targetLoc.name}`,
        targetLocation: targetLoc.id, drugId: drug.id, quantity: dQty,
        turnsLeft: 3, originLocation: location,
      };
    }
    case 'tribute':
      const amt = R(5, 20) * 100;
      return {
        type: 'tribute', gangId: gang.id,
        description: `Pay ${$(amt)} tribute`,
        cashAmount: amt, turnsLeft: 1, originLocation: location,
      };
    case 'muscle': {
      // Find a location on different gang's turf (in available regions)
      const otherGangs = GANGS.filter(g => g.id !== gang.id && g.turf.length > 0 && g.turf.some(t => isRegionAvailable(player.campaignLevel, getRegionForLocation(t)?.id || 'nyc', gameMode)));
      if (otherGangs.length === 0) return null;
      const targetGang = otherGangs[R(0, otherGangs.length - 1)];
      const targetTurf = targetGang.turf[R(0, targetGang.turf.length - 1)];
      const sellTarget = R(3, 8) * 1000;
      return {
        type: 'muscle', gangId: gang.id,
        description: `Sell ${$(sellTarget)} worth at ${LOCATIONS.find(l => l.id === targetTurf)?.name || targetTurf}`,
        targetLocation: targetTurf, sellTarget, sellProgress: 0,
        turnsLeft: 3, originLocation: location,
      };
    }
    case 'supply': {
      const sQty = R(3, 10);
      return {
        type: 'supply', gangId: gang.id,
        description: `Bring ${sQty} ${drug.emoji} ${drug.name} back here`,
        drugId: drug.id, quantity: sQty,
        turnsLeft: 3, originLocation: location,
      };
    }
  }
}

// ── Campaign: Check Level Win Condition ──────────────────
export function checkLevelWinCondition(player: PlayerState, campaign: CampaignState): boolean {
  const config = getLevelConfig(campaign.level);
  const wc = config.winCondition;
  const nw = netWorth(player);
  const terrCount = Object.keys(player.territories).length;

  if (wc.minNetWorth > 0 && nw < wc.minNetWorth) return false;
  if (wc.debtFree && player.debt > 0) return false;
  if (wc.minRep && player.rep < wc.minRep) return false;
  if (wc.minTerritories && terrCount < wc.minTerritories) return false;
  if (wc.bloodBrother && !Object.values(player.gangRelations).some(v => v >= 25)) return false;
  if (wc.defeatedGangs && campaign.gangWar.defeatedGangs.length < wc.defeatedGangs) return false;

  return true;
}

// ── Campaign: Level Transition State ─────────────────────
export function createLevelTransitionState(player: PlayerState, nextLevel: CampaignLevel): PlayerState {
  const config = getLevelConfig(nextLevel);
  const p = { ...player };

  // Carry over: cash, bank, inventory, space, gun, rep, gangRelations, territories, rat, fingers, milestones, persona, cumulative stats
  // Reset: day, debt, heat, prices, eventLog, offer, cops, consignment, gangLoan, gangMission, streak, combo, forecast

  p.day = 1;
  p.debt = Math.round(config.startingDebt * getPersonaModifiers(p.personaId).startingDebtMultiplier);
  p.heat = 0;
  p.hp = Math.min(100, p.hp + 30); // heal +30, cap 100
  p.campaignLevel = nextLevel;
  p.offer = null;
  p.cops = null;
  p.consignment = null;
  p.gangLoan = null;
  p.gangMission = null;
  p.streak = 0;
  p.combo = 1;
  p.forecast = null;
  p.currentEvent = null;
  p.nearMisses = [];
  p.recentSold = [];
  p.recentTrades = [];
  p.priceHistory = {};
  p.tradeLog = [];
  p.eventLog = [{ day: 1, message: `Level ${nextLevel}: ${config.name} begins!`, type: 'levelUp' as const }];

  // Regenerate prices for current location
  const regionId = getRegionForLocation(p.location)?.id || 'nyc';
  const ev = selectEvent(regionId, null, 0.35);
  p.prices = generatePrices(p.location, ev, nextLevel, 'campaign');
  p.previousPrices = {};
  p.currentEvent = ev;
  if (ev) p.eventLog.push({ day: 1, message: ev.message, type: ev.type });

  return p;
}

// ── Campaign: Default Campaign State ─────────────────────
export function createDefaultCampaignState(mode: 'campaign' | 'classic' = 'classic'): CampaignState {
  return {
    level: 1,
    mode,
    campaignStats: {
      totalDaysPlayed: 0,
      totalProfit: 0,
      levelsCompleted: 0,
      levelScores: [],
    },
    gangWar: {
      defeatedGangs: [],
      activeWar: null,
      pendingRaid: null,
    },
  };
}

// ── Campaign: Gang War Functions ─────────────────────────
export function declareGangWar(player: PlayerState, campaign: CampaignState, gangId: string): { player: PlayerState; campaign: CampaignState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  // Guard: can't declare if already at war
  if (campaign.gangWar.activeWar) return { player, campaign, effects };
  // Guard: can't declare on already-defeated gang
  if (campaign.gangWar.defeatedGangs.includes(gangId)) return { player, campaign, effects };

  const p = { ...player };
  const c = { ...campaign, gangWar: { ...campaign.gangWar } };
  const gang = GANGS.find(g => g.id === gangId);

  p.gangRelations = { ...p.gangRelations, [gangId]: -30 };
  c.gangWar.activeWar = {
    targetGangId: gangId,
    playerStrength: 100,
    gangStrength: 100,
    battlesWon: 0,
    battlesLost: 0,
  };

  p.eventLog = [...p.eventLog, { day: p.day, message: `War declared on ${gang?.name || 'gang'}!`, type: 'gangWar' as const }];
  effects.push({ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' });

  return { player: p, campaign: c, effects };
}

export function gangWarBattleAction(player: PlayerState, campaign: CampaignState, action: 'fight' | 'retreat' | 'negotiate'): { player: PlayerState; campaign: CampaignState; phase: 'playing' | 'cop' | 'end'; effects: SideEffect[] } {
  const effects: SideEffect[] = [{ type: 'sfx', sound: 'bad' }, { type: 'haptic', style: 'heavy' }];
  const p = { ...player };
  const c = { ...campaign, gangWar: { ...campaign.gangWar, activeWar: campaign.gangWar.activeWar ? { ...campaign.gangWar.activeWar } : null } };
  const war = c.gangWar.activeWar;
  if (!war) { p.cops = null; return { player: p, campaign: c, phase: 'playing', effects }; }

  const gang = GANGS.find(g => g.id === war.targetGangId);
  const gangName = gang?.name || 'The gang';
  const battle = p.cops?.gangWarBattle;
  const roundNum = (p.cops?.roundsCompleted || 0) + 1;

  if (action === 'fight') {
    const winChance = p.gun ? 0.35 : 0.15;
    if (C(winChance)) {
      // Win round
      const dmg = R(15, 25);
      war.gangStrength = Math.max(0, war.gangStrength - dmg);
      war.battlesWon++;
      p.rep += 5;
      p.heat = Math.min(HEAT_CAP, p.heat + 8);
      effects.push({ type: 'haptic', style: 'success' });

      // Check gang defeat
      if (war.gangStrength <= 0) {
        c.gangWar.defeatedGangs = [...c.gangWar.defeatedGangs, war.targetGangId];
        c.gangWar.activeWar = null;
        p.rep += 15;
        p.cash += 5000;
        p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName} DEFEATED! +$5K bonus, +15 rep`, type: 'gangWar' as const }];
        effects.push({ type: 'sfx', sound: 'level' });
        p.cops = null;
        return { player: p, campaign: c, phase: 'playing', effects };
      } else {
        // Gang still alive — stay in combat
        const lastResult = `Hit ${gangName}! Strength down to ${war.gangStrength}%.`;
        p.eventLog = [...p.eventLog, { day: p.day, message: `Won round vs ${gangName}! Their strength: ${war.gangStrength}%`, type: 'gangWar' as const }];
        p.cops = p.cops ? {
          ...p.cops,
          gangWarBattle: { ...p.cops.gangWarBattle!, enemyStrength: war.gangStrength },
          lastResult,
          roundsCompleted: roundNum,
        } : null;
        if (p.hp <= 0) return { player: p, campaign: c, phase: 'end', effects };
        return { player: p, campaign: c, phase: 'cop', effects };
      }
    } else {
      // Lose round — take damage but stay in combat
      war.battlesLost++;
      const hpLoss = R(10, 25);
      p.hp -= hpLoss;
      const cashLoss = Math.round(p.cash * 0.20);
      p.cash -= cashLoss;
      const lastResult = `Took ${hpLoss} damage and lost ${$(cashLoss)}!`;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Lost round vs ${gangName}! -${hpLoss}HP, -${$(cashLoss)}`, type: 'gangWar' as const }];
      effects.push({ type: 'shake' });
      p.cops = p.cops ? {
        ...p.cops,
        gangWarBattle: { ...p.cops.gangWarBattle!, enemyStrength: war.gangStrength },
        lastResult,
        roundsCompleted: roundNum,
      } : null;
      if (p.hp <= 0) return { player: p, campaign: c, phase: 'end', effects };
      return { player: p, campaign: c, phase: 'cop', effects };
    }
  } else if (action === 'retreat') {
    if (C(0.40)) {
      p.eventLog = [...p.eventLog, { day: p.day, message: `Retreated from ${gangName}'s fighters!`, type: 'gangWar' as const }];
      p.closeCallCount++;
    } else {
      p.hp -= 15;
      const cashLoss = Math.round(p.cash * 0.10);
      p.cash -= cashLoss;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Failed retreat! -15HP, -${$(cashLoss)}`, type: 'gangWar' as const }];
      effects.push({ type: 'shake' });
    }
    p.cops = null;
    if (p.hp <= 0) return { player: p, campaign: c, phase: 'end', effects };
    return { player: p, campaign: c, phase: 'playing', effects };
  } else {
    // Negotiate — ceasefire (use displayed bribe cost, not random)
    const cost = p.cops?.bribeCost || R(2000, 5000);
    if (p.cash >= cost) {
      p.cash -= cost;
      p.cops = null;
      p.eventLog = [...p.eventLog, { day: p.day, message: `Paid ${$(cost)} ceasefire with ${gangName}. 3 turns peace.`, type: 'gangWar' as const }];
      if (p.hp <= 0) return { player: p, campaign: c, phase: 'end', effects };
      return { player: p, campaign: c, phase: 'playing', effects };
    } else {
      // Can't afford — stay in battle
      p.eventLog = [...p.eventLog, { day: p.day, message: `Can't afford ceasefire!`, type: 'gangWar' as const }];
      return { player: p, campaign: c, phase: 'cop', effects: [] };
    }
  }
}

export function checkGangWarEncounter(player: PlayerState, campaign: CampaignState): boolean {
  if (!campaign.gangWar.activeWar) return false;
  const war = campaign.gangWar.activeWar;
  const gang = GANGS.find(g => g.id === war.targetGangId);
  if (!gang) return false;

  // 40% on enemy turf, 15% elsewhere
  const onEnemyTurf = gang.turf.includes(player.location);
  const chance = onEnemyTurf ? 0.40 : 0.15;
  return C(chance);
}

export function checkTerritoryRaid(player: PlayerState, campaign: CampaignState): { gangId: string; locationId: string } | null {
  if (campaign.mode !== 'campaign' || player.campaignLevel < 3) return null;
  const terrIds = Object.keys(player.territories);
  if (terrIds.length === 0) return null;
  if (!C(0.10)) return null;

  // Pick a random territory
  const targetId = terrIds[R(0, terrIds.length - 1)];
  // Find a rival gang (not defeated)
  const rivalGangs = GANGS.filter(g => !campaign.gangWar.defeatedGangs.includes(g.id));
  if (rivalGangs.length === 0) return null;
  const raider = rivalGangs[R(0, rivalGangs.length - 1)];

  return { gangId: raider.id, locationId: targetId };
}

export function resolveTerritoryRaid(player: PlayerState, raid: { gangId: string; locationId: string }, defend: boolean): { player: PlayerState; effects: SideEffect[] } {
  const effects: SideEffect[] = [];
  const p = { ...player };
  const gang = GANGS.find(g => g.id === raid.gangId);
  const loc = LOCATIONS.find(l => l.id === raid.locationId);
  const gangName = gang?.name || 'Rival gang';
  const locName = loc?.name || 'territory';

  if (defend) {
    // Auto-defend — fight encounter (location modifier: raidDefense)
    const raidLoc = LOCATIONS.find(l => l.id === raid.locationId);
    const raidDefenseBonus = raidLoc?.modifier?.type === 'raidDefense' ? raidLoc.modifier.value : 0;
    const winChance = (p.gun ? 0.45 : 0.20) + raidDefenseBonus;
    if (C(winChance)) {
      p.rep += 3;
      p.heat = Math.min(HEAT_CAP, p.heat + 5);
      p.eventLog = [...p.eventLog, { day: p.day, message: `Defended ${locName} from ${gangName}!`, type: 'gangWar' as const }];
      effects.push({ type: 'haptic', style: 'success' });
    } else {
      // Lost defense — lose territory
      const newTerr = { ...p.territories };
      delete newTerr[raid.locationId];
      p.territories = newTerr;
      p.hp -= R(5, 15);
      p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName} took ${locName}! Lost territory.`, type: 'gangWar' as const }];
      effects.push({ type: 'shake' }, { type: 'haptic', style: 'error' });
    }
  } else {
    // Not present — lose territory and stash
    const newTerr = { ...p.territories };
    delete newTerr[raid.locationId];
    p.territories = newTerr;
    p.eventLog = [...p.eventLog, { day: p.day, message: `${gangName} raided ${locName}! Territory and stash lost.`, type: 'gangWar' as const }];
    effects.push({ type: 'shake' }, { type: 'haptic', style: 'error' });
  }

  return { player: p, effects };
}

