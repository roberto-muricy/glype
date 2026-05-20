import { supabase } from '@/src/lib/supabase';
import type { FavoriteGame } from '@/src/types/models';

// Shape cru retornado pelo Supabase com join.
interface RawFavorite {
  rank: number;
  game: {
    id: string;
    rawg_id: number | null;
    title: string;
    cover_url: string | null;
  } | null;
}

/** Busca o Top 5 ranqueado de um usuário. */
export async function getFavoriteGames(userId: string): Promise<FavoriteGame[]> {
  const { data, error } = await supabase
    .from('favorite_games')
    .select(`
      rank,
      game:games ( id, rawg_id, title, cover_url )
    `)
    .eq('user_id', userId)
    .order('rank', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawFavorite[];
  return rows
    .filter((r) => r.game != null)
    .map((r) => ({ rank: r.rank, game: r.game! }));
}

/**
 * Substitui o Top 5 do usuário logado.
 * `gameIds` deve estar na ordem desejada (índice 0 = rank 1).
 * Estratégia: apaga tudo e reinsere — simples e evita conflitos de PK no reorder.
 */
export async function setFavoriteGames(gameIds: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Apaga o top atual
  const { error: delError } = await supabase
    .from('favorite_games')
    .delete()
    .eq('user_id', user.id);
  if (delError) throw new Error(delError.message);

  if (gameIds.length === 0) return;

  // Reinsere na nova ordem (máx. 5)
  const rows = gameIds.slice(0, 5).map((gameId, i) => ({
    user_id: user.id,
    game_id: gameId,
    rank: i + 1,
  }));

  const { error: insError } = await supabase.from('favorite_games').insert(rows);
  if (insError) throw new Error(insError.message);
}
