// Cliente para a RAWG Video Games Database API.
// Docs: https://rawg.io/apidocs
//
// A chave fica em Deno.env como RAWG_API_KEY (configurada via
// `supabase secrets set`) e nunca é exposta ao cliente.

const BASE_URL = 'https://api.rawg.io/api';

// Plataformas RAWG: PS4 = 18, PS5 = 187. Filtramos sempre nesse universo.
export const PS_PLATFORM_IDS = '18,187';

export interface RawgGame {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  background_image_additional?: string | null;
  rating: number;
  metacritic: number | null;
  description_raw?: string;
  genres?: { id: number; name: string; slug: string }[];
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  developers?: { id: number; name: string }[];
  publishers?: { id: number; name: string }[];
}

export interface RawgListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function getApiKey(): string {
  const key = Deno.env.get('RAWG_API_KEY');
  if (!key) {
    throw new Error('RAWG_API_KEY não configurada nas secrets');
  }
  return key;
}

async function rawgFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAWG ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function searchGames(
  query: string,
  pageSize = 20,
): Promise<RawgListResponse<RawgGame>> {
  return rawgFetch<RawgListResponse<RawgGame>>('/games', {
    search: query,
    platforms: PS_PLATFORM_IDS,
    page_size: String(pageSize),
  });
}

export function getGameDetail(rawgId: number): Promise<RawgGame> {
  return rawgFetch<RawgGame>(`/games/${rawgId}`);
}

export function getTrendingGames(
  pageSize = 20,
): Promise<RawgListResponse<RawgGame>> {
  // RAWG ordering '-added' = mais adicionados pelos usuários (proxy de trending).
  return rawgFetch<RawgListResponse<RawgGame>>('/games', {
    platforms: PS_PLATFORM_IDS,
    ordering: '-added',
    page_size: String(pageSize),
  });
}

export function getGamesByGenre(
  genreSlug: string,
  pageSize = 20,
): Promise<RawgListResponse<RawgGame>> {
  return rawgFetch<RawgListResponse<RawgGame>>('/games', {
    genres: genreSlug,
    platforms: PS_PLATFORM_IDS,
    ordering: '-rating',
    page_size: String(pageSize),
  });
}
