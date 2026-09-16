// delete-account: exclui permanentemente a conta do usuário autenticado.
// Apple guideline 5.1.1(v) — apps com cadastro precisam permitir exclusão in-app.
//
// POST /delete-account
// Header: Authorization: Bearer <jwt do usuário>
// Returns: { ok: true } | { error: string }
//
// O delete cascateia (auth.users → profiles → reviews/follows/likes/etc).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handlePreflight, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/cache.ts';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return errorResponse('Método não suportado', 405);
  }

  // 1. Extrai o JWT do header Authorization
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    return errorResponse('Não autenticado', 401);
  }

  // 2. Valida o JWT usando um client com o anon key
  //    (auth.getUser(jwt) consulta o GoTrue e confirma assinatura/expiração)
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    return errorResponse('Configuração ausente no servidor', 500);
  }

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return errorResponse('Sessão inválida ou expirada', 401);
  }

  const userId = userData.user.id;

  // 3. Apaga o auth.user usando service_role.
  //    O delete cascateia em todas as tabelas via ON DELETE CASCADE
  //    (profiles → reviews, user_games, follows, likes, comments, notifications, favorite_games).
  const admin = getServiceClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return errorResponse(`Erro ao excluir conta: ${deleteError.message}`, 500);
  }

  return jsonResponse({ ok: true });
});
