import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Tag } from '@/src/components/ui';
import { ScoreBadge } from '@/src/components/domain';
import { useReviewDetail } from '@/src/hooks/useProfile';
import { useIsFollowing, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { useBatchLikes, useLikeReview, useUnlikeReview } from '@/src/hooks/useLikes';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { ChevronLeftIcon, HeartIcon, HeartOutlineIcon } from '@/src/components/ui/icons';

export default function ReviewDetailScreen() {
  const router = useRouter();
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const { data: review, isLoading, isError } = useReviewDetail(reviewId ?? null);
  const { data: likesMap } = useBatchLikes(reviewId ? [reviewId] : []);
  const like = useLikeReview();
  const unlike = useUnlikeReview();

  const isMe = review?.user.id === currentUser?.id;
  const { data: isFollowing } = useIsFollowing(isMe ? null : (review?.user.id ?? null));
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const likeData = likesMap?.[reviewId ?? ''];
  const liked = likeData?.liked ?? false;
  const likesCount = likeData?.count ?? 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center" edges={['top']}>
        <ActivityIndicator color={tokens.color.brand.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !review) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-display-2 text-text-tertiary">💬</Text>
          <Text className="text-body-lg text-text-secondary">Review não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = review.user.display_name ?? review.user.username;
  const releaseYear = review.game.release_date?.slice(0, 4);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <BackButton onPress={() => router.back()} />
        <Pressable
          onPress={() =>
            liked
              ? unlike.mutate({ reviewId: reviewId! })
              : like.mutate({ reviewId: reviewId! })
          }
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}
          className="flex-row items-center gap-1.5 px-1"
        >
          {liked
            ? <HeartIcon size={20} color={tokens.color.semantic.danger} />
            : <HeartOutlineIcon size={20} color={tokens.color.text.secondary} />
          }
          <Text
            style={{
              fontFamily: tokens.fontFamily.monoMedium,
              fontSize: 14,
              color: liked ? tokens.color.semantic.danger : tokens.color.text.secondary,
            }}
          >
            {likesCount}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ─── Game cover hero ─── */}
        <Pressable
          onPress={() => review.game.rawg_id != null && router.push(`/game/${review.game.rawg_id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes de ${review.game.title}`}
        >
          <View style={{ height: 200, backgroundColor: tokens.color.bg.surface }}>
            {(review.game.background_url ?? review.game.cover_url) ? (
              <Image
                source={{ uri: review.game.background_url ?? review.game.cover_url! }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <LinearGradient
              colors={['transparent', tokens.color.bg.primary]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
            />
            {/* Game info overlay */}
            <View style={{ position: 'absolute', bottom: 12, left: 20, right: 20 }}>
              <Text
                style={{
                  fontFamily: tokens.fontFamily.medium,
                  fontSize: 20,
                  color: '#ffffff',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
                numberOfLines={2}
              >
                {review.game.title}
              </Text>
              {(review.game.genres?.[0] || releaseYear) && (
                <Text
                  style={{
                    fontFamily: tokens.fontFamily.regular,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    marginTop: 2,
                  }}
                >
                  {[review.game.genres?.[0], releaseYear].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </Pressable>

        {/* ─── Score + tags ─── */}
        <View className="flex-row items-center gap-3 px-5 pt-4 pb-3 flex-wrap">
          <ScoreBadge score={review.score} size="md" />
          {review.completed && (
            <Tag label="Completou" variant="success" />
          )}
          {review.has_spoiler && (
            <Tag label="Spoiler" variant="danger" />
          )}
          {review.playtime_hours != null && (
            <Tag label={`${review.playtime_hours}h jogadas`} variant="neutral" />
          )}
        </View>

        {/* ─── Author ─── */}
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-border-subtle">
          <Pressable
            onPress={() => router.push(`/profile/${review.user.id}` as never)}
            className="flex-row items-center gap-3"
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${displayName}`}
          >
            <Avatar name={displayName} uri={review.user.avatar_url} size="md" />
            <View>
              <Text className="text-body-lg font-medium text-text-primary">{displayName}</Text>
              {review.user.display_name && (
                <Text className="text-caption text-text-secondary">@{review.user.username}</Text>
              )}
            </View>
          </Pressable>

          {!isMe && (
            <Button
              label={isFollowing ? 'Seguindo' : 'Seguir'}
              size="sm"
              variant={isFollowing ? 'secondary' : 'primary'}
              loading={follow.isPending || unfollow.isPending}
              onPress={() =>
                isFollowing
                  ? unfollow.mutate(review.user.id)
                  : follow.mutate(review.user.id)
              }
            />
          )}
        </View>

        {/* ─── Review body ─── */}
        <View className="px-5 pt-5">
          <Text
            style={{
              fontFamily: tokens.fontFamily.regular,
              fontSize: 16,
              lineHeight: 26,
              color: tokens.color.text.body,
            }}
          >
            {review.body}
          </Text>

          <Text className="text-caption text-text-tertiary mt-5">
            {new Date(review.created_at).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* ─── Ver jogo CTA ─── */}
        {review.game.rawg_id != null && (
          <View className="px-5 mt-6">
            <Button
              label={`Ver ${review.game.title}`}
              variant="secondary"
              onPress={() => router.push(`/game/${review.game.rawg_id}` as never)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      className="flex-row items-center gap-1"
    >
      <ChevronLeftIcon size={20} color={tokens.color.brand.primary} />
      <Text className="text-body text-brand-primary">Voltar</Text>
    </Pressable>
  );
}
