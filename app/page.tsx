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

// ─── Dimensions (shared) ──────────────────────────────────────────────────────
const VB_W = 340;
const VB_H = 520;

// ─── Sport detection ─────────────────────────────────────────────────────────
// match_type examples: "Pallavolo 5v5", "Calcio a 5", "Calcio a 7", "Calcio a 11"
function detectSport(matchType: string): 'volley' | 'calcio' {
  const t = matchType?.toLowerCase() ?? '';
  return t.includes('pallavolo') || t.includes('volley') ? 'volley' : 'calcio';
}

// ─── Volleyball themes by TIPO ────────────────────────────────────────────────
const VOLLEY_THEMES: Record<string, { bg: string; bg2: string; line: string; label: string }> = {
  indoor: { bg: '#d4a017', bg2: '#b8880f', line: 'rgba(255,255,255,0.85)', label: '🏟️ Indoor'      },
  beach:  { bg: '#e8c87a', bg2: '#d4a84c', line: 'rgba(255,255,255,0.9)',  label: '🏖️ Beach Volley' },
  grass:  { bg: '#5a8f3c', bg2: '#3e6828', line: 'rgba(255,255,255,0.8)',  label: '🌿 Erba'          },
};

// ─── Volleyball player positions (4v4, 5v5, 6v6) ─────────────────────────────
function getVolleyPosition(side: 'A' | 'B', index: number, total: number): { x: number; y: number } {
  const top: Record<number, { x: number; y: number }[]> = {
    4: [{ x: VB_W/2-65, y:95  }, { x: VB_W/2+65, y:95  }, { x: VB_W/2-65, y:185 }, { x: VB_W/2+65, y:185 }],
    5: [{ x: VB_W/2, y:85 }, { x: VB_W/2-80, y:155 }, { x: VB_W/2, y:155 }, { x: VB_W/2+80, y:155 }, { x: VB_W/2, y:220 }],
    6: [{ x: VB_W/2-85, y:90 }, { x: VB_W/2, y:90 }, { x: VB_W/2+85, y:90 }, { x: VB_W/2-85, y:185 }, { x: VB_W/2, y:185 }, { x: VB_W/2+85, y:185 }],
  };
  const safeTotal = Math.min(Math.max(total, 4), 6) as 4|5|6;
  const positions = top[safeTotal] ?? top[6];
  const pos = positions[index] ?? { x: VB_W/2, y: 140 };
  return side === 'A' ? pos : { x: pos.x, y: VB_H - pos.y };
}

// ─── Soccer player positions (5, 6, 7, 11 per team) ──────────────────────────
function getSoccerPositions(total: number): { x: number; y: number }[] {
  if (total <= 5) {
    // Calcio a 5 — 1 GK + 2 DEF + 2 ATT
    return [
      { x: VB_W/2, y: 60 },
      { x: VB_W/2-60, y: 140 }, { x: VB_W/2+60, y: 140 },
      { x: VB_W/2-60, y: 215 }, { x: VB_W/2+60, y: 215 },
    ];
  }
  if (total === 6) {
    // Calcio a 6 — 1 GK + 2 DEF + 1 MID + 2 ATT
    return [
      { x: VB_W/2, y: 55 },
      { x: VB_W/2-70, y: 120 }, { x: VB_W/2+70, y: 120 },
      { x: VB_W/2, y: 180 },
      { x: VB_W/2-65, y: 230 }, { x: VB_W/2+65, y: 230 },
    ];
  }
  if (total <= 7) {
    // Calcio a 7 — 1 GK + 2 DEF + 2 MID + 2 ATT
    return [
      { x: VB_W/2, y: 55 },
      { x: VB_W/2-70, y: 115 }, { x: VB_W/2+70, y: 115 },
      { x: VB_W/2-70, y: 175 }, { x: VB_W/2+70, y: 175 },
      { x: VB_W/2-40, y: 230 }, { x: VB_W/2+40, y: 230 },
    ];
  }
  // Calcio a 11 — 4-3-3
  return [
    { x: VB_W/2, y: 45 },
    { x: VB_W/2-120, y:105 }, { x: VB_W/2-40, y:105 }, { x: VB_W/2+40, y:105 }, { x: VB_W/2+120, y:105 },
    { x: VB_W/2-80,  y:175 }, { x: VB_W/2,    y:175 }, { x: VB_W/2+80, y:175 },
    { x: VB_W/2-90,  y:235 }, { x: VB_W/2,    y:235 }, { x: VB_W/2+90, y:235 },
  ];
}

function getSoccerPosition(side: 'A' | 'B', index: number, total: number): { x: number; y: number } {
  const positions = getSoccerPositions(total);
  const pos = positions[index] ?? { x: VB_W/2, y: 140 };
  return side === 'A' ? pos : { x: pos.x, y: VB_H - pos.y };
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
    case 'INIT': return { ...state, votes: action.votes, mvpId: action.mvpId };
    case 'VOTE_UPDATE': {
      const newVotes = { ...state.votes, [action.playerId]: action.score };
      const newMvpId = action.isMvp ? action.playerId : state.mvpId === action.playerId ? null : state.mvpId;
      return { ...state, votes: newVotes, mvpId: newMvpId, modalPlayer: null };
    }
    case 'MODAL_OPEN':   return { ...state, modalPlayer: action.player };
    case 'MODAL_CLOSE':  return { ...state, modalPlayer: null };
    case 'SHOW_SUCCESS': return { ...state, showSuccess: true };
    case 'HIDE_SUCCESS': return { ...state, showSuccess: false };
    default: return state;
  }
}

const stagger   = { animate: { transition: { staggerChildren: 0.04 } } };
const fadeSlide = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

// ─── Shared props for both courts ─────────────────────────────────────────────
interface CourtProps {
  teamAPlayers: FieldPlayer[];
  teamBPlayers: FieldPlayer[];
  userId: string | null;
  votes: Record<string, number>;
  mvpId: string | null;
  onPlayerClick: (p: FieldPlayer) => void;
  courtType?: string; // volley only
}

// ─── Volleyball court ─────────────────────────────────────────────────────────
function VolleyballCourt({ courtType = 'indoor', teamAPlayers, teamBPlayers, userId, votes, mvpId, onPlayerClick }: CourtProps) {
  const theme = VOLLEY_THEMES[courtType] ?? VOLLEY_THEMES.indoor;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full touch-none select-none">
      <defs>
        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.bg} />
          <stop offset="100%" stopColor={theme.bg2} />
        </linearGradient>
      </defs>
      <rect width={VB_W} height={VB_H} rx="8" fill="url(#fieldGrad)" />
      <rect x="18" y="18" width={VB_W-36} height={VB_H-36} fill="none" stroke={theme.line} strokeWidth="2" />
      {/* Attack lines */}
      <line x1="18" y1={VB_H*0.38} x2={VB_W-18} y2={VB_H*0.38} stroke={theme.line} strokeWidth="1.5" strokeDasharray="7,5" opacity="0.55" />
      <line x1="18" y1={VB_H*0.62} x2={VB_W-18} y2={VB_H*0.62} stroke={theme.line} strokeWidth="1.5" strokeDasharray="7,5" opacity="0.55" />
      {/* Net */}
      <line x1="18" y1={VB_H/2} x2={VB_W-18} y2={VB_H/2} stroke={theme.line} strokeWidth="3.5" />
      <circle cx="18"        cy={VB_H/2} r="4.5" fill={theme.line} opacity="0.75" />
      <circle cx={VB_W-18}   cy={VB_H/2} r="4.5" fill={theme.line} opacity="0.75" />
      {[0.2,0.4,0.6,0.8].map(t => (
        <line key={t} x1={18+t*(VB_W-36)} y1={VB_H/2-7} x2={18+t*(VB_W-36)} y2={VB_H/2+7} stroke={theme.line} strokeWidth="1" opacity="0.3" />
      ))}
      <text x={VB_W/2} y="13"       textAnchor="middle" fontSize="9" fill={theme.line} opacity="0.75" fontWeight="700">SQUADRA A</text>
      <text x={VB_W/2} y={VB_H-5}   textAnchor="middle" fontSize="9" fill={theme.line} opacity="0.75" fontWeight="700">SQUADRA B</text>
      <motion.g variants={stagger} initial="initial" animate="animate">
        {teamAPlayers.map((p, i) => {
          const pos = getVolleyPosition('A', i, teamAPlayers.length);
          return (
            <FieldPlayerCircle
              key={p.id}
              player={{
                ...p,
                pos: [pos.x, pos.y] as [number, number],
                score: votes[p.id] ?? p.score,
                mvp: mvpId === p.id,
              }}
              isMe={p.id === userId}
              onClick={onPlayerClick}
            />
          );
        })}
        {teamBPlayers.map((p, i) => {
          const pos = getVolleyPosition('B', i, teamBPlayers.length);
          return (
            <FieldPlayerCircle
              key={p.id}
              player={{
                ...p,
                pos: [pos.x, pos.y] as [number, number],
                score: votes[p.id] ?? p.score,
                mvp: mvpId === p.id,
              }}
              isMe={p.id === userId}
              onClick={onPlayerClick}
            />
          );
        })}
      </motion.g>
    </svg>
  );
}

// ─── Soccer field ─────────────────────────────────────────────────────────────
function SoccerField({ teamAPlayers, teamBPlayers, userId, votes, mvpId, onPlayerClick }: CourtProps) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full touch-none select-none">
      <defs>
        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a7a1e" />
          <stop offset="100%" stopColor="#2a5a15" />
        </linearGradient>
        <pattern id="stripe" width="0" height="40" patternUnits="userSpaceOnUse">
          <rect width={VB_W} height="20" fill="rgba(0,0,0,0.04)" />
        </pattern>
      </defs>
      {/* Grass */}
      <rect width={VB_W} height={VB_H} rx="8" fill="url(#fieldGrad)" />
      <rect width={VB_W} height={VB_H} rx="8" fill="url(#stripe)" />
      {/* Outer boundary */}
      <rect x="14" y="14" width={VB_W-28} height={VB_H-28} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Halfway line */}
      <line x1="14" y1={VB_H/2} x2={VB_W-14} y2={VB_H/2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Centre circle */}
      <circle cx={VB_W/2} cy={VB_H/2} r="48" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <circle cx={VB_W/2} cy={VB_H/2} r="3"  fill="rgba(255,255,255,0.4)" />
      {/* Penalty areas */}
      <rect x="110" y="14"        width="120" height="65" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <rect x="110" y={VB_H-79}   width="120" height="65" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {/* Goal areas */}
      <rect x="140" y="14"       width="60" height="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="140" y={VB_H-42}  width="60" height="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Penalty spots */}
      <circle cx={VB_W/2} cy="88"        r="2" fill="rgba(255,255,255,0.3)" />
      <circle cx={VB_W/2} cy={VB_H-88}   r="2" fill="rgba(255,255,255,0.3)" />
      {/* Team labels */}
      <text x={VB_W/2} y="11" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.65)" fontWeight="700">SQUADRA A</text>
      <text x={VB_W/2} y={VB_H-4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.65)" fontWeight="700">SQUADRA B</text>
      {/* Players */}
      <motion.g variants={stagger} initial="initial" animate="animate">
        {teamAPlayers.map((p, i) => {
          const pos = getSoccerPosition('A', i, teamAPlayers.length);
          return (
            <FieldPlayerCircle
              key={p.id}
              player={{
                ...p,
                pos: [pos.x, pos.y] as [number, number],
                score: votes[p.id] ?? p.score,
                mvp: mvpId === p.id,
              }}
              isMe={p.id === userId}
              onClick={onPlayerClick}
            />
          );
        })}
        {teamBPlayers.map((p, i) => {
          const pos = getSoccerPosition('B', i, teamBPlayers.length);
          return (
            <FieldPlayerCircle
              key={p.id}
              player={{
                ...p,
                pos: [pos.x, pos.y] as [number, number],
                score: votes[p.id] ?? p.score,
                mvp: mvpId === p.id,
              }}
              isMe={p.id === userId}
              onClick={onPlayerClick}
            />
          );
        })}
      </motion.g>
    </svg>
  );
}

// ─── Smart field switcher ─────────────────────────────────────────────────────
function SportField(props: CourtProps & { matchType: string }) {
  const { matchType, ...rest } = props;
  const sport = detectSport(matchType);
  return sport === 'volley'
    ? <VolleyballCourt {...rest} />
    : <SoccerField {...rest} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [user, setUser]               = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [state, dispatch]             = useReducer(voteReducer, {
    votes: {}, mvpId: null, modalPlayer: null, showSuccess: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('is_admin, nick_name').eq('id_uuid', user.id).single()
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
      votes:   state.votes,
      mvpId:   state.mvpId,
    });
    dispatch({ type: 'SHOW_SUCCESS' });
  }

  const hasVotes = Object.keys(state.votes).length > 0;

  const teamAPlayers  = matchData?.players.filter(p => p.team === 'A') ?? [];
  const teamBPlayers  = matchData?.players.filter(p => p.team === 'B') ?? [];
  const totalVotable  = teamAPlayers.length + teamBPlayers.length - 1;

  const matchType  = matchData?.match?.match_type ?? '';
  const courtType  = matchData?.match?.TIPO ?? 'indoor';
  const sport      = detectSport(matchType);

  // Badge colour & label per sport
  const sportBadge = sport === 'volley'
    ? { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🏐' }
    : { bg: 'bg-green-100',  text: 'text-green-700',  icon: '⚽' };

  const volleyTheme = VOLLEY_THEMES[courtType] ?? VOLLEY_THEMES.indoor;

  const matchDate = matchData?.match?.match_date
    ? new Date(matchData.match.match_date).toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header */}
      <motion.div {...fadeSlide} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {sport === 'volley' ? '🏐' : '⚽'} La Partita
          </h1>
          {matchDate && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Calendar size={14} /> {matchDate}
            </p>
          )}
        </div>
        {matchData?.match && (
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sportBadge.bg} ${sportBadge.text}`}>
              {matchType}
            </span>
            {sport === 'volley' && (
              <span className="text-xs text-gray-400">{volleyTheme.label}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Field column */}
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
            <motion.section {...fadeSlide} className="glass-card rounded-2xl p-4">
              {/* Team bar */}
              <div className="flex justify-between text-xs font-semibold mb-2 px-1">
                <span className={sportBadge.text}>
                  {sportBadge.icon} Squadra A — {teamAPlayers.length}p
                </span>
                <span className="text-blue-600">
                  🔵 Squadra B — {teamBPlayers.length}p
                </span>
              </div>

              {/* Field — switches automatically */}
              <div className="rounded-xl overflow-hidden border border-gray-900/10">
                <SportField
                  matchType={matchType}
                  courtType={courtType}
                  teamAPlayers={teamAPlayers}
                  teamBPlayers={teamBPlayers}
                  userId={user?.id ?? null}
                  votes={state.votes}
                  mvpId={state.mvpId}
                  onPlayerClick={handlePlayerClick}
                />
              </div>

              {/* Vote progress */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-1">
                <span>{Object.keys(state.votes).length} / {totalVotable} voti dati</span>
                {state.mvpId && <span className="text-amber-500 font-semibold">⭐ MVP selezionato</span>}
              </div>

              {/* Submit */}
              <div className="mt-3">
                <button
                  onClick={handleSubmitVotes}
                  disabled={!hasVotes || submitVotes.isPending}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                    sport === 'volley' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
                  }`}
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
                className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-sm ${
                  sport === 'volley' ? 'bg-amber-500' : 'bg-green-600'
                }`}
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
                <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData?.players.slice(0, 5).map((p, i) => (
                    <div key={p.nick_name} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-gray-200 text-gray-600'   :
                          i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <span className="font-medium text-gray-800 text-sm">{p.nick_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{sport === 'volley' ? '🏐' : '⚽'}{p.goal ?? 0}</span>
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
                <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData?.history.map((m) => {
                    const s = detectSport(m.match_type ?? '');
                    return (
                      <div key={m.id_uuid} className="py-2.5 px-3 rounded-xl hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {new Date(m.match_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s === 'volley' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {s === 'volley' ? '🏐' : '⚽'} {m.match_type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">{m.risultato || '—'}</span>
                          {m.MVP && <span className="text-xs text-amber-600">⭐ MVP: {m.MVP}</span>}
                        </div>
                      </div>
                    );
                  })}
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
