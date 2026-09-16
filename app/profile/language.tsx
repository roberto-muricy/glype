// Tela de seleção de idioma.
// Mostra: Padrão do sistema + 3 idiomas suportados (PT, EN, ES).
// A escolha é persistida em SecureStore via setAppLanguage().

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  setAppLanguage,
  getStoredLanguageOverride,
} from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';

interface LanguageOption {
  /** null = "Padrão do sistema" */
  code: SupportedLanguage | null;
  label: string;
  /** Bandeira via emoji (sem dependência externa) */
  flag: string;
}

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [override, setOverride] = useState<SupportedLanguage | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getStoredLanguageOverride().then(setOverride);
  }, []);

  const options: LanguageOption[] = [
    { code: null, label: t('language.system'), flag: '🌐' },
    { code: 'pt', label: t('language.portuguese'), flag: '🇧🇷' },
    { code: 'en', label: t('language.english'), flag: '🇺🇸' },
    { code: 'es', label: t('language.spanish'), flag: '🇪🇸' },
  ];

  const selectedCode: SupportedLanguage | null = override;

  const handleSelect = async (code: SupportedLanguage | null) => {
    if (pending) return;
    setPending(true);
    try {
      await setAppLanguage(code);
      setOverride(code);
    } finally {
      setPending(false);
    }
  };

  // Garante que TypeScript não reclama por `SUPPORTED_LANGUAGES` não usado
  void SUPPORTED_LANGUAGES;
  void i18n;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: tokens.color.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: tokens.color.text.primary, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text className="text-h1 text-text-primary">{t('profile.language')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mx-5 mt-4 rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden">
          {options.map((opt, idx) => {
            const isSelected = opt.code === selectedCode;
            return (
              <View key={opt.code ?? 'system'}>
                <Pressable
                  onPress={() => handleSelect(opt.code)}
                  disabled={pending}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: pending }}
                  accessibilityLabel={opt.label}
                  className="flex-row items-center gap-3 px-4 py-3.5 active:bg-bg-surface"
                  style={{ opacity: pending ? 0.6 : 1 }}
                >
                  <Text style={{ fontSize: 22 }}>{opt.flag}</Text>
                  <Text className="flex-1 text-body text-text-primary">{opt.label}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={tokens.color.brand.primary}
                    />
                  )}
                </Pressable>
                {idx < options.length - 1 && (
                  <View className="h-px bg-border-subtle mx-4" />
                )}
              </View>
            );
          })}
        </View>

        <Text className="mx-5 mt-3 text-caption text-text-tertiary">
          {t('language.selectLanguage')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
