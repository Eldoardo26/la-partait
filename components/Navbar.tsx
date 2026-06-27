'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, Trophy, Sparkles, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { AvatarSkeleton } from '@/components/SkeletonLoader';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('nick_name, is_admin').eq('id_uuid', user.id).single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  const navLink = (href: string, label: string, icon?: React.ReactNode) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
        isActive(href)
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-lg text-white tracking-tight"
        >
          ⚽ <span className="hidden sm:inline">La Partita</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLink('/', 'Home')}
          {navLink('/classifica', 'Classifica', <Trophy size={15} />)}
          {navLink('/fanta/pronostici', 'Fanta', <Sparkles size={15} />)}
          {navLink('/profile', 'Profilo', <User size={15} />)}
          {profile?.is_admin && (
            <Link
              href="/admin/create-match"
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-600/90 text-white hover:bg-red-600 transition"
            >
              Admin
            </Link>
          )}
        </div>

        {/* User section */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-2">
              {profile ? (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {profile.nick_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
              ) : (
                <AvatarSkeleton size={28} />
              )}
              <button
                onClick={handleLogout}
                className="text-white/70 hover:text-white text-sm transition flex items-center gap-1"
              >
                <LogOut size={14} />
                Esci
              </button>
            </div>
          )}

          {!user && (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              Accedi
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white p-1"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-800/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLink('/', 'Home')}
              {navLink('/classifica', 'Classifica', <Trophy size={15} />)}
              {navLink('/fanta/pronostici', 'Fanta', <Sparkles size={15} />)}
              {navLink('/profile', 'Profilo', <User size={15} />)}
              {profile?.is_admin && (
                <Link
                  href="/admin/create-match"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-red-600/90 text-white hover:bg-red-600 transition"
                >
                  Admin
                </Link>
              )}
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full text-left transition mt-2"
                >
                  <LogOut size={15} />
                  Esci
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
