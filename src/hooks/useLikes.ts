import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likeReview, unlikeReview, getBatchReviewLikes } from '@/src/services/likes.service';
import { hapticLight } from '@/src/utils/haptics';

export const likeKeys = {
  batch: (ids: string[]) => ['likes', 'batch', ...ids.slice().sort()] as const,
};

/** Fetch likes for a list of review IDs in one query. */
export function useBatchLikes(reviewIds: string[]) {
  return useQuery({
    queryKey: likeKeys.batch(reviewIds),
    queryFn: () => getBatchReviewLikes(reviewIds),
    enabled: reviewIds.length > 0,
    staleTime: 1000 * 30,
  });
}

export function useLikeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId }: { reviewId: string }) => likeReview(reviewId),
    onMutate: () => hapticLight(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });
}

export function useUnlikeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId }: { reviewId: string }) => unlikeReview(reviewId),
    onMutate: () => hapticLight(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });
}
