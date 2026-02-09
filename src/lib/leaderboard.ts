import { getSupabase } from './supabase';

export interface ScoreEntry {
  id: number;
  player_name: string;
  net_worth: number;
  rank_name: string;
  difficulty: string;
  rep: number;
  territories: number;
  milestones: number;
  trades: number;
  best_trade: number;
  fingers: number;
  days_survived: number;
  won: boolean;
  played_at: string;
}

export async function submitScore(entry: Omit<ScoreEntry, 'id' | 'played_at'>): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from('scores').insert(entry);
    if (error) { console.warn('Score submit failed:', error.message); return false; }
    return true;
  } catch { return false; }
}

export async function fetchLeaderboard(limit = 20): Promise<ScoreEntry[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('net_worth', { ascending: false })
      .limit(limit);
    if (error) { console.warn('Leaderboard fetch failed:', error.message); return []; }
    return data || [];
  } catch { return []; }
}

export async function fetchRecentScores(limit = 10): Promise<ScoreEntry[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch { return []; }
}
