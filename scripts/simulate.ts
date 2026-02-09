#!/usr/bin/env npx tsx
/**
 * Monte Carlo game economy simulation.
 *
 * Usage:
 *   npx tsx scripts/simulate.ts -n 1000 -s reactive -m campaign
 *   npx tsx scripts/simulate.ts -s greedy -m classic -n 500
 *   npx tsx scripts/simulate.ts --scenario arbitrage
 *   npx tsx scripts/simulate.ts --all
 */
import { SeededRandom, installSeededRandom } from './seeded-random';
import { MetricsCollector, type RunResult, type DaySnapshot } from './metrics';
import type { Strategy, TurnActions } from './strategies/types';
import { greedyStrategy } from './strategies/greedy';
import { reactiveStrategy } from './strategies/reactive';
import { conservativeStrategy } from './strategies/conservative';

import {
  DRUGS, LOCATIONS, REGIONS, GANGS, DAYS_PER_LEVEL,
  getLevelConfig, isFeatureEnabled, isRegionAvailable,
  getRegionForLocation, BANK_INTEREST,
} from '../src/constants/game';
import {
  createPlayerState, createDefaultCampaignState, createLevelTransitionState,
  travel, executeTrade, copAction, handleOffer, bankAction, payShark,
  payConsignment, payGangLoan,
  netWorth, inventoryCount, effectiveSpace,
  checkLevelWinCondition, checkGangWarEncounter, gangWarBattleAction,
} from '../src/lib/game-logic';
import type { PlayerState, CampaignState, CampaignLevel } from '../src/types/game';

// ── Strategy Registry ───────────────────────────────────────
const STRATEGIES: Record<string, Strategy> = {
  greedy: greedyStrategy,
  reactive: reactiveStrategy,
  conservative: conservativeStrategy,
};

// ── CLI Arg Parsing ─────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    n: 1000,
    strategy: 'reactive',
    mode: 'campaign' as 'campaign' | 'classic',
    seed: 42,
    verbose: false,
    scenario: null as string | null,
    all: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '-n' || arg === '--runs') && args[i + 1]) { opts.n = parseInt(args[++i]); }
    else if ((arg === '-s' || arg === '--strategy') && args[i + 1]) { opts.strategy = args[++i]; }
    else if ((arg === '-m' || arg === '--mode') && args[i + 1]) { opts.mode = args[++i] as 'campaign' | 'classic'; }
    else if (arg === '--seed' && args[i + 1]) { opts.seed = parseInt(args[++i]); }
    else if (arg === '-v' || arg === '--verbose') { opts.verbose = true; }
    else if (arg === '--scenario' && args[i + 1]) { opts.scenario = args[++i]; }
    else if (arg === '--all') { opts.all = true; }
  }

  return opts;
}

// ── Single Game Simulation ──────────────────────────────────
function simulateGame(
  strategy: Strategy,
  mode: 'campaign' | 'classic',
  seed: number,
  verbose: boolean,
): RunResult {
  const rng = new SeededRandom(seed);
  const cleanup = installSeededRandom(rng);

  try {
    let player = createPlayerState('bronx', 'standard', null, 1, mode);
    let campaign = createDefaultCampaignState(mode);
    const daySnapshots: DaySnapshot[] = [];
    let prevBank = player.bank;
    let prevCash = player.cash;
    const profitSources = { trading: 0, bankInterest: 0, territory: 0, consignment: 0 };
    let l1Won = false, l2Won = false, l3Won = false;
    let diedEarly = false;
    let totalTurns = 0;
    const maxTurns = mode === 'campaign' ? 100 : 35; // safety cap

    while (totalTurns < maxTurns) {
      totalTurns++;

      // Snapshot at start of day
      daySnapshots.push({
        day: player.day,
        level: player.campaignLevel,
        cash: player.cash,
        bank: player.bank,
        debt: player.debt,
        netWorth: netWorth(player),
        heat: player.heat,
        rep: player.rep,
        territories: Object.keys(player.territories).length,
        trades: player.trades,
      });

      // --- Strategy decides actions ---
      const levelConfig = getLevelConfig(player.campaignLevel);
      const actions = strategy.decideTurn(player, campaign, levelConfig, rng);

      // --- Execute sells first ---
      for (const trade of actions.trades.filter(t => t.type === 'sell')) {
        const result = executeTrade(player, trade.drugId, 'sell', trade.quantity);
        const tradePnl = result.player.profit - player.profit;
        if (tradePnl > 0) profitSources.trading += tradePnl;
        player = result.player;
      }

      // --- Pay debt ---
      if (actions.sharkPayment !== undefined && player.debt > 0) {
        const loc = LOCATIONS.find(l => l.id === player.location);
        if (loc?.shark) {
          player = payShark(player, actions.sharkPayment);
        }
      }

      // --- Pay consignment ---
      if (actions.consignmentPayment !== undefined && player.consignment) {
        const result = payConsignment(player, actions.consignmentPayment);
        player = result.player;
      }

      // --- Pay gang loan ---
      if (actions.gangLoanPayment !== undefined && player.gangLoan) {
        const result = payGangLoan(player, actions.gangLoanPayment);
        player = result.player;
      }

      // --- Bank actions ---
      if (actions.bankWithdraw !== undefined) {
        const loc = LOCATIONS.find(l => l.id === player.location);
        if (loc?.bank) player = bankAction(player, 'withdraw', actions.bankWithdraw);
      }

      // --- Execute buys ---
      for (const trade of actions.trades.filter(t => t.type === 'buy')) {
        const result = executeTrade(player, trade.drugId, 'buy', trade.quantity);
        player = result.player;
      }

      // --- Bank deposit ---
      if (actions.bankDeposit !== undefined) {
        const loc = LOCATIONS.find(l => l.id === player.location);
        if (loc?.bank) player = bankAction(player, 'deposit', actions.bankDeposit);
      }

      // --- Handle offer ---
      if (player.offer && actions.acceptOffer !== undefined) {
        const result = handleOffer(player, actions.acceptOffer);
        player = result.player;
      }

      // --- Track bank interest before travel ---
      prevBank = player.bank;
      prevCash = player.cash;
      const prevTribPerDay = player.tributePerDay;

      // --- Travel ---
      const travelResult = travel(player, actions.destination, campaign);
      player = travelResult.player;

      // Track bank interest earned this turn
      const bankInterestEarned = player.bank - prevBank;
      if (bankInterestEarned > 0) profitSources.bankInterest += bankInterestEarned;

      // Track tribute earned
      const tributeEarned = player.tributePerDay * 1; // 1 travel day approx
      if (tributeEarned > 0) profitSources.territory += tributeEarned;

      // --- Handle cops ---
      if (travelResult.phase === 'cop' && player.cops) {
        // Check for gang war encounter
        if (player.cops.gangWarBattle) {
          const warAction = strategy.decideWarAction
            ? strategy.decideWarAction(player, campaign, rng)
            : 'retreat';
          const warResult = gangWarBattleAction(player, campaign, warAction);
          player = warResult.player;
          campaign = warResult.campaign;
          if (warResult.phase === 'end') {
            diedEarly = true;
            break;
          }
        } else {
          const copDecision = strategy.decideCopAction(player, rng);
          const copResult = copAction(player, copDecision);
          player = copResult.player;
          if (copResult.phase === 'end') {
            diedEarly = true;
            break;
          }
        }
      }

      // --- Check gang war encounters ---
      if (mode === 'campaign' && campaign.gangWar.activeWar) {
        if (checkGangWarEncounter(player, campaign)) {
          const warAction = strategy.decideWarAction
            ? strategy.decideWarAction(player, campaign, rng)
            : 'retreat';
          // Set up cops for gang war battle
          const gang = GANGS.find(g => g.id === campaign.gangWar.activeWar!.targetGangId);
          const regionLaw = getRegionForLocation(player.location)?.law || { forceName: 'Gang', forceEmoji: '🔫', bribeMultiplier: 1, aggressionBase: 0, heatDecayBonus: 0, encounterModifier: 0, behavior: 'brutal' as const };
          player.cops = {
            count: rng.R(1, 3),
            bribeCost: rng.R(1000, 3000),
            regionLaw,
            gangWarBattle: {
              type: rng.pick(['ambush', 'turf_fight', 'raid'] as const),
              gangId: campaign.gangWar.activeWar!.targetGangId,
              enemyStrength: campaign.gangWar.activeWar!.gangStrength,
            },
          };
          const warResult = gangWarBattleAction(player, campaign, warAction);
          player = warResult.player;
          campaign = warResult.campaign;
          if (warResult.phase === 'end') {
            diedEarly = true;
            break;
          }
        }
      }

      // --- Handle end-of-level transitions ---
      if (travelResult.phase === 'levelComplete') {
        if (player.campaignLevel === 1) l1Won = true;
        if (player.campaignLevel === 2) l2Won = true;

        const nextLevel = (player.campaignLevel + 1) as CampaignLevel;
        if (nextLevel <= 3) {
          campaign = {
            ...campaign,
            level: nextLevel,
            campaignStats: {
              ...campaign.campaignStats,
              levelsCompleted: campaign.campaignStats.levelsCompleted + 1,
              totalDaysPlayed: campaign.campaignStats.totalDaysPlayed + player.day,
              totalProfit: campaign.campaignStats.totalProfit + player.profit,
              levelScores: [...campaign.campaignStats.levelScores, {
                level: player.campaignLevel,
                netWorth: netWorth(player),
                rep: player.rep,
                territories: Object.keys(player.territories).length,
              }],
            },
          };
          player = createLevelTransitionState(player, nextLevel);
        }
      } else if (travelResult.phase === 'win') {
        if (mode === 'campaign') {
          if (player.campaignLevel === 1) l1Won = true;
          if (player.campaignLevel === 2) l2Won = true;
          if (player.campaignLevel === 3) l3Won = true;
        }
        break;
      } else if (travelResult.phase === 'end') {
        // Check if any levels were won before dying
        if (player.campaignLevel >= 2) l1Won = true;
        if (player.campaignLevel >= 3) l2Won = true;
        diedEarly = player.hp <= 0 || player.fingers <= 0;
        break;
      }

      if (verbose && totalTurns <= 5) {
        console.log(`  Day ${player.day} | NW: ${netWorth(player)} | Cash: ${player.cash} | Bank: ${player.bank} | Heat: ${player.heat} | Rep: ${player.rep}`);
      }
    }

    const campaignWon = l1Won && l2Won && l3Won;
    const won = mode === 'campaign' ? campaignWon : (player.cash + player.bank >= player.debt);

    return {
      seed,
      strategy: strategy.name,
      mode,
      finalNetWorth: netWorth(player),
      finalCash: player.cash,
      finalBank: player.bank,
      finalDebt: player.debt,
      finalRep: player.rep,
      finalTerritories: Object.keys(player.territories).length,
      totalTrades: player.trades,
      daysPlayed: player.day,
      won,
      l1Won,
      l2Won,
      l3Won,
      campaignWon,
      diedEarly,
      daySnapshots,
      profitSources,
    };
  } finally {
    cleanup();
  }
}

// ── Run Simulation Suite ────────────────────────────────────
function runSuite(strategyName: string, mode: 'campaign' | 'classic', n: number, baseSeed: number, verbose: boolean): MetricsCollector {
  const strategy = STRATEGIES[strategyName];
  if (!strategy) {
    console.error(`Unknown strategy: ${strategyName}. Available: ${Object.keys(STRATEGIES).join(', ')}`);
    process.exit(1);
  }

  const collector = new MetricsCollector();

  for (let i = 0; i < n; i++) {
    const seed = baseSeed + i;
    try {
      const result = simulateGame(strategy, mode, seed, verbose && i < 3);
      collector.addRun(result);
    } catch (e) {
      if (verbose) console.error(`Run ${i} (seed ${seed}) crashed:`, e);
      // Skip crashed runs
    }

    if ((i + 1) % 100 === 0 || i === n - 1) {
      process.stdout.write(`\r  ${strategyName}/${mode}: ${i + 1}/${n} runs`);
    }
  }
  console.log(); // newline after progress

  return collector;
}

// ── Edge Case Scenarios ─────────────────────────────────────
function runScenarios(baseSeed: number, n: number) {
  console.log('\n=== EDGE CASE SCENARIOS ===\n');

  // Each scenario uses a modified strategy
  const scenarios: Array<{ name: string; description: string; strategy: Strategy; mode: 'campaign' | 'classic' }> = [
    {
      name: 'arbitrage',
      description: 'Buy cocaine in Colombia, sell in NYC only',
      mode: 'campaign',
      strategy: {
        name: 'arbitrage',
        decideTurn(player, campaign, levelConfig, rng) {
          const actions: TurnActions = { trades: [], destination: player.location };
          const region = getRegionForLocation(player.location);

          // Sell cocaine in NYC
          if (region?.id === 'nyc' && player.inventory['cocaine'] > 0) {
            actions.trades.push({ type: 'sell', drugId: 'cocaine', quantity: 'max' });
          }
          // Also sell heroin
          if (region?.id === 'nyc' && player.inventory['heroin'] > 0) {
            actions.trades.push({ type: 'sell', drugId: 'heroin', quantity: 'max' });
          }

          // Buy cocaine in Colombia
          if (region?.id === 'colombia' && player.prices['cocaine']) {
            actions.trades.push({ type: 'buy', drugId: 'cocaine', quantity: 'max' });
          }

          // Bank at any bank
          const loc = LOCATIONS.find(l => l.id === player.location);
          if (loc?.bank && player.cash > 20000) {
            actions.bankDeposit = Math.round(player.cash * 0.5);
          }

          // Pay debt
          if (player.debt > 0 && player.cash > player.debt * 2) actions.sharkPayment = 'all';

          // Travel: if in NYC with cash, go Colombia. If in Colombia, go NYC.
          if (region?.id === 'nyc' && isRegionAvailable(player.campaignLevel, 'colombia', campaign.mode)
            && player.rep >= 20 && player.cash >= 3000 && inventoryCount(player.inventory) === 0) {
            const colombiaLocs = LOCATIONS.filter(l => l.region === 'colombia');
            actions.destination = colombiaLocs[0].id;
          } else if (region?.id === 'colombia' && inventoryCount(player.inventory) > 0) {
            const nycLocs = LOCATIONS.filter(l => l.region === 'nyc');
            actions.destination = rng.pick(nycLocs).id;
          } else {
            // Grind rep in NYC or Colombia
            const regionLocs = LOCATIONS.filter(l => l.region === (region?.id || 'nyc') && l.id !== player.location);
            if (regionLocs.length > 0) actions.destination = rng.pick(regionLocs).id;
          }

          actions.acceptOffer = player.offer?.type !== 'consignment';
          return actions;
        },
        decideCopAction: (p, rng) => p.cash > 2000 ? 'bribe' : 'run',
      },
    },
    {
      name: 'event_farming',
      description: 'Hold drugs, sell only during 3.5x+ events',
      mode: 'classic',
      strategy: {
        name: 'event_farming',
        decideTurn(player, campaign, levelConfig, rng) {
          const actions: TurnActions = { trades: [], destination: player.location };

          // Only sell during spikes (price > 3.5x drug min)
          for (const [drugId, qty] of Object.entries(player.inventory)) {
            if (qty <= 0) continue;
            const price = player.prices[drugId] as number;
            if (!price) continue;
            const drug = DRUGS.find(d => d.id === drugId);
            if (drug && price > drug.min * 3.5) {
              actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
            }
          }

          // Buy cheap drugs
          const free = effectiveSpace(player) - inventoryCount(player.inventory);
          if (free > 0) {
            for (const drug of DRUGS.filter(d => !d.rare)) {
              const price = player.prices[drug.id] as number;
              if (price && price < drug.min * 1.2) {
                actions.trades.push({ type: 'buy', drugId: drug.id, quantity: 'max' });
              }
            }
          }

          if (player.debt > 0 && player.cash > player.debt) actions.sharkPayment = 'all';
          const loc = LOCATIONS.find(l => l.id === player.location);
          if (loc?.bank && player.cash > 5000) actions.bankDeposit = Math.round(player.cash * 0.5);

          const regionLocs = LOCATIONS.filter(l => l.region === 'nyc' && l.id !== player.location);
          if (regionLocs.length > 0) actions.destination = rng.pick(regionLocs).id;
          actions.acceptOffer = false;
          return actions;
        },
        decideCopAction: (p, rng) => p.cash > 1000 ? 'bribe' : 'run',
      },
    },
    {
      name: 'bank_snowball',
      description: 'Bank everything by day 10, then just travel',
      mode: 'classic',
      strategy: {
        name: 'bank_snowball',
        decideTurn(player, campaign, levelConfig, rng) {
          const actions: TurnActions = { trades: [], destination: player.location };

          // First 10 days: trade normally
          if (player.day <= 10) {
            // Sell at any profit
            for (const [drugId, qty] of Object.entries(player.inventory)) {
              if (qty <= 0) continue;
              const price = player.prices[drugId] as number;
              const avgCost = player.averageCosts[drugId] || 0;
              if (price && avgCost > 0 && price > avgCost) {
                actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
              }
            }
            // Buy cheap
            for (const drug of DRUGS.filter(d => !d.rare)) {
              const price = player.prices[drug.id] as number;
              if (price && price < (drug.min + drug.max) / 2) {
                actions.trades.push({ type: 'buy', drugId: drug.id, quantity: 'max' });
              }
            }
          } else {
            // After day 10: sell everything
            for (const [drugId, qty] of Object.entries(player.inventory)) {
              if (qty > 0) actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
            }
          }

          // Always pay debt
          if (player.debt > 0) actions.sharkPayment = 'all';

          // Bank everything
          const loc = LOCATIONS.find(l => l.id === player.location);
          if (loc?.bank) actions.bankDeposit = 'all';

          const regionLocs = LOCATIONS.filter(l => l.region === 'nyc' && l.id !== player.location);
          if (regionLocs.length > 0) actions.destination = rng.pick(regionLocs).id;
          actions.acceptOffer = false;
          return actions;
        },
        decideCopAction: () => 'run',
      },
    },
    {
      name: 'consignment_farm',
      description: 'Accept all consignment, sell immediately',
      mode: 'campaign',
      strategy: {
        ...reactiveStrategy,
        name: 'consignment_farm',
        decideTurn(player, campaign, levelConfig, rng) {
          const base = reactiveStrategy.decideTurn(player, campaign, levelConfig, rng);
          base.acceptOffer = true; // always accept consignment
          return base;
        },
      },
    },
    {
      name: 'territory_stack',
      description: 'Buy max territories, measure passive income',
      mode: 'campaign',
      strategy: {
        ...reactiveStrategy,
        name: 'territory_stack',
        decideTurn(player, campaign, levelConfig, rng) {
          const base = reactiveStrategy.decideTurn(player, campaign, levelConfig, rng);
          // Always accept territory offers
          if (player.offer?.type === 'territory') {
            base.acceptOffer = true;
          }
          return base;
        },
      },
    },
  ];

  for (const scenario of scenarios) {
    console.log(`--- ${scenario.name}: ${scenario.description} ---`);
    const collector = new MetricsCollector();
    for (let i = 0; i < n; i++) {
      try {
        const result = simulateGame(scenario.strategy, scenario.mode, baseSeed + i, false);
        collector.addRun(result);
      } catch (e) { /* skip */ }
    }
    console.log(collector.generateReport());
    console.log();
  }
}

// ── Main ────────────────────────────────────────────────────
function main() {
  const opts = parseArgs();

  console.log('Drug Wars Empire — Economy Simulator');
  console.log(`Seed: ${opts.seed} | Runs: ${opts.n}\n`);

  if (opts.all) {
    // Run all strategies x modes
    for (const stratName of Object.keys(STRATEGIES)) {
      for (const mode of ['campaign', 'classic'] as const) {
        const collector = runSuite(stratName, mode, opts.n, opts.seed, opts.verbose);
        console.log(collector.generateReport());
        console.log();
      }
    }
    // Edge cases
    runScenarios(opts.seed, Math.min(opts.n, 500));
  } else if (opts.scenario) {
    runScenarios(opts.seed, opts.n);
  } else {
    const collector = runSuite(opts.strategy, opts.mode, opts.n, opts.seed, opts.verbose);
    console.log(collector.generateReport());
  }
}

main();
