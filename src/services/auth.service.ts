import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/src/lib/supabase';

// Configura o Google Sign-In uma vez no carregamento do módulo.
// webClientId é obrigatório para o Supabase validar o token.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export type AuthUser = User;
export type AuthSession = Session;

export interface SignUpInput {
  email: string;
  password: string;
  username: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

// Cria um novo usuário em auth.users.
// O trigger handle_new_user (migration 0003) lê
// raw_user_meta_data.username e cria a linha em public.profiles.
export async function signUp({ email, password, username }: SignUpInput): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  if (error) throw error;
}

export async function signIn({ email, password }: SignInInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Login com Google usando o seletor de contas nativo.
 * Troca o id_token do Google por uma sessão Supabase.
 * Lança erro se o usuário cancelar ou faltar configuração.
 */
export async function signInWithGoogle(): Promise<void> {
  // Garante que o Google Play Services está disponível (Android)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Abre o seletor nativo de contas
  const result = await GoogleSignin.signIn();

  // SDK v16: o token vem em result.data.idToken
  const idToken = result.data?.idToken;
  if (!idToken) {
    throw new Error('Google não retornou um token de identidade.');
  }

  // Troca o token do Google por uma sessão Supabase
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}

/**
 * Sign in with Apple using the native Apple Authentication sheet.
 * On success Supabase creates/finds the user and returns a session.
 * Throws if the user cancels or Apple auth is unavailable.
 */
export async function signInWithApple(): Promise<void> {
  // 1. Trigger the native Apple sign-in sheet
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple não retornou um token de identidade.');
  }

  // 2. Exchange the Apple identity token for a Supabase session
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;

  // 3. If Apple provided a name (first sign-in only), update the profile
  const fullName = [
    credential.fullName?.givenName,
    credential.fullName?.familyName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) {
    // Best-effort: update display_name if still blank
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('id', user.id)
        .is('display_name', null); // only if not yet set
    }
  }
}
