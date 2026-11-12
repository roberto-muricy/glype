import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGamesByGenre } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';
import { fallbackByGenres } from '../_shared/fallback.ts';
import { igdbByGenres } from '../_shared/catalog.ts';

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
      const settled = await Promise.allSettled(
        selectedGenres.map((genre) => getGamesByGenre(genre, perGenre)),
      );

      // Um gênero falhando ainda rende uma lista; todos falhando é a RAWG fora
      // do ar. Antes isso virava [] e ficava 24h no cache.
      const failed = settled.find((s) => s.status === 'rejected');
      if (failed && settled.every((s) => s.status === 'rejected')) {
        throw (failed as PromiseRejectedResult).reason;
      }

      // Intercala resultados por gênero e deduplica por rawg_id
      const seen = new Set<number>();
      const interleaved = [];
      const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value.results : []));
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
    try {
      const results = (await igdbByGenres(selectedGenres, perGenre)).slice(0, pageSize);
      if (results.length > 0) {
        return jsonResponse({ results, count: results.length, genres: selectedGenres, fallback: true, source: 'igdb' });
      }
    } catch (igdbErr) {
      console.error('[games-recommendations] IGDB falhou:', igdbErr instanceof Error ? igdbErr.message : igdbErr);
    }
    try {
      const results = await fallbackByGenres(selectedGenres, pageSize);
      if (results.length > 0) {
        return jsonResponse({ results, count: results.length, genres: selectedGenres, fallback: true });
      }
    } catch (fallbackErr) {
      console.error('[games-recommendations] reserva falhou:', fallbackErr);
    }
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
