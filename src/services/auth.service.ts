import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';

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
