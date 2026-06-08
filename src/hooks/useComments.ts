import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createComment,
  deleteComment,
  getBatchCommentCounts,
  getCommentCount,
  getReviewComments,
} from '@/src/services/comments.service';
import { hapticLight, hapticSuccess } from '@/src/utils/haptics';
import { notificationKeys } from '@/src/hooks/useNotifications';
import { track } from '@/src/lib/analytics';

export const commentKeys = {
  list: (reviewId: string) => ['comments', reviewId] as const,
  count: (reviewId: string) => ['comments', 'count', reviewId] as const,
  batch: (reviewIds: string[]) =>
    ['comments', 'batchCount', reviewIds.join(',')] as const,
};

/** Conta comentários para várias reviews ao mesmo tempo (feed). */
export function useBatchCommentCounts(reviewIds: string[]) {
  return useQuery({
    queryKey: commentKeys.batch(reviewIds),
    queryFn: () => getBatchCommentCounts(reviewIds),
    enabled: reviewIds.length > 0,
    staleTime: 1000 * 30,
  });
}

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
    onSuccess: (comment, vars) => {
      hapticSuccess();
      track('comment_created', { review_id: vars.reviewId, length: comment.body.length });
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
      track('comment_deleted', { review_id: vars.reviewId });
      queryClient.invalidateQueries({ queryKey: commentKeys.list(vars.reviewId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.count(vars.reviewId) });
    },
  });
}
