'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Vote, Crown } from 'lucide-react';

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

// Posizioni sul campo SVG (viewBox 340x520) per squadre da 5, 6 o 7
function getPositions(count: number, isTeamA: boolean): [number, number][] {
  const yFlip = (y: number) => isTeamA ? 520 - y : y;

  const layouts: Record<number, [number, number][]> = {
    5: [
      [170, 40],   // portiere
      [90, 150],   // difensore sx
      [250, 150],  // difensore dx
      [110, 240],  // centrocampista sx
      [230, 240],  // centrocampista dx
    ],
    6: [
      [170, 40],
      [90, 140],
      [250, 140],
      [100, 220],
      [240, 220],
      [170, 210],
    ],
    7: [
      [170, 40],
      [80, 130],
      [260, 130],
      [80, 220],
      [260, 220],
      [140, 200],
      [200, 200],
    ],
  };

  const base = layouts[count] ?? layouts[5];
  return base.map(([x, y]) => [x, yFlip(y)]);
}

function scoreColor(s: number | null): string {
  if (s === null) return 'transparent';
  if (s >= 7) return '#639922';
  if (s >= 5.5) return '#BA7517';
  return '#E24B4A';
}

interface FieldPlayer {
  id: string;
  name: string;
  team: 'A' | 'B';
  pos: [number, number];
  score: number | null;
  mvp: boolean;
}

interface VoteModal {
  player: FieldPlayer;
  inputVal: string;
  isMvp: boolean;
}

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [matches, setMatches] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [citazione, setCitazione] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openMatch, setOpenMatch] = useState<any>(null);
  const [fieldPlayers, setFieldPlayers] = useState<FieldPlayer[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [modal, setModal] = useState<VoteModal | null>(null);

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
      const { data: mp } = await supabase
        .from('match_players')
        .select('*, profiles(nick_name)')
        .eq('match_id', openMatchRes.data.id_uuid);

      const rawPlayers = mp || [];

      // Dividi in due squadre di pari numero (metà A, metà B)
      const others = rawPlayers.filter((p: any) => p.player_id !== user?.id);
      const half = Math.ceil(others.length / 2);
      const teamA = others.slice(0, half);
      const teamB = others.slice(half);

      const posA = getPositions(teamA.length, true);
      const posB = getPositions(teamB.length, false);

      const built: FieldPlayer[] = [
        ...teamA.map((p: any, i: number) => ({
          id: p.player_id,
          name: p.profiles?.nick_name || 'Giocatore',
          team: 'A' as const,
          pos: posA[i] ?? [170, 460],
          score: null,
          mvp: false,
        })),
        ...teamB.map((p: any, i: number) => ({
          id: p.player_id,
          name: p.profiles?.nick_name || 'Giocatore',
          team: 'B' as const,
          pos: posB[i] ?? [170, 60],
          score: null,
          mvp: false,
        })),
      ];

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id_uuid', user.id).single();
        setIsAdmin(profile?.is_admin || false);

        const { data: myVotes } = await supabase
          .from('votes')
          .select('target_id, score')
          .eq('match_id', openMatchRes.data.id_uuid)
          .eq('voter_id', user.id);

        if (myVotes) {
          const vObj: Record<string, number> = {};
          myVotes.forEach((v: any) => (vObj[v.target_id] = v.score));
          setVotes(vObj);
          // Applica voti già salvati ai giocatori sul campo
          built.forEach(p => {
            if (vObj[p.id] !== undefined) p.score = vObj[p.id];
          });
        }
      }

      setFieldPlayers(built);
    }
    setLoading(false);
  }

  function openModal(p: FieldPlayer) {
    setModal({
      player: p,
      inputVal: p.score !== null ? String(p.score) : '',
      isMvp: p.id === mvpId,
    });
  }

  function saveModal() {
    if (!modal) return;
    const raw = parseFloat(modal.inputVal.replace(',', '.'));
    if (isNaN(raw) || raw < 1 || raw > 10) return;
    const rounded = Math.round(raw * 2) / 2;

    const newMvpId = modal.isMvp ? modal.player.id : (mvpId === modal.player.id ? null : mvpId);
    setMvpId(newMvpId);
    setVotes(prev => ({ ...prev, [modal.player.id]: rounded }));
    setFieldPlayers(prev =>
      prev.map(p => ({
        ...p,
        score: p.id === modal.player.id ? rounded : p.score,
        mvp: p.id === newMvpId,
      }))
    );
    setModal(null);
  }

  async function submitVotes() {
    if (!user || !openMatch) return;
    setSubmitting(true);

    const voteRows = Object.entries(votes).map(([playerId, score]) => ({
      voter_id: user.id,
      target_id: playerId,
      match_id: openMatch.id_uuid,
      score,
    }));

    await supabase.from('votes').upsert(voteRows);
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

    const grouped: Record<string, number[]> = {};
    allVotes?.forEach((v: any) => {
      if (!grouped[v.target_id]) grouped[v.target_id] = [];
      grouped[v.target_id].push(v.score);
    });

    for (const [pId, scores] of Object.entries(grouped)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      await supabase.from('match_players').update({ voto: avg.toFixed(2) }).eq('match_id', openMatch.id_uuid).eq('player_id', pId);
    }

    const { data: mvpData } = await supabase
      .from('match_players')
      .select('profiles(nick_name)')
      .eq('match_id', openMatch.id_uuid)
      .eq('mvp', true)
      .single();
    const mvpName = mvpData?.profiles ? (mvpData.profiles as any).nick_name : null;

    await supabase.from('matches').update({ status: 'FINITO', MVP: mvpName }).eq('id_uuid', openMatch.id_uuid);
    window.location.reload();
  }

  // --- SVG Campo ---
  function FieldSVG() {
    return (
      <svg viewBox="0 0 340 520" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Manto erboso */}
        <rect width="340" height="520" rx="6" fill="#3B6D11" />
        <rect x="10" y="10" width="320" height="500" rx="4" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        {/* Linea di metà campo */}
        <line x1="10" y1="260" x2="330" y2="260" stroke="#5DA832" strokeWidth="1.5" />
        {/* Cerchio centrale */}
        <circle cx="170" cy="260" r="40" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        <circle cx="170" cy="260" r="3" fill="#5DA832" />
        {/* Area superiore */}
        <rect x="110" y="10" width="120" height="55" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        <rect x="140" y="10" width="60" height="25" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        {/* Area inferiore */}
        <rect x="110" y="455" width="120" height="55" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        <rect x="140" y="485" width="60" height="25" fill="none" stroke="#5DA832" strokeWidth="1.5" />
        {/* Rigori */}
        <circle cx="170" cy="75" r="3" fill="#5DA832" />
        <circle cx="170" cy="445" r="3" fill="#5DA832" />

        {/* Giocatori */}
        {fieldPlayers.map(p => {
          const [cx, cy] = p.pos;
          const teamColor = p.team === 'A' ? '#378ADD' : '#E24B4A';
          const initials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const sc = votes[p.id] ?? p.score;
          const hasScore = sc !== undefined && sc !== null;

          return (
            <g key={p.id} onClick={() => openModal(p)} style={{ cursor: 'pointer' }}>
              {/* Anello voto */}
              {hasScore && (
                <circle cx={cx} cy={cy} r={22} fill="none" stroke={scoreColor(sc)} strokeWidth={3} />
              )}
              {/* Cerchio giocatore */}
              <circle cx={cx} cy={cy} r={18} fill={teamColor} stroke="#fff" strokeWidth={p.id === mvpId ? 3 : 1.5} />
              {/* Iniziali */}
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={10} fontWeight={500}>{initials}</text>
              {/* Nome */}
              <text x={cx} y={cy + 28} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9}>{p.name.split(' ')[0]}</text>
              {/* Voto */}
              {hasScore && (
                <text x={cx + 14} y={cy - 14} textAnchor="middle" dominantBaseline="middle" fill={scoreColor(sc)} fontSize={10} fontWeight={500}>{Number(sc).toFixed(1)}</text>
              )}
              {/* Corona MVP */}
              {p.id === mvpId && (
                <text x={cx - 14} y={cy - 14} textAnchor="middle" dominantBaseline="middle" fontSize={13}>♛</text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">La Partita</h1>

      <div className="bg-blue-100 p-4 rounded-lg italic text-blue-900 border-l-4 border-blue-500">
        "{citazione}"
      </div>

      {openMatch && (
        <section className="bg-white p-4 rounded-xl shadow border">
          <h2 className="font-bold mb-1 flex items-center gap-2">
            <Vote className="text-green-500" /> Vota Giocatori
          </h2>
          <p className="text-xs text-gray-500 mb-3 italic">
            Tocca un giocatore sul campo per votarlo. La corona ♛ indica l'MVP.
          </p>

          {/* Legenda */}
          <div className="flex gap-4 text-xs text-gray-500 mb-3 justify-center">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#378ADD] inline-block" /> Squadra A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#E24B4A] inline-block" /> Squadra B
            </span>
          </div>

          {/* Campo SVG */}
          <div className="rounded-lg overflow-hidden border border-green-900 mb-4">
            <FieldSVG />
          </div>

          <button
            onClick={submitVotes}
            disabled={submitting}
            className="w-full bg-green-600 text-white py-2 rounded font-bold mb-2"
          >
            Salva Voti e MVP
          </button>
          {isAdmin && (
            <button
              onClick={closeVoting}
              disabled={closing}
              className="w-full bg-red-600 text-white py-2 rounded font-bold"
            >
              Chiudi Voti
            </button>
          )}
        </section>
      )}

      {/* Modal voto */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl p-5 w-64 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className={`inline-block px-2 py-0.5 rounded text-xs mb-2 font-medium ${
              modal.player.team === 'A'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Squadra {modal.player.team}
            </div>
            <p className="font-semibold text-base mb-1">{modal.player.name}</p>
            <p className="text-xs text-gray-400 mb-3">Inserisci il voto (1–10)</p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={modal.inputVal}
                onChange={e => setModal({ ...modal, inputVal: e.target.value })}
                placeholder="6.5"
                className="w-20 border rounded p-2 text-center text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={() => setModal({ ...modal, isMvp: !modal.isMvp })}
                className={`text-2xl p-1 rounded-full transition-colors ${
                  modal.isMvp ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300'
                }`}
                title="Segna come MVP"
              >
                ♛
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-300 rounded py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={saveModal}
                className="flex-1 bg-green-600 text-white rounded py-1.5 text-sm font-semibold hover:bg-green-700"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
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
