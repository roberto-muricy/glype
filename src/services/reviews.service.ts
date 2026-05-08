import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import type { Review, ReviewDraft } from '@/src/types/models';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = (extra['supabaseUrl'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (extra['supabaseAnonKey'] as string | undefined) ?? '';

// ─── ensure-game ─────────────────────────────────────────────────────────────

export async function ensureGame(rawgId: number): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ensure-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ rawg_id: rawgId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[ensure-game] ${res.status}: ${text.slice(0, 200)}`);
  }

  const game = await res.json() as { id: string };
  return game.id;
}

// ─── reviews CRUD ─────────────────────────────────────────────────────────────

export async function createReview(gameId: string, draft: ReviewDraft): Promise<Review> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...draft, game_id: gameId, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Review;
}

export async function updateReview(reviewId: string, draft: Partial<ReviewDraft>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(draft)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw new Error(error.message);
}

export async function getMyReview(gameId: string): Promise<Review | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Review | null;
}

export async function getGameReviews(gameId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as Review[];
}
