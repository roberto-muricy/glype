import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  updateReview,
  deleteReview,
  getMyReview,
  getGameReviews,
  ensureGame,
} from '@/src/services/reviews.service';
import type { ReviewDraft } from '@/src/types/models';

export const reviewKeys = {
  myReview: (gameId: string) => ['reviews', 'mine', gameId] as const,
  gameReviews: (gameId: string) => ['reviews', 'game', gameId] as const,
};

// Review do usuário logado para um jogo
export function useMyReview(gameId: string | null) {
  return useQuery({
    queryKey: reviewKeys.myReview(gameId ?? ''),
    queryFn: () => getMyReview(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
  });
}

// Reviews públicas de um jogo
export function useGameReviews(gameId: string | null) {
  return useQuery({
    queryKey: reviewKeys.gameReviews(gameId ?? ''),
    queryFn: () => getGameReviews(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
  });
}

// Cria review — garante o jogo no banco antes via ensure-game
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rawgId, draft }: { rawgId: number; draft: ReviewDraft }) => {
      const gameId = await ensureGame(rawgId);
      return createReview(gameId, draft);
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(review.game_id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.gameReviews(review.game_id) });
    },
  });
}

export function useUpdateReview(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, draft }: { reviewId: string; draft: Partial<ReviewDraft> }) =>
      updateReview(reviewId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(gameId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.gameReviews(gameId) });
    },
  });
}

export function useDeleteReview(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(gameId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.gameReviews(gameId) });
    },
  });
}
