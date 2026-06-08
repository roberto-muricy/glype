// Serviço para operações de conta (delete-account).
// Mantém a chamada à Edge Function isolada do hook.

import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = (extra['supabaseUrl'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (extra['supabaseAnonKey'] as string | undefined) ?? '';

/**
 * Exclui permanentemente a conta do usuário autenticado.
 *
 * Chama a Edge Function `delete-account`, que valida o JWT e usa
 * service_role para `auth.admin.deleteUser()`. O delete cascateia em todas
 * as tabelas (profiles → reviews/library/follows/likes/comments/etc) via
 * ON DELETE CASCADE.
 *
 * Após o sucesso, a sessão local é invalidada — o caller deve chamar
 * `signOut()` para limpar o store/SecureStore.
 */
export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Não autenticado');
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    let message = `Erro ${res.status} ao excluir conta`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // resposta sem JSON — mantém mensagem padrão
    }
    throw new Error(message);
  }
}
