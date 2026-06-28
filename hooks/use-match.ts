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
  matchVote: number | null;
  goals: number;
  totalGoals: number;
  mvp: boolean;
  winPercentage: number | null;
}

export interface MatchData {
  match: { id_uuid: string; match_date: string; match_type: string; status: string; TIPO: string } | null;
  players: FieldPlayer[];
  userVotes: Record<string, number>;
  mvpId: string | null;
}

function getPositions(count: number, isTeamA: boolean): [number, number][] {
  const yFlip = (y: number) => (isTeamA ? 520 - y : y);
  const layouts: Record<number, [number, number][]> = {
    5: [[170, 35],[90, 115],[250, 115],[110, 200],[230, 200]],
    6: [[170, 35],[90, 105],[250, 105],[100, 180],[240, 180],[170, 235]],
    7: [[170, 35],[80, 100],[260, 100],[100, 165],[240, 165],[140, 230],[200, 230]],
  };
  const base = layouts[count] ?? layouts[5];
  return base.map(([x, y]) => [x, yFlip(y)]);
}

export function useMatch(userId: string | undefined) {
  return useQuery({
    queryKey: ['match', 'open', userId],
    queryFn: async (): Promise<MatchData> => {
      const result: MatchData = { match: null, players: [], userVotes: {}, mvpId: null };

      // EXACTLY matches original working query: select('*').eq('status','APERTO').maybeSingle()
      const { data: openMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'APERTO')
        .maybeSingle();

      if (!openMatch) return result;
      result.match = openMatch;

      // EXACTLY matches original: select('*, profiles(nick_name)')
      const { data: mp } = await supabase
        .from('match_players')
        .select('*, profiles(nick_name)')
        .eq('match_id', openMatch.id_uuid);

      const rawPlayers = mp || [];

      // Group by team column (exists in your schema)
      const teamA = rawPlayers.filter((p: any) => p.team === 'A');
      const teamB = rawPlayers.filter((p: any) => p.team === 'B');

      // Fallback: if no team assigned, split by index like original code
      const useTeamA = teamA.length > 0 || teamB.length > 0
        ? teamA
        : rawPlayers.slice(0, Math.ceil(rawPlayers.length / 2));
      const useTeamB = teamB.length > 0 || teamA.length > 0
        ? teamB
        : rawPlayers.slice(Math.ceil(rawPlayers.length / 2));

      const posA = getPositions(useTeamA.length, true);
      const posB = getPositions(useTeamB.length, false);

      const buildPlayer = (p: any, team: 'A' | 'B', i: number, positions: [number, number][]): FieldPlayer => ({
        id: p.player_id,
        name: p.profiles?.nick_name || 'Giocatore',
        avatarUrl: null,
        team,
        pos: (positions[i] ?? [170, team === 'A' ? 460 : 60]) as [number, number],
        score: null,
        matchVote: p.voto ?? null,
        goals: p.GOAL || 0,
        totalGoals: 0,
        mvp: p.mvp || false,
        winPercentage: null,
      });

      const built: FieldPlayer[] = [
        ...useTeamA.map((p, i) => buildPlayer(p, 'A', i, posA)),
        ...useTeamB.map((p, i) => buildPlayer(p, 'B', i, posB)),
      ];

      if (userId) {
        // EXACTLY matches original vote query
        const { data: myVotes } = await supabase
          .from('votes')
          .select('target_id, score')
          .eq('match_id', openMatch.id_uuid)
          .eq('voter_id', userId);

        if (myVotes) {
          const vObj: Record<string, number> = {};
          myVotes.forEach((v: any) => { vObj[v.target_id] = v.score; });
          built.forEach((p) => {
            if (vObj[p.id] !== undefined) p.score = vObj[p.id];
          });
          result.userVotes = vObj;
        }

        const mvpPlayer = built.find((p) => p.mvp);
        result.mvpId = mvpPlayer?.id ?? null;
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
      // 1. Mappiamo le righe includendo la colonna "ha vinto?"
      // Nota: Assicurati che il nome della colonna nel DB sia esattamente "ha vinto?"
      // Se nel DB si chiama diversamente (es: "ha_vinto"), usa quel nome qui.
      const voteRows = Object.entries(votes).map(([playerId, score]) => ({
        voter_id: voterId,
        target_id: playerId,
        match_id: matchId,
        score: score,
        "ha vinto?": false, 
      }));

      // 2. Eseguiamo l'upsert e verifichiamo eventuali errori
      const { error: voteError } = await supabase.from('votes').upsert(voteRows);
      if (voteError) throw voteError;

      // 3. Gestione MVP su match_players
      const { error: resetMvpError } = await supabase
        .from('match_players')
        .update({ mvp: false })
        .eq('match_id', matchId);
      
      if (resetMvpError) throw resetMvpError;

      if (mvpId) {
        const { error: setMvpError } = await supabase
          .from('match_players')
          .update({ mvp: true })
          .eq('match_id', matchId)
          .eq('player_id', mvpId);
          
        if (setMvpError) throw setMvpError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', 'open'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}