'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { EmptyState } from '@/components/EmptyState';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { useMatch } from '@/hooks/use-match';

export default function SchedinaPage() {
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: matchData, isLoading: matchLoading } = useMatch(user?.id);

  const { data: schedine } = useQuery({
    queryKey: ['schedine', matchData?.match?.id_uuid],
    queryFn: async () => {
      if (!matchData?.match?.id_uuid) return [];
      const { data } = await supabase
        .from('fantaschedina')
        .select('*, profiles!user_id(nick_name)')
        .eq('match_id', matchData.match.id_uuid)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!matchData?.match?.id_uuid,
  });

  const submitMutation = useMutation({
    mutationFn: async (rows: { player_id: string; predicted_goals: number; predicted_vote: number | null }[]) => {
      const inserts = rows.map((r) => ({
        match_id: matchData!.match!.id_uuid,
        user_id: user.id,
        ...r,
      }));
      const { error } = await supabase.from('fantaschedina').upsert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedine'] });
    },
  });

  const [schedinaState, setSchedinaState] = useState<Record<string, { goals: string; vote: string }>>({});

  function handleChange(playerId: string, field: 'goals' | 'vote', value: string) {
    setSchedinaState((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || { goals: '', vote: '' }), [field]: value },
    }));
  }

  function submit() {
    const rows = Object.entries(schedinaState)
      .filter(([, v]) => v.goals !== '' || v.vote !== '')
      .map(([playerId, v]) => ({
        player_id: playerId,
        predicted_goals: parseInt(v.goals) || 0,
        predicted_vote: v.vote ? parseFloat(v.vote) : null,
      }));

    if (rows.length === 0) return;
    submitMutation.mutate(rows);
  }

  if (matchLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!matchData?.match) {
    return (
      <EmptyState
        icon="📊"
        title="Nessuna partita in corso"
        description="La schedina è disponibile solo quando c'è una partita aperta."
      />
    );
  }

  const mySchedina: Record<string, any> = {};
  schedine?.forEach((s: any) => {
    if (s.user_id === user?.id) mySchedina[s.player_id] = s;
  });

  const hasSubmitted = Object.keys(mySchedina).length > 0;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{matchData.match.match_type}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              {new Date(matchData.match.match_date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {hasSubmitted && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
              Schedina inviata ✅
            </span>
          )}
        </div>

        {!hasSubmitted ? (
          <>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {matchData.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50"
                >
                  <span className={`w-2 h-2 rounded-full ${p.team === 'A' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <span className="flex-1 text-sm font-medium text-gray-800">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Gol"
                      min="0"
                      max="10"
                      value={schedinaState[p.id]?.goals || ''}
                      onChange={(e) => handleChange(p.id, 'goals', e.target.value)}
                      className="w-14 text-center py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Voto"
                      min="1"
                      max="10"
                      value={schedinaState[p.id]?.vote || ''}
                      onChange={(e) => handleChange(p.id, 'vote', e.target.value)}
                      className="w-16 text-center py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={submitMutation.isPending}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 active:scale-[0.98] transition"
            >
              {submitMutation.isPending ? 'Salvando...' : 'Invia Schedina'}
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Target size={12} />
              La tua schedina
            </p>
            {matchData.players.map((p) => {
              const s = mySchedina[p.id];
              return (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 text-xs">
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <div className="flex gap-3 text-gray-500">
                    <span>⚽ {s?.predicted_goals ?? 0}</span>
                    <span>⭐ {s?.predicted_vote ?? '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Other schedine */}
      {schedine && schedine.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5"
        >
          <p className="text-xs font-semibold text-gray-500 mb-3">
            Schedine inviate ({new Set(schedine.map((s: any) => s.user_id)).size})
          </p>
          {Array.from(new Set(schedine.map((s: any) => s.user_id))).map((uid: any) => {
            const userSchedina = schedine.filter((s: any) => s.user_id === uid);
            const nick = userSchedina[0]?.profiles?.nick_name || 'Anonimo';
            return (
              <div key={uid} className="mb-3 last:mb-0">
                <p className="text-xs font-bold text-gray-800 mb-1">{nick}</p>
                <div className="grid grid-cols-2 gap-1">
                  {userSchedina.map((s: any) => (
                    <div key={s.player_id} className="text-[11px] text-gray-500 flex justify-between px-2 py-1 bg-gray-50 rounded">
                      <span>{matchData.players.find((p: any) => p.id === s.player_id)?.name || '?'}</span>
                      <span>G:{s.predicted_goals} V:{s.predicted_vote ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
