import { supabase } from '@/src/lib/supabase';
import type { Profile } from '@/src/types/models';

export interface ProfileUpdate {
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  favorite_genres?: string[];
}

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const db = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db.from('profiles')
    .update(update)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function getProfileStats(userId: string): Promise<{
  reviewsCount: number;
  gamesCount: number;
}> {
  const db = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [reviewsRes, gamesRes] = await Promise.all([
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('user_games').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    reviewsCount: reviewsRes.count ?? 0,
    gamesCount: gamesRes.count ?? 0,
  };
}
