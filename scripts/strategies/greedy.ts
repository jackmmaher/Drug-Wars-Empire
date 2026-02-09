/**
 * Greedy strategy: maximize immediate profit.
 * Buy drugs in bottom 40% of price range (highest tier first),
 * sell at 50%+ profit, bribe cops if affordable, accept all offers,
 * travel to maximize trading within current region.
 */
import type { PlayerState, CampaignState } from '../../src/types/game';
import type { LevelConfig } from '../../src/constants/game';
import { DRUGS, LOCATIONS, REGIONS, GANGS, getRegionForLocation, isRegionAvailable } from '../../src/constants/game';
import { inventoryCount, effectiveSpace, netWorth } from '../../src/lib/game-logic';
import type { SeededRandom } from '../seeded-random';
import type { Strategy, TurnActions } from './types';

export const greedyStrategy: Strategy = {
  name: 'greedy',

  decideTurn(player: PlayerState, campaign: CampaignState, levelConfig: LevelConfig, rng: SeededRandom): TurnActions {
    const actions: TurnActions = { trades: [], destination: player.location };
    const currentRegion = getRegionForLocation(player.location);

    // --- Sell first: sell anything at 50%+ profit ---
    for (const [drugId, qty] of Object.entries(player.inventory)) {
      if (qty <= 0) continue;
      const price = player.prices[drugId] as number;
      if (!price) continue;
      const avgCost = player.averageCosts[drugId] || 0;
      if (avgCost > 0 && price >= avgCost * 1.5) {
        actions.trades.push({ type: 'sell', drugId, quantity: 'max' });
      }
    }

    // --- Pay debt early if affordable ---
    if (player.debt > 0 && player.cash > player.debt * 1.5) {
      actions.sharkPayment = 'all';
    }

    // --- Pay consignment if we have cash ---
    if (player.consignment) {
      const remaining = player.consignment.amountOwed - player.consignment.amountPaid;
      if (player.cash >= remaining) {
        actions.consignmentPayment = 'all';
      }
    }

    // --- Pay gang loan if we have cash ---
    if (player.gangLoan) {
      const remaining = player.gangLoan.amountOwed - player.gangLoan.amountPaid;
      if (player.cash >= remaining) {
        actions.gangLoanPayment = 'all';
      }
    }

    // --- Buy: drugs in bottom 40% of price range, highest tier first ---
    const free = effectiveSpace(player) - inventoryCount(player.inventory);
    if (free > 0 && player.cash > 0) {
      const buyable = DRUGS
        .filter(d => {
          const price = player.prices[d.id] as number;
          if (!price) return false;
          const range = d.max - d.min;
          const threshold = d.min + range * 0.4;
          return price <= threshold;
        })
        .sort((a, b) => b.tier - a.tier);

      for (const drug of buyable) {
        actions.trades.push({ type: 'buy', drugId: drug.id, quantity: 'max' });
      }
    }

    // --- Bank deposit: bank excess cash after buying ---
    const loc = LOCATIONS.find(l => l.id === player.location);
    if (loc?.bank && player.cash > 5000) {
      actions.bankDeposit = Math.round(player.cash * 0.5);
    }

    // --- Accept offers ---
    actions.acceptOffer = true;

    // --- Travel: pick a different location in current region ---
    const regionLocs = LOCATIONS.filter(l => l.region === currentRegion?.id && l.id !== player.location);
    if (regionLocs.length > 0) {
      actions.destination = rng.pick(regionLocs).id;
    }

    // --- Consider international travel if profitable ---
    if (campaign.mode === 'campaign' && player.rep >= 20) {
      const availableRegions = REGIONS.filter(r =>
        r.id !== 'nyc' &&
        r.id !== currentRegion?.id &&
        isRegionAvailable(player.campaignLevel, r.id, campaign.mode) &&
        player.rep >= r.rep &&
        player.cash >= r.flyCost * 2
      );
      if (availableRegions.length > 0 && rng.C(0.3)) {
        const targetRegion = rng.pick(availableRegions);
        const regionLocs2 = LOCATIONS.filter(l => l.region === targetRegion.id);
        if (regionLocs2.length > 0) {
          actions.destination = regionLocs2[0].id;
        }
      }
    }

    return actions;
  },

  decideCopAction(player: PlayerState, rng: SeededRandom): 'run' | 'fight' | 'bribe' {
    // Bribe if affordable (< 30% of cash)
    if (player.cops) {
      const bribeCost = player.cops.bribeCost * player.cops.count;
      if (player.cash >= bribeCost && bribeCost < player.cash * 0.3) {
        return 'bribe';
      }
    }
    return player.gun ? 'fight' : 'run';
  },

  decideWarAction(player: PlayerState, campaign: CampaignState, rng: SeededRandom): 'fight' | 'retreat' | 'negotiate' {
    if (player.gun && player.hp > 40) return 'fight';
    if (player.cash > 5000) return 'negotiate';
    return 'retreat';
  },
};
