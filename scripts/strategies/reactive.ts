/**
 * Reactive strategy: mimics a casual player's "go with the flow" style.
 * Travel internationally when available, buy whatever looks cheap,
 * sell whatever's profitable, respond to events, accept most offers.
 * No deliberate arbitrage optimization.
 */
import type { PlayerState, CampaignState } from '../../src/types/game';
import type { LevelConfig } from '../../src/constants/game';
import { DRUGS, LOCATIONS, REGIONS, getRegionForLocation, isRegionAvailable } from '../../src/constants/game';
import { inventoryCount, effectiveSpace } from '../../src/lib/game-logic';
import type { SeededRandom } from '../seeded-random';
import type { Strategy, TurnActions } from './types';

export const reactiveStrategy: Strategy = {
  name: 'reactive',

  decideTurn(player: PlayerState, campaign: CampaignState, levelConfig: LevelConfig, rng: SeededRandom): TurnActions {
    const actions: TurnActions = { trades: [], destination: player.location };
    const currentRegion = getRegionForLocation(player.location);

    // --- Sell anything profitable (any profit, not greedy threshold) ---
    for (const [drugId, qty] of Object.entries(player.inventory)) {
      if (qty <= 0) continue;
      const price = player.prices[drugId] as number;
      if (!price) continue;
      const avgCost = player.averageCosts[drugId] || 0;
      // Sell if any profit, or sell at loss if running out of days
      if ((avgCost > 0 && price > avgCost * 1.1) || player.day > 25) {
        actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
      }
    }

    // --- Pay debt when comfortable ---
    if (player.debt > 0 && player.cash > player.debt * 2) {
      actions.sharkPayment = 'all';
    } else if (player.debt > 0 && player.day > 20) {
      actions.sharkPayment = 'all';
    }

    // --- Pay consignment if we have surplus ---
    if (player.consignment) {
      const remaining = player.consignment.amountOwed - player.consignment.amountPaid;
      if (player.cash > remaining * 1.5 || player.consignment.turnsLeft <= 2) {
        actions.consignmentPayment = 'all';
      }
    }

    // --- Pay gang loan ---
    if (player.gangLoan) {
      const remaining = player.gangLoan.amountOwed - player.gangLoan.amountPaid;
      if (player.cash > remaining * 1.5 || player.gangLoan.turnsLeft <= 2) {
        actions.gangLoanPayment = 'all';
      }
    }

    // --- Buy whatever looks cheap (relative to drug's range) ---
    const free = effectiveSpace(player) - inventoryCount(player.inventory);
    if (free > 0 && player.cash > 500) {
      const buyable = DRUGS.filter(d => {
        const price = player.prices[d.id] as number;
        if (!price) return false;
        const midpoint = (d.min + d.max) / 2;
        return price < midpoint; // anything below midpoint
      });

      // Shuffle to avoid always buying the same thing
      const shuffled = [...buyable].sort(() => rng.next() - 0.5);
      for (const drug of shuffled.slice(0, 3)) {
        actions.trades.push({ type: 'buy', drugId: drug.id, quantity: 'max' });
      }
    }

    // --- Bank: deposit when we have surplus cash at bank locations ---
    const loc = LOCATIONS.find(l => l.id === player.location);
    if (loc?.bank && player.cash > 10000) {
      actions.bankDeposit = Math.round(player.cash * 0.4);
    }

    // --- Accept most offers (80% chance, always accept consignment) ---
    if (player.offer) {
      if (player.offer.type === 'consignment') {
        actions.acceptOffer = rng.C(0.7);
      } else if (player.offer.type === 'territory') {
        actions.acceptOffer = player.cash >= (player.offer.cost || 0) * 2;
      } else {
        actions.acceptOffer = rng.C(0.8);
      }
    }

    // --- Travel: prefer international when available, otherwise random in region ---
    const availableRegions = REGIONS.filter(r =>
      r.id !== 'nyc' &&
      r.id !== currentRegion?.id &&
      isRegionAvailable(player.campaignLevel, r.id, campaign.mode) &&
      player.rep >= r.rep &&
      player.cash >= r.flyCost * 1.5
    );

    if (availableRegions.length > 0 && rng.C(0.4)) {
      // Go international
      const targetRegion = rng.pick(availableRegions);
      const regionLocs = LOCATIONS.filter(l => l.region === targetRegion.id);
      if (regionLocs.length > 0) {
        actions.destination = regionLocs[0].id;
      }
    } else if (currentRegion?.id !== 'nyc' && rng.C(0.25)) {
      // Sometimes go back to NYC
      const nycLocs = LOCATIONS.filter(l => l.region === 'nyc');
      actions.destination = rng.pick(nycLocs).id;
    } else {
      // Random location in current region
      const regionLocs = LOCATIONS.filter(l => l.region === currentRegion?.id && l.id !== player.location);
      if (regionLocs.length > 0) {
        actions.destination = rng.pick(regionLocs).id;
      }
    }

    return actions;
  },

  decideCopAction(player: PlayerState, rng: SeededRandom): 'run' | 'fight' | 'bribe' {
    if (player.cops) {
      const bribeCost = player.cops.bribeCost * player.cops.count;
      if (player.cash >= bribeCost && bribeCost < player.cash * 0.5) {
        return 'bribe';
      }
    }
    if (player.gun && rng.C(0.5)) return 'fight';
    return 'run';
  },

  decideWarAction(player: PlayerState, campaign: CampaignState, rng: SeededRandom): 'fight' | 'retreat' | 'negotiate' {
    if (rng.C(0.4) && player.gun) return 'fight';
    if (player.cash > 3000 && rng.C(0.3)) return 'negotiate';
    return 'retreat';
  },
};
