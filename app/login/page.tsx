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
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
  };

  async function handleAuth() {
    setLoading(true);
    setError('');
    setSuccess('');

    if (isRegistering) {
      // REGISTRAZIONE
      const { error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess('Account creato! Controlla la tua email per confermare, poi accedi.');
      setIsRegistering(false);
      setLoading(false);
    } else {
      // LOGIN
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        setError('Email o password non validi.');
        setLoading(false);
        return;
      }

      // Check profilo
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_completed_profile')
        .eq('id_uuid', authData.user.id)
        .single();

      if (profileError || !profile?.has_completed_profile) {
        router.push('/setup');
      } else {
        router.push('/');
      }
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white shadow-lg rounded-2xl border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-bold mt-2 text-gray-800">
            {isRegistering ? 'Crea un account' : 'Bentornato'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRegistering ? 'Unisciti a La partait' : 'Accedi a La partait'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="la-tua@email.com"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Messaggi di errore / successo */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
              {success}
            </p>
          )}

          {/* Bottone principale */}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading
              ? 'Attendere...'
              : isRegistering
              ? 'Crea account'
              : 'Accedi'}
          </button>

          {/* Switch login / registrazione */}
          <div className="text-center pt-1">
            <span className="text-sm text-gray-500">
              {isRegistering ? 'Hai già un account? ' : 'Non hai un account? '}
            </span>
            <button
              onClick={switchMode}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {isRegistering ? 'Accedi' : 'Registrati'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
