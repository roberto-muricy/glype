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
import { useTranslation } from 'react-i18next';
import { Button, Pill, Toast } from '@/src/components/ui';
import { useAuth } from '@/src/hooks/useAuth';
import { useUpdateProfile } from '@/src/hooks/useProfile';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui/icons';

const GENRE_KEYS: Array<{ value: string; key: string }> = [
  { value: 'action', key: 'action' },
  { value: 'role-playing-games-rpg', key: 'rpg' },
  { value: 'adventure', key: 'adventure' },
  { value: 'shooter', key: 'shooter' },
  { value: 'sports', key: 'sports' },
  { value: 'racing', key: 'racing' },
  { value: 'indie', key: 'indie' },
  { value: 'strategy', key: 'strategy' },
  { value: 'puzzle', key: 'puzzle' },
  { value: 'fighting', key: 'fighting' },
  { value: 'platformer', key: 'platformer' },
  { value: 'horror', key: 'horror' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
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
      setToast({ variant: 'success', title: t('profile.profileUpdated') });
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setToast({
        variant: 'danger',
        title: err instanceof Error ? err.message : t('profile.errorSaving'),
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
          <Text className="text-h2 text-text-primary">{t('profile.editProfile')}</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
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
            <Text className="text-section uppercase text-brand-muted mb-1">{t('auth.username')}</Text>
            <Text className="text-body text-text-tertiary">@{profile?.username}</Text>
          </View>

          {/* Display name */}
          <Field
            label={t('auth.displayName')}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('profile.displayNamePlaceholder')}
            maxLength={50}
          />

          {/* Bio */}
          <Field
            label={t('profile.bio')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('profile.bioPlaceholder')}
            multiline
            numberOfLines={3}
            maxLength={160}
          />

          {/* Localização */}
          <Field
            label={t('profile.location')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('profile.locationPlaceholder')}
            maxLength={60}
          />

          {/* Gêneros favoritos */}
          <View className="px-5 mt-5">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-section uppercase text-brand-muted">{t('profile.favoriteGenres')}</Text>
              <Text className="text-caption text-text-tertiary">
                {selectedGenres.length} {selectedGenres.length !== 1 ? t('profile.selectedPlural') : t('profile.selected')}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {GENRE_KEYS.map((g) => (
                <Pill
                  key={g.value}
                  label={t(`search.genres.${g.key}`)}
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
              label={updateProfile.isPending ? t('common.saving') : t('review.saveChanges')}
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
