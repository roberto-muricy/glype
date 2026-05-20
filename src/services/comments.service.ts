import { supabase } from '@/src/lib/supabase';
import type { ReviewComment } from '@/src/types/models';

// Shape cru retornado pelo Supabase (join aninhado).
interface RawComment {
  id: string;
  review_id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/** Lista comentários de uma review, mais antigos primeiro (conversa cronológica). */
export async function getReviewComments(reviewId: string): Promise<ReviewComment[]> {
  const { data, error } = await supabase
    .from('review_comments')
    .select(`
      id,
      review_id,
      body,
      created_at,
      user:profiles!user_id ( id, username, display_name, avatar_url )
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawComment[];
  return rows
    .filter((r) => r.user != null)
    .map((r) => ({
      id: r.id,
      review_id: r.review_id,
      body: r.body,
      created_at: r.created_at,
      user: r.user!,
    }));
}

/** Cria um novo comentário. Retorna o comentário inserido. */
export async function createComment(
  reviewId: string,
  body: string,
): Promise<ReviewComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const trimmed = body.trim();
  if (trimmed.length === 0) throw new Error('Comentário vazio');
  if (trimmed.length > 500) throw new Error('Máximo 500 caracteres');

  const { data, error } = await supabase
    .from('review_comments')
    .insert({ review_id: reviewId, user_id: user.id, body: trimmed })
    .select(`
      id,
      review_id,
      body,
      created_at,
      user:profiles!user_id ( id, username, display_name, avatar_url )
    `)
    .single();

  if (error) throw new Error(error.message);
  const row = data as unknown as RawComment;
  if (!row.user) throw new Error('Erro ao carregar autor');
  return {
    id: row.id,
    review_id: row.review_id,
    body: row.body,
    created_at: row.created_at,
    user: row.user,
  };
}

/** Deleta um comentário (RLS garante que só o autor pode). */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('review_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw new Error(error.message);
}

/** Conta comentários de uma review (otimização — não traz os dados). */
export async function getCommentCount(reviewId: string): Promise<number> {
  const { count, error } = await supabase
    .from('review_comments')
    .select('id', { count: 'exact', head: true })
    .eq('review_id', reviewId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
