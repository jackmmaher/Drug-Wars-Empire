import { create } from 'zustand';
import type { PlayerState, GamePhase, TabId, TradeInfo, PersonaId, CampaignState, CampaignLevel } from '../types/game';
import {
  createPlayerState, travel as travelLogic, executeTrade, copAction,
  handleOffer, bankAction, payShark, borrowShark, payRat as payRatLogic,
  payConsignment as payConsignmentLogic,
  borrowFromGang as borrowFromGangLogic, payGangLoan as payGangLoanLogic,
  stashDrug as stashDrugLogic, retrieveDrug as retrieveDrugLogic,
  inventoryCount, netWorth, checkMilestones, effectiveSpace,
  createDefaultCampaignState, createLevelTransitionState, checkLevelWinCondition,
  declareGangWar as declareGangWarLogic, gangWarBattleAction as gangWarBattleLogic,
  checkGangWarEncounter, checkTerritoryRaid, resolveTerritoryRaid,
  type SideEffect,
} from '../lib/game-logic';
import { getRank, DAYS, DRUGS, LOCATIONS, GANGS, DAYS_PER_LEVEL, R } from '../constants/game';
import { processSideEffects } from '../lib/audio';

interface Notification {
  message: string;
  type: string;
  key: number;
}

interface GameStore {
  // Game state
  phase: GamePhase;
  player: PlayerState;
  playerName: string;
  selectedPersona: PersonaId | null;

  // Campaign state
  campaign: CampaignState;
  gameMode: 'campaign' | 'classic';

  // UI state
  activeTab: TabId;
  activeTrade: TradeInfo | null;
  tradeQuantity: string;
  isShaking: boolean;
  subPanel: string | null;
  notifications: Notification[];
  hasSeenRules: boolean;
  helpSeen: Record<string, boolean>;

  // Computed helpers
  usedSpace: () => number;
  freeSpace: () => number;
  currentLocation: () => typeof LOCATIONS[0] | undefined;
  currentRank: () => ReturnType<typeof getRank>;
  currentNetWorth: () => number;

  // Actions
  setSelectedPersona: (persona: PersonaId | null) => void;
  setGameMode: (mode: 'campaign' | 'classic') => void;
  startGame: (difficulty?: 'conservative' | 'standard' | 'highroller') => void;
  startCampaign: (difficulty?: 'conservative' | 'standard' | 'highroller') => void;
  advanceLevel: () => void;
  travel: (locationId: string) => void;
  openTrade: (drugId: string, type: 'buy' | 'sell') => void;
  setTradeQuantity: (qty: string) => void;
  confirmTrade: () => void;
  closeTrade: () => void;
  copAct: (action: 'run' | 'fight' | 'bribe') => void;
  acceptOffer: () => void;
  declineOffer: () => void;
  bank: (action: 'deposit' | 'withdraw', amount: number | 'all') => void;
  shark: (amount: number | 'all') => void;
  borrow: (amount: number) => void;
  payConsignment: (amount: number | 'all') => void;
  borrowGang: (gangId: string, amount: number) => void;
  payGangLoan: (amount: number | 'all') => void;
  stashDrug: (drugId: string, qty: number) => void;
  retrieveDrug: (drugId: string, qty: number) => void;
  payRat: () => void;
  declareWar: (gangId: string) => void;
  resolveWarBattle: (action: 'fight' | 'retreat' | 'negotiate') => void;
  setTab: (tab: TabId) => void;
  setSubPanel: (panel: string | null) => void;
  setPlayerName: (name: string) => void;
  dismissRules: () => void;
  markHelpSeen: (key: string) => void;
  resetToTitle: () => void;
  notify: (message: string, type?: string) => void;
  clearNotifications: () => void;
}

let notifyTimeout: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  phase: 'title',
  player: createPlayerState(),
  playerName: '',
  selectedPersona: null,

  // Campaign
  campaign: createDefaultCampaignState(),
  gameMode: 'classic',

  activeTab: 'market',
  activeTrade: null,
  tradeQuantity: '',
  isShaking: false,
  subPanel: null,
  notifications: [],
  hasSeenRules: false,
  helpSeen: {},

  // Computed
  usedSpace: () => inventoryCount(get().player.inventory),
  freeSpace: () => {
    const p = get().player;
    return effectiveSpace(p) - inventoryCount(p.inventory);
  },
  currentLocation: () => LOCATIONS.find(l => l.id === get().player.location),
  currentRank: () => getRank(get().player.rep),
  currentNetWorth: () => netWorth(get().player),

  // Actions
  setSelectedPersona: (persona) => set({ selectedPersona: persona }),
  setGameMode: (mode) => set({ gameMode: mode }),

  startGame: (difficulty = 'standard') => {
    const s = get();
    const persona = s.selectedPersona;
    if (s.gameMode === 'campaign') {
      return s.startCampaign(difficulty);
    }
    set({
      phase: 'playing',
      player: createPlayerState('bronx', difficulty, persona, 1, 'classic'),
      campaign: createDefaultCampaignState('classic'),
      activeTab: 'market',
      subPanel: null,
    });
  },

  startCampaign: (difficulty = 'standard') => {
    const persona = get().selectedPersona;
    const campaign = createDefaultCampaignState('campaign');
    set({
      phase: 'levelIntro',
      player: createPlayerState('bronx', difficulty, persona, 1, 'campaign'),
      campaign,
      gameMode: 'campaign',
      activeTab: 'market',
      subPanel: null,
    });
  },

  advanceLevel: () => {
    const s = get();
    const nextLevel = (s.campaign.level + 1) as CampaignLevel;
    if (nextLevel > 3) return;

    const newPlayer = createLevelTransitionState(s.player, nextLevel);
    const nw = netWorth(s.player);
    const newCampaign: CampaignState = {
      ...s.campaign,
      level: nextLevel,
      campaignStats: {
        ...s.campaign.campaignStats,
        totalDaysPlayed: s.campaign.campaignStats.totalDaysPlayed + Math.min(s.player.day - 1, DAYS_PER_LEVEL),
        totalProfit: s.campaign.campaignStats.totalProfit + s.player.profit,
        levelsCompleted: s.campaign.campaignStats.levelsCompleted + 1,
        levelScores: [...s.campaign.campaignStats.levelScores, {
          level: s.campaign.level,
          netWorth: nw,
          rep: s.player.rep,
          territories: Object.keys(s.player.territories).length,
        }],
      },
    };

    set({
      phase: 'levelIntro',
      player: newPlayer,
      campaign: newCampaign,
    });
  },

  travel: (locationId) => {
    const s = get();
    const result = travelLogic(s.player, locationId, s.campaign);

    // Process side effects
    processEffects(result.effects, set);

    // Show notifications
    for (const n of result.notifications) {
      get().notify(n.message, n.type);
    }

    if (result.notifications.length > 0 && result.player === s.player) return;

    // Same-location travel — no-op, don't increment ad counter
    if (result.player.location === s.player.location && result.phase === 'playing' && result.player.day === s.player.day) {
      return;
    }

    // Gang war encounter + territory raid checks (campaign L3 OR classic with active war)
    let finalPlayer = result.player;
    let finalPhase = result.phase;
    let updatedCampaign = s.campaign;

    const hasGangWarFeatures = (s.gameMode === 'campaign' && s.campaign.level === 3) || (s.gameMode === 'classic' && s.campaign.gangWar.activeWar);

    if (hasGangWarFeatures) {
      // Territory raid check (only when not already in an encounter, campaign only)
      if (finalPhase === 'playing' && s.gameMode === 'campaign') {
        const raid = checkTerritoryRaid(finalPlayer, updatedCampaign);
        if (raid) {
          const atLocation = finalPlayer.location === raid.locationId;
          const raidResult = resolveTerritoryRaid(finalPlayer, raid, atLocation);
          finalPlayer = raidResult.player;
          processEffects(raidResult.effects, set);
          for (const e of raidResult.effects) {
            if (e.type === 'shake') get().notify('Territory raided!', 'danger');
          }
        }
      }

      // Gang war encounter check — only when phase is 'playing' (don't override cops, bounty hunters, or game end)
      if (finalPhase === 'playing' && checkGangWarEncounter(finalPlayer, updatedCampaign)) {
        const war = updatedCampaign.gangWar.activeWar!;
        const gang = GANGS.find(g => g.id === war.targetGangId);
        const onTurf = gang?.turf.includes(finalPlayer.location);
        finalPlayer = {
          ...finalPlayer,
          cops: {
            count: 1,
            bribeCost: R(2000, 5000),
            regionLaw: finalPlayer.cops?.regionLaw || { forceName: 'Gang Fighters', forceEmoji: gang?.emoji || '⚔️', bribeMultiplier: 1, aggressionBase: 0, heatDecayBonus: 0, encounterModifier: 0, behavior: 'brutal' },
            gangWarBattle: {
              type: onTurf ? 'turf_fight' : 'ambush',
              gangId: war.targetGangId,
              enemyStrength: war.gangStrength,
            },
          },
        };
        finalPhase = 'cop';
      }
    }

    set({ player: finalPlayer, phase: finalPhase, campaign: updatedCampaign });
  },

  openTrade: (drugId, type) => {
    set({ activeTrade: { drugId, type }, tradeQuantity: '' });
  },

  setTradeQuantity: (qty) => set({ tradeQuantity: qty }),

  confirmTrade: () => {
    const s = get();
    if (!s.activeTrade) return;
    const drug = DRUGS.find(d => d.id === s.activeTrade!.drugId)!;
    const price = s.player.prices[drug.id] as number;
    if (!price) return;

    const used = inventoryCount(s.player.inventory);
    const free = effectiveSpace(s.player) - used;
    const own = s.player.inventory[drug.id] || 0;
    const maxBuy = Math.min(Math.floor(s.player.cash / price), free);
    const maxQty = s.activeTrade!.type === 'buy' ? maxBuy : own;
    const qty = s.tradeQuantity === 'max' ? maxQty : Math.min(parseInt(s.tradeQuantity) || 0, maxQty);

    if (qty <= 0) return;

    const result = executeTrade(s.player, drug.id, s.activeTrade!.type, qty);
    processEffects(result.effects, set);
    set({ player: result.player, activeTrade: null, tradeQuantity: '' });
  },

  closeTrade: () => set({ activeTrade: null, tradeQuantity: '' }),

  copAct: (action) => {
    const s = get();
    // Delegate gang war battles to resolveWarBattle
    if (s.player.cops?.gangWarBattle) {
      const warAction = action === 'bribe' ? 'negotiate' : action === 'run' ? 'retreat' : 'fight';
      s.resolveWarBattle(warAction as 'fight' | 'retreat' | 'negotiate');
      return;
    }
    const result = copAction(s.player, action);
    processEffects(result.effects, set);
    set({ player: result.player, phase: result.phase });
  },

  acceptOffer: () => {
    const result = handleOffer(get().player, true);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  declineOffer: () => {
    const result = handleOffer(get().player, false);
    set({ player: result.player });
  },

  bank: (action, amount) => {
    const result = bankAction(get().player, action, amount);
    set({ player: result });
  },

  shark: (amount) => {
    const result = payShark(get().player, amount);
    set({ player: result });
  },

  borrow: (amount) => {
    const result = borrowShark(get().player, amount);
    set({ player: result });
  },

  payConsignment: (amount) => {
    const result = payConsignmentLogic(get().player, amount);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  borrowGang: (gangId, amount) => {
    const result = borrowFromGangLogic(get().player, gangId, amount);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  payGangLoan: (amount) => {
    const result = payGangLoanLogic(get().player, amount);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  stashDrug: (drugId, qty) => {
    const result = stashDrugLogic(get().player, drugId, qty);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  retrieveDrug: (drugId, qty) => {
    const result = retrieveDrugLogic(get().player, drugId, qty);
    processEffects(result.effects, set);
    set({ player: result.player });
  },

  payRat: () => {
    const s = get();
    const result = payRatLogic(s.player);
    processEffects(result.effects, set);
    set({ player: result.player });
    if (result.player !== s.player) {
      if (result.tipGenerated) {
        get().notify('Loyalty boosted. Got a tip!', 'info');
      } else {
        get().notify('Loyalty boosted.', 'info');
      }
    }
  },

  declareWar: (gangId) => {
    const s = get();
    const result = declareGangWarLogic(s.player, s.campaign, gangId);
    processEffects(result.effects, set);
    set({ player: result.player, campaign: result.campaign });
  },

  resolveWarBattle: (action) => {
    const s = get();
    const result = gangWarBattleLogic(s.player, s.campaign, action);
    processEffects(result.effects, set);
    set({ player: result.player, campaign: result.campaign, phase: result.phase });
  },

  setTab: (tab) => set({ activeTab: tab, subPanel: null }),
  setSubPanel: (panel) => set(s => ({ subPanel: s.subPanel === panel ? null : panel })),

  setPlayerName: (name) => {
    // Sanitize: strip dangerous chars, limit length
    const clean = name.replace(/[<>"';&\\]/g, '').slice(0, 20);
    set({ playerName: clean });
  },

  dismissRules: () => set({ hasSeenRules: true }),

  markHelpSeen: (key) => set(s => ({ helpSeen: { ...s.helpSeen, [key]: true } })),

  resetToTitle: () => {
    set(s => ({
      phase: 'title',
      player: createPlayerState(),
      campaign: createDefaultCampaignState(),
      gameMode: s.gameMode,
      activeTab: 'market',
      activeTrade: null,
      tradeQuantity: '',
      subPanel: null,
      notifications: [],
      hasSeenRules: s.hasSeenRules,
      helpSeen: s.helpSeen,
      playerName: s.playerName,
      selectedPersona: null,
    }));
  },

  notify: (message, type = 'info') => {
    set(s => ({
      notifications: [...s.notifications.slice(-3), { message, type, key: Date.now() }],
    }));
    if (notifyTimeout) clearTimeout(notifyTimeout);
    notifyTimeout = setTimeout(() => {
      set({ notifications: [] });
    }, 3500);
  },

  clearNotifications: () => set({ notifications: [] }),
}));

// Process effects (shake + audio)
function processEffects(effects: SideEffect[], set: any) {
  const hasShake = effects.some(e => e.type === 'shake');
  if (hasShake) {
    set({ isShaking: true });
    setTimeout(() => set({ isShaking: false }), 500);
  }
  processSideEffects(effects);
}
