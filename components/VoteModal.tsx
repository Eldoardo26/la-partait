'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import type { FieldPlayer } from '@/hooks/use-match';

interface VoteModalProps {
  player: FieldPlayer;
  currentScore: number | null;
  currentMvpId: string | null;
  canAssignMvp: boolean;
  isMatchOpen: boolean;
  isLoading: boolean;
  onSave: (score: number, isMvp: boolean) => void;
  onClose: () => void;
}

export function VoteModal({ player, currentScore, currentMvpId, canAssignMvp, isMatchOpen, isLoading, onSave, onClose }: VoteModalProps) {
  const [inputVal, setInputVal] = useState(currentScore !== null ? String(currentScore) : '');
  const [isMvp, setIsMvp] = useState(player.id === currentMvpId);

  useEffect(() => {
    setInputVal(currentScore !== null ? String(currentScore) : '');
    setIsMvp(player.id === currentMvpId);
  }, [currentScore, currentMvpId, player.id]);

  function handleSave() {
    const raw = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(raw) || raw < 1 || raw > 10) return;
    const rounded = Math.round(raw * 2) / 2;
    onSave(rounded, isMvp);
  }

  const quickScores = [5, 5.5, 6, 6.5, 7, 7.5, 8];

  // Verifica se il voto è cambiato o se l'MVP è stato cambiato
  const isVoteChanged = () => {
    if (!inputVal) return false;
    const raw = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(raw)) return false;
    const rounded = Math.round(raw * 2) / 2;
    const mvpChanged = isMvp !== (player.id === currentMvpId);
    const scoreChanged = currentScore === null || rounded !== currentScore;
    return scoreChanged || mvpChanged;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X size={18} className="text-gray-400" />
        </button>

        {/* Player info */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              player.team === 'A' ? 'bg-blue-500' : 'bg-red-500'
            }`}
          >
            {player.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{player.name}</p>
            <p className="text-xs text-gray-500">Squadra {player.team}</p>
          </div>
        </div>

        {/* Player stats */}
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span>⚽ {player.goals} gol partita</span>
          <span>🏆 {player.totalGoals} gol totali</span>
          {player.matchVote !== null && <span>⭐ {player.matchVote} voto</span>}
        </div>

        {/* Score input */}
        <label className="block text-sm font-medium text-gray-700 mb-2">Voto (1-10)</label>
        <input
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="7.5"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          autoFocus
        />

        {/* Quick scores */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {quickScores.map((s) => (
            <button
              key={s}
              onClick={() => setInputVal(String(s))}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                inputVal === String(s)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* MVP toggle */}
        <button
          onClick={() => setIsMvp(!isMvp)}
          disabled={!canAssignMvp && !isMvp}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition ${
            !canAssignMvp && !isMvp
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : isMvp
              ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <Star size={16} fill={isMvp ? '#D97706' : 'none'} className={isMvp ? 'text-amber-600' : 'text-gray-400'} />
          {isMvp ? 'MVP selezionato' : 'Assegna MVP'}
        </button>

        {/* MVP warning message */}
        {!canAssignMvp && currentMvpId && currentMvpId !== player.id && (
          <p className="text-xs text-amber-600 mt-2 text-center font-medium">
            ⭐ MVP già assegnato. Toglilo prima di assegnarlo a un altro giocatore.
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isVoteChanged() || !isMatchOpen || isLoading}
          className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : !isMatchOpen ? (
            '🔒 Partita chiusa'
          ) : (
            'Salva Voto'
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
