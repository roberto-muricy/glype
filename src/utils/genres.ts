import type { TFunction } from 'i18next';

/**
 * Slug de gênero guardado no perfil (o mesmo da RAWG) → chave de tradução em
 * `search.genres`. Sem isso o perfil mostrava "role-playing-games-rpg".
 */
const GENRE_KEYS: Record<string, string> = {
  action: 'action',
  'role-playing-games-rpg': 'rpg',
  adventure: 'adventure',
  shooter: 'shooter',
  sports: 'sports',
  racing: 'racing',
  indie: 'indie',
  strategy: 'strategy',
  puzzle: 'puzzle',
  fighting: 'fighting',
  platformer: 'platformer',
  horror: 'horror',
  // Nomes como vêm em `games.genres` (RAWG e IGDB), já em minúsculas.
  rpg: 'rpg',
  'role-playing (rpg)': 'rpg',
  sport: 'sports',
  platform: 'platformer',
};

/** Aceita o slug do perfil ou o nome guardado em `games.genres`. */
export function genreLabel(slug: string, t: TFunction | ((key: string) => string)): string {
  const key = GENRE_KEYS[slug] ?? GENRE_KEYS[slug.toLowerCase()];
  return key ? (t as (k: string) => string)(`search.genres.${key}`) : slug;
}
