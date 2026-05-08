import { supabase } from '@/src/lib/supabase';
import type { GameStatus, UserGame } from '@/src/types/models';

export async function getMyLibrary(status?: GameStatus): Promise<UserGame[]> {
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('user_games')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', gameId);

  if (error) throw new Error(error.message);
}
