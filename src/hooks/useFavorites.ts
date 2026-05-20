import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFavoriteGames, setFavoriteGames } from '@/src/services/favorites.service';
import { hapticSuccess } from '@/src/utils/haptics';

export const favoriteKeys = {
  list: (userId: string) => ['favorites', userId] as const,
};

/** Top 5 jogos de um usuário (próprio ou de terceiros). */
export function useFavoriteGames(userId: string | null) {
  return useQuery({
    queryKey: favoriteKeys.list(userId ?? ''),
    queryFn: () => getFavoriteGames(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5min
  });
}

/** Salva o Top 5 do usuário logado (gameIds em ordem de rank). */
export function useSetFavoriteGames(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameIds: string[]) => setFavoriteGames(gameIds),
    onSuccess: () => {
      hapticSuccess();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: favoriteKeys.list(userId) });
      }
    },
  });
}
