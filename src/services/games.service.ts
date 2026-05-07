import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import type { Game, GamesListResponse } from '@/src/types/models';

// Lê as mesmas variáveis que src/lib/supabase.ts usa
const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = (extra['supabaseUrl'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (extra['supabaseAnonKey'] as string | undefined) ?? '';

// ─── API pública ────────────────────────────────────────────────────────────

export async function searchGames(query: string, pageSize = 20): Promise<GamesListResponse> {
  return fetchEdgeFunction<GamesListResponse>('games-search', {
    q: query,
    page_size: String(pageSize),
  });
}

export async function getGameDetail(rawgId: number): Promise<Game> {
  return fetchEdgeFunction<Game>('games-detail', { rawg_id: String(rawgId) });
}

export async function getTrendingGames(pageSize = 20): Promise<GamesListResponse> {
  return fetchEdgeFunction<GamesListResponse>('games-trending', { page_size: String(pageSize) });
}

export async function getRecommendations(
  genres: string[],
  pageSize = 20,
): Promise<GamesListResponse> {
  const params: Record<string, string> = { page_size: String(pageSize) };
  if (genres.length > 0) params['genres'] = genres.join(',');
  return fetchEdgeFunction<GamesListResponse>('games-recommendations', params);
}

// Busca jogo pelo rawg_id direto na tabela `games` (cache Supabase).
// Tela de detalhe usa isso primeiro; só chama a Edge Function se não encontrar.
export async function getGameByRawgId(rawgId: number): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('rawg_id', rawgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Game | null;
}

// ─── helper interno ─────────────────────────────────────────────────────────

async function fetchEdgeFunction<T>(
  name: string,
  params: Record<string, string> = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const url = new URL(`${SUPABASE_URL}/functions/v1/${name}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${name}] ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}
