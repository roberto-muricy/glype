import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createComment,
  deleteComment,
  getCommentCount,
  getReviewComments,
} from '@/src/services/comments.service';
import { hapticLight, hapticSuccess } from '@/src/utils/haptics';
import { notificationKeys } from '@/src/hooks/useNotifications';

export const commentKeys = {
  list: (reviewId: string) => ['comments', reviewId] as const,
  count: (reviewId: string) => ['comments', 'count', reviewId] as const,
};

/** Lista comentários de uma review (ordem cronológica). */
export function useReviewComments(reviewId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(reviewId ?? ''),
    queryFn: () => getReviewComments(reviewId!),
    enabled: !!reviewId,
    staleTime: 1000 * 30, // 30s
  });
}

/** Conta comentários de uma review (badge). */
export function useCommentCount(reviewId: string | null) {
  return useQuery({
    queryKey: commentKeys.count(reviewId ?? ''),
    queryFn: () => getCommentCount(reviewId!),
    enabled: !!reviewId,
    staleTime: 1000 * 30,
  });
}

/** Cria um comentário e invalida as queries relacionadas. */
export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: string }) =>
      createComment(reviewId, body),
    onMutate: () => hapticLight(),
    onSuccess: (_, vars) => {
      hapticSuccess();
      queryClient.invalidateQueries({ queryKey: commentKeys.list(vars.reviewId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.count(vars.reviewId) });
      // A notificação foi criada via trigger no banco — refresca o badge
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

/** Deleta um comentário (autor apenas). */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; reviewId: string }) =>
      deleteComment(commentId),
    onMutate: () => hapticLight(),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(vars.reviewId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.count(vars.reviewId) });
    },
  });
}
