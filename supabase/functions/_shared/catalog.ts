// Catálogo pela IGDB, usado quando a RAWG não responde.
//
// Em novembro de 2026 a RAWG saiu do ar inteira (site e API) sem aviso. A
// tabela `games` segurava o app, mas só com ~2.000 jogos: lançamento novo e
// busca fora dela não apareciam. A IGDB (da Twitch) cobre o catálogo todo.
//
// O app identifica um jogo pelo `rawg_id` — no banco, nas rotas e nas reviews.
// Para não mudar o app, um jogo que só existe na IGDB ganha como `rawg_id` o
// id da IGDB com sinal negativo (IGDB 1942 → -1942). Antes disso, cada jogo da
// IGDB é procurado no banco (pelo igdb_id, pelo slug ou pelo título); se já
// existe, volta com o rawg_id de verdade e as reviews continuam ligadas a ele.
//
// Ordem nas funções: RAWG → cópia do cache → IGDB → tabela `games`.

import { igdbFetch, igdbCoverUrl, type IgdbGame } from './igdb.ts';
import { getServiceClient, getCacheEntry, setCache } from './cache.ts';
import type { NormalizedGame } from './normalize.ts';

// ─── Chave do jogo ───────────────────────────────────────────────────────────

/** rawg_id de um jogo que só existe na IGDB. */
export function igdbKey(igdbId: number): number {
  return -Math.abs(igdbId);
}

/** id da IGDB quando o rawg_id é uma chave da IGDB; senão null. */
export function igdbIdFromKey(rawgId: number): number | null {
  return rawgId < 0 ? -rawgId : null;
}

// ─── Consultas ───────────────────────────────────────────────────────────────

const FIELDS = [
  'name', 'slug', 'summary', 'storyline', 'first_release_date',
  'total_rating', 'total_rating_count',
  'cover.image_id', 'artworks.image_id', 'screenshots.image_id',
  'genres.slug', 'genres.name', 'themes.slug', 'themes.name',
  'platforms.name',
  'involved_companies.company.name', 'involved_companies.developer', 'involved_companies.publisher',
].join(',');

/**
 * PS4 (48) e PS5 (167), só o jogo principal: sem edições (version_parent) e
 * sem DLC, expansão ou pacote (game_type 0 = jogo, 8 = remake, 9 = remaster,
 * 10 = jogo expandido, 11 = port).
 */
const BASE_WHERE = 'platforms = (48,167) & version_parent = null & game_type = (0,8,9,10,11)';

/** Jogos com poucas avaliações são ruído no topo das listas. */
const MIN_RATINGS = 10;

function escapeIgdb(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Gêneros: o app manda os slugs da RAWG; a IGDB divide entre gêneros e temas
// ("Action" é tema na IGDB, não gênero).
interface GenreQuery {
  genres?: string[];
  themes?: string[];
}

const APP_GENRES: Record<string, GenreQuery> = {
  action: { themes: ['action'], genres: ['hack-and-slash-beat-em-up'] },
  'role-playing-games-rpg': { genres: ['role-playing-rpg'] },
  adventure: { genres: ['adventure'] },
  shooter: { genres: ['shooter'] },
  sports: { genres: ['sport'] },
  racing: { genres: ['racing'] },
  indie: { genres: ['indie'] },
  strategy: { genres: ['strategy', 'real-time-strategy-rts', 'turn-based-strategy-tbs', 'tactical'] },
  puzzle: { genres: ['puzzle'] },
  fighting: { genres: ['fighting'] },
  platformer: { genres: ['platform'] },
};

/** Slug da IGDB → nome que a RAWG usa, para o app e a tabela falarem a mesma língua. */
const GENRE_DISPLAY: Record<string, string> = {
  action: 'Action',
  'hack-and-slash-beat-em-up': 'Action',
  'role-playing-rpg': 'RPG',
  adventure: 'Adventure',
  shooter: 'Shooter',
  sport: 'Sports',
  racing: 'Racing',
  indie: 'Indie',
  strategy: 'Strategy',
  'real-time-strategy-rts': 'Strategy',
  'turn-based-strategy-tbs': 'Strategy',
  tactical: 'Strategy',
  puzzle: 'Puzzle',
  fighting: 'Fighting',
  platform: 'Platformer',
  simulator: 'Simulation',
  arcade: 'Arcade',
  'card-and-board-game': 'Board Games',
};

/** slug → id, por endpoint (genres, themes, keywords). Vale enquanto o isolate vive. */
const idCache = new Map<string, number>();

async function lookupIds(endpoint: 'genres' | 'themes' | 'keywords', slugs: string[]): Promise<number[]> {
  const missing = slugs.filter((s) => !idCache.has(`${endpoint}:${s}`));
  if (missing.length > 0) {
    const list = missing.map((s) => `"${escapeIgdb(s)}"`).join(',');
    const rows = await igdbFetch<{ id: number; slug: string }[]>(
      endpoint,
      `fields id,slug; where slug = (${list}); limit 50;`,
    );
    for (const r of rows) idCache.set(`${endpoint}:${r.slug}`, r.id);
  }
  return slugs
    .map((s) => idCache.get(`${endpoint}:${s}`))
    .filter((id): id is number => id != null);
}

async function genreFilter(appGenre: string): Promise<string | null> {
  const q = APP_GENRES[appGenre];
  if (!q) return null;
  const [genreIds, themeIds] = await Promise.all([
    q.genres ? lookupIds('genres', q.genres) : [],
    q.themes ? lookupIds('themes', q.themes) : [],
  ]);
  const parts = [];
  if (genreIds.length > 0) parts.push(`genres = (${genreIds.join(',')})`);
  if (themeIds.length > 0) parts.push(`themes = (${themeIds.join(',')})`);
  return parts.length > 0 ? `(${parts.join(' | ')})` : null;
}

function queryGames(clauses: { search?: string; where?: string; sort?: string; limit: number }) {
  const body = [
    clauses.search ? `search "${escapeIgdb(clauses.search)}";` : '',
    `fields ${FIELDS};`,
    `where ${BASE_WHERE}${clauses.where ? ` & ${clauses.where}` : ''};`,
    clauses.sort ? `sort ${clauses.sort};` : '',
    `limit ${clauses.limit};`,
  ].join(' ');
  return igdbFetch<IgdbGame[]>('games', body);
}

// ─── Normalização ────────────────────────────────────────────────────────────

function toGame(g: IgdbGame): NormalizedGame {
  const names = new Set<string>();
  for (const t of g.themes ?? []) if (t.slug === 'action') names.add('Action');
  for (const x of g.genres ?? []) names.add((x.slug && GENRE_DISPLAY[x.slug]) ?? x.name);

  const wideImage = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
  return {
    rawg_id: igdbKey(g.id),
    igdb_id: g.id,
    title: g.name,
    slug: g.slug ?? null,
    cover_url: igdbCoverUrl(g.cover?.image_id, 't_cover_big'),
    background_url: igdbCoverUrl(wideImage, 't_720p') ?? igdbCoverUrl(g.cover?.image_id, 't_720p'),
    description: g.summary ?? g.storyline ?? null,
    genres: [...names],
    platforms: (g.platforms ?? []).map((p) => p.name),
    developer: g.involved_companies?.find((c) => c.developer)?.company.name ?? null,
    publisher: g.involved_companies?.find((c) => c.publisher)?.company.name ?? null,
    release_date: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    // Mesma escala da RAWG (0 a 5), que é como o app lê esse campo.
    rawg_rating: g.total_rating != null ? Math.round(g.total_rating / 2) / 10 : null,
    metacritic_score: null,
  };
}

// ─── Ligação com a tabela games ──────────────────────────────────────────────

const GAME_COLUMNS =
  'rawg_id, igdb_id, title, slug, cover_url, background_url, description, genres, platforms, developer, publisher, release_date, rawg_rating, metacritic_score';

/**
 * Título comparável entre RAWG e IGDB: minúsculas, sem o "(2018)" do fim, só
 * letras a-z e dígitos. Igual à coluna games.title_key (migration 0014).
 */
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').replace(/[^a-z0-9]+/g, '');
}

function year(date: string | null): number | null {
  return date ? Number(date.slice(0, 4)) : null;
}

/** Mesmo jogo, a não ser que as datas digam o contrário (God of War de 2005 × 2018). */
function sameEra(a: NormalizedGame, b: NormalizedGame): boolean {
  const ya = year(a.release_date);
  const yb = year(b.release_date);
  return ya == null || yb == null || Math.abs(ya - yb) <= 1;
}

/**
 * Troca cada jogo da IGDB pelo jogo do banco quando ele já existe lá, para o
 * rawg_id bater com reviews e bibliotecas. De quebra grava o igdb_id que
 * faltava, e a próxima ligação sai direto pelo id.
 */
async function linkToTable(games: NormalizedGame[]): Promise<NormalizedGame[]> {
  if (games.length === 0) return games;
  const supabase = getServiceClient();
  const ids = games.map((g) => g.igdb_id!).filter(Boolean);
  const slugs = games.map((g) => g.slug).filter((s): s is string => !!s);
  const titleKeys = [...new Set(games.map((g) => titleKey(g.title)).filter(Boolean))];

  const [byId, bySlug, byTitle] = await Promise.all([
    supabase.from('games').select(GAME_COLUMNS).in('igdb_id', ids),
    slugs.length > 0 ? supabase.from('games').select(GAME_COLUMNS).in('slug', slugs) : { data: [] },
    supabase.from('games').select(GAME_COLUMNS).in('title_key', titleKeys),
  ]);
  for (const r of [byId, bySlug, byTitle]) {
    if ('error' in r && r.error) console.error('[catalog] ligação com games:', r.error.message);
  }
  const rows = [
    ...((byId.data ?? []) as NormalizedGame[]),
    ...((bySlug.data ?? []) as NormalizedGame[]),
    ...((byTitle.data ?? []) as NormalizedGame[]),
  ];

  const toLink: { rawgId: number; igdbId: number }[] = [];
  const seen = new Set<number>();
  const linked: NormalizedGame[] = [];

  for (const g of games) {
    const row =
      rows.find((r) => r.igdb_id === g.igdb_id) ??
      rows.find((r) => r.igdb_id == null && g.slug && r.slug === g.slug && sameEra(r, g)) ??
      rows.find((r) => r.igdb_id == null && titleKey(r.title) === titleKey(g.title) && sameEra(r, g));

    const game = row
      ? {
        ...row,
        igdb_id: row.igdb_id ?? g.igdb_id,
        cover_url: row.cover_url ?? g.cover_url,
        background_url: row.background_url ?? g.background_url,
        description: row.description ?? g.description,
        genres: row.genres?.length ? row.genres : g.genres,
      }
      : g;
    if (row && row.igdb_id == null && row.rawg_id != null) {
      toLink.push({ rawgId: row.rawg_id, igdbId: g.igdb_id! });
      row.igdb_id = g.igdb_id; // não liga o mesmo jogo duas vezes nesta lista
    }
    if (game.rawg_id == null || seen.has(game.rawg_id)) continue;
    seen.add(game.rawg_id);
    linked.push(game);
  }

  // Best-effort: um conflito de igdb_id (outra linha já tem esse id) só
  // significa que a ligação fica para depois.
  await Promise.allSettled(
    toLink.map(({ rawgId, igdbId }) =>
      supabase.from('games').update({ igdb_id: igdbId }).eq('rawg_id', rawgId).is('igdb_id', null)
    ),
  );
  return linked;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const TTL = {
  search: 60 * 60 * 6,
  detail: 60 * 60 * 24 * 7,
  list: 60 * 60 * 12,
} as const;

/**
 * Cache próprio, separado do da RAWG: quando ela voltar, as chaves dela voltam
 * a valer sozinhas. A IGDB limita a 4 requisições por segundo, e o cache é o
 * que mantém o app longe desse teto.
 */
async function cached<T extends NormalizedGame[] | NormalizedGame | null>(
  parts: (string | number)[],
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const key = ['igdb', ...parts].map((p) => String(p).toLowerCase().trim()).join(':');
  const isEmpty = (v: unknown) => v == null || (Array.isArray(v) && v.length === 0);

  const entry = await getCacheEntry<T>(key);
  if (entry?.fresh && !isEmpty(entry.payload)) return entry.payload;
  try {
    const fresh = await fetcher();
    if (!isEmpty(fresh)) {
      await setCache(key, fresh, ttl).catch((e) => console.error('[catalog] cache:', e.message));
    }
    return fresh;
  } catch (e) {
    if (entry && !isEmpty(entry.payload)) return entry.payload;
    throw e;
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

export function igdbSearch(query: string, limit: number): Promise<NormalizedGame[]> {
  return cached(['search', query, limit], TTL.search, async () =>
    linkToTable((await queryGames({ search: query, limit })).map(toGame))
  );
}

export function igdbDetail(igdbId: number): Promise<NormalizedGame | null> {
  return cached(['detail', igdbId], TTL.detail, async () => {
    const [g] = await igdbFetch<IgdbGame[]>('games', `fields ${FIELDS}; where id = ${igdbId};`);
    if (!g) return null;
    const [linked] = await linkToTable([toGame(g)]);
    return linked ?? null;
  });
}

/** Os mais avaliados no geral — o equivalente ao "mais adicionados" da RAWG. */
export function igdbTop(limit: number): Promise<NormalizedGame[]> {
  return cached(['top', limit], TTL.list, async () =>
    linkToTable(
      (await queryGames({ where: `total_rating_count >= ${MIN_RATINGS}`, sort: 'total_rating_count desc', limit }))
        .map(toGame),
    )
  );
}

/** Por gênero (slugs da RAWG), os mais bem avaliados, intercalando os gêneros. */
export function igdbByGenres(genreSlugs: string[], perGenre: number): Promise<NormalizedGame[]> {
  const genres = [...genreSlugs].sort();
  return cached(['genres', genres.join('+'), perGenre], TTL.list, async () => {
    const filters = (await Promise.all(genres.map(genreFilter))).filter((f): f is string => !!f);
    if (filters.length === 0) filters.push('');
    const lists = await Promise.all(
      filters.map((f) =>
        queryGames({
          where: `total_rating_count >= ${MIN_RATINGS}${f ? ` & ${f}` : ''}`,
          sort: 'total_rating desc',
          limit: perGenre,
        })
      ),
    );
    const interleaved: IgdbGame[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < Math.max(...lists.map((l) => l.length), 0); i++) {
      for (const list of lists) {
        const g = list[i];
        if (g && !seen.has(g.id)) {
          seen.add(g.id);
          interleaved.push(g);
        }
      }
    }
    return linkToTable(interleaved.map(toGame));
  });
}

// ─── Coleções ────────────────────────────────────────────────────────────────

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/** Primeiro e último segundo do mês corrente (UTC). */
export function currentMonthRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1000);
  return { start, end };
}

type CollectionQuery = () => Promise<{ where?: string; sort: string }>;

const byTheme = (slug: string): CollectionQuery => async () => {
  const [id] = await lookupIds('themes', [slug]);
  if (id == null) throw new Error(`IGDB: tema ${slug} não encontrado`);
  return { where: `themes = (${id}) & total_rating_count >= ${MIN_RATINGS}`, sort: 'total_rating desc' };
};

const byKeyword = (slug: string): CollectionQuery => async () => {
  const [id] = await lookupIds('keywords', [slug]);
  if (id == null) throw new Error(`IGDB: palavra-chave ${slug} não encontrada`);
  return { where: `keywords = (${id}) & total_rating_count >= 5`, sort: 'total_rating desc' };
};

const COLLECTIONS: Record<string, CollectionQuery> = {
  'monthly-releases': async () => {
    const { start, end } = currentMonthRange();
    return {
      where: `first_release_date >= ${unix(start)} & first_release_date <= ${unix(end)}`,
      sort: 'hypes desc',
    };
  },
  'editors-pick': async () => ({ where: 'aggregated_rating >= 85 & aggregated_rating_count >= 5', sort: 'aggregated_rating desc' }),
  'bestsellers': async () => ({ where: `total_rating_count >= ${MIN_RATINGS}`, sort: 'total_rating_count desc' }),
  'ps4-classics': async () => ({
    where: `first_release_date >= ${unix(new Date('2013-01-01'))} & first_release_date < ${unix(new Date('2021-01-01'))} & aggregated_rating_count >= 5`,
    sort: 'aggregated_rating desc',
  }),
  'sci-fi': byTheme('science-fiction'),
  'horror': byTheme('horror'),
  'open-world': byTheme('open-world'),
  'cyberpunk': byKeyword('cyberpunk'),
  'soulslike': byKeyword('soulslike'),
};

export function igdbCollection(collectionId: string, limit: number): Promise<NormalizedGame[]> {
  const build = COLLECTIONS[collectionId];
  if (!build) return Promise.resolve([]);
  const month = collectionId === 'monthly-releases' ? currentMonthRange().start.toISOString().slice(0, 7) : '';
  return cached(['collection', collectionId, month, limit], TTL.list, async () => {
    const q = await build();
    return linkToTable((await queryGames({ ...q, limit })).map(toGame));
  });
}

/** Só para testes locais das consultas, sem banco nem cache. */
export const _internals = { queryGames, lookupIds, genreFilter, toGame, COLLECTIONS, BASE_WHERE };
