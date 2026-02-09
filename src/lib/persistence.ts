import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, isSupabaseConfigured, getSession } from './supabase';
import type { PlayerState } from '../types/game';

const LOCAL_SAVE_KEY = 'drugwars_save';

// ── Local Save/Load (Classic Mode / Offline) ───────────────
export async function saveLocal(state: PlayerState): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save locally:', e);
  }
}

export async function loadLocal(): Promise<PlayerState | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load locally:', e);
    return null;
  }
}

export async function clearLocal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOCAL_SAVE_KEY);
  } catch (e) {
    console.warn('Failed to clear local save:', e);
  }
}

// ── Cloud Save/Load (Supabase — subscribers) ───────────────
export async function saveToCloud(state: PlayerState): Promise<void> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return;
  const session = await getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('game_saves')
    .upsert({
      user_id: session.user.id,
      state: state,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) console.warn('Failed to save to cloud:', error);
}

export async function loadFromCloud(): Promise<PlayerState | null> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return null;
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('game_saves')
    .select('state')
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) return null;
  return data.state as PlayerState;
}

// ── Smart Save (local + cloud if subscriber) ───────────────
export async function saveGame(state: PlayerState, isSubscriber = false): Promise<void> {
  await saveLocal(state);
  if (isSubscriber) {
    await saveToCloud(state);
  }
}

export async function loadGame(isSubscriber = false): Promise<PlayerState | null> {
  // Try cloud first for subscribers
  if (isSubscriber) {
    const cloud = await loadFromCloud();
    if (cloud) return cloud;
  }
  // Fall back to local
  return loadLocal();
}
