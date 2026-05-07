import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Pill, Toast } from '@/src/components/ui';
import { useUpdateProfile } from '@/src/hooks/useProfile';
import { tokens } from '@/src/theme/tokens';

const GENRE_OPTIONS = [
  { value: 'action', label: 'Ação', emoji: '⚔️' },
  { value: 'role-playing-games-rpg', label: 'RPG', emoji: '🧙' },
  { value: 'adventure', label: 'Aventura', emoji: '🗺️' },
  { value: 'shooter', label: 'Shooter', emoji: '🎯' },
  { value: 'sports', label: 'Esportes', emoji: '⚽' },
  { value: 'racing', label: 'Corrida', emoji: '🏎️' },
  { value: 'indie', label: 'Indie', emoji: '🎨' },
  { value: 'strategy', label: 'Estratégia', emoji: '♟️' },
  { value: 'puzzle', label: 'Puzzle', emoji: '🧩' },
  { value: 'fighting', label: 'Luta', emoji: '🥊' },
  { value: 'platformer', label: 'Plataforma', emoji: '🍄' },
  { value: 'horror', label: 'Terror', emoji: '👻' },
];

const MIN_GENRES = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
    setError(null);
  };

  const handleContinue = async () => {
    if (selected.length < MIN_GENRES) {
      setError(`Selecione pelo menos ${MIN_GENRES} gêneros`);
      return;
    }
    try {
      await updateProfile.mutateAsync({ favorite_genres: selected });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const handleSkip = async () => {
    // Salva lista vazia para não mostrar onboarding novamente nesta sessão
    // (AuthGate re-checar só na próxima sessão se ainda estiver vazio)
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View className="px-6 pt-10 pb-6">
          <Text className="text-display-1 text-text-primary">
            Bem-vindo ao{'\n'}
            <Text style={{ color: tokens.color.brand.primary }}>Glype</Text>
          </Text>
          <Text className="text-body-lg text-text-secondary mt-3">
            Quais gêneros você mais curte? Vamos personalizar sua experiência.
          </Text>
          <Text className="text-caption text-text-tertiary mt-1">
            Selecione pelo menos {MIN_GENRES}
          </Text>
        </View>

        {/* ─── Grade de gêneros ─── */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          {GENRE_OPTIONS.map((g) => {
            const isSelected = selected.includes(g.value);
            return (
              <Pressable
                key={g.value}
                onPress={() => toggle(g.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={g.label}
                style={{
                  width: '47%',
                  borderRadius: tokens.radius.xl,
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? tokens.color.brand.primary
                    : tokens.color.border.DEFAULT,
                  backgroundColor: isSelected
                    ? tokens.color.brand.dark
                    : tokens.color.bg.elevated,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                <Text
                  style={{
                    color: isSelected
                      ? tokens.color.text.primary
                      : tokens.color.text.body,
                    fontSize: tokens.fontSize['body-lg'],
                    fontWeight: isSelected ? '500' : '400',
                    flex: 1,
                  }}
                >
                  {g.label}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: tokens.color.brand.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ─── Contador + erro ─── */}
        <View className="px-6 mt-4">
          <Text className="text-caption text-text-tertiary">
            {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
          </Text>
          {error && (
            <View className="mt-2">
              <Toast variant="danger" title={error} />
            </View>
          )}
        </View>

        {/* ─── Ações ─── */}
        <View className="px-6 mt-6 gap-3">
          <Button
            label={
              updateProfile.isPending
                ? 'Salvando…'
                : selected.length < MIN_GENRES
                  ? `Selecione mais ${MIN_GENRES - selected.length}`
                  : 'Continuar'
            }
            size="lg"
            disabled={selected.length < MIN_GENRES || updateProfile.isPending}
            loading={updateProfile.isPending}
            onPress={handleContinue}
          />
          <Button
            label="Pular por agora"
            size="lg"
            variant="ghost"
            onPress={handleSkip}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
