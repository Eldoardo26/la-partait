'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { X } from 'lucide-react';

export default function CreateMatchPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [numPlayers, setNumPlayers] = useState(5);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default oggi
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from('profiles').select('id_uuid, nick_name').eq('is_approved', true);
      if (data) setAllPlayers(data);
    }
    loadPlayers();
  }, [supabase]);

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(p => 
      p.nick_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedPlayers.find(sp => sp.id_uuid === p.id_uuid)
    );
  }, [allPlayers, searchTerm, selectedPlayers]);

  const addPlayer = (player: any) => {
    if (selectedPlayers.length < numPlayers * 2) {
      setSelectedPlayers(prev => [...prev, player]);
      setSearchTerm('');
    }
  };

  const removePlayer = (id: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id_uuid !== id));
  };

  async function createMatch() {
    if (selectedPlayers.length !== numPlayers * 2) return;
    
    setSaving(true);

    // Chiamata singola al server (RPC) - Velocità istantanea
    const { error } = await supabase.rpc('create_match_with_players', {
      match_date_val: date,
      match_type_val: `Calcio a ${numPlayers * 2}`,
      player_ids: selectedPlayers.map(p => p.id_uuid)
    });

    if (error) {
      console.error(error);
      alert('Errore: ' + error.message);
      setSaving(false);
    } else {
      alert('✅ Partita creata con successo!');
      router.push('/');
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Crea Partita</h1>
      
      <input type="date" value={date} className="w-full border p-2 rounded" onChange={e => setDate(e.target.value)} />
      
      <select value={numPlayers} onChange={e => {setNumPlayers(Number(e.target.value)); setSelectedPlayers([])}} className="w-full border p-2 rounded">
        <option value={5}>5 vs 5</option>
        <option value={6}>6 vs 6</option>
        <option value={7}>7 vs 7</option>
      </select>

      <div className="relative">
        <input 
          placeholder="Cerca giocatore..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full border p-2 rounded"
        />
        {searchTerm && (
          <div className="absolute z-10 w-full bg-white border mt-1 shadow-lg max-h-40 overflow-y-auto">
            {filteredPlayers.map(p => (
              <button key={p.id_uuid} onClick={() => addPlayer(p)} className="block w-full text-left p-2 hover:bg-gray-100">
                {p.nick_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h3 className="font-bold text-blue-800 mb-2">Squadra A</h3>
          {selectedPlayers.slice(0, numPlayers).map(p => (
            <div key={p.id_uuid} className="flex justify-between text-sm py-1">
              {p.nick_name} <button onClick={() => removePlayer(p.id_uuid)}><X size={14}/></button>
            </div>
          ))}
        </div>
        <div className="bg-red-50 p-3 rounded">
          <h3 className="font-bold text-red-800 mb-2">Squadra B</h3>
          {selectedPlayers.slice(numPlayers, numPlayers * 2).map(p => (
            <div key={p.id_uuid} className="flex justify-between text-sm py-1">
              {p.nick_name} <button onClick={() => removePlayer(p.id_uuid)}><X size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={createMatch} 
        disabled={saving || selectedPlayers.length !== numPlayers * 2} 
        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold disabled:opacity-50"
      >
        {saving ? 'Creazione in corso...' : `Crea Partita (${selectedPlayers.length}/${numPlayers * 2})`}
      </button>
    </div>
  );
}