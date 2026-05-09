import { supabase } from '@/src/lib/supabase';
import type { FeedItem, FollowCounts } from '@/src/types/models';

// ─── Feed ─────────────────────────────────────────────────────────────────────

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  if (followingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('reviews')
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
  return (data ?? []) as unknown as FeedItem[];
}

// ─── Follows ──────────────────────────────────────────────────────────────────

export async function followUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetId });

  if (error) throw new Error(error.message);
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetId);

  if (error) throw new Error(error.message);
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle();

  return !!data;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export async function getFollowers(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follower_id ( id, username, display_name, avatar_url )')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.follower).filter(Boolean) as {
    id: string; username: string; display_name: string | null; avatar_url: string | null;
  }[];
}

export async function getFollowing(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles!following_id ( id, username, display_name, avatar_url )')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.following).filter(Boolean) as {
    id: string; username: string; display_name: string | null; avatar_url: string | null;
  }[];
}

export async function searchProfiles(query: string, limit = 10) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${query}%`)
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
