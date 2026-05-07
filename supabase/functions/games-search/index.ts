import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { searchGames } from '../_shared/rawg.ts';
import { searchGameByName } from '../_shared/igdb.ts';
import { normalizeRawg, normalizeIgdb, mergeRawgIgdb } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim();
  const pageSizeParam = url.searchParams.get('page_size');
  const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 40) : 20;

  if (!query || query.length < 2) {
    return errorResponse('Parâmetro "q" obrigatório (mínimo 2 caracteres)', 400);
  }

  try {
    const cacheKey = makeCacheKey(['search', query, String(pageSize)]);

    const results = await withCache(cacheKey, CACHE_TTL.search, async () => {
      const [rawgRes, igdbRes] = await Promise.allSettled([
        searchGames(query, pageSize),
        searchGameByName(query),
      ]);

      const rawgGames = rawgRes.status === 'fulfilled' ? rawgRes.value.results : [];
      const igdbGames = igdbRes.status === 'fulfilled' ? igdbRes.value : [];

      // Indexa resultados IGDB por nome (normalizado) para merge
      const igdbByName = new Map(
        igdbGames.map((g) => [g.name.toLowerCase(), normalizeIgdb(g)]),
      );

      return rawgGames.map((g) => {
        const normalized = normalizeRawg(g);
        const igdbMatch = igdbByName.get(g.name.toLowerCase()) ?? null;
        return mergeRawgIgdb(normalized, igdbMatch);
      });
    });

    return jsonResponse({ results, count: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
