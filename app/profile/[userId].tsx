import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Pill, SectionHeader } from '@/src/components/ui';
import { ScoreBadge } from '@/src/components/domain';
import { usePublicProfile, useUserPublicReviews } from '@/src/hooks/useProfile';
import { useFollowCounts, useIsFollowing, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { useProfileStats } from '@/src/hooks/useProfile';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { ChevronLeftIcon } from '@/src/components/ui/icons';
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
              <View className="items-center">
                <Text className="text-body-lg font-medium text-text-primary">{counts.followers}</Text>
                <Text className="text-caption text-text-secondary">seguidores</Text>
              </View>
              <View className="items-center">
                <Text className="text-body-lg font-medium text-text-primary">{counts.following}</Text>
                <Text className="text-caption text-text-secondary">seguindo</Text>
              </View>
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

        {/* ─── Reviews públicas ─── */}
        <SectionHeader title="Reviews" />
        {reviewsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={tokens.color.brand.primary} />
          </View>
        ) : (reviews?.length ?? 0) === 0 ? (
          <View className="items-center py-8 gap-2">
            <Text className="text-body text-text-tertiary">Nenhuma review pública ainda</Text>
          </View>
        ) : (
          <View className="px-5 gap-3">
            {reviews!.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onGamePress={() => {
                  if (review.game.rawg_id != null) {
                    router.push(`/game/${review.game.rawg_id}` as never);
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onGamePress,
}: {
  review: ReviewWithGame;
  onGamePress: () => void;
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
      </View>

      {/* Review body */}
      <View className="p-3">
        <Text className="text-body text-text-body leading-5">{bodyTruncated}</Text>
        <Text className="text-caption text-text-tertiary mt-2">
          {new Date(review.created_at).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
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
