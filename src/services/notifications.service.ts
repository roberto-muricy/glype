import { supabase } from '@/src/lib/supabase';
import type { NotificationItem, NotificationType } from '@/src/types/models';

// Shape cru retornado pelo Supabase (joins aninhados).
interface RawNotification {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  review: {
    id: string;
    game: { title: string; rawg_id: number | null } | null;
  } | null;
}

/** Lista as notificações do usuário logado, mais recentes primeiro. */
export async function getNotifications(limit = 50): Promise<NotificationItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      is_read,
      created_at,
      actor:profiles!actor_id ( id, username, display_name, avatar_url ),
      review:reviews ( id, game:games ( title, rawg_id ) )
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawNotification[];

  return rows
    .filter((r) => r.actor != null)
    .map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      is_read: r.is_read,
      created_at: r.created_at,
      actor: r.actor!,
      review: r.review
        ? {
            id: r.review.id,
            game_title: r.review.game?.title ?? 'um jogo',
            game_rawg_id: r.review.game?.rawg_id ?? null,
          }
        : null,
    }));
}

/** Conta as notificações não lidas do usuário logado. */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Marca todas as notificações do usuário como lidas. */
export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  if (error) throw new Error(error.message);
}
