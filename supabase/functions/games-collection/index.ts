import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { PS_PLATFORM_IDS, type RawgGame, type RawgListResponse } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';

// ─── Collections config (duplicado do src/config/collections.ts) ─────────────
// Deno não pode importar do src/ do projeto React Native, então replicamos aqui.

interface CollectionConfig {
  rawgParams: Record<string, string>;
}

const COLLECTION_MAP: Record<string, CollectionConfig> = {
  'monthly-releases': { rawgParams: { dates: '2026-05-01,2026-05-31', ordering: '-rating' } },
  'editors-pick':     { rawgParams: { metacritic: '85,100', ordering: '-metacritic' } },
  'sci-fi':           { rawgParams: { tags: 'science-fiction', ordering: '-rating' } },
  'cyberpunk':        { rawgParams: { tags: 'cyberpunk', ordering: '-rating' } },
  'bestsellers':      { rawgParams: { ordering: '-added' } },
  'ps4-classics':     { rawgParams: { dates: '2013-01-01,2020-12-31', ordering: '-metacritic' } },
  'open-world':       { rawgParams: { tags: 'open-world', ordering: '-rating' } },
  'horror':           { rawgParams: { tags: 'horror', ordering: '-rating' } },
  'soulslike':        { rawgParams: { tags: 'souls-like', ordering: '-rating' } },
};

// ─── RAWG fetch (inline para não depender de rawg.ts que tem getGamesByGenre etc.) ──

function getApiKey(): string {
  const key = Deno.env.get('RAWG_API_KEY');
  if (!key) throw new Error('RAWG_API_KEY não configurada');
  return key;
}

async function fetchCollection(
  params: Record<string, string>,
  pageSize: number,
): Promise<RawgListResponse<RawgGame>> {
  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', getApiKey());
  url.searchParams.set('platforms', PS_PLATFORM_IDS);
  url.searchParams.set('page_size', String(pageSize));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAWG ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<RawgListResponse<RawgGame>>;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const collectionId = url.searchParams.get('collection') ?? '';
  const pageSizeParam = url.searchParams.get('page_size');
  const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 40) : 20;

  const config = COLLECTION_MAP[collectionId];
  if (!config) {
    return errorResponse(`Coleção desconhecida: ${collectionId}`, 400);
  }

  try {
    const cacheKey = makeCacheKey(['collection', collectionId, String(pageSize)]);

    const results = await withCache(cacheKey, CACHE_TTL.trending, async () => {
      const rawgRes = await fetchCollection(config.rawgParams, pageSize);
      return rawgRes.results.map(normalizeRawg);
    });

    return jsonResponse({ results, count: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
