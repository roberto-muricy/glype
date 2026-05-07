import { supabase } from '@/src/lib/supabase';
import type { FeedItem, FollowCounts } from '@/src/types/models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as unknown as { from: (t: string) => any };

// ─── Feed ─────────────────────────────────────────────────────────────────────

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Busca quem o usuário segue
  const { data: follows } = await db().from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds: string[] = (follows ?? []).map((f: { following_id: string }) => f.following_id);
  if (followingIds.length === 0) return [];

  // Reviews públicas dos seguidos, com join em profiles e games
  const { data, error } = await db().from('reviews')
    .select(`
      id, score, body, has_spoiler, completed, playtime_hours, created_at,
      user:profiles ( id, username, display_name, avatar_url ),
      game:games ( id, title, cover_url, rawg_id )
    `)
    .in('user_id', followingIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as FeedItem[];
}

// ─── Follows ──────────────────────────────────────────────────────────────────

export async function followUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await db().from('follows')
    .insert({ follower_id: user.id, following_id: targetId });

  if (error) throw new Error(error.message);
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await db().from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetId);

  if (error) throw new Error(error.message);
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await db().from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle();

  return !!data;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followersRes, followingRes] = await Promise.all([
    db().from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    db().from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

// Busca perfis por username (para descoberta de usuários)
export async function searchProfiles(query: string, limit = 10) {
  const { data, error } = await db().from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${query}%`)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; username: string; display_name: string | null; avatar_url: string | null }[];
}
