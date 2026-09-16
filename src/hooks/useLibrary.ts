import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyLibrary,
  getMyGameStatus,
  setGameStatus,
  removeFromLibrary,
  getUserLibrary,
  getUserLibraryCounts,
} from '@/src/services/library.service';
import { track } from '@/src/lib/analytics';
import type { GameStatus } from '@/src/types/models';

export const libraryKeys = {
  all: ['library'] as const,
  list: (status?: GameStatus) => ['library', 'list', status ?? 'all'] as const,
  gameStatus: (gameId: string) => ['library', 'status', gameId] as const,
  userList: (userId: string, status?: GameStatus) =>
    ['library', 'user', userId, status ?? 'all'] as const,
  userCounts: (userId: string) => ['library', 'userCounts', userId] as const,
};

// ─── Biblioteca pública (outro usuário) ──────────────────────────────────────

export function useUserLibrary(userId: string | null, status?: GameStatus) {
  return useQuery({
    queryKey: libraryKeys.userList(userId ?? '', status),
    queryFn: () => getUserLibrary(userId!, status),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUserLibraryCounts(userId: string | null) {
  return useQuery({
    queryKey: libraryKeys.userCounts(userId ?? ''),
    queryFn: () => getUserLibraryCounts(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

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
    onSuccess: (_, { gameId, status }) => {
      track('game_added_to_library', { status, game_id: gameId });
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
      track('game_removed_from_library', { game_id: gameId });
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      queryClient.invalidateQueries({ queryKey: libraryKeys.gameStatus(gameId) });
    },
  });
}
