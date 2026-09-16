// i18n setup — i18next + RN NativeModules para detectar locale.
//
// - Detecta o locale do device automaticamente na primeira execução
// - Permite override manual (persistido em SecureStore)
// - Fallback para inglês quando o locale do device não está suportado
//
// Uso:
//   import { useTranslation } from 'react-i18next';
//   const { t } = useTranslation();
//   <Text>{t('profile.title')}</Text>
//
// Mudar idioma:
//   import { setAppLanguage } from '@/src/i18n';
//   await setAppLanguage('en');

import { NativeModules, Platform } from 'react-native';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';

// Detecta o locale do device sem depender de native modules de terceiros.
// iOS: NativeModules.SettingsManager.settings.AppleLocale / AppleLanguages[0]
// Android: NativeModules.I18nManager.localeIdentifier
// (Ambos são built-in do React Native — não precisam de pod/autolinking.)
function getDeviceLocaleCode(): string {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const locale =
        settings?.AppleLocale ||
        (Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages[0] : null);
      if (typeof locale === 'string') return locale.toLowerCase().split(/[-_]/)[0];
    } else if (Platform.OS === 'android') {
      const locale = NativeModules.I18nManager?.localeIdentifier;
      if (typeof locale === 'string') return locale.toLowerCase().split(/[-_]/)[0];
    }
  } catch {
    // ignore
  }
  return FALLBACK_LANGUAGE;
}

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'glype.language';
const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

function isSupported(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Detecta o idioma a usar inicialmente:
 * 1. Override manual persistido (se houver)
 * 2. Locale primário do device (se suportado)
 * 3. Fallback (inglês)
 */
async function detectInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored && isSupported(stored)) return stored;
  } catch {
    // SecureStore pode falhar em alguns ambientes — segue pro fallback
  }

  const code = getDeviceLocaleCode();
  if (isSupported(code)) return code;

  return FALLBACK_LANGUAGE;
}

let initialized = false;

/**
 * Inicializa o i18n. Deve ser chamado uma única vez no bootstrap do app
 * (ex.: _layout.tsx) antes de renderizar qualquer texto traduzido.
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const lng = await detectInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    lng,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false }, // React já escapa
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

/**
 * Troca o idioma do app e persiste a escolha.
 * Se `lang` for null, remove o override e volta a seguir o device.
 */
export async function setAppLanguage(lang: SupportedLanguage | null): Promise<void> {
  // Tracking pra entender quais idiomas a base de usuários prefere.
  // Import dinâmico evita ciclo entre i18n init e analytics init.
  try {
    const { track } = await import('@/src/lib/analytics');
    track('language_changed', { from: i18n.language, to: lang ?? 'system' });
  } catch {
    // ignore — analytics não é crítico
  }
  if (lang === null) {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // ignore
    }
    const deviceLang = getDeviceLocaleCode();
    const next = isSupported(deviceLang) ? deviceLang : FALLBACK_LANGUAGE;
    await i18n.changeLanguage(next);
    return;
  }

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, lang);
  } catch {
    // ignore — a mudança em memória ainda funciona
  }
  await i18n.changeLanguage(lang);
}

/** Retorna o idioma atualmente ativo. */
export function getCurrentLanguage(): SupportedLanguage {
  const lang = i18n.language;
  return isSupported(lang) ? lang : FALLBACK_LANGUAGE;
}

/** Lê o override persistido (sem mudar o idioma atual). */
export async function getStoredLanguageOverride(): Promise<SupportedLanguage | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return stored && isSupported(stored) ? stored : null;
  } catch {
    return null;
  }
}

export default i18n;
