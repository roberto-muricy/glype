// Normaliza payloads RAWG/IGDB para o tipo `Game` usado pelo cliente.
// Mantém as chaves snake_case para alinhar com a tabela `games` no Postgres
// (que o cliente também consome via supabase-js).

import type { RawgGame } from './rawg.ts';
import type { IgdbGame } from './igdb.ts';
import { igdbCoverUrl } from './igdb.ts';

export interface NormalizedGame {
  rawg_id: number | null;
  igdb_id: number | null;
  title: string;
  slug: string | null;
  cover_url: string | null;
  background_url: string | null;
  description: string | null;
  genres: string[];
  platforms: string[];
  developer: string | null;
  publisher: string | null;
  release_date: string | null; // ISO date (YYYY-MM-DD)
  rawg_rating: number | null;
  metacritic_score: number | null;
}

export function normalizeRawg(g: RawgGame): NormalizedGame {
  const developer = g.developers?.[0]?.name ?? null;
  const publisher = g.publishers?.[0]?.name ?? null;
  return {
    rawg_id: g.id,
    igdb_id: null,
    title: g.name,
    slug: g.slug,
    cover_url: g.background_image,
    background_url: g.background_image_additional ?? null,
    description: g.description_raw ?? null,
    genres: (g.genres ?? []).map((x) => x.name),
    platforms: (g.platforms ?? []).map((x) => x.platform.name),
    developer,
    publisher,
    release_date: g.released,
    rawg_rating: typeof g.rating === 'number' ? g.rating : null,
    metacritic_score: g.metacritic ?? null,
  };
}

export function normalizeIgdb(g: IgdbGame): NormalizedGame {
  const dev = g.involved_companies?.find((c) => c.developer)?.company.name ?? null;
  const pub = g.involved_companies?.find((c) => c.publisher)?.company.name ?? null;
  const release = g.first_release_date
    ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
    : null;
  // IGDB rating é 0-100; convertemos pra 0-10 pra ficar consistente com o app.
  const ratingRaw = g.aggregated_rating ?? g.rating ?? null;
  const rating = ratingRaw != null ? Math.round((ratingRaw / 10) * 10) / 10 : null;
  return {
    rawg_id: null,
    igdb_id: g.id,
    title: g.name,
    slug: g.slug ?? null,
    cover_url: igdbCoverUrl(g.cover?.image_id, 't_cover_big'),
    background_url: igdbCoverUrl(g.cover?.image_id, 't_1080p'),
    description: g.summary ?? g.storyline ?? null,
    genres: (g.genres ?? []).map((x) => x.name),
    platforms: (g.platforms ?? []).map((x) => x.name),
    developer: dev,
    publisher: pub,
    release_date: release,
    rawg_rating: rating,
    metacritic_score: null,
  };
}

// Merge RAWG (canônico) + IGDB (complementa storyline, IDs e ratings críticos).
// RAWG vence em campos comuns; IGDB preenche o que faltar.
export function mergeRawgIgdb(
  rawg: NormalizedGame,
  igdb: NormalizedGame | null,
): NormalizedGame {
  if (!igdb) return rawg;
  return {
    ...rawg,
    igdb_id: igdb.igdb_id,
    description: rawg.description ?? igdb.description,
    background_url: rawg.background_url ?? igdb.background_url,
    developer: rawg.developer ?? igdb.developer,
    publisher: rawg.publisher ?? igdb.publisher,
    release_date: rawg.release_date ?? igdb.release_date,
    genres: rawg.genres.length > 0 ? rawg.genres : igdb.genres,
    platforms: rawg.platforms.length > 0 ? rawg.platforms : igdb.platforms,
  };
}
