// Moderação: denúncias e bloqueios entre usuários.
// Requisito de Apple App Store guideline 1.2 + Google Play UGC policy.

import { getSessionUser, supabase } from '@/src/lib/supabase';

export type ReportTargetType = 'review' | 'comment' | 'user';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'sexual_content'
  | 'violence'
  | 'self_harm'
  | 'misinformation'
  | 'impersonation'
  | 'other';

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  /** ID do dono do conteúdo (review/comment) ou o próprio user se target='user'. */
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Cria uma denúncia. RLS garante que reporter_id = auth.uid().
 * Falha se já houver denúncia do mesmo reporter no mesmo target (unique constraint).
 */
export async function createReport(input: CreateReportInput): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Não autenticado');

  if (input.reportedUserId === user.id) {
    throw new Error('Você não pode denunciar a si mesmo');
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });

  if (error) {
    // unique violation = já denunciou esse alvo
    if (error.code === '23505') {
      throw new Error('Você já denunciou esse conteúdo');
    }
    throw new Error(error.message);
  }
}

// ─── Bloqueios ────────────────────────────────────────────────────────────────

/** Bloqueia um usuário. Idempotente — se já bloqueado, no-op. */
export async function blockUser(targetUserId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Não autenticado');
  if (targetUserId === user.id) throw new Error('Você não pode bloquear a si mesmo');

  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { blocker_id: user.id, blocked_id: targetUserId },
      { onConflict: 'blocker_id,blocked_id' },
    );

  if (error) throw new Error(error.message);
}

/** Desbloqueia um usuário. */
export async function unblockUser(targetUserId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId);

  if (error) throw new Error(error.message);
}

/** Retorna lista de IDs que o usuário atual bloqueou. */
export async function getBlockedUserIds(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.blocked_id);
}

/** Lista os usuários que o usuário atual bloqueou (com profile data). */
export async function getBlockedUsers(): Promise<Array<{
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
}>> {
  const user = await getSessionUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select(`
      blocked_at,
      blocked:profiles!blocked_id ( id, username, display_name, avatar_url )
    `)
    .eq('blocker_id', user.id)
    .order('blocked_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    blocked_at: string;
    blocked: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.blocked != null)
    .map((r) => ({ ...r.blocked!, blocked_at: r.blocked_at }));
}

/** Verifica se o usuário atual bloqueou um usuário específico. */
export async function isBlocked(targetUserId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId)
    .maybeSingle();

  return data != null;
}
