import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Button, Card, Pill, SectionHeader } from '@/src/components/ui';
import { TopGamesRow, TopGamesEmptyCTA } from '@/src/components/domain';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfileStats } from '@/src/hooks/useProfile';
import { useMyLibrary } from '@/src/hooks/useLibrary';
import { useFollowCounts } from '@/src/hooks/useFeed';
import { useFavoriteGames } from '@/src/hooks/useFavorites';
import { GAME_STATUS_LABEL, type GameStatus } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';

const STATUS_LIST: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { data: stats } = useProfileStats();
  const { data: library } = useMyLibrary();
  const { data: counts } = useFollowCounts(user?.id ?? null);
  const { data: favorites } = useFavoriteGames(user?.id ?? null);

  const onSignOut = async () => {
    Alert.alert('Sair', 'Tem certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao sair');
          }
        },
      },
    ]);
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
          <Text className="text-h1 text-text-primary">Perfil</Text>
          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
          >
            <Text className="text-body text-brand-primary">Editar</Text>
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
                <Text className="text-caption text-text-secondary">seguidores</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${user?.id}&tab=following` as never)}
                accessibilityRole="button"
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.following}</Text>
                <Text className="text-caption text-text-secondary">seguindo</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ─── Stats ─── */}
        <View className="flex-row mx-5 gap-3 mb-6">
          <StatCard
            value={stats?.reviewsCount ?? 0}
            label="Reviews"
          />
          <StatCard
            value={stats?.gamesCount ?? 0}
            label="Na biblioteca"
          />
        </View>

        {/* ─── Top 5 jogos ─── */}
        {(favorites?.length ?? 0) > 0 ? (
          <>
            <SectionHeader
              title="Top 5 Jogos"
              rightSlot={
                <Pressable
                  onPress={() => router.push('/profile/top-games' as never)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Editar Top 5"
                >
                  <Text className="text-caption text-brand-primary">Editar</Text>
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
        <SectionHeader title="Biblioteca" />
        <View className="flex-row flex-wrap mx-5 gap-3 mb-2">
          {STATUS_LIST.map((s) => (
            <View
              key={s}
              className="flex-1 min-w-[40%] rounded-xl bg-bg-elevated border border-border-subtle p-3"
            >
              <Text className="text-h2 text-text-primary">{countByStatus(s)}</Text>
              <Text className="text-caption text-text-secondary mt-0.5">
                {GAME_STATUS_LABEL[s]}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Gêneros favoritos ─── */}
        {(profile?.favorite_genres?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="Gêneros favoritos" className="mt-2" />
            <View className="flex-row flex-wrap px-5 gap-2 mb-2">
              {profile!.favorite_genres.map((g) => (
                <Pill key={g} label={g} variant="active" />
              ))}
            </View>
          </>
        )}

        {/* ─── Email ─── */}
        <SectionHeader title="Conta" className="mt-2" />
        <Card variant="flat" className="mx-5">
          <Text className="text-caption text-text-tertiary uppercase mb-1">Email</Text>
          <Text className="text-body text-text-body">{user?.email ?? '—'}</Text>
        </Card>

        {/* ─── Sign out ─── */}
        <View className="px-5 mt-6">
          <Button label="Sair da conta" variant="ghost" onPress={onSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View
      className="flex-1 rounded-xl bg-bg-elevated border border-border-subtle p-4 items-center"
    >
      <Text className="text-display-1 text-text-primary">{value}</Text>
      <Text className="text-caption text-text-secondary mt-1">{label}</Text>
    </View>
  );
}
