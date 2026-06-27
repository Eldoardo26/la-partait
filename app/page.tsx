'use client';

import { useState, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { useMatch, useSubmitVotes, type FieldPlayer } from '@/hooks/use-match';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { FieldPlayerCircle } from '@/components/FieldPlayer';
import { VoteModal } from '@/components/VoteModal';
import { FieldSkeleton, CardSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { WinBadge } from '@/components/WinBadge';

const VB_W = 340;
const VB_H = 520;

type VoteState = {
  votes: Record<string, number>;
  mvpId: string | null;
  modalPlayer: FieldPlayer | null;
  showSuccess: boolean;
};

type VoteAction =
  | { type: 'VOTE_UPDATE'; playerId: string; score: number; isMvp: boolean }
  | { type: 'MODAL_OPEN'; player: FieldPlayer }
  | { type: 'MODAL_CLOSE' }
  | { type: 'SHOW_SUCCESS' }
  | { type: 'HIDE_SUCCESS' }
  | { type: 'INIT'; votes: Record<string, number>; mvpId: string | null };

function voteReducer(state: VoteState, action: VoteAction): VoteState {
  switch (action.type) {
    case 'INIT':
      return { ...state, votes: action.votes, mvpId: action.mvpId };
    case 'VOTE_UPDATE': {
      const newVotes = { ...state.votes, [action.playerId]: action.score };
      const newMvpId = action.isMvp ? action.playerId : state.mvpId === action.playerId ? null : state.mvpId;
      return { ...state, votes: newVotes, mvpId: newMvpId, modalPlayer: null };
    }
    case 'MODAL_OPEN':
      return { ...state, modalPlayer: action.player };
    case 'MODAL_CLOSE':
      return { ...state, modalPlayer: null };
    case 'SHOW_SUCCESS':
      return { ...state, showSuccess: true };
    case 'HIDE_SUCCESS':
      return { ...state, showSuccess: false };
    default:
      return state;
  }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [state, dispatch] = useReducer(voteReducer, {
    votes: {},
    mvpId: null,
    modalPlayer: null,
    showSuccess: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('is_admin, avatar_url, nick_name')
      .eq('id_uuid', user.id)
      .single()
      .then(({ data }) => setUserProfile(data));
  }, [user]);

  const { data: matchData, isLoading: matchLoading } = useMatch(user?.id);
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard();
  const submitVotes = useSubmitVotes();

  useEffect(() => {
    if (matchData && user) {
      dispatch({ type: 'INIT', votes: matchData.userVotes, mvpId: matchData.mvpId });
    }
  }, [matchData, user]);

  if (state.showSuccess) {
    setTimeout(() => dispatch({ type: 'HIDE_SUCCESS' }), 2500);
  }

  function handlePlayerClick(player: FieldPlayer) {
    if (player.id === user?.id) return;
    dispatch({ type: 'MODAL_OPEN', player });
  }

  function handleVoteSave(score: number, isMvp: boolean) {
    if (!state.modalPlayer) return;
    dispatch({ type: 'VOTE_UPDATE', playerId: state.modalPlayer.id, score, isMvp });
  }

  async function handleSubmitVotes() {
    if (!user || !matchData?.match) return;
    await submitVotes.mutateAsync({
      matchId: matchData.match.id_uuid,
      voterId: user.id,
      votes: state.votes,
      mvpId: state.mvpId,
    });
    dispatch({ type: 'SHOW_SUCCESS' });
  }

  const hasVotes = Object.keys(state.votes).length > 0;

  const enrichedPlayers = matchData?.players.map((p) => ({
    ...p,
    score: state.votes[p.id] ?? p.score,
    mvp: state.mvpId === p.id ? true : p.mvp,
  })) ?? [];

  const matchDate = matchData?.match?.match_date
    ? new Date(matchData.match.match_date).toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div {...fadeSlide} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            La Partita
          </h1>
          {matchDate && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Calendar size={14} />
              {matchDate}
            </p>
          )}
        </div>
        {matchData?.match && (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            {matchData.match.match_type}
          </span>
        )}
      </motion.div>

      {/* Main layout: desktop 2-col, mobile 1-col */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pitch column */}
        <div className="lg:col-span-7 space-y-4">
          {matchLoading ? (
            <FieldSkeleton />
          ) : !matchData?.match ? (
            <motion.div {...fadeSlide}>
              <EmptyState
                icon="📭"
                title="Nessuna partita in corso"
                description="Chiedi all'admin di creare una nuova partita per iniziare a votare."
              />
            </motion.div>
          ) : (
            <motion.section
              {...fadeSlide}
              className="glass-card rounded-2xl p-4"
            >
              <div className="rounded-xl overflow-hidden border border-green-900/10">
                <svg
                  viewBox={`0 0 ${VB_W} ${VB_H}`}
                  className="w-full touch-none select-none"
                >
                  {/* Field background with gradient */}
                  <defs>
                    <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3a7a1e" />
                      <stop offset="100%" stopColor="#2a5a15" />
                    </linearGradient>
                    <pattern id="grassPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="0.5" fill="rgba(255,255,255,0.03)" />
                    </pattern>
                  </defs>
                  <rect width={VB_W} height={VB_H} rx="6" fill="url(#fieldGrad)" />
                  <rect width={VB_W} height={VB_H} rx="6" fill="url(#grassPattern)" />

                  {/* Field markings */}
                  <rect
                    x="12" y="12"
                    width={VB_W - 24} height={VB_H - 24}
                    fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"
                  />
                  <line
                    x1={VB_W / 2} y1="12" x2={VB_W / 2} y2={VB_H - 12}
                    stroke="rgba(255,255,255,0.25)" strokeWidth="1"
                  />
                  <circle
                    cx={VB_W / 2} cy={VB_H / 2} r="48"
                    fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"
                  />
                  <circle cx={VB_W / 2} cy={VB_H / 2} r="2" fill="rgba(255,255,255,0.4)" />

                  {/* Penalty areas */}
                  <rect x="122" y="12" width="96" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <rect x="122" y={VB_H - 72} width="96" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

                  {/* Players */}
                  <motion.g variants={stagger} initial="initial" animate="animate">
                    {enrichedPlayers.map((p) => (
                      <FieldPlayerCircle
                        key={p.id}
                        player={p}
                        isMe={p.id === user?.id}
                        onClick={handlePlayerClick}
                      />
                    ))}
                  </motion.g>
                </svg>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSubmitVotes}
                  disabled={!hasVotes || submitVotes.isPending}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                >
                  {submitVotes.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    `Salva Voti${hasVotes ? ` (${Object.keys(state.votes).length})` : ''}`
                  )}
                </button>
              </div>
            </motion.section>
          )}

          {/* Vote modal */}
          <AnimatePresence>
            {state.modalPlayer && (
              <VoteModal
                key={state.modalPlayer.id}
                player={state.modalPlayer}
                currentScore={state.votes[state.modalPlayer.id] ?? null}
                currentMvpId={state.mvpId}
                onSave={handleVoteSave}
                onClose={() => dispatch({ type: 'MODAL_CLOSE' })}
              />
            )}
          </AnimatePresence>

          {/* Success toast */}
          <AnimatePresence>
            {state.showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-sm"
              >
                ✅ Voti salvati con successo!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top players */}
          <motion.div {...fadeSlide} transition={{ delay: 0.1 }}>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-amber-500" />
                <h2 className="font-bold text-gray-900">Top 5 Giocatori</h2>
              </div>

              {leaderboardLoading ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData?.players.slice(0, 5).map((p, i) => (
                    <div
                      key={p.nick_name}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-gray-200 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-800 text-sm">{p.nick_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">⚽{p.goal}</span>
                        <span className="text-sm font-bold text-gray-900">{p.media_score}</span>
                        <WinBadge percentage={p.win_percentage} />
                      </div>
                    </div>
                  ))}
                  {(!leaderboardData?.players || leaderboardData.players.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">Nessun dato disponibile</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Match history */}
          <motion.div {...fadeSlide} transition={{ delay: 0.2 }}>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-blue-500" />
                <h2 className="font-bold text-gray-900">Ultime Partite</h2>
              </div>

              {leaderboardLoading ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData?.history.map((m) => (
                    <div
                      key={m.id_uuid}
                      className="py-2.5 px-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {new Date(m.match_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {m.match_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">
                          {m.risultato || '—'}
                        </span>
                        {m.MVP && (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            ⭐ MVP: {m.MVP}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!leaderboardData?.history || leaderboardData.history.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">Nessuna partita giocata</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
