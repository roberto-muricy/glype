import { useCallback, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  Pressable,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionHeader, Skeleton, Button, Avatar, Toast } from '@/src/components/ui';
import { GameCard, ReviewCard, CollectionCard } from '@/src/components/domain';
import { useTrendingGames, useRecommendations, useCollection } from '@/src/hooks/useGames';
import { COLLECTIONS } from '@/src/config/collections';
import type { CollectionDef } from '@/src/config/collections';
import { useFeed } from '@/src/hooks/useFeed';
import { useUnreadCount } from '@/src/hooks/useNotifications';
import { BellIcon } from '@/src/components/ui/icons';
import { Ionicons } from '@expo/vector-icons';
import { useBatchLikes, useLikeReview, useUnlikeReview } from '@/src/hooks/useLikes';
import { useBatchCommentCounts } from '@/src/hooks/useComments';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { hapticLight } from '@/src/utils/haptics';
import type { FeedItem, Game } from '@/src/types/models';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const genres = profile?.favorite_genres ?? [];

  const trending = useTrendingGames(12);
  const recommendations = useRecommendations(genres, 12);
  const feed = useFeed(15);

  const isRefreshing = trending.isFetching || recommendations.isFetching || feed.isFetching;
  const [showRefreshedToast, setShowRefreshedToast] = useState(false);
  const wasRefreshing = useRef(false);

  const onRefresh = useCallback(() => {
    hapticLight();
    wasRefreshing.current = true;
    trending.refetch();
    recommendations.refetch();
    feed.refetch();
  }, [trending, recommendations, feed]);

  // Show toast when refresh completes
  if (wasRefreshing.current && !isRefreshing) {
    wasRefreshing.current = false;
    if (!showRefreshedToast) {
      setShowRefreshedToast(true);
      setTimeout(() => setShowRefreshedToast(false), 2000);
    }
  }

  const greeting = getGreeting(t);
  const firstName = profile?.display_name?.split(' ')[0] ?? profile?.username ?? '';

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {showRefreshedToast && (
        <View style={{ position: 'absolute', top: 56, left: 20, right: 20, zIndex: 99 }}>
          <Toast variant="success" title={t('home.feedRefreshed')} />
        </View>
      )}
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
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-caption text-text-tertiary uppercase tracking-widest">
              {greeting}
            </Text>
            <Text className="text-h1 text-text-primary mt-0.5">
              {firstName ? t('home.hello', { name: firstName }) : 'Glype'}
            </Text>
          </View>
          <NotificationBell onPress={() => router.push('/notifications' as never)} />
        </View>

        {/* ─── Em Alta ─── */}
        <SectionHeader
          title={t('home.trending')}
          rightSlot={
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.seeMore')}
            >
              <Text className="text-caption text-brand-primary">{t('common.seeMore')}</Text>
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

        {/* ─── Descobrir (swipe deck) ─── */}
        <DiscoverPromoCard onPress={() => router.push('/discover' as never)} />

        {/* ─── Para Você ─── */}
        <SectionHeader
          title={genres.length > 0 ? t('home.forYou') : t('home.popular')}
          className="mt-4"
          rightSlot={
            genres.length === 0 ? (
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('home.personalize')}
              >
                <Text className="text-caption text-brand-primary">{t('home.personalize')}</Text>
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

        {/* ─── Coleções curadas ─── */}
        <SectionHeader title={t('home.collections')} className="mt-4" />
        <View style={{ height: 220 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
          >
            {COLLECTIONS.map((col) => (
              <CollectionPreviewCard
                key={col.id}
                collection={col}
                onPress={() => router.push(`/collection/${col.id}` as never)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── Feed dos seguidos ─── */}
        <SectionHeader title={t('home.following')} className="mt-4" />
        {feed.isLoading ? (
          <View className="px-5 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={120} className="rounded-xl" />
            ))}
          </View>
        ) : (feed.data?.length ?? 0) === 0 ? (
          <EmptyState
            title={t('home.noReviewsYet')}
            subtitle={t('home.noReviewsSubtitle')}
            action={
              <Button
                label={t('home.findPlayers')}
                size="sm"
                variant="secondary"
                onPress={() => router.push('/(tabs)/search' as never)}
              />
            }
          />
        ) : (
          <FeedList
            items={feed.data!}
            onGamePress={(rawgId) => router.push(`/game/${rawgId}` as never)}
            onUserPress={(userId) => router.push(`/profile/${userId}` as never)}
            onReviewPress={(reviewId) => router.push(`/review/${reviewId}` as never)}
          />
        )}

        {/* Dica de personalização se sem gêneros favoritos */}
        {!recommendations.isLoading && genres.length === 0 && (
          <View className="mx-5 mt-2 rounded-xl bg-bg-surface border border-border-accent p-4">
            <Text className="text-body text-text-primary font-medium">
              {t('home.personalizeTitle')}
            </Text>
            <Text className="text-caption text-text-secondary mt-1">
              {t('home.personalizeSubtitle')}
            </Text>
            <View className="mt-3">
              <Button
                label={t('home.goToProfile')}
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
  const { t } = useTranslation();
  return (
    <View className="px-5 py-3 flex-row items-center gap-3">
      <Text className="text-caption text-text-secondary flex-1">
        {t('home.couldNotLoadGames')}
      </Text>
      <Button label={t('common.retry')} size="sm" variant="ghost" onPress={onRetry} />
    </View>
  );
}

// ─── FeedList ────────────────────────────────────────────────────────────────

function FeedList({
  items,
  onGamePress,
  onUserPress,
  onReviewPress,
}: {
  items: FeedItem[];
  onGamePress: (rawgId: number) => void;
  onUserPress: (userId: string) => void;
  onReviewPress: (reviewId: string) => void;
}) {
  const reviewIds = items.map((i) => i.id);
  const { data: likesMap } = useBatchLikes(reviewIds);
  const { data: commentsMap } = useBatchCommentCounts(reviewIds);
  const like = useLikeReview();
  const unlike = useUnlikeReview();

  return (
    <View className="px-5 gap-3">
      {items.map((item, index) => {
        const likeData = likesMap?.[item.id];
        const commentsCount = commentsMap?.[item.id] ?? 0;
        return (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(index * 60).duration(350).springify()}
          >
          <FeedCard
            item={item}
            liked={likeData?.liked ?? false}
            likesCount={likeData?.count ?? 0}
            commentsCount={commentsCount}
            onGamePress={onGamePress}
            onUserPress={onUserPress}
            onReviewPress={onReviewPress}
            onLikePress={() =>
              likeData?.liked
                ? unlike.mutate({ reviewId: item.id })
                : like.mutate({ reviewId: item.id })
            }
          />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── FeedCard ────────────────────────────────────────────────────────────────

function FeedCard({
  item,
  liked,
  likesCount,
  commentsCount,
  onGamePress,
  onUserPress,
  onReviewPress,
  onLikePress,
}: {
  item: FeedItem;
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  onGamePress: (rawgId: number) => void;
  onUserPress: (userId: string) => void;
  onReviewPress: (reviewId: string) => void;
  onLikePress: () => void;
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
      <Pressable onPress={() => onReviewPress(item.id)} accessibilityRole="button">
      <ReviewCard
        variant="compact"
        user={{
          username: item.user.display_name ?? item.user.username,
          avatarUrl: item.user.avatar_url,
          onPress: () => onUserPress(item.user.id),
        }}
        score={item.score}
        body={item.body}
        liked={liked}
        likesCount={likesCount}
        onLikePress={onLikePress}
        commentsCount={commentsCount}
        onCommentPress={() => onReviewPress(item.id)}
        tags={[
          ...(item.completed ? [{ label: 'Completou', variant: 'success' as const }] : []),
          ...(item.has_spoiler ? [{ label: 'Spoiler', variant: 'danger' as const }] : []),
          ...(item.playtime_hours ? [{ label: `${item.playtime_hours}h`, variant: 'neutral' as const }] : []),
        ]}
      />
      </Pressable>
    </View>
  );
}

// ─── NotificationBell ────────────────────────────────────────────────────────

function NotificationBell({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { data: unreadCount } = useUnreadCount();
  const count = unreadCount ?? 0;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? t('home.notificationsNew', { count }) : t('home.notifications')}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: tokens.color.bg.elevated,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BellIcon size={20} color={tokens.color.text.primary} />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: tokens.color.semantic.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: tokens.color.bg.primary,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontFamily.monoMedium,
              fontSize: 9,
              color: '#fff',
            }}
          >
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── CollectionPreviewCard ───────────────────────────────────────────────────
// Wrapper que carrega os primeiros 3 jogos da coleção pra mostrar as capas.

function CollectionPreviewCard({
  collection,
  onPress,
}: {
  collection: CollectionDef;
  onPress: () => void;
}) {
  const { data, isLoading } = useCollection(collection.id, 3);
  return (
    <CollectionCard
      collection={collection}
      previewGames={data?.results}
      loading={isLoading}
      onPress={onPress}
    />
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const listContentStyle: ViewStyle = {
  paddingHorizontal: 20,
  gap: 12,
  paddingBottom: 4,
};

// ─── DiscoverPromoCard ───────────────────────────────────────────────────────
// Card destacado na home que abre o swipe deck.

function DiscoverPromoCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="mx-5 mt-4">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('discover.homeCardTitle')}
        style={({ pressed }) => ({
          borderRadius: 16,
          overflow: 'hidden',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View
          style={{
            backgroundColor: tokens.color.brand.primary,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 16,
                color: '#fff',
              }}
            >
              {t('discover.homeCardTitle')}
            </Text>
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: 12,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 2,
              }}
            >
              {t('discover.homeCardSubtitle')}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: '#fff',
            }}
          >
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 13,
                color: tokens.color.brand.primary,
              }}
            >
              {t('discover.homeCardCta')}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.greetingMorning');
  if (hour < 18) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
}
