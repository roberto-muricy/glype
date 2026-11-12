import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getTrendingGames } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';
import { fallbackTop } from '../_shared/fallback.ts';
import { igdbTop } from '../_shared/catalog.ts';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const pageSizeParam = url.searchParams.get('page_size');
  const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 40) : 20;

  try {
    const cacheKey = makeCacheKey(['trending', String(pageSize)]);

    const results = await withCache(cacheKey, CACHE_TTL.trending, async () => {
      const rawgRes = await getTrendingGames(pageSize);
      return rawgRes.results.map(normalizeRawg);
    });

    return jsonResponse({ results, count: results.length });
  } catch (err) {
    // Sem RAWG e sem cópia: os mais avaliados da IGDB, depois os da tabela games.
    try {
      const results = await igdbTop(pageSize);
      if (results.length > 0) {
        return jsonResponse({ results, count: results.length, fallback: true, source: 'igdb' });
      }
    } catch (igdbErr) {
      console.error('[games-trending] IGDB falhou:', igdbErr instanceof Error ? igdbErr.message : igdbErr);
    }
    try {
      const results = await fallbackTop(pageSize);
      if (results.length > 0) return jsonResponse({ results, count: results.length, fallback: true });
    } catch (fallbackErr) {
      console.error('[games-trending] reserva falhou:', fallbackErr);
    }
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
