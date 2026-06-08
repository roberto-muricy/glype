// Serviço pro swipe deck — busca a queue paginada e marca dismissals.

import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import type { Game } from '@/src/types/models';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = (extra['supabaseUrl'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (extra['supabaseAnonKey'] as string | undefined) ?? '';

export interface DiscoverBatch {
  results: Game[];
  page: number;
  has_more: boolean;
}

/**
 * Busca um batch da queue de descoberta.
 * Requer sessão autenticada — a Edge Function valida o JWT.
 */
export async function getDiscoverBatch(
  genres: string[],
  page = 0,
  pageSize = 20,
): Promise<DiscoverBatch> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Não autenticado');
  }

  const url = new URL(`${SUPABASE_URL}/functions/v1/games-discover`);
  if (genres.length > 0) url.searchParams.set('genres', genres.join(','));
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[games-discover] ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<DiscoverBatch>;
}

/**
 * Marca um jogo como "não me interessa" — insere em game_dismissals.
 * Requer o game_id interno (UUID), não o rawg_id. Use ensureGame() antes.
 */
export async function dismissGame(gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('game_dismissals')
    .upsert(
      { user_id: user.id, game_id: gameId },
      { onConflict: 'user_id,game_id' },
    );
  if (error) throw new Error(error.message);
}
