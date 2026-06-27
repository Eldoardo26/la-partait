'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { EmptyState } from '@/components/EmptyState';
import { CardSkeleton } from '@/components/SkeletonLoader';

export default function PronosticiPage() {
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches', 'open'],
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'APERTO')
        .order('match_date', { ascending: true });
      return data || [];
    },
  });

  const { data: predictions } = useQuery({
    queryKey: ['pronostici'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fantapronostici')
        .select('*, profiles!user_id(nick_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ matchId, result, scoreA, scoreB }: { matchId: string; result: string; scoreA: number | null; scoreB: number | null }) => {
      const { error } = await supabase.from('fantapronostici').upsert({
        match_id: matchId,
        user_id: user.id,
        predicted_result: result,
        predicted_score_a: scoreA,
        predicted_score_b: scoreB,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pronostici'] });
    },
  });

  const [predictionsState, setPredictionsState] = useState<Record<string, { result: string; scoreA: string; scoreB: string }>>({});

  function handlePrediction(matchId: string, result: string) {
    setPredictionsState((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { result: '', scoreA: '', scoreB: '' }), result },
    }));
  }

  function handleScoreChange(matchId: string, field: 'scoreA' | 'scoreB', value: string) {
    setPredictionsState((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { result: '', scoreA: '', scoreB: '' }), [field]: value },
    }));
  }

  function submit(matchId: string) {
    const p = predictionsState[matchId];
    if (!p?.result) return;
    submitMutation.mutate({
      matchId,
      result: p.result,
      scoreA: p.scoreA ? parseInt(p.scoreA) : null,
      scoreB: p.scoreB ? parseInt(p.scoreB) : null,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <EmptyState
        icon="🔮"
        title="Nessuna partita disponibile"
        description="Non ci sono partite APERTE al momento."
      />
    );
  }

  const submittedPreds: Record<string, any> = {};
  predictions?.forEach((p: any) => {
    if (submittedPreds[p.match_id]) {
      submittedPreds[p.match_id].push(p);
    } else {
      submittedPreds[p.match_id] = [p];
    }
  });

  return (
    <div className="space-y-4">
      {matches.map((m: any) => {
        const myPred = predictionsState[m.id_uuid];
        const preds = submittedPreds[m.id_uuid] || [];
        const userPred = user ? preds.find((p: any) => p.user_id === user.id) : null;

        return (
          <motion.div
            key={m.id_uuid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900">{m.match_type}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(m.match_date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              {userPred && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                  Pronosticato ✅
                </span>
              )}
            </div>

            {!userPred && (
              <>
                {/* Result buttons */}
                <div className="flex gap-2 mb-3">
                  {[
                    { key: 'A', label: 'Vince A', color: 'bg-blue-50 text-blue-700 border-blue-200', active: 'bg-blue-600 text-white border-blue-600' },
                    { key: 'DRAW', label: 'Pareggio', color: 'bg-gray-50 text-gray-600 border-gray-200', active: 'bg-gray-600 text-white border-gray-600' },
                    { key: 'B', label: 'Vince B', color: 'bg-red-50 text-red-700 border-red-200', active: 'bg-red-600 text-white border-red-600' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handlePrediction(m.id_uuid, opt.key)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition ${
                        myPred?.result === opt.key ? opt.active : opt.color
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="number"
                    placeholder="Gol A"
                    min="0"
                    max="20"
                    value={myPred?.scoreA || ''}
                    onChange={(e) => handleScoreChange(m.id_uuid, 'scoreA', e.target.value)}
                    className="w-20 text-center py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-400 font-bold">—</span>
                  <input
                    type="number"
                    placeholder="Gol B"
                    min="0"
                    max="20"
                    value={myPred?.scoreB || ''}
                    onChange={(e) => handleScoreChange(m.id_uuid, 'scoreB', e.target.value)}
                    className="w-20 text-center py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button
                  onClick={() => submit(m.id_uuid)}
                  disabled={!myPred?.result || submitMutation.isPending}
                  className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 active:scale-[0.98] transition"
                >
                  {submitMutation.isPending ? 'Salvando...' : 'Invia Pronostico'}
                </button>
              </>
            )}

            {/* Other predictions */}
            {preds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Pronostici ({preds.length})
                </p>
                <div className="space-y-1.5">
                  {preds.map((p: any) => (
                    <div key={p.id_uuid} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-gray-700">{p.profiles?.nick_name || 'Anonimo'}</span>
                      <span className={`font-semibold ${
                        p.predicted_result === 'A' ? 'text-blue-600' :
                        p.predicted_result === 'B' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {p.predicted_result === 'A' ? 'Vince A' : p.predicted_result === 'B' ? 'Vince B' : 'Pareggio'}
                        {p.predicted_score_a !== null && ` ${p.predicted_score_a}-${p.predicted_score_b}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
