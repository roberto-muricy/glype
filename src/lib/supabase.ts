import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Database } from '@/src/types/database.types';

// Storage cross-platform para a sessão do Supabase.
// - iOS/Android: SecureStore → tokens criptografados no Keychain/Keystore
// - Web: localStorage → expo-secure-store não tem implementação web
// - SSR (sem window): noop, evita crash no bundle do React Compiler
const isWeb = Platform.OS === 'web';

const webStorage: SupportedStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

const nativeStorage: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const sessionStorage = isWeb ? webStorage : nativeStorage;

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra['supabaseUrl'] as string | undefined) ?? '';
const supabaseAnonKey = (extra['supabaseAnonKey'] as string | undefined) ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes. Verifique o arquivo .env.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Habilitado na web (callbacks de OAuth chegam via URL),
    // desabilitado em mobile (não há URL no app).
    detectSessionInUrl: isWeb,
  },
});
