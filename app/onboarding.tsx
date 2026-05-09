import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Button, Toast } from '@/src/components/ui';
import { useUpdateProfile } from '@/src/hooks/useProfile';
import { useSuggestedUsers, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { tokens } from '@/src/theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

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
const TOTAL_STEPS = 2;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
    setError(null);
  };

  const handleGenresContinue = async () => {
    if (selected.length < MIN_GENRES) {
      setError(`Selecione pelo menos ${MIN_GENRES} gêneros`);
      return;
    }
    try {
      await updateProfile.mutateAsync({ favorite_genres: selected });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const handleFinish = () => router.replace('/(tabs)');

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      {/* ─── Progress bar ─── */}
      <View className="flex-row gap-2 px-6 pt-4 pb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor:
                i < step
                  ? tokens.color.brand.primary
                  : tokens.color.border.DEFAULT,
            }}
          />
        ))}
      </View>

      {step === 1 ? (
        <StepGenres
          selected={selected}
          onToggle={toggle}
          onContinue={handleGenresContinue}
          onSkip={handleFinish}
          loading={updateProfile.isPending}
          error={error}
        />
      ) : (
        <StepFollow onFinish={handleFinish} />
      )}
    </SafeAreaView>
  );
}

// ─── Step 1: Gêneros ──────────────────────────────────────────────────────────

function StepGenres({
  selected,
  onToggle,
  onContinue,
  onSkip,
  loading,
  error,
}: {
  selected: string[];
  onToggle: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-6 pb-5">
        <Text className="text-caption text-text-tertiary uppercase tracking-widest mb-2">
          Passo 1 de 2
        </Text>
        <Text className="text-h1 text-text-primary">
          Quais gêneros{'\n'}você mais curte?
        </Text>
        <Text className="text-body text-text-secondary mt-2">
          Vamos personalizar suas recomendações.{' '}
          <Text className="text-text-tertiary">Selecione pelo menos {MIN_GENRES}.</Text>
        </Text>
      </View>

      {/* Genre grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 }}>
        {GENRE_OPTIONS.map((g) => {
          const isSelected = selected.includes(g.value);
          return (
            <Pressable
              key={g.value}
              onPress={() => onToggle(g.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={g.label}
              style={{
                width: '47%',
                borderRadius: tokens.radius.xl,
                borderWidth: 1.5,
                borderColor: isSelected ? tokens.color.brand.primary : tokens.color.border.DEFAULT,
                backgroundColor: isSelected ? tokens.color.brand.dark : tokens.color.bg.elevated,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
              <Text
                style={{
                  color: isSelected ? tokens.color.text.primary : tokens.color.text.body,
                  fontSize: tokens.fontSize['body-lg'],
                  fontFamily: isSelected ? tokens.fontFamily.medium : tokens.fontFamily.regular,
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
                  <Text style={{ color: '#fff', fontSize: 11, fontFamily: tokens.fontFamily.medium }}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Counter + error */}
      <View className="px-6 mt-4">
        <Text className="text-caption text-text-tertiary">
          {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
          {selected.length >= MIN_GENRES ? ' ✓' : ''}
        </Text>
        {error && (
          <View className="mt-2">
            <Toast variant="danger" title={error} />
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="px-6 mt-6 gap-3">
        <Button
          label={
            loading
              ? 'Salvando…'
              : selected.length < MIN_GENRES
                ? `Selecione mais ${MIN_GENRES - selected.length}`
                : 'Continuar'
          }
          size="lg"
          disabled={selected.length < MIN_GENRES || loading}
          loading={loading}
          onPress={onContinue}
        />
        <Button label="Pular por agora" size="lg" variant="ghost" onPress={onSkip} />
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Seguir pessoas ───────────────────────────────────────────────────

function StepFollow({ onFinish }: { onFinish: () => void }) {
  const { data: users, isLoading } = useSuggestedUsers();
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const handleToggleFollow = (userId: string) => {
    if (followed.has(userId)) {
      unfollow.mutate(userId);
      setFollowed((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    } else {
      follow.mutate(userId);
      setFollowed((prev) => new Set(prev).add(userId));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-6 pb-5">
        <Text className="text-caption text-text-tertiary uppercase tracking-widest mb-2">
          Passo 2 de 2
        </Text>
        <Text className="text-h1 text-text-primary">
          Encontre jogadores
        </Text>
        <Text className="text-body text-text-secondary mt-2">
          Siga quem joga os mesmos jogos que você e veja as reviews no feed.
        </Text>
      </View>

      {/* User list */}
      {isLoading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator color={tokens.color.brand.primary} />
        </View>
      ) : (users ?? []).length === 0 ? (
        <View className="items-center py-12 px-8">
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 36,
              color: tokens.color.brand.primary,
              marginBottom: 12,
            }}
          >
            G
          </Text>
          <Text className="text-body text-text-secondary text-center">
            Ainda não há outros jogadores.{'\n'}Convide amigos para o Glype!
          </Text>
        </View>
      ) : (
        <View className="px-5 gap-2">
          {(users ?? []).map((user) => {
            const isFollowed = followed.has(user.id);
            return (
              <View
                key={user.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: tokens.radius.xl,
                  backgroundColor: tokens.color.bg.elevated,
                  borderWidth: 1,
                  borderColor: isFollowed
                    ? tokens.color.brand.primary
                    : tokens.color.border.subtle,
                }}
              >
                <Avatar
                  name={user.display_name ?? user.username}
                  uri={user.avatar_url}
                  size="md"
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: tokens.fontFamily.medium,
                      fontSize: 15,
                      color: tokens.color.text.primary,
                    }}
                    numberOfLines={1}
                  >
                    {user.display_name ?? user.username}
                  </Text>
                  {(user.favorite_genres?.length ?? 0) > 0 && (
                    <Text
                      style={{
                        fontFamily: tokens.fontFamily.regular,
                        fontSize: 12,
                        color: tokens.color.text.secondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {user.favorite_genres.slice(0, 3).join(' · ')}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => handleToggleFollow(user.id)}
                  accessibilityRole="button"
                  accessibilityLabel={isFollowed ? `Deixar de seguir ${user.username}` : `Seguir ${user.username}`}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: isFollowed ? 'transparent' : tokens.color.brand.primary,
                    borderWidth: 1,
                    borderColor: isFollowed ? tokens.color.border.DEFAULT : tokens.color.brand.primary,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: tokens.fontFamily.medium,
                      fontSize: 13,
                      color: isFollowed ? tokens.color.text.secondary : '#ffffff',
                    }}
                  >
                    {isFollowed ? 'Seguindo' : 'Seguir'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions */}
      <View className="px-6 mt-6 gap-3">
        <Button
          label={followed.size > 0 ? `Começar — seguindo ${followed.size}` : 'Começar'}
          size="lg"
          onPress={onFinish}
        />
        {followed.size === 0 && (
          <Button label="Pular" size="lg" variant="ghost" onPress={onFinish} />
        )}
      </View>
    </ScrollView>
  );
}
