'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { WinBadge } from '@/components/WinBadge';
import { CardSkeleton } from '@/components/SkeletonLoader';

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function ClassificaPage() {
  const { data, isLoading } = useLeaderboard();
  const [filter, setFilter] = useState<'all' | '5' | '6' | '7'>('all');

  const filteredHistory = (data?.history || []).filter((m) => {
    if (filter === 'all') return true;
    const count = parseInt(m.match_type.match(/\d+/)?.[0] || '0');
    return count === parseInt(filter) * 2;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <motion.div {...fadeSlide}>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" />
          Classifica
        </h1>
      </motion.div>

      {/* Top players */}
      <motion.section {...fadeSlide} transition={{ delay: 0.05 }}>
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Migliori Giocatori
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="space-y-1">
              {data?.players.map((p, i) => (
                <div
                  key={p.nick_name}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? 'bg-amber-100 text-amber-700'
                          : i === 1
                            ? 'bg-gray-200 text-gray-600'
                            : i === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-800">{p.nick_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400">⚽{p.goal}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{p.media_score}</span>
                      <p className="text-[10px] text-gray-400">media</p>
                    </div>
                    <WinBadge percentage={p.win_percentage} />
                  </div>
                </div>
              ))}
              {(!data?.players || data.players.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-6">Nessun dato disponibile</p>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* Match history */}
      <motion.section {...fadeSlide} transition={{ delay: 0.1 }}>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={16} className="text-green-500" />
              Storico Partite
            </h2>

            {/* Filter */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'all', label: 'Tutte' },
                { key: '5', label: '5v5' },
                { key: '6', label: '6v6' },
                { key: '7', label: '7v7' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    filter === opt.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredHistory.map((m) => (
                <div
                  key={m.id_uuid}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14">
                      {new Date(m.match_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {m.match_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{m.risultato || '—'}</span>
                    {m.MVP && (
                      <span className="text-xs text-amber-600 flex items-center gap-0.5">
                        ⭐ {m.MVP}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nessuna partita trovata</p>
              )}
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
