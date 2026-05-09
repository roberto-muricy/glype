import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateProfile,
  getProfileStats,
  getPublicProfile,
  getUserPublicReviews,
  getReviewDetail,
  type ProfileUpdate,
} from '@/src/services/profile.service';
import { useAuthStore } from '@/src/stores/auth';

export const profileKeys = {
  stats:        (userId: string)   => ['profile', 'stats', userId]    as const,
  public:       (userId: string)   => ['profile', 'public', userId]   as const,
  reviews:      (userId: string)   => ['profile', 'reviews', userId]  as const,
  reviewDetail: (reviewId: string) => ['profile', 'review', reviewId] as const,
};

export function useProfileStats() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: profileKeys.stats(user?.id ?? ''),
    queryFn: () => getProfileStats(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePublicProfile(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.public(userId ?? ''),
    queryFn: () => getPublicProfile(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserPublicReviews(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.reviews(userId ?? ''),
    queryFn: () => getUserPublicReviews(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useReviewDetail(reviewId: string | null) {
  return useQuery({
    queryKey: profileKeys.reviewDetail(reviewId ?? ''),
    queryFn: () => getReviewDetail(reviewId!),
    enabled: !!reviewId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (update: ProfileUpdate) => updateProfile(update),
    onSuccess: (updated) => {
      // Atualiza o store imediatamente — sem precisar re-fetch
      setProfile(updated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
