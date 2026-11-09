// Catálogo de reserva: a tabela `games` respondendo quando a RAWG não responde
// e o cache não tem aquela chamada exata (uma busca nova, um gênero sem cópia).
//
// É um catálogo menor — os jogos que já passaram pelo app, mais os copiados do
// cache pela migration 0013 —, mas é muito melhor que uma tela de erro. Nada
// aqui é gravado no cache: quando a RAWG voltar, a resposta normal assume.

import { getServiceClient } from './cache.ts';
import type { NormalizedGame } from './normalize.ts';

const GAME_COLUMNS =
  'rawg_id, igdb_id, title, slug, cover_url, background_url, description, genres, platforms, developer, publisher, release_date, rawg_rating, metacritic_score';

/** Slug de gênero da RAWG (o que o app manda) → nome guardado em `games.genres`. */
const GENRE_NAMES: Record<string, string> = {
  action: 'Action',
  'role-playing-games-rpg': 'RPG',
  adventure: 'Adventure',
  shooter: 'Shooter',
  sports: 'Sports',
  racing: 'Racing',
  indie: 'Indie',
  strategy: 'Strategy',
  puzzle: 'Puzzle',
  fighting: 'Fighting',
  platformer: 'Platformer',
};

/**
 * O cache também guardou jogos de outras plataformas (páginas abertas por
 * link, dados da IGDB). As listas da RAWG sempre filtram PS4/PS5; a reserva
 * também precisa, senão Zelda aparece no topo de um app de PlayStation.
 */
const PS_PLATFORMS = ['PlayStation 4', 'PlayStation 5'];

function logFallback(context: string, count: number): void {
  console.warn(`[fallback] ${context}: ${count} jogo(s) da tabela games`);
}

// As listas saem dos mais bem avaliados para os menos e deixam de fora jogos
// sem capa, porque o app é todo visual.

export async function fallbackDetail(rawgId: number): Promise<NormalizedGame | null> {
  const { data, error } = await getServiceClient()
    .from('games')
    .select(GAME_COLUMNS)
    .eq('rawg_id', rawgId)
    .maybeSingle<NormalizedGame>();
  if (error) throw new Error(`fallbackDetail: ${error.message}`);
  if (data) logFallback(`detalhe ${rawgId}`, 1);
  return data;
}

export async function fallbackSearch(query: string, limit: number): Promise<NormalizedGame[]> {
  // Escapa os curingas do ILIKE para a busca valer como texto.
  const term = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await getServiceClient()
    .from('games')
    .select(GAME_COLUMNS)
    .ilike('title', `%${term}%`)
    .overlaps('platforms', PS_PLATFORMS)
    .not('cover_url', 'is', null)
    .order('metacritic_score', { ascending: false, nullsFirst: false })
    .order('rawg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`fallbackSearch: ${error.message}`);
  logFallback(`busca "${query}"`, data?.length ?? 0);
  return (data ?? []) as NormalizedGame[];
}

/** Por gêneros (slugs da RAWG); sem gênero conhecido, os mais bem avaliados. */
export async function fallbackByGenres(
  genreSlugs: string[],
  limit: number,
): Promise<NormalizedGame[]> {
  const names = genreSlugs.map((g) => GENRE_NAMES[g]).filter(Boolean);
  let query = getServiceClient()
    .from('games')
    .select(GAME_COLUMNS)
    .overlaps('platforms', PS_PLATFORMS)
    .not('cover_url', 'is', null);
  if (names.length > 0) query = query.overlaps('genres', names);
  const { data, error } = await query
    .order('metacritic_score', { ascending: false, nullsFirst: false })
    .order('rawg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`fallbackByGenres: ${error.message}`);
  logFallback(`gêneros ${genreSlugs.join(',') || '(nenhum)'}`, data?.length ?? 0);
  return (data ?? []) as NormalizedGame[];
}

export function fallbackTop(limit: number): Promise<NormalizedGame[]> {
  return fallbackByGenres([], limit);
}
