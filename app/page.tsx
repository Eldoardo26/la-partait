'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Vote, Crown, X } from 'lucide-react';
import Link from 'next/link';

const citazioni = [
  "Non dire gatto se non ce l'hai nel sacco.",
  "E anche oggi si vince domani.",
  "Il calcio è semplice, ma è difficile fare le cose semplici.",
  "Io non sono un pirla.",
  "Zero tituli.",
  "Dai, dai, dai!",
  "È stata una partita maschia.",
  "C'è un clima da guerra."
];

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [matches, setMatches] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [citazione, setCitazione] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openMatch, setOpenMatch] = useState<any>(null);
  const [matchPlayers, setMatchPlayers] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setCitazione(citazioni[Math.floor(Math.random() * citazioni.length)]);
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    const [matchesRes, playersRes, openMatchRes] = await Promise.all([
      supabase.from('matches').select('id_uuid, match_date, risultato, "MVP"').eq('status', 'FINITO').order('match_date', { ascending: false }).limit(5),
      supabase.from('profiles').select('nick_name, media_score').not('media_score', 'is', null).order('media_score', { ascending: false }).limit(5),
      supabase.from('matches').select('*').eq('status', 'APERTO').maybeSingle(),
    ]);

    setMatches(matchesRes.data || []);
    setTopPlayers(playersRes.data || []);

    if (openMatchRes.data) {
      setOpenMatch(openMatchRes.data);
      const { data: mp } = await supabase.from('match_players').select('*, profiles(nick_name)').eq('match_id', openMatchRes.data.id_uuid);
      setMatchPlayers(mp || []);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id_uuid', user.id).single();
        setIsAdmin(profile?.is_admin || false);

        const { data: myVotes } = await supabase.from('votes').select('target_id, score').eq('match_id', openMatchRes.data.id_uuid).eq('voter_id', user.id);
        if (myVotes) {
          const vObj: any = {};
          myVotes.forEach(v => vObj[v.target_id] = v.score);
          setVotes(vObj);
        }
      }
    }
    setLoading(false);
  }

  const handleVoteChange = (pId: string, val: string) => {
    const formatted = parseFloat(val.replace(',', '.'));
    setVotes({...votes, [pId]: formatted});
  };

  async function submitVotes() {
    if (!user || !openMatch) return;
    setSubmitting(true);
    
    const voteRows = Object.entries(votes).map(([playerId, score]) => ({
      voter_id: user.id,
      target_id: playerId,
      match_id: openMatch.id_uuid,
      score: score
    }));

    await supabase.from('votes').upsert(voteRows);
    
    // Aggiorna MVP
    await supabase.from('match_players').update({ mvp: false }).eq('match_id', openMatch.id_uuid);
    if (mvpId) {
      await supabase.from('match_players').update({ mvp: true }).eq('match_id', openMatch.id_uuid).eq('player_id', mvpId);
    }

    alert('✅ Voti e MVP salvati!');
    setSubmitting(false);
  }

  async function closeVoting() {
    setClosing(true);
    const { data: allVotes } = await supabase.from('votes').select('target_id, score').eq('match_id', openMatch.id_uuid);
    
    const grouped: any = {};
    allVotes?.forEach(v => {
      if (!grouped[v.target_id]) grouped[v.target_id] = [];
      grouped[v.target_id].push(v.score);
    });

    for (const [pId, scores] of Object.entries(grouped)) {
      const avg = (scores as number[]).reduce((a, b) => a + b, 0) / (scores as number[]).length;
      await supabase.from('match_players').update({ voto: avg.toFixed(2) }).eq('match_id', openMatch.id_uuid).eq('player_id', pId);
    }

    const { data: mvpData } = await supabase.from('match_players').select('profiles(nick_name)').eq('match_id', openMatch.id_uuid).eq('mvp', true).single();
    const mvpName = mvpData?.profiles ? (mvpData.profiles as any).nick_name : null;

    await supabase.from('matches').update({ status: 'FINITO', "MVP": mvpName }).eq('id_uuid', openMatch.id_uuid);
    window.location.reload();
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">La Partita</h1>

      <div className="bg-blue-100 p-4 rounded-lg italic text-blue-900 border-l-4 border-blue-500">
        "{citazione}"
      </div>
      
      {openMatch && (
        <section className="bg-white p-4 rounded-xl shadow border">
          <h2 className="font-bold mb-1 flex items-center gap-2"><Vote className="text-green-500" /> Vota Giocatori</h2>
          <p className="text-xs text-gray-500 mb-4 italic">Usa la virgola per i decimali. Clicca sulla <Crown size={12} className="inline text-yellow-500"/> per l'MVP.</p>
          
          <div className="space-y-3">
            {matchPlayers.filter(mp => mp.player_id !== user?.id).map(mp => (
              <div key={mp.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMvpId(mp.player_id)} className={`p-1 rounded-full ${mvpId === mp.player_id ? 'text-yellow-500 bg-yellow-100' : 'text-gray-300'}`}>
                        <Crown size={18} />
                    </button>
                    <span className="text-sm font-medium">{mp.profiles?.nick_name || 'Giocatore'}</span>
                </div>
                <input
                  type="text" 
                  value={votes[mp.player_id] ?? ''}
                  onChange={e => handleVoteChange(mp.player_id, e.target.value)}
                  className="w-16 border rounded p-1 text-center"
                />
              </div>
            ))}
            <button onClick={submitVotes} disabled={submitting} className="w-full bg-green-600 text-white py-2 rounded font-bold">Salva Voti e MVP</button>
            {isAdmin && <button onClick={closeVoting} disabled={closing} className="w-full bg-red-600 text-white py-2 rounded font-bold">Chiudi Voti</button>}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold mb-3">Ultime 5 Partite</h2>
        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.id_uuid} className="bg-white p-3 rounded shadow border">
              <div className="flex justify-between font-bold">
                <span>{new Date(m.match_date).toLocaleDateString()}</span>
                <span>{m.risultato || '-'}</span>
              </div>
              {m.MVP && <div className="text-xs text-yellow-600">MVP: {m.MVP}</div>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Top 5 Giocatori</h2>
        <div className="bg-white p-4 rounded shadow border">
          {topPlayers.map((p, i) => (
            <div key={i} className="flex justify-between py-1 border-b">
              <span>{p.nick_name}</span>
              <span className="font-bold text-green-600">{Number(p.media_score).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}