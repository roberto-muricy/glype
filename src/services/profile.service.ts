import { supabase } from '@/src/lib/supabase';
import type { Profile } from '@/src/types/models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as unknown as { from: (t: string) => any };

export interface ProfileUpdate {
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  favorite_genres?: string[];
}

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data, error } = await db().from('profiles')
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
  const [reviewsRes, gamesRes] = await Promise.all([
    db().from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db().from('user_games').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    reviewsCount: reviewsRes.count ?? 0,
    gamesCount: gamesRes.count ?? 0,
  };
}

// ─── Public profile (outros usuários) ────────────────────────────────────────

export async function getPublicProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export interface ReviewWithGame {
  id: string;
  score: number;
  body: string;
  has_spoiler: boolean;
  completed: boolean;
  playtime_hours: number | null;
  created_at: string;
  game: {
    id: string;
    title: string;
    cover_url: string | null;
    rawg_id: number | null;
  };
}

export async function getUserPublicReviews(
  userId: string,
  limit = 20,
): Promise<ReviewWithGame[]> {
  const { data, error } = await db().from('reviews')
    .select(`
      id, score, body, has_spoiler, completed, playtime_hours, created_at,
      game:games ( id, title, cover_url, rawg_id )
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewWithGame[];
}
