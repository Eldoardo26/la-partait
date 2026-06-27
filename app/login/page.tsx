'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [existingProfiles, setExistingProfiles] = useState<{ id_uuid: string; nick_name: string }[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    if (!isRegistering) return;
    supabase
      .from('profiles')
      .select('id_uuid, nick_name')
      .is('email', null)
      .not('nick_name', 'is', null)
      .order('nick_name')
      .then(({ data }) => { if (data) setExistingProfiles(data); });
  }, [isRegistering]);

  function validateEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

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

    if (!validateEmail(email)) {
      setError('Inserisci un indirizzo email valido.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    if (isRegistering) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError || !signUpData.user) {
        setError(signUpError?.message ?? 'Errore durante la registrazione.');
        setLoading(false);
        return;
      }

      const newUserId = signUpData.user.id;

      if (selectedProfileId) {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        setError('Email o password non validi.');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    }
  }

  const inputVariants = {
    focus: { scale: 1.01, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md mx-4"
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <motion.span
              className="text-5xl inline-block"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
            >
              ⚽
            </motion.span>
            <h1 className="text-2xl font-extrabold mt-3 text-gray-900 tracking-tight">
              {isRegistering ? 'Crea un account' : 'Bentornato'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isRegistering ? 'Unisciti a La Partita' : 'Accedi a La Partita'}
            </p>
          </div>

          <div className="space-y-4">
            <motion.div whileFocus={inputVariants.focus}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </motion.div>

            <motion.div whileFocus={inputVariants.focus}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  key="profiles"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sei già nella lista? <span className="text-gray-400 font-normal">(opzionale)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {existingProfiles.map((p) => (
                      <motion.button
                        key={p.id_uuid}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedProfileId(selectedProfileId === p.id_uuid ? '' : p.id_uuid)}
                        className={`text-sm px-3 py-2 rounded-xl border text-left transition font-medium truncate ${
                          selectedProfileId === p.id_uuid
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        {p.nick_name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-green-600 text-sm bg-green-50 p-3 rounded-xl border border-green-100"
                >
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleAuth}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 transition text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Attendere...
                </span>
              ) : isRegistering ? (
                'Crea account'
              ) : (
                'Accedi'
              )}
            </motion.button>

            <div className="text-center pt-2">
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
      </motion.div>
    </div>
  );
}
