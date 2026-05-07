import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Pill, Toast } from '@/src/components/ui';
import { useAuth } from '@/src/hooks/useAuth';
import { useUpdateProfile } from '@/src/hooks/useProfile';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui/icons';

const GENRE_OPTIONS = [
  { value: 'action', label: 'Ação' },
  { value: 'role-playing-games-rpg', label: 'RPG' },
  { value: 'adventure', label: 'Aventura' },
  { value: 'shooter', label: 'Shooter' },
  { value: 'sports', label: 'Esportes' },
  { value: 'racing', label: 'Corrida' },
  { value: 'indie', label: 'Indie' },
  { value: 'strategy', label: 'Estratégia' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'fighting', label: 'Luta' },
  { value: 'platformer', label: 'Plataforma' },
  { value: 'horror', label: 'Terror' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    profile?.favorite_genres ?? [],
  );
  const [toast, setToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleGenre = (value: string) => {
    setSelectedGenres((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        favorite_genres: selectedGenres,
      });
      setToast({ variant: 'success', title: 'Perfil atualizado!' });
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setToast({
        variant: 'danger',
        title: err instanceof Error ? err.message : 'Erro ao salvar',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-border-subtle">
          <Text className="text-h2 text-text-primary">Editar perfil</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            className="rounded-full bg-bg-elevated p-2"
          >
            <CloseIcon size={18} color={tokens.color.text.primary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Username (read-only) */}
          <View className="px-5 pt-5">
            <Text className="text-section uppercase text-brand-muted mb-1">Username</Text>
            <Text className="text-body text-text-tertiary">@{profile?.username}</Text>
          </View>

          {/* Display name */}
          <Field
            label="Nome de exibição"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Como quer ser chamado?"
            maxLength={50}
          />

          {/* Bio */}
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Conte um pouco sobre você…"
            multiline
            numberOfLines={3}
            maxLength={160}
          />

          {/* Localização */}
          <Field
            label="Localização"
            value={location}
            onChangeText={setLocation}
            placeholder="São Paulo, Brasil"
            maxLength={60}
          />

          {/* Gêneros favoritos */}
          <View className="px-5 mt-5">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-section uppercase text-brand-muted">Gêneros favoritos</Text>
              <Text className="text-caption text-text-tertiary">
                {selectedGenres.length} selecionado{selectedGenres.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => (
                <Pill
                  key={g.value}
                  label={g.label}
                  variant={selectedGenres.includes(g.value) ? 'active' : 'default'}
                  onPress={() => toggleGenre(g.value)}
                />
              ))}
            </View>
          </View>

          {/* Toast */}
          {toast && (
            <View className="px-5 mt-4">
              <Toast variant={toast.variant} title={toast.title} />
            </View>
          )}

          {/* Salvar */}
          <View className="px-5 mt-6">
            <Button
              label={updateProfile.isPending ? 'Salvando…' : 'Salvar alterações'}
              size="lg"
              loading={updateProfile.isPending}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
}) {
  return (
    <View className="px-5 mt-5">
      <View className="flex-row items-baseline justify-between mb-2">
        <Text className="text-section uppercase text-brand-muted">{label}</Text>
        {maxLength && (
          <Text className="text-caption text-text-tertiary">
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.text.tertiary}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          backgroundColor: tokens.color.bg.elevated,
          color: tokens.color.text.primary,
          borderRadius: tokens.radius.md,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: tokens.fontSize['body-lg'],
          borderWidth: 1,
          borderColor: tokens.color.border.DEFAULT,
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}
