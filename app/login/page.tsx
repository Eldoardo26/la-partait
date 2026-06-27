'use client';

import { useState, useEffect } from 'react';
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

  // Nickname binding
  const [existingProfiles, setExistingProfiles] = useState<{ id_uuid: string; nick_name: string }[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Carica i profili senza email quando si passa in modalità registrazione
  useEffect(() => {
    if (!isRegistering) return;

    async function loadProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id_uuid, nick_name')
        .is('email', null)
        .not('nick_name', 'is', null)
        .order('nick_name');

      if (!error && data) {
        setExistingProfiles(data);
      }
    }

    loadProfiles();
  }, [isRegistering]);

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    setSelectedProfileId('');
  };

  async function handleAuth() {
    setLoading(true);
    setError('');
    setSuccess('');

    if (isRegistering) {
      // 1. Crea l'utente in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError || !signUpData.user) {
        setError(signUpError?.message ?? 'Errore durante la registrazione.');
        setLoading(false);
        return;
      }

      const newUserId = signUpData.user.id;

      if (selectedProfileId) {
        // 2a. Binda il profilo esistente al nuovo utente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ id_uuid: newUserId, email })
          .eq('id_uuid', selectedProfileId);

        if (updateError) {
          setError('Account creato ma errore nel collegare il profilo: ' + updateError.message);
          setLoading(false);
          return;
        }
      }

      setSuccess('Account creato! Controlla la tua email per confermare, poi accedi.');
      setIsRegistering(false);
      setSelectedProfileId('');
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
        window.location.href = '/setup';
      } else {
        window.location.href = '/';
      }
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

          {/* Selezione nickname — solo in fase di registrazione */}
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sei già nella lista?{' '}
                <span className="text-gray-400 font-normal">(opzionale)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Se hai già giocato con noi, seleziona il tuo nickname per collegare il tuo storico.
              </p>

              {existingProfiles.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nessun profilo disponibile da collegare.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {existingProfiles.map((p) => (
                    <button
                      key={p.id_uuid}
                      type="button"
                      onClick={() =>
                        setSelectedProfileId(selectedProfileId === p.id_uuid ? '' : p.id_uuid)
                      }
                      className={`text-sm px-3 py-2 rounded-lg border text-left transition font-medium truncate
                        ${selectedProfileId === p.id_uuid
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                        }`}
                    >
                      {p.nick_name}
                    </button>
                  ))}
                </div>
              )}

              {selectedProfileId && (
                <p className="text-xs text-blue-600 mt-2">
                  ✓ Collegherai il tuo account a{' '}
                  <strong>{existingProfiles.find((p) => p.id_uuid === selectedProfileId)?.nick_name}</strong>
                </p>
              )}
            </div>
          )}

          {/* Messaggi */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">{success}</p>
          )}

          {/* Bottone principale */}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? 'Attendere...' : isRegistering ? 'Crea account' : 'Accedi'}
          </button>

          {/* Switch login / registrazione */}
          <div className="text-center pt-1">
            <span className="text-sm text-gray-500">
              {isRegistering ? 'Hai già un account? ' : 'Non hai un account? '}
            </span>
            <button onClick={switchMode} className="text-sm text-blue-600 hover:underline font-medium">
              {isRegistering ? 'Accedi' : 'Registrati'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
