import { create } from 'zustand';
import type { PlayerState, GamePhase, TabId, TradeInfo, PersonaId } from '../types/game';
import {
  createPlayerState, travel as travelLogic, executeTrade, copAction,
  handleOffer, bankAction, payShark, borrowShark, payRat as payRatLogic,
  payConsignment as payConsignmentLogic,
  borrowFromGang as borrowFromGangLogic, payGangLoan as payGangLoanLogic,
  stashDrug as stashDrugLogic, retrieveDrug as retrieveDrugLogic,
  inventoryCount, netWorth, checkMilestones, effectiveSpace,
  type SideEffect,
} from '../lib/game-logic';
import { getRank, DAYS, DRUGS, LOCATIONS } from '../constants/game';
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

  // UI state
  activeTab: TabId;
  activeTrade: TradeInfo | null;
  tradeQuantity: string;
  isShaking: boolean;
  subPanel: string | null;
  notifications: Notification[];
  hasSeenRules: boolean;

  // Ad state
  travelCount: number;
  showingAd: boolean;

  // Computed helpers
  usedSpace: () => number;
  freeSpace: () => number;
  currentLocation: () => typeof LOCATIONS[0] | undefined;
  currentRank: () => ReturnType<typeof getRank>;
  currentNetWorth: () => number;

  // Actions
  setSelectedPersona: (persona: PersonaId | null) => void;
  startGame: (difficulty?: 'conservative' | 'standard' | 'highroller') => void;
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
  setTab: (tab: TabId) => void;
  setSubPanel: (panel: string | null) => void;
  setPlayerName: (name: string) => void;
  dismissRules: () => void;
  dismissAd: () => void;
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

  activeTab: 'market',
  activeTrade: null,
  tradeQuantity: '',
  isShaking: false,
  subPanel: null,
  notifications: [],
  hasSeenRules: false,
  travelCount: 0,
  showingAd: false,

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

  startGame: (difficulty = 'standard') => {
    const persona = get().selectedPersona;
    set({
      phase: 'playing',
      player: createPlayerState('bronx', difficulty, persona),
      activeTab: 'market',
      subPanel: null,
    });
  },

  travel: (locationId) => {
    const s = get();
    const result = travelLogic(s.player, locationId);

    // Process side effects
    processEffects(result.effects, set);

    // Show notifications
    for (const n of result.notifications) {
      get().notify(n.message, n.type);
    }

    if (result.notifications.length > 0 && result.player === s.player) return;

    // Increment travel counter for ad interstitial timing
    const newTravelCount = s.travelCount + 1;
    const shouldShowAd = newTravelCount > 0 && newTravelCount % 5 === 0
      && result.phase === 'playing'; // No ads before cop encounters or game end

    set({ player: result.player, phase: result.phase, travelCount: newTravelCount, showingAd: shouldShowAd });
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
    const result = copAction(get().player, action);
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

  setTab: (tab) => set({ activeTab: tab, subPanel: null }),
  setSubPanel: (panel) => set(s => ({ subPanel: s.subPanel === panel ? null : panel })),

  setPlayerName: (name) => set({ playerName: name }),

  dismissRules: () => set({ hasSeenRules: true }),

  dismissAd: () => set({ showingAd: false }),

  resetToTitle: () => {
    set(s => ({
      phase: 'title',
      player: createPlayerState(),
      activeTab: 'market',
      activeTrade: null,
      tradeQuantity: '',
      subPanel: null,
      notifications: [],
      hasSeenRules: s.hasSeenRules,
      playerName: s.playerName,
      selectedPersona: null,
      travelCount: 0,
      showingAd: false,
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
