'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation'; // Importa useRouter

export default function ProfilePage() {
  const router = useRouter(); // Inizializza router
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        setEmail(user.email || '');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id_uuid', user.id)
          .single();

        if (data) {
          setProfile(data);
          setNickname(data.nick_name || '');
        }
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  async function updateNickname() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ nick_name: nickname })
      .eq('id_uuid', session.user.id);

    if (error) alert('Errore: ' + error.message);
    else alert('Profilo aggiornato!');
  }

  // Funzione per il Logout
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login'); // Riporta al login dopo il logout
    router.refresh(); // Forza il refresh per aggiornare la Navbar
  }

  if (loading) return <div className="p-10 text-center">Caricamento...</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-2xl border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Il mio Profilo</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
          <p className="text-gray-900 font-medium">{email || 'Non loggato'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <button 
          onClick={updateNickname}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Salva Modifiche
        </button>

        {/* Pulsante Logout */}
        <button 
          onClick={handleLogout}
          className="w-full bg-red-100 text-red-600 py-2.5 rounded-lg font-semibold hover:bg-red-200 transition mt-2"
        >
          Esci (Logout)
        </button>
      </div>
      
      <div className="mt-8 border-t pt-6 text-sm text-gray-600 space-y-2">
        <div className="flex justify-between">
          <span>Stato:</span>
          <span className="font-bold">{profile?.is_approved ? '✅ Approvato' : '⏳ In attesa'}</span>
        </div>
        <div className="flex justify-between">
          <span>Admin:</span>
          <span className="font-bold">{profile?.is_admin ? 'Sì' : 'No'}</span>
        </div>
      </div>
    </div>
  );
}