'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';

export function useAvatar(userId: string | undefined) {
  const [uploading, setUploading] = useState(false);

  const getAvatarUrl = useCallback(
    (avatarPath: string | null, size = 64) => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith('http')) return avatarPath;
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarPath}`;
    },
    []
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return null;
      setUploading(true);

      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const filePath = `${userId}/avatar.${ext}`;

        const { error } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
          });

        if (error) throw error;

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;

        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id_uuid', userId);

        return publicUrl;
      } catch (err) {
        console.error('Upload error:', err);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [userId]
  );

  const deleteAvatar = useCallback(async () => {
    if (!userId) return;
    setUploading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id_uuid', userId)
        .single();

      if (profile?.avatar_url) {
        const path = profile.avatar_url.split('/avatars/')[1];
        if (path) {
          await supabase.storage.from('avatars').remove([path]);
        }
      }

      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id_uuid', userId);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setUploading(false);
    }
  }, [userId]);

  return { getAvatarUrl, uploadAvatar, deleteAvatar, uploading };
}
