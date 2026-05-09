import { supabase } from '@/src/lib/supabase';

export async function likeReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase
    .from('review_likes')
    .insert({ review_id: reviewId, user_id: user.id });
  if (error && error.code !== '23505') throw new Error(error.message); // ignore duplicate
}

export async function unlikeReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase
    .from('review_likes')
    .delete()
    .eq('review_id', reviewId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function getReviewLikes(
  reviewId: string,
): Promise<{ count: number; liked: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();

  const [countRes, likedRes] = await Promise.all([
    supabase
      .from('review_likes')
      .select('review_id', { count: 'exact', head: true })
      .eq('review_id', reviewId),
    user
      ? supabase
          .from('review_likes')
          .select('review_id')
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    count: countRes.count ?? 0,
    liked: !!likedRes.data,
  };
}

/** Batch: fetch likes for multiple reviews at once. */
export async function getBatchReviewLikes(reviewIds: string[]): Promise<
  Record<string, { count: number; liked: boolean }>
> {
  if (reviewIds.length === 0) return {};
  const { data: { user } } = await supabase.auth.getUser();

  const [allLikes, myLikes] = await Promise.all([
    supabase
      .from('review_likes')
      .select('review_id')
      .in('review_id', reviewIds),
    user
      ? supabase
          .from('review_likes')
          .select('review_id')
          .in('review_id', reviewIds)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const countMap: Record<string, number> = {};
  for (const row of allLikes.data ?? []) {
    countMap[row.review_id] = (countMap[row.review_id] ?? 0) + 1;
  }

  const likedSet = new Set((myLikes.data ?? []).map((r) => r.review_id));

  const result: Record<string, { count: number; liked: boolean }> = {};
  for (const id of reviewIds) {
    result[id] = { count: countMap[id] ?? 0, liked: likedSet.has(id) };
  }
  return result;
}
