'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase-browser';
import { X, Goal } from 'lucide-react';

type PlayerWithGoals = {
  id_uuid: string;
  nick_name: string;
  goals: number;
};

export default function CreateMatchPage() {
  const router = useRouter();

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithGoals[]>([]);
  const [numPlayers, setNumPlayers] = useState(5);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [risultato, setRisultato] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id_uuid, nick_name')
      .eq('is_approved', true)
      .then(({ data }) => { if (data) setAllPlayers(data); });
  }, []);

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(
      (p) =>
        p.nick_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedPlayers.find((sp) => sp.id_uuid === p.id_uuid)
    );
  }, [allPlayers, searchTerm, selectedPlayers]);

  const addPlayer = (player: any) => {
    if (selectedPlayers.length < numPlayers * 2) {
      setSelectedPlayers((prev) => [...prev, { ...player, goals: 0 }]);
      setSearchTerm('');
    }
  };

  const removePlayer = (id: string) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id_uuid !== id));
  };

  const setPlayerGoals = (id: string, goals: number) => {
    setSelectedPlayers((prev) =>
      prev.map((p) => (p.id_uuid === id ? { ...p, goals: Math.max(0, Math.min(20, goals)) } : p))
    );
  };

  const teamA = selectedPlayers.slice(0, numPlayers);
  const teamB = selectedPlayers.slice(numPlayers, numPlayers * 2);
  const totalGoalsA = teamA.reduce((sum, p) => sum + p.goals, 0);
  const totalGoalsB = teamB.reduce((sum, p) => sum + p.goals, 0);

  async function createMatch() {
    if (selectedPlayers.length !== numPlayers * 2) return;
    setSaving(true);

    const finalRisultato = risultato || `${totalGoalsA}-${totalGoalsB}`;

    // 1. Create match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        match_date: date,
        match_type: `Calcio a ${numPlayers * 2}`,
        status: 'APERTO',
        risultato: finalRisultato,
      })
      .select('id_uuid')
      .single();

    if (matchError || !match) {
      alert('Errore creazione match: ' + (matchError?.message || 'sconosciuto'));
      setSaving(false);
      return;
    }

    // 2. Insert match_players with team and goals
    const playerRows = selectedPlayers.map((p, i) => ({
      match_id: match.id_uuid,
      player_id: p.id_uuid,
      team: i < numPlayers ? 'A' : 'B',
      GOAL: p.goals,
      mvp: false,
    }));

    const { error: playersError } = await supabase.from('match_players').insert(playerRows);

    if (playersError) {
      alert('Errore assegnazione giocatori: ' + playersError.message);
      setSaving(false);
      return;
    }

    // 3. Update profile total goals
    const goalUpdates = selectedPlayers
      .filter((p) => p.goals > 0)
      .map(async (p) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('goal')
          .eq('id_uuid', p.id_uuid)
          .single();
        const currentGoals = profile?.goal || 0;
        await supabase
          .from('profiles')
          .update({ goal: currentGoals + p.goals })
          .eq('id_uuid', p.id_uuid);
      });

    await Promise.all(goalUpdates);

    alert('✅ Partita creata con successo!');
    router.push('/');
  }

  const canCreate = selectedPlayers.length === numPlayers * 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-4 space-y-6"
    >
      <h1 className="text-2xl font-extrabold text-gray-900">Crea Partita</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
          <select
            value={numPlayers}
            onChange={(e) => {
              setNumPlayers(Number(e.target.value));
              setSelectedPlayers([]);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={5}>5 vs 5</option>
            <option value={6}>6 vs 6</option>
            <option value={7}>7 vs 7</option>
          </select>
        </div>
      </div>

      {/* Risultato */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Risultato finale <span className="text-gray-400 font-normal">(es. 3-2)</span>
        </label>
        <input
          type="text"
          value={risultato}
          onChange={(e) => setRisultato(e.target.value)}
          placeholder={`${totalGoalsA}-${totalGoalsB}`}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg text-center"
        />
        <p className="text-xs text-gray-400 mt-1 text-center">
          Lascia vuoto per usare {totalGoalsA}-{totalGoalsB} calcolato dai gol
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          placeholder="Cerca giocatore..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {searchTerm && filteredPlayers.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filteredPlayers.map((p) => (
              <button
                key={p.id_uuid}
                onClick={() => addPlayer(p)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition"
              >
                {p.nick_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Teams with goal inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team A */}
        <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-blue-700 text-lg">Squadra A</h3>
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {totalGoalsA} gol
            </span>
          </div>
          <div className="space-y-2">
            {teamA.map((p) => (
              <div key={p.id_uuid} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.nick_name}</span>
                <div className="flex items-center gap-1">
                  <Goal size={14} className="text-blue-500" />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={p.goals}
                    onChange={(e) => setPlayerGoals(p.id_uuid, parseInt(e.target.value) || 0)}
                    className="w-12 text-center py-1 rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button onClick={() => removePlayer(p.id_uuid)} className="text-gray-300 hover:text-red-500 transition">
                  <X size={14} />
                </button>
              </div>
            ))}
            {teamA.length < numPlayers &&
              Array.from({ length: numPlayers - teamA.length }).map((_, i) => (
                <div key={`empty-a-${i}`} className="bg-white/50 rounded-xl px-3 py-2 border border-dashed border-blue-200 text-xs text-blue-400 text-center">
                  Cerca e aggiungi un giocatore
                </div>
              ))}
          </div>
        </div>

        {/* Team B */}
        <div className="bg-red-50/80 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-red-700 text-lg">Squadra B</h3>
            <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">
              {totalGoalsB} gol
            </span>
          </div>
          <div className="space-y-2">
            {teamB.map((p) => (
              <div key={p.id_uuid} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.nick_name}</span>
                <div className="flex items-center gap-1">
                  <Goal size={14} className="text-red-500" />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={p.goals}
                    onChange={(e) => setPlayerGoals(p.id_uuid, parseInt(e.target.value) || 0)}
                    className="w-12 text-center py-1 rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button onClick={() => removePlayer(p.id_uuid)} className="text-gray-300 hover:text-red-500 transition">
                  <X size={14} />
                </button>
              </div>
            ))}
            {teamB.length < numPlayers &&
              Array.from({ length: numPlayers - teamB.length }).map((_, i) => (
                <div key={`empty-b-${i}`} className="bg-white/50 rounded-xl px-3 py-2 border border-dashed border-red-200 text-xs text-red-400 text-center">
                  Cerca e aggiungi un giocatore
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={createMatch}
        disabled={saving || !canCreate}
        className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-40 active:scale-[0.98] transition"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creazione in corso...
          </span>
        ) : (
          `Crea Partita (${selectedPlayers.length}/${numPlayers * 2}) — Risultato: ${risultato || `${totalGoalsA}-${totalGoalsB}`}`
        )}
      </button>
    </motion.div>
  );
}
