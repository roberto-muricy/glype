// ensure-game: garante que um jogo existe na tabela `games` e retorna seu UUID.
// Chamado pelo app antes de criar uma review (games só aceita escrita via service_role).
//
// POST /ensure-game
// Body: { rawg_id: number }
// Returns: { id: string, ...game }

import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGameDetail } from '../_shared/rawg.ts';
import { searchGameByName } from '../_shared/igdb.ts';
import {
  normalizeRawg,
  normalizeIgdb,
  mergeRawgIgdb,
  type NormalizedGame,
} from '../_shared/normalize.ts';
import { getServiceClient, withCache, makeCacheKey, CACHE_TTL } from '../_shared/cache.ts';
import { igdbDetail, igdbIdFromKey } from '../_shared/catalog.ts';

/** A IGDB é opcional aqui: não pode segurar o cadastro do jogo. */
const IGDB_BUDGET_MS = 4_000;

/**
 * Só as colunas da tabela games. O payload vem do cache, que pode ter sido
 * gravado por uma versão anterior com campos a mais, e uma coluna
 * desconhecida faria o upsert falhar.
 */
function gameColumns(g: NormalizedGame): NormalizedGame {
  return {
    rawg_id: g.rawg_id,
    igdb_id: g.igdb_id ?? null,
    title: g.title,
    slug: g.slug ?? null,
    cover_url: g.cover_url ?? null,
    background_url: g.background_url ?? null,
    description: g.description ?? null,
    genres: g.genres ?? [],
    platforms: g.platforms ?? [],
    developer: g.developer ?? null,
    publisher: g.publisher ?? null,
    release_date: g.release_date ?? null,
    rawg_rating: g.rawg_rating ?? null,
    metacritic_score: g.metacritic_score ?? null,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout após ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return errorResponse('Método não suportado', 405);
  }

  let rawgId: number;
  try {
    const body = await req.json();
    rawgId = Number(body.rawg_id);
    if (!rawgId || isNaN(rawgId)) throw new Error('rawg_id inválido');
  } catch {
    return errorResponse('Body inválido. Esperado: { rawg_id: number }', 400);
  }

  const supabase = getServiceClient();

  // 1. Verifica se o jogo já existe (evita chamada desnecessária à RAWG)
  const { data: existing } = await supabase
    .from('games')
    .select('*')
    .eq('rawg_id', rawgId)
    .maybeSingle();

  if (existing) {
    return jsonResponse(existing);
  }

  // 2. Jogo que só existe na IGDB (chave negativa). O igdbDetail já procura o
  // jogo no banco pelo igdb_id, slug e título: se ele existir com o rawg_id de
  // verdade, é essa linha que volta, e a review fica com o jogo certo.
  const igdbId = igdbIdFromKey(rawgId);
  if (igdbId != null) {
    let game;
    try {
      game = await igdbDetail(igdbId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar jogo';
      return errorResponse(msg, 502);
    }
    if (!game) return errorResponse('Jogo não encontrado', 404);

    const { data: linked } = await supabase
      .from('games')
      .select('*')
      .eq('rawg_id', game.rawg_id)
      .maybeSingle();
    if (linked) return jsonResponse(linked);

    const { data: inserted, error } = await supabase
      .from('games')
      .upsert(game, { onConflict: 'rawg_id' })
      .select()
      .single();
    if (!error) return jsonResponse(inserted, 201);

    // Conflito de slug ou igdb_id: o jogo já está no banco por outro caminho.
    const { data: same } = await supabase
      .from('games')
      .select('*')
      .or(`igdb_id.eq.${igdbId}${game.slug ? `,slug.eq.${game.slug}` : ''}`)
      .limit(1)
      .maybeSingle();
    if (same) return jsonResponse(same);
    return errorResponse(`Erro ao salvar jogo: ${error.message}`, 500);
  }

  // 3. Dados do jogo pelo mesmo cache do games-detail. Quase sempre a tela do
  // jogo abriu antes e deixou a cópia lá, e com a RAWG fora a cópia vencida
  // serve: sem isso, adicionar à biblioteca dava 502 num jogo que a tela
  // mostrava normalmente.
  let gameData: NormalizedGame;
  try {
    const game = await withCache(makeCacheKey(['detail', rawgId]), CACHE_TTL.detail, async () => {
      const rawgGame = await getGameDetail(rawgId);
      const normalized = normalizeRawg(rawgGame);

      let igdbMatch = null;
      try {
        // Orçamento próprio: se a IGDB (ou o token da Twitch) demorar, o jogo é
        // salvo só com os dados da RAWG em vez de travar a resposta.
        const igdbResults = await withTimeout(searchGameByName(rawgGame.name), IGDB_BUDGET_MS);
        if (igdbResults.length > 0) igdbMatch = normalizeIgdb(igdbResults[0]);
      } catch { /* best-effort */ }

      return mergeRawgIgdb(normalized, igdbMatch);
    });
    gameData = gameColumns(game);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar jogo';
    return errorResponse(msg, 502);
  }

  // 4. Upsert (service_role bypassa RLS)
  const { data: upserted, error } = await supabase
    .from('games')
    .upsert(gameData, { onConflict: 'rawg_id' })
    .select()
    .single();

  if (error) {
    return errorResponse(`Erro ao salvar jogo: ${error.message}`, 500);
  }

  return jsonResponse(upserted, 201);
});
