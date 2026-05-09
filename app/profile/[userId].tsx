import { ActionSheetIOS, Alert, ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Pill, SectionHeader } from '@/src/components/ui';
import { ScoreBadge } from '@/src/components/domain';
import { usePublicProfile, useUserPublicReviews } from '@/src/hooks/useProfile';
import { useFollowCounts, useIsFollowing, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { useProfileStats } from '@/src/hooks/useProfile';
import { useDeleteReview } from '@/src/hooks/useReviews';
import { useBatchLikes, useLikeReview, useUnlikeReview } from '@/src/hooks/useLikes';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { ChevronLeftIcon, EllipsisIcon, HeartIcon, HeartOutlineIcon } from '@/src/components/ui/icons';
import type { ReviewWithGame } from '@/src/services/profile.service';

export default function PublicProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isMe = userId === currentUser?.id;

  const { data: profile, isLoading: profileLoading, isError } = usePublicProfile(userId ?? null);
  const { data: stats } = useProfileStats();
  const { data: reviews, isLoading: reviewsLoading } = useUserPublicReviews(userId ?? null);
  const { data: counts } = useFollowCounts(userId ?? null);
  const { data: isFollowing } = useIsFollowing(isMe ? null : (userId ?? null));
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const deleteReview = useDeleteReview();
  const reviewIds = (reviews ?? []).map((r) => r.id);
  const { data: likesMap } = useBatchLikes(reviewIds);
  const like = useLikeReview();
  const unlike = useUnlikeReview();

  // Para o perfil do usuário logado, usa o store (já carregado) e busca stats normalmente
  const ownProfile = useAuthStore((s) => s.profile);
  const displayProfile = isMe ? ownProfile : profile;

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center" edges={['top']}>
        <ActivityIndicator color={tokens.color.brand.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !displayProfile) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-display-2 text-text-tertiary">👤</Text>
          <Text className="text-body-lg text-text-secondary">Perfil não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = displayProfile.display_name ?? displayProfile.username;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <BackButton onPress={() => router.back()} />
        {isMe && (
          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
          >
            <Text className="text-body text-brand-primary">Editar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ─── Avatar + info ─── */}
        <View className="items-center gap-3 pt-4 pb-5 px-5">
          <Avatar
            size="lg"
            name={displayName}
            uri={displayProfile.avatar_url}
          />
          <View className="items-center gap-1">
            <Text className="text-h2 text-text-primary">{displayName}</Text>
            {displayProfile.display_name && (
              <Text className="text-body text-text-secondary">@{displayProfile.username}</Text>
            )}
            {displayProfile.bio && (
              <Text className="text-body text-text-body mt-1 text-center px-6" numberOfLines={3}>
                {displayProfile.bio}
              </Text>
            )}
            {displayProfile.location && (
              <Text className="text-caption text-text-tertiary mt-0.5">
                📍 {displayProfile.location}
              </Text>
            )}
          </View>

          {/* Follow/Following counts */}
          {counts != null && (
            <View className="flex-row gap-6 mt-1">
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${userId}&tab=followers` as never)}
                accessibilityRole="button"
                accessibilityLabel={`${counts.followers} seguidores`}
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.followers}</Text>
                <Text className="text-caption text-text-secondary">seguidores</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${userId}&tab=following` as never)}
                accessibilityRole="button"
                accessibilityLabel={`${counts.following} seguindo`}
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.following}</Text>
                <Text className="text-caption text-text-secondary">seguindo</Text>
              </Pressable>
            </View>
          )}

          {/* Follow button */}
          {!isMe && (
            <Button
              label={isFollowing ? 'Seguindo' : 'Seguir'}
              variant={isFollowing ? 'secondary' : 'primary'}
              size="sm"
              loading={follow.isPending || unfollow.isPending}
              onPress={() =>
                isFollowing
                  ? unfollow.mutate(userId!)
                  : follow.mutate(userId!)
              }
            />
          )}
        </View>

        {/* ─── Stats ─── */}
        <View className="flex-row mx-5 gap-3 mb-5">
          <StatCard value={stats?.reviewsCount ?? reviews?.length ?? 0} label="Reviews" />
          <StatCard value={stats?.gamesCount ?? 0} label="Na biblioteca" />
        </View>

        {/* ─── Gêneros favoritos ─── */}
        {(displayProfile.favorite_genres?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="Gêneros favoritos" />
            <View className="flex-row flex-wrap px-5 gap-2 mb-5">
              {displayProfile.favorite_genres.map((g) => (
                <Pill key={g} label={g} variant="active" />
              ))}
            </View>
          </>
        )}

        {/* ─── Reviews ─── */}
        <SectionHeader title="Reviews" />
        {reviewsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={tokens.color.brand.primary} />
          </View>
        ) : (reviews?.length ?? 0) === 0 ? (
          <View className="items-center py-12 gap-4">
            <Text className="text-display-1 text-brand-primary">G</Text>
            <Text className="text-body-lg text-text-secondary text-center px-8">
              {isMe
                ? 'Você ainda não escreveu nenhuma review.\nToque em + para começar.'
                : 'Nenhuma review pública ainda.'}
            </Text>
            {isMe && (
              <Button
                label="Escrever review"
                size="sm"
                onPress={() => router.push('/review/pick-game' as never)}
              />
            )}
          </View>
        ) : (
          <View className="px-5 gap-3">
            {reviews!.map((review) => {
              const likeData = likesMap?.[review.id];
              return (
              <ReviewCard
                key={review.id}
                review={review}
                isOwner={isMe}
                liked={likeData?.liked ?? false}
                likesCount={likeData?.count ?? 0}
                onLikePress={() =>
                  likeData?.liked
                    ? unlike.mutate({ reviewId: review.id })
                    : like.mutate({ reviewId: review.id })
                }
                onGamePress={() => {
                  if (review.game.rawg_id != null) {
                    router.push(`/game/${review.game.rawg_id}` as never);
                  }
                }}
                onEdit={() => {
                  router.push(
                    `/review/new?rawgId=${review.game.rawg_id}&reviewId=${review.id}&initialScore=${review.score}&initialBody=${encodeURIComponent(review.body)}&initialPlaytime=${review.playtime_hours ?? ''}&initialCompleted=${review.completed}&initialSpoiler=${review.has_spoiler}&initialPublic=true` as never,
                  );
                }}
                onDelete={() => {
                  const doDelete = () =>
                    deleteReview.mutate(
                      { reviewId: review.id },
                      { onError: (e) => Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao excluir') },
                    );

                  if (Platform.OS === 'ios') {
                    ActionSheetIOS.showActionSheetWithOptions(
                      { options: ['Cancelar', 'Excluir review'], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
                      (i) => { if (i === 1) doDelete(); },
                    );
                  } else {
                    Alert.alert('Excluir review', 'Tem certeza? Essa ação não pode ser desfeita.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Excluir', style: 'destructive', onPress: doDelete },
                    ]);
                  }
                }}
              />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  isOwner = false,
  liked = false,
  likesCount = 0,
  onGamePress,
  onLikePress,
  onEdit,
  onDelete,
}: {
  review: ReviewWithGame;
  isOwner?: boolean;
  liked?: boolean;
  likesCount?: number;
  onGamePress: () => void;
  onLikePress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const MAX_BODY = 160;
  const bodyTruncated = review.body.length > MAX_BODY
    ? review.body.slice(0, MAX_BODY).trimEnd() + '…'
    : review.body;

  return (
    <Pressable
      onPress={onGamePress}
      accessibilityRole="button"
      accessibilityLabel={`Review de ${review.game.title}`}
      className="rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden"
    >
      {/* Game cover strip */}
      <View className="flex-row items-center gap-3 p-3 border-b border-border-subtle">
        <View className="rounded-lg overflow-hidden" style={{ width: 44, height: 56 }}>
          {review.game.cover_url ? (
            <Image
              source={{ uri: review.game.cover_url }}
              style={{ width: 44, height: 56 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LinearGradient
              colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
              style={{ width: 44, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-caption text-text-tertiary text-center px-0.5" numberOfLines={2}>
                {review.game.title}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-body-lg font-medium text-text-primary" numberOfLines={1}>
            {review.game.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <ScoreBadge score={review.score} size="sm" />
            {review.completed && (
              <Text className="text-caption text-text-tertiary">Completado</Text>
            )}
            {review.has_spoiler && (
              <Text className="text-caption text-semantic-warning">⚠ Spoiler</Text>
            )}
          </View>
        </View>

        {/* ⋯ menu — só para o dono */}
        {isOwner && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  {
                    options: ['Cancelar', 'Editar review', 'Excluir review'],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                  },
                  (i) => {
                    if (i === 1) onEdit?.();
                    if (i === 2) onDelete?.();
                  },
                );
              } else {
                Alert.alert('Review', review.game.title, [
                  { text: 'Editar', onPress: onEdit },
                  { text: 'Excluir', style: 'destructive', onPress: onDelete },
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              }
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Opções da review"
            className="p-1"
          >
            <EllipsisIcon size={18} color={tokens.color.text.secondary} />
          </Pressable>
        )}
      </View>

      {/* Review body */}
      <View className="p-3">
        <Text className="text-body text-text-body leading-5">{bodyTruncated}</Text>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-caption text-text-tertiary">
            {new Date(review.created_at).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onLikePress?.(); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}
            className="flex-row items-center gap-1.5"
          >
            {liked
              ? <HeartIcon size={15} color={tokens.color.semantic.danger} />
              : <HeartOutlineIcon size={15} color={tokens.color.text.secondary} />
            }
            <Text className="text-caption text-text-secondary">{likesCount}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 rounded-xl bg-bg-elevated border border-border-subtle p-4 items-center">
      <Text className="text-display-1 text-text-primary">{value}</Text>
      <Text className="text-caption text-text-secondary mt-1">{label}</Text>
    </View>
  );
}

// ─── BackButton ───────────────────────────────────────────────────────────────

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
