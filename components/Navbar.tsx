'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function Navbar() {
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. Funzione per aggiornare lo stato in base all'utente
    const updateUserState = (session: any) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAdminEmail(currentUser?.email === 'edoardo0262@gmail.com');
    };

    // 2. Controllo iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserState(session);
    });

    // 3. Listener per i cambiamenti di auth (login/logout in tempo reale)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUserState(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-slate-800 text-white p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">⚽ La partait</Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:text-blue-300 transition">Home</Link>
          <Link href="/profile" className="hover:text-blue-300 transition">Profilo</Link>
          
          {isAdminEmail && (
            <Link href="/admin/create-match" className="bg-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 transition">
              Admin
            </Link>
          )}

          {/* Pulsante dinamico Login/Logout */}
          {!user ? (
            <Link href="/login" className="bg-blue-600 px-3 py-1 rounded text-sm font-semibold hover:bg-blue-700 transition">
              Login
            </Link>
          ) : (
            <button 
              onClick={handleLogout} 
              className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}