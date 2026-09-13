import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, Pill, SectionHeader } from '@/src/components/ui';
import { TopGamesRow, TopGamesEmptyCTA } from '@/src/components/domain';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfileStats } from '@/src/hooks/useProfile';
import { useMyLibrary } from '@/src/hooks/useLibrary';
import { useFollowCounts } from '@/src/hooks/useFeed';
import { useFavoriteGames } from '@/src/hooks/useFavorites';
import { type GameStatus } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';

const LEGAL_URLS = {
  privacy: 'https://roberto-muricy.github.io/glype/privacy.html',
  terms: 'https://roberto-muricy.github.io/glype/terms.html',
  support: 'https://roberto-muricy.github.io/glype/support.html',
};

const STATUS_LIST: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // Nome do idioma atual exibido na linha de Idioma (sempre no próprio idioma).
  const LANGUAGE_NAMES: Record<string, string> = {
    pt: 'Português',
    en: 'English',
    es: 'Español',
  };
  const currentLanguageLabel = LANGUAGE_NAMES[i18n.language] ?? i18n.language;
  const { user, profile, signOut, deleteAccount } = useAuth();
  const { data: stats } = useProfileStats();
  const { data: library } = useMyLibrary();
  const { data: counts } = useFollowCounts(user?.id ?? null);
  const { data: favorites } = useFavoriteGames(user?.id ?? null);
  const [deleting, setDeleting] = useState(false);

  const onSignOut = async () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch (e) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.errorSigningOut'));
          }
        },
      },
    ]);
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert(t('common.error'), t('common.couldNotOpenLink')),
    );
  };

  const onDeleteAccount = () => {
    // Confirmação em DUAS etapas: o delete é destrutivo e irreversível.
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.continueDelete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccountFinalTitle'),
              t('profile.deleteAccountFinalText'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteMyAccount'),
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      // AuthGate redireciona automaticamente pro login
                      // quando a sessão é invalidada.
                    } catch (e) {
                      setDeleting(false);
                      Alert.alert(
                        t('common.error'),
                        e instanceof Error ? e.message : t('profile.errorDeletingAccount'),
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const GAME_STATUS_LABEL_I18N: Record<GameStatus, string> = {
    playing: t('gameStatus.playing'),
    played: t('gameStatus.played'),
    wishlist: t('gameStatus.wishlist'),
    dropped: t('gameStatus.dropped'),
  };

  // Contagem por status
  const countByStatus = (status: GameStatus) =>
    library?.filter((g) => g.status === status).length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ─── Header ─── */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <Text className="text-h1 text-text-primary">{t('profile.title')}</Text>
          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
          >
            <Text className="text-body text-brand-primary">{t('common.edit')}</Text>
          </Pressable>
        </View>

        {/* ─── Avatar + info ─── */}
        <View className="items-center gap-3 pt-4 pb-6">
          <Avatar
            size="lg"
            name={profile?.display_name ?? profile?.username ?? user?.email ?? '?'}
            uri={profile?.avatar_url}
          />
          <View className="items-center gap-1">
            <Text className="text-h2 text-text-primary">
              {profile?.display_name ?? profile?.username ?? '—'}
            </Text>
            {profile?.display_name && (
              <Text className="text-body text-text-secondary">@{profile.username}</Text>
            )}
            {profile?.bio && (
              <Text className="text-body text-text-body mt-1 text-center px-8">
                {profile.bio}
              </Text>
            )}
            {profile?.location && (
              <Text className="text-caption text-text-tertiary">{profile.location}</Text>
            )}
          </View>

          {/* Follow counts */}
          {counts != null && (
            <View className="flex-row gap-6 mt-1">
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${user?.id}&tab=followers` as never)}
                accessibilityRole="button"
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.followers}</Text>
                <Text className="text-caption text-text-secondary">{t('profile.followers')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${user?.id}&tab=following` as never)}
                accessibilityRole="button"
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.following}</Text>
                <Text className="text-caption text-text-secondary">{t('profile.followingPlural')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ─── Stats ─── */}
        <View className="flex-row mx-5 gap-3 mb-6">
          <StatCard
            value={stats?.reviewsCount ?? 0}
            label={t('profile.reviews')}
            onPress={user?.id ? () => router.push(`/profile/${user.id}` as never) : undefined}
          />
          <StatCard
            value={stats?.gamesCount ?? 0}
            label={t('profile.inLibrary')}
            onPress={() => router.push('/(tabs)/library' as never)}
          />
        </View>

        {/* ─── Top 5 jogos ─── */}
        {(favorites?.length ?? 0) > 0 ? (
          <>
            <SectionHeader
              title={t('profile.topGames')}
              rightSlot={
                <Pressable
                  onPress={() => router.push('/profile/top-games' as never)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.editTop5')}
                >
                  <Text className="text-caption text-brand-primary">{t('common.edit')}</Text>
                </Pressable>
              }
            />
            <View className="mb-4 mt-1">
              <TopGamesRow
                favorites={favorites!}
                onGamePress={(rawgId) => router.push(`/game/${rawgId}` as never)}
              />
            </View>
          </>
        ) : (
          <View className="mb-4 mt-2">
            <TopGamesEmptyCTA
              onPress={() => router.push('/profile/top-games' as never)}
            />
          </View>
        )}

        {/* ─── Biblioteca por status ─── */}
        <SectionHeader title={t('profile.library')} />
        <View className="flex-row flex-wrap mx-5 gap-3 mb-2">
          {STATUS_LIST.map((s) => (
            <View
              key={s}
              className="flex-1 min-w-[40%] rounded-xl bg-bg-elevated border border-border-subtle p-3"
            >
              <Text className="text-h2 text-text-primary">{countByStatus(s)}</Text>
              <Text className="text-caption text-text-secondary mt-0.5">
                {GAME_STATUS_LABEL_I18N[s]}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Gêneros favoritos ─── */}
        {(profile?.favorite_genres?.length ?? 0) > 0 && (
          <>
            <SectionHeader title={t('profile.favoriteGenres')} className="mt-2" />
            <View className="flex-row flex-wrap px-5 gap-2 mb-2">
              {profile!.favorite_genres.map((g) => (
                <Pill key={g} label={g} variant="active" />
              ))}
            </View>
          </>
        )}

        {/* ─── Email ─── */}
        <SectionHeader title={t('profile.account')} className="mt-2" />
        <Card variant="flat" className="mx-5">
          <Text className="text-caption text-text-tertiary uppercase mb-1">{t('auth.email')}</Text>
          <Text className="text-body text-text-body">{user?.email ?? '—'}</Text>
        </Card>

        {/* ─── Estatísticas + Idioma + Bloqueados ─── */}
        <View className="mx-5 mt-3 rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden">
          <LinkRow
            icon="stats-chart-outline"
            label={t('stats.entryLabel')}
            external={false}
            onPress={() => router.push('/profile/stats' as never)}
          />
          <RowDivider />
          <LinkRow
            icon="language-outline"
            label={t('profile.language')}
            value={currentLanguageLabel}
            external={false}
            onPress={() => router.push('/profile/language' as never)}
          />
          <RowDivider />
          <LinkRow
            icon="ban-outline"
            label={t('block.manageBlocked')}
            external={false}
            onPress={() => router.push('/profile/blocked' as never)}
          />
        </View>

        {/* ─── Sobre / Legal ─── */}
        <SectionHeader title={t('profile.about')} className="mt-4" />
        <View className="mx-5 rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden">
          <LinkRow
            icon="shield-checkmark-outline"
            label={t('profile.privacy')}
            onPress={() => openUrl(LEGAL_URLS.privacy)}
          />
          <RowDivider />
          <LinkRow
            icon="document-text-outline"
            label={t('profile.terms')}
            onPress={() => openUrl(LEGAL_URLS.terms)}
          />
          <RowDivider />
          <LinkRow
            icon="help-circle-outline"
            label={t('profile.support')}
            onPress={() => openUrl(LEGAL_URLS.support)}
          />
        </View>

        {/* ─── Sign out ─── */}
        <View className="px-5 mt-6">
          <Button label={t('auth.signOut')} variant="ghost" onPress={onSignOut} />
        </View>

        {/* ─── Delete account (Apple 5.1.1(v) — obrigatório) ─── */}
        <View className="px-5 mt-2 mb-4">
          <Pressable
            onPress={onDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel={t('profile.deleteAccount')}
            hitSlop={4}
            className="py-3 items-center"
          >
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 14,
                color: tokens.color.semantic.danger,
                opacity: deleting ? 0.5 : 1,
              }}
            >
              {deleting ? t('profile.deletingAccount') : t('profile.deleteAccount')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  value,
  external = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Texto opcional exibido à direita (ex: idioma atual). */
  value?: string;
  /** Se true (default), mostra ícone de link externo. Se false, chevron de navegação. */
  external?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="flex-row items-center gap-3 px-4 py-3.5 active:bg-bg-surface"
    >
      <Ionicons name={icon} size={20} color={tokens.color.text.secondary} />
      <Text className="flex-1 text-body text-text-primary">{label}</Text>
      {value && (
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 14,
            color: tokens.color.text.tertiary,
          }}
        >
          {value}
        </Text>
      )}
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={external ? 16 : 18}
        color={tokens.color.text.tertiary}
      />
    </Pressable>
  );
}

function RowDivider() {
  return <View className="h-px bg-border-subtle mx-4" />;
}

function StatCard({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${value} ${label}` : undefined}
      className="flex-1 rounded-xl bg-bg-elevated border border-border-subtle p-4 items-center"
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.7 : 1 })}
    >
      <Text className="text-display-1 text-text-primary">{value}</Text>
      <Text className="text-caption text-text-secondary mt-1">{label}</Text>
    </Pressable>
  );
}
