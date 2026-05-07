import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGamesByGenre } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';

// Recomendações baseadas em gêneros favoritos do usuário (profile.favorite_genres).
// Recebe uma lista de genre slugs (RAWG) e retorna jogos bem avaliados por gênero.
// Sem gêneros: fallback para os mais populares (action, rpg, adventure).

const FALLBACK_GENRES = ['action', 'role-playing-games-rpg', 'adventure'];

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const genresParam = url.searchParams.get('genres');
  const pageSizeParam = url.searchParams.get('page_size');
  const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 40) : 20;

  const genres = genresParam
    ? genresParam.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean)
    : FALLBACK_GENRES;

  // Usa no máximo 3 gêneros para evitar latência excessiva
  const selectedGenres = genres.slice(0, 3);
  const perGenre = Math.ceil(pageSize / selectedGenres.length);

  try {
    const cacheKey = makeCacheKey(['recommendations', ...selectedGenres, String(pageSize)]);

    const results = await withCache(cacheKey, CACHE_TTL.recommendations, async () => {
      const fetches = selectedGenres.map((genre) =>
        getGamesByGenre(genre, perGenre).catch(() => ({ results: [] })),
      );

      const responses = await Promise.all(fetches);

      // Intercala resultados por gênero e deduplica por rawg_id
      const seen = new Set<number>();
      const interleaved = [];
      const lists = responses.map((r) => r.results);
      const maxLen = Math.max(...lists.map((l) => l.length));

      for (let i = 0; i < maxLen; i++) {
        for (const list of lists) {
          const game = list[i];
          if (game && !seen.has(game.id)) {
            seen.add(game.id);
            interleaved.push(normalizeRawg(game));
          }
        }
      }

      return interleaved.slice(0, pageSize);
    });

    return jsonResponse({ results, count: results.length, genres: selectedGenres });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
