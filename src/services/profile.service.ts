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

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export async function getProfileStats(userId: string): Promise<{
  reviewsCount: number;
  gamesCount: number;
}> {
  const [reviewsRes, gamesRes] = await Promise.all([
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('user_games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  return {
    reviewsCount: reviewsRes.count ?? 0,
    gamesCount: gamesRes.count ?? 0,
  };
}

// ─── Public profile ───────────────────────────────────────────────────────────

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

export interface ReviewDetail extends ReviewWithGame {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  game: {
    id: string;
    title: string;
    cover_url: string | null;
    background_url: string | null;
    rawg_id: number | null;
    genres: string[];
    release_date: string | null;
  };
}

export async function getReviewDetail(reviewId: string): Promise<ReviewDetail | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id, score, body, has_spoiler, completed, playtime_hours, created_at,
      user:profiles ( id, username, display_name, avatar_url ),
      game:games ( id, title, cover_url, background_url, rawg_id, genres, release_date )
    `)
    .eq('id', reviewId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as ReviewDetail | null;
}

export async function getUserPublicReviews(
  userId: string,
  limit = 20,
): Promise<ReviewWithGame[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id, score, body, has_spoiler, completed, playtime_hours, created_at,
      game:games ( id, title, cover_url, rawg_id )
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReviewWithGame[];
}
