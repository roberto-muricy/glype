// Hooks pra swipe deck — busca queue e marca dismissal.
//
// Estratégia: useInfiniteQuery agrega páginas e o componente consome o flat list.
// O service faz exclude de dismissed+library no server, mas se o usuário
// dismissar um card durante a sessão, removemos client-side imediatamente.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscoverBatch, dismissGame } from '@/src/services/discover.service';
import { ensureGame } from '@/src/services/reviews.service';
import { libraryKeys } from '@/src/hooks/useLibrary';
import { track } from '@/src/lib/analytics';
import { captureException } from '@/src/lib/sentry';
import type { Game } from '@/src/types/models';

export const discoverKeys = {
  queue: (genres: string[]) => ['discover', 'queue', genres.join(',')] as const,
};

/**
 * Mantém uma queue local de jogos pro deck.
 *
 * - Busca a primeira página automaticamente.
 * - `prefetchMore()` busca a próxima página em background quando a queue fica curta.
 * - `pop(rawgId)` remove o card do topo (chamado após swipe).
 */
export function useDiscoverQueue(genres: string[], pageSize = 20) {
  const [queue, setQueue] = useState<Game[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reset queue quando genres muda
  const genresKey = useMemo(() => genres.join(','), [genres]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setQueue([]);
    setPage(0);
    setHasMore(true);
    (async () => {
      try {
        const batch = await getDiscoverBatch(genres, 0, pageSize);
        if (cancelled) return;
        setQueue(batch.results);
        setPage(0);
        setHasMore(batch.has_more);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genresKey, pageSize]);

  const prefetchMore = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const next = page + 1;
      const batch = await getDiscoverBatch(genres, next, pageSize);
      setQueue((q) => {
        // Dedup: garante que não duplica caso a página retorne algo já presente
        const seen = new Set(q.map((g) => g.rawg_id));
        const fresh = batch.results.filter((g) => g.rawg_id != null && !seen.has(g.rawg_id));
        return [...q, ...fresh];
      });
      setPage(next);
      setHasMore(batch.has_more);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsFetchingMore(false);
    }
  }, [genres, hasMore, isFetchingMore, page, pageSize]);

  const pop = useCallback((rawgId: number | null) => {
    if (rawgId == null) return;
    setQueue((q) => q.filter((g) => g.rawg_id !== rawgId));
  }, []);

  return {
    queue,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    prefetchMore,
    pop,
  };
}

/**
 * Mutation pra marcar como "não me interessa".
 * Resolve o rawg_id pro game_id interno via ensureGame() antes de inserir.
 */
export function useDismissGame() {
  return useMutation({
    mutationFn: async ({ rawgId }: { rawgId: number; position?: number }) => {
      const gameId = await ensureGame(rawgId);
      await dismissGame(gameId);
      return { rawgId, gameId };
    },
    onSuccess: (_, vars) => {
      track('discover_swipe_left', {
        rawg_id: vars.rawgId,
        position_in_queue: vars.position ?? null,
      });
    },
    // O card já saiu da tela quando isso roda (swipe otimista), então não há
    // como avisar o usuário — mas engolir em silêncio esconderia dismissals
    // perdidos. Reporta pro Sentry.
    onError: (error, vars) => {
      captureException(error, { scope: 'discover_dismiss', rawg_id: vars.rawgId });
    },
  });
}

/**
 * Mutation pra adicionar à wishlist via swipe right.
 * Reaproveita o pattern do useSetGameStatus, mas trackeia evento próprio.
 */
export function useWishlistFromDiscover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rawgId }: { rawgId: number; position?: number }) => {
      const gameId = await ensureGame(rawgId);
      // Insere/atualiza user_games com status='wishlist' usando upsert.
      const { supabase, getSessionUser } = await import('@/src/lib/supabase');
      const user = await getSessionUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('user_games')
        .upsert(
          { user_id: user.id, game_id: gameId, status: 'wishlist' },
          { onConflict: 'user_id,game_id' },
        );
      if (error) throw new Error(error.message);
      return { rawgId, gameId };
    },
    onSuccess: (_, vars) => {
      track('discover_swipe_right', {
        rawg_id: vars.rawgId,
        position_in_queue: vars.position ?? null,
      });
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
    onError: (error, vars) => {
      captureException(error, { scope: 'discover_wishlist', rawg_id: vars.rawgId });
    },
  });
}
