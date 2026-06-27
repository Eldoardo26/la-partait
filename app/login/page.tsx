'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');

    // 1. Esegui il login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError || !authData.user) {
      setError('Credenziali non valide. Riprova.');
      setLoading(false);
      return;
    }

    // 2. Controllo stato completamento profilo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_completed_profile')
      .eq('id_uuid', authData.user.id)
      .single();

    // 3. Reindirizzamento condizionale
    if (profileError || !profile?.has_completed_profile) {
      // Se non esiste profilo o non è completo, vai al setup
      router.push('/setup');
    } else {
      // Se è tutto ok, vai alla home
      router.push('/');
    }
    
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white shadow-lg rounded-2xl border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Accedi</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="la-tua@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifica in corso...' : 'Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
}