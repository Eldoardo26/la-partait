'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Vote } from 'lucide-react';

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

function getPositions(count: number, isTeamA: boolean): [number, number][] {
  const yFlip = (y: number) => isTeamA ? 520 - y : y;
  const layouts: Record<number, [number, number][]> = {
    5: [[170, 35], [90, 115], [250, 115], [110, 200], [230, 200]],
    6: [[170, 35], [90, 105], [250, 105], [100, 180], [240, 180], [170, 235]],
    7: [[170, 35], [80, 100], [260, 100], [100, 165], [240, 165], [140, 230], [200, 230]],
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

const VB_W = 340;
const VB_H = 520;
const RADIUS = 18;

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [matches, setMatches] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openMatch, setOpenMatch] = useState<any>(null);
  const [fieldPlayers, setFieldPlayers] = useState<FieldPlayer[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [modal, setModal] = useState<VoteModal | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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

      const rawPlayers = (mp || []);
      const half = Math.ceil(rawPlayers.length / 2);
      const teamA = rawPlayers.slice(0, half);
      const teamB = rawPlayers.slice(half);

      if (teamA.length !== teamB.length && teamA.length > 0) {
        setTeamError(`Squadre asimmetriche: ${teamA.length} vs ${teamB.length}.`);
      }

      const posA = getPositions(teamA.length, true);
      const posB = getPositions(teamB.length, false);

      const built: FieldPlayer[] = [
        ...teamA.map((p: any, i: number) => ({ id: p.player_id, name: p.profiles?.nick_name || 'Giocatore', team: 'A' as const, pos: (posA[i] ?? [170, 460]) as [number, number], score: null, mvp: false })),
        ...teamB.map((p: any, i: number) => ({ id: p.player_id, name: p.profiles?.nick_name || 'Giocatore', team: 'B' as const, pos: (posB[i] ?? [170, 60]) as [number, number], score: null, mvp: false })),
      ];

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id_uuid', user.id).single();
        setIsAdmin(profile?.is_admin || false);
        const { data: myVotes } = await supabase.from('votes').select('target_id, score').eq('match_id', openMatchRes.data.id_uuid).eq('voter_id', user.id);
        if (myVotes) {
          const vObj: Record<string, number> = {};
          myVotes.forEach((v: any) => vObj[v.target_id] = v.score);
          setVotes(vObj);
          built.forEach(p => { if (vObj[p.id] !== undefined) p.score = vObj[p.id]; });
        }
      }
      setFieldPlayers(built);
    }
  }

  function openModal(p: FieldPlayer) {
    if (p.id === user?.id) return;
    setModal({ player: p, inputVal: p.score !== null ? String(p.score) : '', isMvp: p.id === mvpId });
  }

  function saveModal() {
    if (!modal) return;
    const raw = parseFloat(modal.inputVal.replace(',', '.'));
    if (isNaN(raw) || raw < 1 || raw > 10) return;
    const rounded = Math.round(raw * 2) / 2;
    const newMvpId = modal.isMvp ? modal.player.id : (mvpId === modal.player.id ? null : mvpId);
    setMvpId(newMvpId);
    setVotes(prev => ({ ...prev, [modal.player.id]: rounded }));
    setFieldPlayers(prev => prev.map(p => ({ ...p, score: p.id === modal.player.id ? rounded : p.score, mvp: p.id === newMvpId })));
    setModal(null);
  }

  async function submitVotes() {
    if (!user || !openMatch) return;
    const voteRows = Object.entries(votes).map(([playerId, score]) => ({ voter_id: user.id, target_id: playerId, match_id: openMatch.id_uuid, score }));
    await supabase.from('votes').upsert(voteRows);
    await supabase.from('match_players').update({ mvp: false }).eq('match_id', openMatch.id_uuid);
    if (mvpId) await supabase.from('match_players').update({ mvp: true }).eq('match_id', openMatch.id_uuid).eq('player_id', mvpId);
    alert('✅ Salvato!');
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">La Partita</h1>
      {openMatch && (
        <section className="bg-white p-4 rounded-xl shadow border">
          <div className="rounded-lg overflow-hidden border border-green-900 mb-4">
            <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full touch-none select-none">
              <rect width={VB_W} height={VB_H} rx="6" fill="#3B6D11" />
              {fieldPlayers.map(p => {
                const [cx, cy] = p.pos;
                const isMe = p.id === user?.id;
                const teamColor = isMe ? '#9CA3AF' : (p.team === 'A' ? '#378ADD' : '#E24B4A');
                return (
                  <g key={p.id} onClick={!isMe ? () => openModal(p) : undefined} style={{ cursor: isMe ? 'not-allowed' : 'pointer' }}>
                    <circle cx={cx} cy={cy} r={RADIUS} fill={teamColor} stroke="#fff" />
                    {isMe && <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={14}>🚫</text>}
                    <text x={cx} y={cy + 28} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9}>{p.name.split(' ')[0]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <button onClick={submitVotes} className="w-full bg-green-600 text-white py-2 rounded font-bold">Salva Voti</button>
        </section>
      )}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-5 w-64" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3">{modal.player.name}</p>
            <input type="number" value={modal.inputVal} onChange={e => setModal({ ...modal, inputVal: e.target.value })} className="w-full border p-2 mb-4" />
            <button onClick={saveModal} className="w-full bg-green-600 text-white py-2 rounded">Salva</button>
          </div>
        </div>
      )}
    </div>
  );
}