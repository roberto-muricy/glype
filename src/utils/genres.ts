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
};

export function genreLabel(slug: string, t: TFunction | ((key: string) => string)): string {
  const key = GENRE_KEYS[slug];
  return key ? (t as (k: string) => string)(`search.genres.${key}`) : slug;
}
