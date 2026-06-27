'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

export interface FieldPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  team: 'A' | 'B';
  pos: [number, number];
  score: number | null;
  mvp: boolean;
  winPercentage: number | null;
}

export interface OpenMatch {
  id_uuid: string;
  match_date: string;
  match_type: string;
  status: string;
}

export interface MatchData {
  match: OpenMatch | null;
  players: FieldPlayer[];
  userVotes: Record<string, number>;
  mvpId: string | null;
}

function getPositions(count: number, isTeamA: boolean): [number, number][] {
  const yFlip = (y: number) => (isTeamA ? 520 - y : y);
  const layouts: Record<number, [number, number][]> = {
    5: [
      [170, 35],
      [90, 115],
      [250, 115],
      [110, 200],
      [230, 200],
    ],
    6: [
      [170, 35],
      [90, 105],
      [250, 105],
      [100, 180],
      [240, 180],
      [170, 235],
    ],
    7: [
      [170, 35],
      [80, 100],
      [260, 100],
      [100, 165],
      [240, 165],
      [140, 230],
      [200, 230],
    ],
  };
  const base = layouts[count] ?? layouts[5];
  return base.map(([x, y]) => [x, yFlip(y)]);
}

export function useMatch(userId: string | undefined) {
  return useQuery({
    queryKey: ['match', 'open', userId],
    queryFn: async (): Promise<MatchData> => {
      const result: MatchData = {
        match: null,
        players: [],
        userVotes: {},
        mvpId: null,
      };

      const { data: openMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'APERTO')
        .maybeSingle();

      if (!openMatch) return result;
      result.match = openMatch;

      const { data: mp } = await supabase
        .from('match_players')
        .select('*, profiles!inner(nick_name, avatar_url, win_percentage)')
        .eq('match_id', openMatch.id_uuid);

      const rawPlayers = mp || [];
      const half = Math.ceil(rawPlayers.length / 2);
      const teamA = rawPlayers.slice(0, half);
      const teamB = rawPlayers.slice(half);

      const posA = getPositions(teamA.length, true);
      const posB = getPositions(teamB.length, false);

      const built: FieldPlayer[] = [
        ...teamA.map((p: any, i: number) => ({
          id: p.player_id,
          name: p.profiles?.nick_name || 'Giocatore',
          avatarUrl: p.profiles?.avatar_url || null,
          team: 'A' as const,
          pos: (posA[i] ?? [170, 460]) as [number, number],
          score: null,
          mvp: p.mvp || false,
          winPercentage: p.profiles?.win_percentage ?? null,
        })),
        ...teamB.map((p: any, i: number) => ({
          id: p.player_id,
          name: p.profiles?.nick_name || 'Giocatore',
          avatarUrl: p.profiles?.avatar_url || null,
          team: 'B' as const,
          pos: (posB[i] ?? [170, 60]) as [number, number],
          score: null,
          mvp: p.mvp || false,
          winPercentage: p.profiles?.win_percentage ?? null,
        })),
      ];

      if (userId) {
        const { data: myVotes } = await supabase
          .from('votes')
          .select('target_id, score')
          .eq('match_id', openMatch.id_uuid)
          .eq('voter_id', userId);

        if (myVotes) {
          const vObj: Record<string, number> = {};
          let mvp: string | null = null;
          myVotes.forEach((v: any) => {
            vObj[v.target_id] = v.score;
          });
          built.forEach((p) => {
            if (vObj[p.id] !== undefined) p.score = vObj[p.id];
            if (p.mvp) mvp = p.id;
          });
          result.userVotes = vObj;
          result.mvpId = mvp;
        }
      }

      result.players = built;
      return result;
    },
    enabled: !!userId,
  });
}

export function useSubmitVotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      voterId,
      votes,
      mvpId,
    }: {
      matchId: string;
      voterId: string;
      votes: Record<string, number>;
      mvpId: string | null;
    }) => {
      const voteRows = Object.entries(votes).map(([playerId, score]) => ({
        voter_id: voterId,
        target_id: playerId,
        match_id: matchId,
        score,
      }));

      await supabase.from('votes').upsert(voteRows);
      await supabase.from('match_players').update({ mvp: false }).eq('match_id', matchId);
      if (mvpId) {
        await supabase
          .from('match_players')
          .update({ mvp: true })
          .eq('match_id', matchId)
          .eq('player_id', mvpId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', 'open'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
