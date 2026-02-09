import type { PlayerState, CampaignState } from '../../src/types/game';
import type { LevelConfig } from '../../src/constants/game';
import type { SeededRandom } from '../seeded-random';

export interface TurnActions {
  trades: Array<{ type: 'buy' | 'sell'; drugId: string; quantity: number | 'max' }>;
  bankDeposit?: number | 'all';
  bankWithdraw?: number | 'all';
  sharkPayment?: number | 'all';
  consignmentPayment?: number | 'all';
  gangLoanPayment?: number | 'all';
  acceptOffer?: boolean;
  destination: string;
}

export interface Strategy {
  name: string;
  decideTurn(player: PlayerState, campaign: CampaignState, levelConfig: LevelConfig, rng: SeededRandom): TurnActions;
  decideCopAction(player: PlayerState, rng: SeededRandom): 'run' | 'fight' | 'bribe';
  decideWarAction?(player: PlayerState, campaign: CampaignState, rng: SeededRandom): 'fight' | 'retreat' | 'negotiate';
}
