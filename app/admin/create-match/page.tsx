'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type Sport = 'volley' | 'calcio';
type VolleyFormat = '4v4' | '5v5' | '6v6';
type SoccerFormat = '5v5' | '6v6' | '7v7' | '11v11';
type CourtType = 'indoor' | 'beach' | 'grass';

const VOLLEY_FORMATS: { value: VolleyFormat; label: string }[] = [
  { value: '4v4',   label: '4 vs 4' },
  { value: '5v5',   label: '5 vs 5' },
  { value: '6v6',   label: '6 vs 6' },
];

const SOCCER_FORMATS: { value: SoccerFormat; label: string }[] = [
  { value: '5v5',   label: 'Calcio a 5'  },
  { value: '6v6',   label: 'Calcio a 6'  },
  { value: '7v7',   label: 'Calcio a 7'  },
  { value: '11v11', label: 'Calcio a 11' },
];

const COURT_OPTIONS: { value: CourtType; label: string; emoji: string }[] = [
  { value: 'indoor', label: 'Palestra (Indoor)', emoji: '🏟️' },
  { value: 'beach',  label: 'Beach Volley',      emoji: '🏖️' },
  { value: 'grass',  label: 'Erba',              emoji: '🌿' },
];

function playersPerTeam(format: string): number {
  const n = parseInt(format);
  return isNaN(n) ? 5 : n;
}

export default function CreateMatchPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [players, setPlayers]     = useState<any[]>([]);
  const [teamA, setTeamA]         = useState<string[]>([]);
  const [teamB, setTeamB]         = useState<string[]>([]);
  const [date, setDate]           = useState('');
  const [sport, setSport]         = useState<Sport>('calcio');
  const [volleyFmt, setVolleyFmt] = useState<VolleyFormat>('6v6');
  const [soccerFmt, setSoccerFmt] = useState<SoccerFormat>('5v5');
  const [courtType, setCourtType] = useState<CourtType>('indoor');

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from('profiles').select('id_uuid, nick_name');
      if (data) setPlayers(data);
    }
    loadPlayers();
  }, [supabase]);

  const format    = sport === 'volley' ? volleyFmt : soccerFmt;
  const maxPerTeam = playersPerTeam(format);

  function switchSport(s: Sport) {
    setSport(s);
    setTeamA([]);
    setTeamB([]);
  }

  const toggleTeam = (id: string, team: 'A' | 'B') => {
    const currentTeam = team === 'A' ? teamA : teamB;
    const setTeam     = team === 'A' ? setTeamA : setTeamB;
    const setOther    = team === 'A' ? setTeamB : setTeamA;

    setOther(prev => prev.filter(p => p !== id));

    if (currentTeam.includes(id)) {
      setTeam(prev => prev.filter(p => p !== id));
    } else {
      if (currentTeam.length >= maxPerTeam) {
        return alert(`Squadra ${team} è già al completo (${maxPerTeam} giocatori)`);
      }
      setTeam(prev => [...prev, id]);
    }
  };

  async function createMatch() {
    if (!date) return alert('Inserisci la data!');
    if (teamA.length !== maxPerTeam || teamB.length !== maxPerTeam)
      return alert(`Ogni squadra deve avere esattamente ${maxPerTeam} giocatori!`);

    const matchType = sport === 'volley'
      ? `Pallavolo ${volleyFmt}`                  // es. "Pallavolo 6v6"
      : SOCCER_FORMATS.find(f => f.value === soccerFmt)?.label ?? `Calcio ${soccerFmt}`; // es. "Calcio a 5"

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert([{
        match_date: date,
        match_type: matchType,
        status:     'APERTO',
        TIPO:       sport === 'volley' ? courtType : 'grass',
        format:     format,
      }])
      .select('id')
      .single();

    if (matchErr) return console.error(matchErr);

    const playerRows = [
      ...teamA.map(pId => ({ match_id: match.id, player_id: pId, team: 'A', mvp: false, GOAL: 0 })),
      ...teamB.map(pId => ({ match_id: match.id, player_id: pId, team: 'B', mvp: false, GOAL: 0 })),
    ];

    const { error: playersErr } = await supabase.from('match_players').insert(playerRows);
    if (playersErr) return console.error(playersErr);

    alert('Partita creata!');
    router.push('/');
  }

  const isVolley = sport === 'volley';

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        {isVolley ? '🏐' : '⚽'} Crea Nuova Partita
      </h1>

      <div className="space-y-5 bg-white p-6 rounded-xl shadow-sm border">

        {/* Sport selector */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Sport</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => switchSport('calcio')}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition ${
                sport === 'calcio'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              ⚽ Calcio
            </button>
            <button
              onClick={() => switchSport('volley')}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition ${
                sport === 'volley'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
              }`}
            >
              🏐 Pallavolo
            </button>
          </div>
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Data</label>
          <input
            type="date"
            onChange={(e) => setDate(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
        </div>

        {/* Formato calcio */}
        {sport === 'calcio' && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Formato</label>
            <div className="grid grid-cols-4 gap-2">
              {SOCCER_FORMATS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSoccerFmt(opt.value); setTeamA([]); setTeamB([]); }}
                  className={`py-2 rounded-lg border font-semibold text-sm transition ${
                    soccerFmt === opt.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formato pallavolo */}
        {sport === 'volley' && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Formato</label>
              <div className="grid grid-cols-3 gap-2">
                {VOLLEY_FORMATS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setVolleyFmt(opt.value); setTeamA([]); setTeamB([]); }}
                    className={`py-2 rounded-lg border font-semibold text-sm transition ${
                      volleyFmt === opt.value
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Tipo di Campo</label>
              <div className="grid grid-cols-3 gap-2">
                {COURT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCourtType(opt.value)}
                    className={`py-2 px-3 rounded-lg border font-medium text-sm text-center transition ${
                      courtType === opt.value
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Selezione squadre */}
        <div className="grid grid-cols-2 gap-4">
          {(['A', 'B'] as const).map(team => {
            const currentTeam = team === 'A' ? teamA : teamB;
            const otherTeam   = team === 'A' ? teamB : teamA;
            const accent      = isVolley ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300';
            const accentCheck = isVolley ? 'accent-amber-500' : 'accent-green-600';
            return (
              <div key={team}>
                <p className="font-semibold mb-2 text-sm">
                  Squadra {team}{' '}
                  <span className="text-gray-400 font-normal">({currentTeam.length}/{maxPerTeam})</span>
                </p>
                <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {players.map(p => {
                    const inThis  = currentTeam.includes(p.id_uuid);
                    const inOther = otherTeam.includes(p.id_uuid);
                    return (
                      <label
                        key={p.id_uuid}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                          inThis  ? `${accent} border` :
                          inOther ? 'opacity-40 cursor-not-allowed' :
                                    'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inThis}
                          disabled={inOther}
                          onChange={() => toggleTeam(p.id_uuid, team)}
                          className={accentCheck}
                        />
                        <span className="text-sm">{p.nick_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stato */}
        <div className="text-xs text-gray-500 text-center">
          Squadra A: {teamA.length}/{maxPerTeam} · Squadra B: {teamB.length}/{maxPerTeam}
        </div>

        <button
          onClick={createMatch}
          className={`w-full py-3 rounded-xl font-bold text-white transition ${
            isVolley
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isVolley ? '🏐' : '⚽'} Crea Partita e Apri Voti
        </button>
      </div>
    </div>
  );
}
