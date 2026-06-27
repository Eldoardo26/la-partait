'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function CreateMatchPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [type, setType] = useState('');

  // Carica i giocatori disponibili
  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from('profiles').select('id_uuid, nick_name');
      if (data) setPlayers(data);
    }
    loadPlayers();
  }, [supabase]);

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  async function createMatch() {
    if (!date || !type || selectedPlayers.length === 0) return alert("Compila tutto!");

    // 1. Crea il match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert([{ match_date: date, match_type: type, status: 'APERTO' }])
      .select('id')
      .single();

    if (matchErr) return console.error(matchErr);

    // 2. Crea le righe in match_players per ogni giocatore selezionato
    const playerRows = selectedPlayers.map(pId => ({
      match_id: match.id,
      player_id: pId
    }));

    const { error: playersErr } = await supabase.from('match_players').insert(playerRows);

    if (playersErr) return console.error(playersErr);

    alert("Partita creata e giocatori collegati!");
    router.push('/');
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Crea Nuova Partita</h1>
      
      <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
        <input type="date" onChange={(e) => setDate(e.target.value)} className="w-full border p-2 rounded" />
        <input type="text" placeholder="Tipo (es. Calcio a 5)" onChange={(e) => setType(e.target.value)} className="w-full border p-2 rounded" />
        
        <div className="mt-4">
          <p className="font-semibold mb-2">Seleziona Giocatori:</p>
          {players.map(p => (
            <label key={p.id_uuid} className="flex items-center space-x-2 p-2 border-b">
              <input type="checkbox" onChange={() => togglePlayer(p.id_uuid)} />
              <span>{p.nick_name}</span>
            </label>
          ))}
        </div>

        <button onClick={createMatch} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">
          Crea Partita e Apri Voti
        </button>
      </div>
    </div>
  );
}