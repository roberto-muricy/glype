import { getSessionUser, supabase } from '@/src/lib/supabase';
import type { GameStatus, UserGame } from '@/src/types/models';

export async function getMyLibrary(status?: GameStatus): Promise<UserGame[]> {
  const user = await getSessionUser();
  if (!user) return [];

  let query = supabase
    .from('user_games')
    .select('*, game:games(*)')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as UserGame[];
}

export async function getMyGameStatus(gameId: string): Promise<GameStatus | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_games')
    .select('status')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .maybeSingle();

  return (data?.status as GameStatus) ?? null;
}

export async function setGameStatus(gameId: string, status: GameStatus): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('user_games')
    .upsert(
      { user_id: user.id, game_id: gameId, status },
      { onConflict: 'user_id,game_id' },
    );

  if (error) throw new Error(error.message);
}

export async function removeFromLibrary(gameId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('user_games')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', gameId);

  if (error) throw new Error(error.message);
}

// ─── Biblioteca pública de outro usuário ──────────────────────────────────────

/** Lista jogos da biblioteca de um usuário específico (público). */
export async function getUserLibrary(
  userId: string,
  status?: GameStatus,
): Promise<UserGame[]> {
  let query = supabase
    .from('user_games')
    .select('*, game:games(*)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as UserGame[];
}

/** Conta jogos por status pra um usuário específico (numa query só). */
export async function getUserLibraryCounts(
  userId: string,
): Promise<Record<GameStatus, number> & { total: number }> {
  const { data, error } = await supabase
    .from('user_games')
    .select('status')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const counts: Record<GameStatus, number> = {
    playing: 0,
    played: 0,
    wishlist: 0,
    dropped: 0,
  };
  for (const row of (data ?? []) as { status: GameStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return { ...counts, total: data?.length ?? 0 };
}
