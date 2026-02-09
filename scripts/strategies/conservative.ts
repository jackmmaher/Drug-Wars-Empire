/**
 * Conservative strategy: risk-averse, bank-heavy.
 * Buy only bottom 25% of price range, sell at any profit,
 * stay in NYC, bank aggressively, pay debt immediately,
 * decline consignment, never fight cops.
 */
import type { PlayerState, CampaignState } from '../../src/types/game';
import type { LevelConfig } from '../../src/constants/game';
import { DRUGS, LOCATIONS, getRegionForLocation } from '../../src/constants/game';
import { inventoryCount, effectiveSpace } from '../../src/lib/game-logic';
import type { SeededRandom } from '../seeded-random';
import type { Strategy, TurnActions } from './types';

export const conservativeStrategy: Strategy = {
  name: 'conservative',

  decideTurn(player: PlayerState, campaign: CampaignState, levelConfig: LevelConfig, rng: SeededRandom): TurnActions {
    const actions: TurnActions = { trades: [], destination: player.location };
    const currentRegion = getRegionForLocation(player.location);

    // --- Sell at any profit ---
    for (const [drugId, qty] of Object.entries(player.inventory)) {
      if (qty <= 0) continue;
      const price = player.prices[drugId] as number;
      if (!price) continue;
      const avgCost = player.averageCosts[drugId] || 0;
      if (avgCost > 0 && price > avgCost) {
        actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
      }
    }

    // --- Pay debt immediately ---
    if (player.debt > 0) {
      actions.sharkPayment = 'all';
    }

    // --- Pay consignment immediately ---
    if (player.consignment) {
      actions.consignmentPayment = 'all';
    }

    // --- Pay gang loan immediately ---
    if (player.gangLoan) {
      actions.gangLoanPayment = 'all';
    }

    // --- Buy only bottom 25% of price range ---
    const free = effectiveSpace(player) - inventoryCount(player.inventory);
    if (free > 0 && player.cash > 1000) {
      const buyable = DRUGS
        .filter(d => {
          const price = player.prices[d.id] as number;
          if (!price) return false;
          const range = d.max - d.min;
          const threshold = d.min + range * 0.25;
          return price <= threshold;
        })
        .sort((a, b) => {
          // Prefer mid-tier drugs for reliable returns
          const priceA = player.prices[a.id] as number;
          const priceB = player.prices[b.id] as number;
          return (b.max - priceB) / b.max - (a.max - priceA) / a.max;
        });

      for (const drug of buyable.slice(0, 2)) {
        actions.trades.push({ type: 'buy', drugId: drug.id, quantity: 'max' });
      }
    }

    // --- Bank aggressively at every bank location ---
    const loc = LOCATIONS.find(l => l.id === player.location);
    if (loc?.bank && player.cash > 2000 && player.debt <= 0) {
      actions.bankDeposit = Math.round(player.cash * 0.7);
    }

    // --- Decline consignment and risky offers ---
    if (player.offer) {
      if (player.offer.type === 'consignment' || player.offer.type === 'mission') {
        actions.acceptOffer = false;
      } else if (player.offer.type === 'territory') {
        // Buy territory only if very cheap
        actions.acceptOffer = (player.offer.cost || 0) < player.cash * 0.2;
      } else {
        actions.acceptOffer = true; // guns, coats, rats are fine
      }
    }

    // --- Stay in NYC (or return to NYC if somehow abroad) ---
    if (currentRegion?.id !== 'nyc') {
      // Go back to NYC
      const nycLocs = LOCATIONS.filter(l => l.region === 'nyc');
      actions.destination = rng.pick(nycLocs).id;
    } else {
      // Random NYC location, prefer bank locations
      const nycLocs = LOCATIONS.filter(l => l.region === 'nyc' && l.id !== player.location);
      const bankLocs = nycLocs.filter(l => l.bank);
      if (bankLocs.length > 0 && rng.C(0.4)) {
        actions.destination = rng.pick(bankLocs).id;
      } else if (nycLocs.length > 0) {
        actions.destination = rng.pick(nycLocs).id;
      }
    }

    return actions;
  },

  decideCopAction(player: PlayerState, rng: SeededRandom): 'run' | 'fight' | 'bribe' {
    // Never fight, prefer bribe, then run
    if (player.cops) {
      const bribeCost = player.cops.bribeCost * player.cops.count;
      if (player.cash >= bribeCost) {
        return 'bribe';
      }
    }
    return 'run';
  },

  decideWarAction(player: PlayerState, campaign: CampaignState, rng: SeededRandom): 'fight' | 'retreat' | 'negotiate' {
    if (player.cash > 3000) return 'negotiate';
    return 'retreat';
  },
};
