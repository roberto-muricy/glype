import { useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/auth';
import {
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  signInWithApple as signInWithAppleService,
  signInWithGoogle as signInWithGoogleService,
  type SignInInput,
  type SignUpInput,
} from '@/src/services/auth.service';
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
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}

// Hook principal: estado + ações.
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const reset = useAuthStore((s) => s.reset);

  const signIn = async (input: SignInInput): Promise<void> => {
    await signInService(input);
  };

  const signUp = async (input: SignUpInput): Promise<void> => {
    await signUpService(input);
  };

  const signOut = async (): Promise<void> => {
    await signOutService();
    reset();
  };

  const signInWithApple = async (): Promise<void> => {
    await signInWithAppleService();
  };

  const signInWithGoogle = async (): Promise<void> => {
    await signInWithGoogleService();
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
  };
}
