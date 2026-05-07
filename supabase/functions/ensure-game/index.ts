// ensure-game: garante que um jogo existe na tabela `games` e retorna seu UUID.
// Chamado pelo app antes de criar uma review (games só aceita escrita via service_role).
//
// POST /ensure-game
// Body: { rawg_id: number }
// Returns: { id: string, ...game }

import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGameDetail } from '../_shared/rawg.ts';
import { searchGameByName } from '../_shared/igdb.ts';
import { normalizeRawg, normalizeIgdb, mergeRawgIgdb } from '../_shared/normalize.ts';
import { getServiceClient } from '../_shared/cache.ts';

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

  // 2. Busca na RAWG + IGDB e normaliza
  let gameData;
  try {
    const rawgGame = await getGameDetail(rawgId);
    const normalized = normalizeRawg(rawgGame);

    let igdbMatch = null;
    try {
      const igdbResults = await searchGameByName(rawgGame.name);
      if (igdbResults.length > 0) igdbMatch = normalizeIgdb(igdbResults[0]);
    } catch { /* best-effort */ }

    gameData = mergeRawgIgdb(normalized, igdbMatch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar jogo';
    return errorResponse(msg, 502);
  }

  // 3. Upsert (service_role bypassa RLS)
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
