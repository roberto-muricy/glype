// games-discover: queue de jogos pra swipe deck.
//
// Diferente de games-recommendations:
// - Requer JWT (precisa do user_id pra excluir dismissed + library)
// - Pagina (?page=N) pra prefetch ao swipar
// - Exclui jogos que o usuário já dismissou (game_dismissals)
// - Exclui jogos que já estão na library (user_games) — não faz sentido sugerir o que já joga
//
// Cache: o pool de candidatos depende SÓ do conjunto de gêneros — não do
// usuário nem da página. É isso que o torna cacheável e compartilhado entre
// todos os usuários (1h). A exclusão por usuário e o fatiamento por página
// acontecem depois, em memória. Antes daqui cada request (inclusive cada
// prefetch de página) fazia 3 chamadas ao vivo na RAWG.
//
// Query: GET /games-discover?genres=action,rpg&page=0&page_size=20

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGamesByGenre } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import {
  getServiceClient,
  withCache,
  makeCacheKey,
  CACHE_TTL,
} from '../_shared/cache.ts';

const FALLBACK_GENRES = ['action', 'role-playing-games-rpg', 'adventure'];

/** Teto da RAWG por request. Buscamos o pool cheio de uma vez e paginamos em memória. */
const POOL_PER_GENRE = 40;

type NormalizedGame = ReturnType<typeof normalizeRawg>;

/**
 * Pool de candidatos pro conjunto de gêneros, em round-robin e deduplicado.
 * Fica atrás do cache: o custo da RAWG é pago uma vez por hora pra toda a base,
 * em vez de uma vez por usuário por página.
 */
function fetchPool(selectedGenres: string[]): Promise<NormalizedGame[]> {
  const key = makeCacheKey(['discover', 'pool', selectedGenres.join('+'), POOL_PER_GENRE]);

  return withCache(key, CACHE_TTL.discover, async () => {
    const settled = await Promise.all(
      selectedGenres.map((g) =>
        getGamesByGenre(g, POOL_PER_GENRE).then(
          (r) => r.results,
          () => null, // null = esse gênero falhou
        ),
      ),
    );

    // Se TODOS falharam, joga o erro: `withCache` não grava nada e o próximo
    // request tenta de novo. Gravar um pool vazio prenderia o deck por 1h.
    if (settled.every((list) => list === null)) {
      throw new Error('RAWG indisponível para todos os gêneros');
    }

    // Interleave entre gêneros (round-robin) + dedup por rawg_id.
    const lists = settled.map((list) => list ?? []);
    const maxLen = Math.max(...lists.map((l) => l.length), 0);
    const seen = new Set<number>();
    const pool: NormalizedGame[] = [];

    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        const game = list[i];
        if (!game || seen.has(game.id)) continue;
        seen.add(game.id);
        pool.push(normalizeRawg(game));
      }
    }
    return pool;
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  // 1. Auth — extrai user_id do JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) return errorResponse('Não autenticado', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return errorResponse('Configuração ausente no servidor', 500);
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
  if (userErr || !userData.user) return errorResponse('Sessão inválida', 401);
  const userId = userData.user.id;

  // 2. Params
  const url = new URL(req.url);
  const genresParam = url.searchParams.get('genres');
  const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10));
  const pageSize = Math.min(40, parseInt(url.searchParams.get('page_size') ?? '20', 10));

  const genres = genresParam
    ? genresParam.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean)
    : FALLBACK_GENRES;
  // Ordena pra que ?genres=action,rpg e ?genres=rpg,action compartilhem cache.
  const selectedGenres = genres.slice(0, 3).sort();

  try {
    // 3. Pool (cacheado) + exclusões do usuário, em paralelo — são
    //    independentes, não faz sentido serializar.
    const admin = getServiceClient();

    const [pool, excludedRawgIds] = await Promise.all([
      fetchPool(selectedGenres),
      (async () => {
        const excluded = new Set<number>();
        try {
          const [{ data: dismissed }, { data: library }] = await Promise.all([
            admin
              .from('game_dismissals')
              .select('game_id, games:games!inner(rawg_id)')
              .eq('user_id', userId),
            admin
              .from('user_games')
              .select('game_id, games:games!inner(rawg_id)')
              .eq('user_id', userId),
          ]);
          for (const row of [...(dismissed ?? []), ...(library ?? [])]) {
            const rid = (row as { games?: { rawg_id?: number | null } }).games?.rawg_id;
            if (rid != null) excluded.add(rid);
          }
        } catch (_e) {
          // Sem filtro é melhor que sem deck — pior caso mostra jogos repetidos.
        }
        return excluded;
      })(),
    ]);

    // 4. Aplica exclusão e fatia a página — tudo em memória.
    const available = pool.filter(
      (g) => g.rawg_id != null && !excludedRawgIds.has(g.rawg_id),
    );
    const start = page * pageSize;
    const slice = available.slice(start, start + pageSize);

    return jsonResponse({
      results: slice,
      count: slice.length,
      page,
      has_more: available.length > start + pageSize,
      genres: selectedGenres,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
