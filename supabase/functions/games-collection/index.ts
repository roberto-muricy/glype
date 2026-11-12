import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { PS_PLATFORM_IDS, type RawgGame, type RawgListResponse } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';
import { igdbCollection, currentMonthRange } from '../_shared/catalog.ts';

// ─── Collections config (duplicado do src/config/collections.ts) ─────────────
// Deno não pode importar do src/ do projeto React Native, então replicamos aqui.

interface CollectionConfig {
  rawgParams: Record<string, string>;
}

/** O mês corrente no formato da RAWG. Fixo no código, a coleção dizia "maio" em novembro. */
function monthlyReleaseDates(): string {
  const { start, end } = currentMonthRange();
  return `${start.toISOString().slice(0, 10)},${end.toISOString().slice(0, 10)}`;
}

const COLLECTION_MAP: Record<string, CollectionConfig> = {
  'monthly-releases': { rawgParams: { dates: '', ordering: '-rating' } },
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
  // Mesmo teto do rawgFetch: sem ele, uma RAWG fora do ar segurava a função
  // até o gateway cortar, e a cópia do cache nunca chegava a ser usada.
  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('RAWG não respondeu em 10s');
    }
    throw err;
  }
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

  const params = collectionId === 'monthly-releases'
    ? { ...config.rawgParams, dates: monthlyReleaseDates() }
    : config.rawgParams;

  try {
    // O mês entra na chave: a coleção de novembro não pode servir a de dezembro.
    // As outras mantêm a chave antiga, cujas cópias seguram o app sem a RAWG.
    const cacheKey = makeCacheKey(
      collectionId === 'monthly-releases'
        ? ['collection', collectionId, params.dates, String(pageSize)]
        : ['collection', collectionId, String(pageSize)],
    );

    const results = await withCache(cacheKey, CACHE_TTL.trending, async () => {
      const rawgRes = await fetchCollection(params, pageSize);
      return rawgRes.results.map(normalizeRawg);
    });

    return jsonResponse({ results, count: results.length });
  } catch (err) {
    // Sem RAWG e sem cópia: a mesma coleção montada com os filtros da IGDB.
    try {
      const results = await igdbCollection(collectionId, pageSize);
      if (results.length > 0) {
        return jsonResponse({ results, count: results.length, fallback: true, source: 'igdb' });
      }
    } catch (igdbErr) {
      console.error('[games-collection] IGDB falhou:', igdbErr instanceof Error ? igdbErr.message : igdbErr);
    }
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
