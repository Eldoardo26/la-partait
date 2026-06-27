'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SetupPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const [mode, setMode] = useState<'search' | 'create' | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [nick, setNick] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('id_uuid, nick_name').then(({ data }) => setProfiles(data || []));
  }, []);

  async function completeSetup(data: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Se è un nuovo profilo, inseriscilo
    if (mode === 'create') {
      await supabase.from('profiles').insert({ id_uuid: user.id, nick_name: nick, has_completed_profile: true });
    } else {
      // Se si collega a uno esistente, aggiorna
      await supabase.from('profiles').update({ has_completed_profile: true }).eq('id_uuid', data.id_uuid);
    }
    router.push('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Chi sei?</h1>
        {!mode ? (
          <div className="space-y-3">
            <button onClick={() => setMode('search')} className="w-full p-3 border rounded-lg bg-blue-50">Cerca il mio nome</button>
            <button onClick={() => setMode('create')} className="w-full p-3 border rounded-lg bg-green-50">Crea nuovo profilo</button>
          </div>
        ) : mode === 'create' ? (
          <div className="space-y-3">
            <input placeholder="Tuo Nickname" onChange={e => setNick(e.target.value)} className="w-full p-2 border rounded" />
            <button onClick={completeSetup} className="w-full bg-green-600 text-white p-2 rounded">Salva</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {profiles.map(p => (
              <button key={p.id_uuid} onClick={() => completeSetup(p)} className="block w-full p-2 border-b">{p.nick_name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}