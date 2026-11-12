import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/src/types/models';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  // false enquanto a sessão inicial ainda está sendo lida do SecureStore
  isLoading: boolean;
  /** Se esta conta já viu o onboarding neste aparelho. null = ainda lendo. */
  onboardingSeen: boolean | null;
  /**
   * true enquanto o AuthGate ainda vai redirecionar (login, onboarding). A
   * tela de baixo fica coberta e o ScreenTracker não a conta como visita.
   */
  routePending: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setOnboardingSeen: (seen: boolean | null) => void;
  setRoutePending: (pending: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  onboardingSeen: null,
  routePending: true,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboardingSeen: (onboardingSeen) => set({ onboardingSeen }),
  setRoutePending: (routePending) => set({ routePending }),
  reset: () => set({ session: null, user: null, profile: null, onboardingSeen: null }),
}));
