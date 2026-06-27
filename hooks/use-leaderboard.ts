'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

export interface LeaderboardPlayer {
  nick_name: string;
  media_score: number;
  win_percentage: number | null;
  goal: number;
}

export interface MatchHistory {
  id_uuid: string;
  match_date: string;
  risultato: string | null;
  match_type: string;
  MVP: string | null;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const [playersRes, matchesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('nick_name, media_score, win_percentage, goal')
          .not('media_score', 'is', null)
          .order('media_score', { ascending: false })
          .limit(10),
        supabase
          .from('matches')
          .select('id_uuid, match_date, risultato, match_type, "MVP"')
          .eq('status', 'FINITO')
          .order('match_date', { ascending: false })
          .limit(5),
      ]);

      const players: LeaderboardPlayer[] = (playersRes.data || []).map((p: any) => ({
        nick_name: p.nick_name,
        media_score: p.media_score,
        win_percentage: p.win_percentage ?? null,
        goal: p.goal || 0,
      }));

      const history: MatchHistory[] = (matchesRes.data || []).map((m: any) => ({
        id_uuid: m.id_uuid,
        match_date: m.match_date,
        risultato: m.risultato,
        match_type: m.match_type,
        MVP: m.MVP,
      }));

      return { players, history };
    },
  });
}
