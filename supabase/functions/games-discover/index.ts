// games-discover: queue de jogos pra swipe deck.
//
// Diferente de games-recommendations:
// - Requer JWT (precisa do user_id pra excluir dismissed + library)
// - Pagina (?page=N) pra prefetch ao swipar
// - Exclui jogos que o usuário já dismissou (game_dismissals)
// - Exclui jogos que já estão na library (user_games) — não faz sentido sugerir o que já joga
//
// Cache: o pool completo de candidatos depende SÓ do conjunto de gêneros — não
// do usuário nem da página —, então fica 1h em cache, compartilhado por todos.
// A exclusão por usuário e o fatiamento por página acontecem depois, em memória.
//
// Num cache miss a resposta NÃO espera o pool completo: medido em produção,
// pedir 40 jogos por gênero à RAWG deixava a primeira abertura do deck em ~11s.
// Respondemos com uma busca do tamanho da página pedida (o mesmo dimensionamento
// da versão sem cache) e montamos o pool completo em background.
//
// Query: GET /games-discover?genres=action,rpg&page=0&page_size=20

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGamesByGenre } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import {
  getServiceClient,
  getCache,
  setCache,
  makeCacheKey,
  CACHE_TTL,
} from '../_shared/cache.ts';

// O Edge Runtime do Supabase mantém vivo o que for passado ao waitUntil depois
// que a resposta sai. Fora dele (ex.: testes locais) o identificador não existe.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const FALLBACK_GENRES = ['action', 'role-playing-games-rpg', 'adventure'];

/** Tamanho do pool completo por gênero (teto da RAWG por request). */
const POOL_PER_GENRE = 40;

type NormalizedGame = ReturnType<typeof normalizeRawg>;
type RawgList = Awaited<ReturnType<typeof getGamesByGenre>>['results'];

/** Pools sendo montados neste isolate — evita buscas repetidas numa rajada de misses. */
const filling = new Set<string>();

function poolKey(genres: string[]): string {
  return makeCacheKey(['discover', 'pool', genres.join('+'), POOL_PER_GENRE]);
}

function logError(context: string, e: unknown): void {
  console.error(`[games-discover] ${context}:`, e instanceof Error ? e.message : e);
}

function runInBackground(task: Promise<unknown>): void {
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
}

/** Listas por gênero. Lança só se TODOS falharem: pool vazio não serve pra nada. */
async function fetchGenreLists(genres: string[], perGenre: number): Promise<RawgList[]> {
  const settled = await Promise.all(
    genres.map((g) =>
      getGamesByGenre(g, perGenre).then(
        (r) => r.results,
        () => null, // null = esse gênero falhou
      ),
    ),
  );
  if (settled.every((list) => list === null)) {
    throw new Error('RAWG indisponível para todos os gêneros');
  }
  return settled.map((list) => list ?? []);
}

/** Interleave entre gêneros (round-robin) + dedup por rawg_id. */
function buildPool(lists: RawgList[]): NormalizedGame[] {
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
}

/** Monta o pool completo e grava no cache sem segurar a resposta. */
function fillPoolInBackground(key: string, genres: string[]): void {
  if (filling.has(key)) return;
  filling.add(key);
  runInBackground(
    fetchGenreLists(genres, POOL_PER_GENRE)
      .then((lists) => setCache(key, buildPool(lists), CACHE_TTL.discover))
      .catch((e) => logError(`preenchimento do pool ${key}`, e))
      .finally(() => filling.delete(key)),
  );
}

/** rawg_ids que o usuário já dismissou ou tem na biblioteca. */
async function getExcludedRawgIds(userId: string): Promise<Set<number>> {
  const admin = getServiceClient();
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
  } catch (e) {
    // Sem filtro é melhor que sem deck — pior caso mostra jogos repetidos.
    logError('busca de exclusões', e);
  }
  return excluded;
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
    // 3. Cache e exclusões em paralelo — são independentes e ambos rápidos.
    const key = poolKey(selectedGenres);
    const [cachedPool, excludedRawgIds] = await Promise.all([
      getCache<NormalizedGame[]>(key),
      getExcludedRawgIds(userId),
    ]);

    const start = page * pageSize;
    const end = start + pageSize;
    let pool: NormalizedGame[];
    let poolIsPartial = false;

    if (cachedPool) {
      pool = cachedPool;
    } else {
      // 4. Miss: busca só o que esta página precisa, já descontando as exclusões.
      const perGenre = Math.min(
        POOL_PER_GENRE,
        Math.ceil((end + excludedRawgIds.size) / selectedGenres.length),
      );
      pool = buildPool(await fetchGenreLists(selectedGenres, perGenre));

      if (perGenre < POOL_PER_GENRE) {
        poolIsPartial = true;
        fillPoolInBackground(key, selectedGenres);
      } else {
        // Já veio no tamanho cheio: só grava, sem refazer a busca.
        runInBackground(
          setCache(key, pool, CACHE_TTL.discover).catch((e) => logError(`gravação do pool ${key}`, e)),
        );
      }
    }

    // 5. Aplica exclusão e fatia a página — tudo em memória.
    const available = pool.filter(
      (g) => g.rawg_id != null && !excludedRawgIds.has(g.rawg_id),
    );
    const slice = available.slice(start, end);

    return jsonResponse({
      results: slice,
      count: slice.length,
      page,
      // Com pool parcial pode haver mais do que buscamos agora — e a próxima
      // página provavelmente já sai do pool completo.
      has_more: available.length > end || poolIsPartial,
      genres: selectedGenres,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
