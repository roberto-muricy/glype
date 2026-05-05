import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Database } from '@/src/types/database.types';

// Adapter que faz SecureStore implementar a interface esperada pelo
// Supabase (getItem/setItem/removeItem). Os tokens de sessão ficam
// criptografados pelo Keychain (iOS) / Keystore (Android), não em
// AsyncStorage em texto puro.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra['supabaseUrl'] as string | undefined) ?? '';
const supabaseAnonKey = (extra['supabaseAnonKey'] as string | undefined) ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Em dev queremos saber cedo que .env não está carregado.
  // Em produção isso vira falha de build, então o throw não chega aqui.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes. Verifique o arquivo .env.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // No mobile não há URL para detectar callback de OAuth.
    detectSessionInUrl: false,
  },
});
