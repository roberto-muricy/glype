import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGameDetail } from '../_shared/rawg.ts';
import { searchGameByName } from '../_shared/igdb.ts';
import { normalizeRawg, normalizeIgdb, mergeRawgIgdb } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';
import { fallbackDetail } from '../_shared/fallback.ts';
import { igdbDetail, igdbIdFromKey } from '../_shared/catalog.ts';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const rawgIdParam = url.searchParams.get('rawg_id');

  if (!rawgIdParam) {
    return errorResponse('Parâmetro "rawg_id" obrigatório', 400);
  }

  const rawgId = parseInt(rawgIdParam, 10);
  if (isNaN(rawgId)) {
    return errorResponse('"rawg_id" deve ser um número inteiro', 400);
  }

  // Jogo que só existe na IGDB (chave negativa): a RAWG não o conhece.
  const igdbId = igdbIdFromKey(rawgId);
  if (igdbId != null) {
    try {
      const game = await igdbDetail(igdbId);
      return game ? jsonResponse(game) : errorResponse('Jogo não encontrado', 404);
    } catch (err) {
      console.error('[games-detail] IGDB falhou:', err instanceof Error ? err.message : err);
      return errorResponse('Catálogo indisponível', 503);
    }
  }

  try {
    const cacheKey = makeCacheKey(['detail', rawgId]);

    const game = await withCache(cacheKey, CACHE_TTL.detail, async () => {
      const rawgGame = await getGameDetail(rawgId);
      const normalized = normalizeRawg(rawgGame);

      // Busca IGDB pelo título para enriquecer com storyline e ratings críticos
      let igdbMatch = null;
      try {
        const igdbResults = await searchGameByName(rawgGame.name);
        if (igdbResults.length > 0) {
          igdbMatch = normalizeIgdb(igdbResults[0]);
        }
      } catch {
        // IGDB é best-effort: falha silenciosa
      }

      return mergeRawgIgdb(normalized, igdbMatch);
    });

    return jsonResponse(game);
  } catch (err) {
    // Sem RAWG e sem cópia: o jogo como está na tabela games, se estiver.
    try {
      const game = await fallbackDetail(rawgId);
      if (game) return jsonResponse(game);
    } catch (fallbackErr) {
      console.error('[games-detail] reserva falhou:', fallbackErr);
    }
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
