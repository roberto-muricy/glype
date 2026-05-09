import type { Game } from '@/src/types/models';
import type { SearchFiltersState } from '@/src/components/domain/SearchFilters';

const PS5_STRINGS = ['PlayStation 5', 'PS5'];
const PS4_STRINGS = ['PlayStation 4', 'PS4'];

function matchesPlatform(game: Game, platform: SearchFiltersState['platform']): boolean {
  if (platform === 'all') return true;
  const names = game.platforms;
  if (platform === 'ps5') return names.some((p) => PS5_STRINGS.some((s) => p.includes(s)));
  if (platform === 'ps4') return names.some((p) => PS4_STRINGS.some((s) => p.includes(s)));
  return true;
}

function gameScore(game: Game): number {
  if (game.metacritic_score != null) return game.metacritic_score / 10;
  if (game.rawg_rating != null) return game.rawg_rating * 2; // 0-5 → 0-10
  return 0;
}

function matchesScore(game: Game, score: SearchFiltersState['score']): boolean {
  if (score === 'any') return true;
  const min = parseInt(score, 10);
  return gameScore(game) >= min;
}

function sortGames(
  games: Game[],
  sort: SearchFiltersState['sort'],
): Game[] {
  if (sort === 'relevance') return games; // preserve API order
  if (sort === 'score') {
    return [...games].sort((a, b) => gameScore(b) - gameScore(a));
  }
  if (sort === 'date') {
    return [...games].sort((a, b) => {
      const da = a.release_date ?? '';
      const db = b.release_date ?? '';
      return db.localeCompare(da); // newest first
    });
  }
  return games;
}

export function applyFilters(
  games: Game[],
  filters: SearchFiltersState,
): Game[] {
  const filtered = games.filter(
    (g) => matchesPlatform(g, filters.platform) && matchesScore(g, filters.score),
  );
  return sortGames(filtered, filters.sort);
}
