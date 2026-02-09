import { create } from 'zustand';
import type { PlayerState, GamePhase, GameMode, TabId, TradeInfo, Offer } from '../types/game';
import {
  createPlayerState, travel as travelLogic, executeTrade, copAction,
  handleOffer, bankAction, payShark, borrowShark, payRat as payRatLogic,
  inventoryCount, netWorth, checkMilestones,
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
  mode: GameMode;
  phase: GamePhase;
  turn: number;
  player: PlayerState;
  p1: PlayerState | null;
  p2: PlayerState | null;

  // UI state
  activeTab: TabId;
  activeTrade: TradeInfo | null;
  tradeQuantity: string;
  isShaking: boolean;
  subPanel: string | null;
  notifications: Notification[];

  // Computed helpers
  currentPlayer: () => PlayerState;
  usedSpace: () => number;
  freeSpace: () => number;
  currentLocation: () => typeof LOCATIONS[0] | undefined;
  currentRank: () => ReturnType<typeof getRank>;
  currentNetWorth: () => number;

  // Actions
  startGame: (mode: GameMode) => void;
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
  payRat: () => void;
  setTab: (tab: TabId) => void;
  setSubPanel: (panel: string | null) => void;
  endTurn: () => void;
  resetToTitle: () => void;
  notify: (message: string, type?: string) => void;
  clearNotifications: () => void;
}

let notifyTimeout: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  mode: 'solo',
  phase: 'title',
  turn: 1,
  player: createPlayerState(),
  p1: null,
  p2: null,

  activeTab: 'market',
  activeTrade: null,
  tradeQuantity: '',
  isShaking: false,
  subPanel: null,
  notifications: [],

  // Computed
  currentPlayer: () => {
    const s = get();
    if (s.mode === '2p') return s.turn === 1 ? s.p1! : s.p2!;
    return s.player;
  },
  usedSpace: () => inventoryCount(get().currentPlayer().inventory),
  freeSpace: () => {
    const cp = get().currentPlayer();
    return cp.space - inventoryCount(cp.inventory);
  },
  currentLocation: () => {
    const cp = get().currentPlayer();
    return LOCATIONS.find(l => l.id === cp.location);
  },
  currentRank: () => getRank(get().currentPlayer().rep),
  currentNetWorth: () => netWorth(get().currentPlayer()),

  // Actions
  startGame: (mode) => {
    if (mode === '2p') {
      set({
        mode: '2p',
        phase: 'playing',
        turn: 1,
        p1: { ...createPlayerState('bronx') },
        p2: { ...createPlayerState('brooklyn') },
        player: createPlayerState(),
        activeTab: 'market',
        subPanel: null,
      });
    } else {
      set({
        mode: 'solo',
        phase: 'playing',
        turn: 1,
        player: createPlayerState(),
        p1: null,
        p2: null,
        activeTab: 'market',
        subPanel: null,
      });
    }
  },

  travel: (locationId) => {
    const s = get();
    const cp = s.currentPlayer();
    const result = travelLogic(cp, locationId);

    // Process side effects
    processEffects(result.effects, set);

    // Show notifications
    for (const n of result.notifications) {
      get().notify(n.message, n.type);
    }

    if (result.notifications.length > 0 && result.player === cp) return;

    if (s.mode === '2p') {
      const key = s.turn === 1 ? 'p1' : 'p2';
      // Handle 2P end-of-game
      if (result.phase === 'end' || result.phase === 'win') {
        const otherKey = s.turn === 1 ? 'p2' : 'p1';
        const other = s[otherKey as 'p1' | 'p2']!;
        if (result.player.day > DAYS && other.day > DAYS) {
          set({ [key]: result.player, phase: 'end' } as any);
        } else {
          set({ [key]: result.player, turn: s.turn === 1 ? 2 : 1, phase: 'playing' } as any);
        }
      } else {
        set({ [key]: result.player, phase: result.phase } as any);
      }
    } else {
      set({ player: result.player, phase: result.phase });
    }
  },

  openTrade: (drugId, type) => {
    set({ activeTrade: { drugId, type }, tradeQuantity: '' });
  },

  setTradeQuantity: (qty) => set({ tradeQuantity: qty }),

  confirmTrade: () => {
    const s = get();
    if (!s.activeTrade) return;
    const cp = s.currentPlayer();
    const drug = DRUGS.find(d => d.id === s.activeTrade!.drugId)!;
    const price = cp.prices[drug.id] as number;
    if (!price) return;

    const used = inventoryCount(cp.inventory);
    const free = cp.space - used;
    const own = cp.inventory[drug.id] || 0;
    const maxBuy = Math.min(Math.floor(cp.cash / price), free);
    const maxQty = s.activeTrade!.type === 'buy' ? maxBuy : own;
    const qty = s.tradeQuantity === 'max' ? maxQty : Math.min(parseInt(s.tradeQuantity) || 0, maxQty);

    if (qty <= 0) return;

    const result = executeTrade(cp, drug.id, s.activeTrade!.type, qty);
    processEffects(result.effects, set);

    if (s.mode === '2p') {
      const key = s.turn === 1 ? 'p1' : 'p2';
      set({ [key]: result.player, activeTrade: null, tradeQuantity: '' } as any);
    } else {
      set({ player: result.player, activeTrade: null, tradeQuantity: '' });
    }
  },

  closeTrade: () => set({ activeTrade: null, tradeQuantity: '' }),

  copAct: (action) => {
    const s = get();
    const cp = s.currentPlayer();
    const result = copAction(cp, action);
    processEffects(result.effects, set);

    if (s.mode === '2p') {
      const key = s.turn === 1 ? 'p1' : 'p2';
      set({ [key]: result.player, phase: result.phase } as any);
    } else {
      set({ player: result.player, phase: result.phase });
    }
  },

  acceptOffer: () => {
    const s = get();
    const cp = s.currentPlayer();
    const result = handleOffer(cp, true);
    processEffects(result.effects, set);
    updatePlayer(s, result.player, set);
  },

  declineOffer: () => {
    const s = get();
    const cp = s.currentPlayer();
    const result = handleOffer(cp, false);
    updatePlayer(s, result.player, set);
  },

  bank: (action, amount) => {
    const s = get();
    const cp = s.currentPlayer();
    const result = bankAction(cp, action, amount);
    updatePlayer(s, result, set);
  },

  shark: (amount) => {
    const s = get();
    const cp = s.currentPlayer();
    const result = payShark(cp, amount);
    updatePlayer(s, result, set);
  },

  borrow: (amount) => {
    const s = get();
    const cp = s.currentPlayer();
    const result = borrowShark(cp, amount);
    updatePlayer(s, result, set);
  },

  payRat: () => {
    const s = get();
    const cp = s.currentPlayer();
    const result = payRatLogic(cp);
    processEffects(result.effects, set);
    updatePlayer(s, result.player, set);
    if (result.player !== cp) get().notify('Loyalty boosted.', 'info');
  },

  setTab: (tab) => set({ activeTab: tab, subPanel: null }),
  setSubPanel: (panel) => set(s => ({ subPanel: s.subPanel === panel ? null : panel })),

  endTurn: () => {
    const s = get();
    if (s.mode === '2p') {
      set({ turn: s.turn === 1 ? 2 : 1 });
    }
  },

  resetToTitle: () => {
    set({
      mode: 'solo',
      phase: 'title',
      turn: 1,
      player: createPlayerState(),
      p1: null,
      p2: null,
      activeTab: 'market',
      activeTrade: null,
      tradeQuantity: '',
      subPanel: null,
      notifications: [],
    });
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

// Helper to update player state correctly for both modes
function updatePlayer(state: GameStore, player: PlayerState, set: any) {
  if (state.mode === '2p') {
    const key = state.turn === 1 ? 'p1' : 'p2';
    set({ [key]: player });
  } else {
    set({ player });
  }
}

// Process effects (shake + audio/haptics)
function processEffects(effects: SideEffect[], set: any) {
  const hasShake = effects.some(e => e.type === 'shake');
  if (hasShake) {
    set({ isShaking: true });
    setTimeout(() => set({ isShaking: false }), 500);
  }
  processSideEffects(effects);
}
