import { useQuery } from '@tanstack/react-query';
import {
  searchGames,
  getGameDetail,
  getTrendingGames,
  getRecommendations,
  getCollection,
  getGameByRawgId,
} from '@/src/services/games.service';

// ─── Query keys ─────────────────────────────────────────────────────────────
// Centralizados aqui para invalidação e deduplicação consistentes.

export const gameKeys = {
  all: ['games'] as const,
  search: (query: string, pageSize?: number) =>
    ['games', 'search', query, pageSize ?? 20] as const,
  detail: (rawgId: number) =>
    ['games', 'detail', rawgId] as const,
  trending: (pageSize?: number) =>
    ['games', 'trending', pageSize ?? 20] as const,
  recommendations: (genres: string[], pageSize?: number) =>
    ['games', 'recommendations', genres.join(','), pageSize ?? 20] as const,
  collection: (id: string, pageSize?: number) =>
    ['games', 'collection', id, pageSize ?? 20] as const,
  byRawgId: (rawgId: number) =>
    ['games', 'byRawgId', rawgId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSearchGames(query: string, pageSize = 20) {
  return useQuery({
    queryKey: gameKeys.search(query, pageSize),
    queryFn: () => searchGames(query, pageSize),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 60, // 1h — alinhado ao cache da Edge Function
  });
}

export function useGameDetail(rawgId: number | null) {
  return useQuery({
    queryKey: gameKeys.detail(rawgId ?? 0),
    queryFn: () => getGameDetail(rawgId!),
    enabled: rawgId != null,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7d — alinhado ao cache da Edge Function
  });
}

export function useTrendingGames(pageSize = 20) {
  return useQuery({
    queryKey: gameKeys.trending(pageSize),
    queryFn: () => getTrendingGames(pageSize),
    staleTime: 1000 * 60 * 60 * 6, // 6h — alinhado ao cache da Edge Function
  });
}

export function useRecommendations(genres: string[], pageSize = 20) {
  return useQuery({
    queryKey: gameKeys.recommendations(genres, pageSize),
    queryFn: () => getRecommendations(genres, pageSize),
    staleTime: 1000 * 60 * 60 * 24, // 24h — alinhado ao cache da Edge Function
  });
}

export function useCollection(collectionId: string, pageSize = 20) {
  return useQuery({
    queryKey: gameKeys.collection(collectionId, pageSize),
    queryFn: () => getCollection(collectionId, pageSize),
    staleTime: 1000 * 60 * 60 * 6, // 6h — alinhado ao cache da Edge Function
    enabled: collectionId.length > 0,
  });
}

// Busca no cache Supabase (tabela `games`) antes de chamar a Edge Function.
// Telas de detalhe usam este hook; ele tenta o cache local primeiro.
export function useGameByRawgId(rawgId: number | null) {
  return useQuery({
    queryKey: gameKeys.byRawgId(rawgId ?? 0),
    queryFn: () => getGameByRawgId(rawgId!),
    enabled: rawgId != null,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7d
  });
}
