// Cliente para a IGDB API (via Twitch OAuth).
// Docs: https://api-docs.igdb.com/
//
// Auth: precisamos trocar TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET por um
// access_token (client_credentials flow), e mandar nos headers de cada request.
// Cacheamos o token em memória do isolate enquanto válido.

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_URL = 'https://api.igdb.com/v4';

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}
let cachedToken: TokenCache | null = null;

export interface IgdbGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  first_release_date?: number; // unix seconds
  rating?: number; // 0-100 (IGDB user rating)
  aggregated_rating?: number; // 0-100 (critics)
  cover?: { id: number; url: string; image_id?: string };
  genres?: { id: number; name: string }[];
  platforms?: { id: number; name: string; abbreviation?: string }[];
  involved_companies?: {
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
  }[];
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('TWITCH_CLIENT_ID');
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET não configuradas');
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const { clientId, clientSecret } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch OAuth ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return cachedToken.token;
}

async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();
  const { clientId } = getCredentials();
  const res = await fetch(`${IGDB_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IGDB ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

const GAME_FIELDS = [
  'name', 'slug', 'summary', 'storyline', 'first_release_date',
  'rating', 'aggregated_rating',
  'cover.image_id',
  'genres.name',
  'platforms.name', 'platforms.abbreviation',
  'involved_companies.company.name',
  'involved_companies.developer',
  'involved_companies.publisher',
].join(',');

// Plataformas IGDB: PS4 = 48, PS5 = 167.
const PS_PLATFORMS = '(48,167)';

export function searchGameByName(name: string): Promise<IgdbGame[]> {
  // search retorna por similaridade textual. Filtramos por plataforma PS.
  const body = `search "${name.replace(/"/g, '\\"')}"; fields ${GAME_FIELDS}; where platforms = ${PS_PLATFORMS}; limit 5;`;
  return igdbFetch<IgdbGame[]>('games', body);
}

export function getGameById(igdbId: number): Promise<IgdbGame[]> {
  const body = `fields ${GAME_FIELDS}; where id = ${igdbId};`;
  return igdbFetch<IgdbGame[]>('games', body);
}

// Helper para montar URL de cover. IGDB devolve image_id; tamanhos suportados:
// t_thumb, t_cover_small, t_cover_big, t_720p, t_1080p, t_original.
export function igdbCoverUrl(
  imageId: string | undefined,
  size: 't_cover_big' | 't_720p' | 't_1080p' = 't_cover_big',
): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}
