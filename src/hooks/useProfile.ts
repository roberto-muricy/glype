import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateProfile, getProfileStats, type ProfileUpdate } from '@/src/services/profile.service';
import { useAuthStore } from '@/src/stores/auth';

export const profileKeys = {
  stats: (userId: string) => ['profile', 'stats', userId] as const,
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
