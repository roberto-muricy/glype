import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyLibrary,
  getMyGameStatus,
  setGameStatus,
  removeFromLibrary,
} from '@/src/services/library.service';
import type { GameStatus } from '@/src/types/models';

export const libraryKeys = {
  all: ['library'] as const,
  list: (status?: GameStatus) => ['library', 'list', status ?? 'all'] as const,
  gameStatus: (gameId: string) => ['library', 'status', gameId] as const,
};

export function useMyLibrary(status?: GameStatus) {
  return useQuery({
    queryKey: libraryKeys.list(status),
    queryFn: () => getMyLibrary(status),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyGameStatus(gameId: string | null) {
  return useQuery({
    queryKey: libraryKeys.gameStatus(gameId ?? ''),
    queryFn: () => getMyGameStatus(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSetGameStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, status }: { gameId: string; status: GameStatus }) =>
      setGameStatus(gameId, status),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      queryClient.invalidateQueries({ queryKey: libraryKeys.gameStatus(gameId) });
    },
  });
}

export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => removeFromLibrary(gameId),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      queryClient.invalidateQueries({ queryKey: libraryKeys.gameStatus(gameId) });
    },
  });
}
