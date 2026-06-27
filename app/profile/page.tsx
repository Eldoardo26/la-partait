'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Camera, Trash2, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { useAvatar } from '@/hooks/use-avatar';
import { WinBadge } from '@/components/WinBadge';

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getAvatarUrl, uploadAvatar, deleteAvatar, uploading } = useAvatar(profile?.id_uuid);

  const avatarUrl = getAvatarUrl(profile?.avatar_url, 96);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id_uuid', user.id)
        .single();

      if (data) {
        setProfile(data);
        setNickname(data.nick_name || '');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File troppo grande (max 2MB)' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Formato non supportato (usa JPG, PNG o WebP)' });
      return;
    }
    setSelectedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage(null);
  }

  async function handleAvatarUpload() {
    if (!selectedFile) return;
    const url = await uploadAvatar(selectedFile);
    if (url) {
      setProfile((prev: any) => ({ ...prev, avatar_url: url }));
      setSelectedFile(null);
      setAvatarPreview(null);
      setMessage({ type: 'success', text: 'Foto profilo aggiornata!' });
    } else {
      setMessage({ type: 'error', text: 'Errore durante il caricamento' });
    }
  }

  async function handleAvatarDelete() {
    await deleteAvatar();
    setProfile((prev: any) => ({ ...prev, avatar_url: null }));
    setAvatarPreview(null);
    setSelectedFile(null);
    setMessage({ type: 'success', text: 'Foto profilo rimossa' });
  }

  async function updateNickname() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ nick_name: nickname })
      .eq('id_uuid', session.user.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setProfile((prev: any) => ({ ...prev, nick_name: nickname }));
      setMessage({ type: 'success', text: 'Profilo aggiornato!' });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto py-6 md:py-10 space-y-6"
    >
      <motion.div {...fadeSlide} className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Il mio Profilo</h1>

        {/* Avatar section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group mb-3">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
                {nickname
                  ? nickname.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?'}
              </div>
            )}

            {/* Overlay on hover */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
            >
              <Camera size={20} className="text-white" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex gap-2">
            {selectedFile && (
              <button
                onClick={handleAvatarUpload}
                disabled={uploading}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                Carica foto
              </button>
            )}
            {(avatarUrl || avatarPreview) && (
              <button
                onClick={handleAvatarDelete}
                disabled={uploading}
                className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg font-semibold hover:bg-red-100 transition flex items-center gap-1"
              >
                <Trash2 size={14} />
                Rimuovi
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">JPG, PNG o WebP • max 2MB</p>
        </div>

        {/* Nickname */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <button
            onClick={updateNickname}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition"
          >
            Salva Modifiche
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeSlide} transition={{ delay: 0.1 }}>
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-4">Statistiche</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-blue-700">{profile?.media_score ?? '—'}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Media Voto</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center flex flex-col items-center">
              <WinBadge percentage={profile?.win_percentage} size="md" />
              <p className="text-xs text-green-600 font-medium mt-1">% Vittorie</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Stato</span>
              <span className="font-semibold">{profile?.is_approved ? '✅ Approvato' : '⏳ In attesa'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Admin</span>
              <span className="font-semibold">{profile?.is_admin ? 'Sì' : 'No'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div {...fadeSlide} transition={{ delay: 0.2 }}>
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Esci (Logout)
        </button>
      </motion.div>

      {/* Toast message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg ${
            message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {message.text}
        </motion.div>
      )}
    </motion.div>
  );
}
