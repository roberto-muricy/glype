import { useEffect } from 'react';
import { getSessionUser, supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/auth';
import { queryClient } from '@/src/lib/queryClient';
import {
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  signInWithApple as signInWithAppleService,
  signInWithGoogle as signInWithGoogleService,
  type SignInInput,
  type SignUpInput,
} from '@/src/services/auth.service';
import { deleteAccount as deleteAccountService } from '@/src/services/account.service';
import { identify, resetAnalytics, track } from '@/src/lib/analytics';
import { setSentryUser, captureException } from '@/src/lib/sentry';
import { isSignInCanceled } from '@/src/utils/authErrors';
import type { Profile } from '@/src/types/models';

// Hidrata o store a partir da sessão persistida (SecureStore) e
// se inscreve em onAuthStateChange para manter sincronizado.
// Deve ser usado uma única vez no root layout.
export function useAuthBootstrap(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let active = true;

    const fetchProfile = async (userId: string): Promise<void> => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!active) return;
      setProfile((data as Profile | null) ?? null);
    };

    const init = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
      setLoading(false);
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Identify user em analytics + Sentry (sem PII — só o id do Supabase)
        identify(session.user.id);
        setSentryUser(session.user.id);
      } else {
        setProfile(null);
        setSentryUser(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}

/**
 * Conta criada há menos disso = cadastro, não retorno.
 *
 * O primeiro login com Apple ou Google cria a conta no Supabase, mas
 * `signup_succeeded` só era disparado no cadastro por email — então cadastro
 * por login social não aparecia como cadastro em lugar nenhum, e a conversão
 * de instalação para cadastro saía errada. O que separa um caso do outro é o
 * `created_at` da conta: recém-criada, é de segundos atrás.
 */
const NEW_ACCOUNT_WINDOW_MS = 60_000;

async function trackSocialSignIn(method: 'apple' | 'google'): Promise<void> {
  track('signin_succeeded', { method });
  try {
    const signedIn = await getSessionUser();
    const createdAt = signedIn?.created_at ? Date.parse(signedIn.created_at) : NaN;
    if (!Number.isNaN(createdAt) && Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS) {
      track('signup_succeeded', { method });
    }
  } catch {
    // Sem o dado fica só o signin_succeeded. Não vale arriscar o login por analytics.
  }
}

// Hook principal: estado + ações.
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const reset = useAuthStore((s) => s.reset);

  const signIn = async (input: SignInInput): Promise<void> => {
    try {
      await signInService(input);
      track('signin_succeeded', { method: 'email' });
    } catch (e) {
      track('signin_failed', { method: 'email' });
      throw e;
    }
  };

  const signUp = async (input: SignUpInput): Promise<void> => {
    try {
      await signUpService(input);
      track('signup_succeeded', { method: 'email' });
    } catch (e) {
      track('signup_failed', { method: 'email' });
      throw e;
    }
  };

  const signOut = async (): Promise<void> => {
    track('signout');
    await signOutService();
    reset();
    resetAnalytics();
    setSentryUser(null);
    // Limpa o cache do TanStack Query — evita exibir dados do usuário
    // anterior caso outro usuário faça login em seguida no mesmo device.
    queryClient.clear();
  };

  const signInWithApple = async (): Promise<void> => {
    try {
      await signInWithAppleService();
      await trackSocialSignIn('apple');
    } catch (e) {
      // Fechar a janela não é falha: sem alerta no Sentry e sem signin_failed.
      if (isSignInCanceled(e)) {
        track('signin_canceled', { method: 'apple' });
      } else {
        track('signin_failed', { method: 'apple' });
        captureException(e, undefined, { provider: 'apple' });
      }
      throw e;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      await signInWithGoogleService();
      await trackSocialSignIn('google');
    } catch (e) {
      if (isSignInCanceled(e)) {
        track('signin_canceled', { method: 'google' });
      } else {
        track('signin_failed', { method: 'google' });
        // `diag` vem do serviço quando o Google volta sem token de identidade.
        const diag = (e as { diag?: Record<string, unknown> }).diag;
        captureException(e, diag, { provider: 'google' });
      }
      throw e;
    }
  };

  /**
   * Exclui permanentemente a conta do usuário.
   * Chama a Edge Function `delete-account` e depois faz signOut local
   * (limpando store, sessão e cache).
   */
  const deleteAccount = async (): Promise<void> => {
    track('account_deleted');
    await deleteAccountService();
    // Depois do delete remoto, força um signOut local pra invalidar a sessão
    // armazenada (SecureStore) e disparar o AuthGate de volta pro login.
    try {
      await signOutService();
    } catch {
      // sessão pode já estar inválida no servidor — segue limpando estado
    }
    reset();
    resetAnalytics();
    setSentryUser(null);
    queryClient.clear();
  };

  return {
    user,
    profile,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithApple,
    signInWithGoogle,
    deleteAccount,
  };
}
