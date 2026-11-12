import type { Game } from '@/src/types/models';

type ScoredGame = Pick<Game, 'metacritic_score' | 'rawg_rating'>;

/**
 * Nota do jogo de 0 a 10, como os cards mostram.
 *
 * O Metacritic vai de 0 a 100; a RAWG (e a IGDB, gravada no mesmo campo) vai
 * de 0 a 5. Os cards mostravam a da RAWG crua, então um jogo com 4,4 de 5
 * aparecia como "4.4" ao lado de outro com "9.2" — um terço dos jogos.
 * Nota 0 na RAWG é "sem avaliação", não nota zero.
 */
export function gameScore10(game: ScoredGame): number | null {
  if (game.metacritic_score != null) return game.metacritic_score / 10;
  if (game.rawg_rating != null && game.rawg_rating > 0) {
    return Math.round(game.rawg_rating * 20) / 10;
  }
  return null;
}
