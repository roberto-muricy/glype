// games-discover: queue de jogos pra swipe deck.
//
// Diferente de games-recommendations:
// - Requer JWT (precisa do user_id pra excluir dismissed + library)
// - Pagina (?page=N) pra prefetch ao swipar
// - Exclui jogos que o usuário já dismissou (game_dismissals)
// - Exclui jogos que já estão na library (user_games) — não faz sentido sugerir o que já joga
// - Mantém cache curto (1h) por genres+page pra freshness
//
// Query: GET /games-discover?genres=action,rpg&page=0&page_size=20

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getGamesByGenre } from '../_shared/rawg.ts';
import { normalizeRawg } from '../_shared/normalize.ts';
import { getServiceClient } from '../_shared/cache.ts';

const FALLBACK_GENRES = ['action', 'role-playing-games-rpg', 'adventure'];

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
  const selectedGenres = genres.slice(0, 3);

  // 3. Busca exclusion set (dismissed + library) via service_role
  const admin = getServiceClient();
  const excludedRawgIds = new Set<number>();

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

    for (const row of dismissed ?? []) {
      const rid = (row as { games?: { rawg_id?: number | null } }).games?.rawg_id;
      if (rid != null) excludedRawgIds.add(rid);
    }
    for (const row of library ?? []) {
      const rid = (row as { games?: { rawg_id?: number | null } }).games?.rawg_id;
      if (rid != null) excludedRawgIds.add(rid);
    }
  } catch (_e) {
    // Se der erro na exclusão, segue sem filtro — pior caso: mostra duplicados
  }

  // 4. Fetch RAWG por gênero. Pula `page * pageSize` resultados pra paginar
  //    (RAWG não tem cursor real, então usamos offset por página computado client-side).
  try {
    // Pra páginas > 0, multiplica por (page+1) o batch RAWG e descarta os primeiros — solução simples
    // pra MVP. Não é eficiente, mas funciona com até ~5 páginas.
    const batchSize = pageSize * (page + 1) + excludedRawgIds.size; // overhead defensivo
    const perGenre = Math.min(40, Math.ceil(batchSize / selectedGenres.length));

    const fetches = selectedGenres.map((g) =>
      getGamesByGenre(g, perGenre).catch(() => ({ results: [] })),
    );
    const responses = await Promise.all(fetches);

    // Interleave + dedup + exclude
    const seen = new Set<number>();
    const interleaved: ReturnType<typeof normalizeRawg>[] = [];
    const lists = responses.map((r) => r.results);
    const maxLen = Math.max(...lists.map((l) => l.length), 0);

    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        const game = list[i];
        if (!game) continue;
        if (seen.has(game.id)) continue;
        if (excludedRawgIds.has(game.id)) continue;
        seen.add(game.id);
        interleaved.push(normalizeRawg(game));
      }
    }

    // Skip pra página atual
    const start = page * pageSize;
    const slice = interleaved.slice(start, start + pageSize);

    return jsonResponse({
      results: slice,
      count: slice.length,
      page,
      has_more: interleaved.length > start + pageSize,
      genres: selectedGenres,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return errorResponse(message);
  }
});
