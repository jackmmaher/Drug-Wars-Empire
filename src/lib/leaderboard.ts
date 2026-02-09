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

// Sanitize player name — strip dangerous chars, trim, collapse whitespace
function sanitizeName(name: string): string {
  return name
    .replace(/[<>"';&\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

// Clamp a number to a valid range
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function submitScore(entry: Omit<ScoreEntry, 'id' | 'played_at'>): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const cleanName = sanitizeName(entry.player_name);
    if (cleanName.length < 1) return false;

    const { data, error } = await supabase.rpc('submit_score', {
      p_player_name: cleanName,
      p_net_worth: clamp(entry.net_worth, -1000000, 100000000),
      p_rank_name: entry.rank_name || null,
      p_difficulty: entry.difficulty || 'standard',
      p_rep: clamp(entry.rep, 0, 1000),
      p_territories: clamp(entry.territories, 0, 30),
      p_milestones: clamp(entry.milestones, 0, 50),
      p_trades: clamp(entry.trades, 0, 10000),
      p_best_trade: clamp(entry.best_trade, 0, 100000000),
      p_fingers: clamp(entry.fingers, 0, 10),
      p_days_survived: clamp(entry.days_survived, 1, 90),
      p_won: entry.won,
    });

    if (error) {
      console.warn('Score submit failed:', error.message);
      return false;
    }

    return data?.ok === true;
  } catch {
    return false;
  }
}

export async function fetchLeaderboard(limit = 20): Promise<ScoreEntry[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('public_scores')
      .select('*')
      .order('net_worth', { ascending: false })
      .limit(Math.min(limit, 100));
    if (error) {
      console.warn('Leaderboard fetch failed:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchRecentScores(limit = 10): Promise<ScoreEntry[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('public_scores')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(Math.min(limit, 100));
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
