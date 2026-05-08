import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  Pressable,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SectionHeader, Skeleton, Button, Avatar } from '@/src/components/ui';
import { GameCard, ReviewCard } from '@/src/components/domain';
import { useTrendingGames, useRecommendations } from '@/src/hooks/useGames';
import { useFeed } from '@/src/hooks/useFeed';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import type { FeedItem, Game } from '@/src/types/models';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const genres = profile?.favorite_genres ?? [];

  const trending = useTrendingGames(12);
  const recommendations = useRecommendations(genres, 12);
  const feed = useFeed(15);

  const isRefreshing = trending.isFetching || recommendations.isFetching || feed.isFetching;

  const onRefresh = useCallback(() => {
    trending.refetch();
    recommendations.refetch();
    feed.refetch();
  }, [trending, recommendations, feed]);

  const greeting = getGreeting();
  const firstName = profile?.display_name?.split(' ')[0] ?? profile?.username ?? '';

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={tokens.color.brand.primary}
          />
        }
      >
        {/* ─── Header ─── */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-caption text-text-tertiary uppercase tracking-widest">
            {greeting}
          </Text>
          <Text className="text-h1 text-text-primary mt-0.5">
            {firstName ? `Olá, ${firstName}` : 'Glype'}
          </Text>
        </View>

        {/* ─── Em Alta ─── */}
        <SectionHeader
          title="Em Alta"
          rightSlot={
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ver mais"
            >
              <Text className="text-caption text-brand-primary">Ver mais</Text>
            </Pressable>
          }
        />

        {trending.isError ? (
          <ErrorRow onRetry={() => trending.refetch()} />
        ) : (
          <HorizontalGameList
            games={trending.data?.results}
            loading={trending.isLoading}
            onPress={(game) =>
              router.push(`/game/${game.rawg_id}` as never)
            }
          />
        )}

        {/* ─── Para Você ─── */}
        <SectionHeader
          title={genres.length > 0 ? 'Para Você' : 'Populares'}
          className="mt-4"
          rightSlot={
            genres.length === 0 ? (
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Personalizar"
              >
                <Text className="text-caption text-brand-primary">Personalizar</Text>
              </Pressable>
            ) : undefined
          }
        />

        {recommendations.isError ? (
          <ErrorRow onRetry={() => recommendations.refetch()} />
        ) : (
          <HorizontalGameList
            games={recommendations.data?.results}
            loading={recommendations.isLoading}
            onPress={(game) =>
              router.push(`/game/${game.rawg_id}` as never)
            }
          />
        )}

        {/* ─── Feed dos seguidos ─── */}
        {(feed.data?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="Seguindo" className="mt-4" />
            <View className="px-5 gap-3">
              {feed.isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} width="100%" height={120} className="rounded-xl" />
                  ))
                : feed.data!.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      onGamePress={(rawgId) => router.push(`/game/${rawgId}` as never)}
                      onUserPress={(userId) => router.push(`/profile/${userId}` as never)}
                    />
                  ))}
            </View>
          </>
        )}

        {/* Dica de personalização se sem gêneros favoritos */}
        {!recommendations.isLoading && genres.length === 0 && (
          <View className="mx-5 mt-2 rounded-xl bg-bg-surface border border-border-accent p-4">
            <Text className="text-body text-text-primary font-medium">
              Personalize suas recomendações
            </Text>
            <Text className="text-caption text-text-secondary mt-1">
              Adicione gêneros favoritos no seu perfil para ver jogos que combinam com você.
            </Text>
            <View className="mt-3">
              <Button
                label="Ir para o perfil"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/(tabs)/profile')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function HorizontalGameList({
  games,
  loading,
  onPress,
}: {
  games: Game[] | undefined;
  loading: boolean;
  onPress: (game: Game) => void;
}) {
  if (loading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={listContentStyle}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  }

  if (!games || games.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={listContentStyle}
    >
      {games.map((game) => (
        <GameCard
          key={game.rawg_id ?? game.slug ?? game.title}
          title={game.title}
          genre={game.genres[0]}
          coverUrl={game.cover_url}
          score={
            game.metacritic_score != null
              ? game.metacritic_score / 10
              : (game.rawg_rating ?? undefined)
          }
          size="sm"
          onPress={() => onPress(game)}
        />
      ))}
    </ScrollView>
  );
}

function SkeletonCard() {
  return (
    <View style={{ width: 130 }}>
      <Skeleton width={130} height={160} className="rounded-xl" />
      <View className="mt-2 gap-1.5">
        <Skeleton width={100} height={10} />
        <Skeleton width={70} height={8} />
      </View>
    </View>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="px-5 py-3 flex-row items-center gap-3">
      <Text className="text-caption text-text-secondary flex-1">
        Não foi possível carregar os jogos.
      </Text>
      <Button label="Tentar novamente" size="sm" variant="ghost" onPress={onRetry} />
    </View>
  );
}

// ─── FeedCard ────────────────────────────────────────────────────────────────

function FeedCard({
  item,
  onGamePress,
  onUserPress,
}: {
  item: FeedItem;
  onGamePress: (rawgId: number) => void;
  onUserPress: (userId: string) => void;
}) {
  return (
    <View>
      {item.game && (
        <Pressable
          onPress={() => item.game.rawg_id && onGamePress(item.game.rawg_id)}
          className="flex-row items-center gap-2 mb-2"
          accessibilityRole="button"
          accessibilityLabel={item.game.title}
        >
          <Text className="text-caption text-text-tertiary uppercase tracking-wide">
            {item.game.title}
          </Text>
        </Pressable>
      )}
      <ReviewCard
        variant="compact"
        user={{
          username: item.user.display_name ?? item.user.username,
          avatarUrl: item.user.avatar_url,
          onPress: () => onUserPress(item.user.id),
        }}
        score={item.score}
        body={item.body}
        tags={[
          ...(item.completed ? [{ label: 'Completou', variant: 'success' as const }] : []),
          ...(item.has_spoiler ? [{ label: 'Spoiler', variant: 'danger' as const }] : []),
          ...(item.playtime_hours ? [{ label: `${item.playtime_hours}h`, variant: 'neutral' as const }] : []),
        ]}
      />
    </View>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const listContentStyle: ViewStyle = {
  paddingHorizontal: 20,
  gap: 12,
  paddingBottom: 4,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
