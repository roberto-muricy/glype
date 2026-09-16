import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ActionSheet, Avatar, Button, Pill, ReportSheet, SectionHeader, Toast } from '@/src/components/ui';
import { ScoreBadge, TopGamesRow } from '@/src/components/domain';
import { usePublicProfile, useUserPublicReviews } from '@/src/hooks/useProfile';
import { useFollowCounts, useIsFollowing, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { useProfileStats } from '@/src/hooks/useProfile';
import { useFavoriteGames } from '@/src/hooks/useFavorites';
import { useUserLibrary, useUserLibraryCounts } from '@/src/hooks/useLibrary';
import { useGameStatusLabel } from '@/src/i18n/useGameStatusLabel';
import { useBlockUser, useIsBlocked, useUnblockUser } from '@/src/hooks/useModeration';
import { useDeleteReview } from '@/src/hooks/useReviews';
import { useBatchLikes, useLikeReview, useUnlikeReview } from '@/src/hooks/useLikes';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { ChevronLeftIcon, EditIcon, EllipsisIcon, HeartIcon, HeartOutlineIcon, LocationIcon, PersonCircleIcon, TrashIcon } from '@/src/components/ui/icons';
import type { ReviewWithGame } from '@/src/services/profile.service';

export default function PublicProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isMe = userId === currentUser?.id;

  const { data: profile, isLoading: profileLoading, isError } = usePublicProfile(userId ?? null);
  const { data: stats } = useProfileStats();
  const { data: reviews, isLoading: reviewsLoading } = useUserPublicReviews(userId ?? null);
  const { data: counts } = useFollowCounts(userId ?? null);
  const { data: favorites } = useFavoriteGames(userId ?? null);
  const { data: libraryCounts } = useUserLibraryCounts(userId ?? null);
  // Preview do "Jogando agora" — só os 3 mais recentes
  const { data: playingNow } = useUserLibrary(userId ?? null, 'playing');
  const GAME_STATUS_LABEL = useGameStatusLabel();
  const { data: isFollowing } = useIsFollowing(isMe ? null : (userId ?? null));
  const { data: blockedByMe } = useIsBlocked(isMe ? null : (userId ?? null));
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);

  // Auto-dismiss toast após 3s
  useEffect(() => {
    if (!feedbackToast) return;
    const id = setTimeout(() => setFeedbackToast(null), 3000);
    return () => clearTimeout(id);
  }, [feedbackToast]);

  const handleBlock = () => {
    setProfileMenuOpen(false);
    if (!userId || !profile?.username) return;
    Alert.alert(
      t('block.confirmTitle', { username: profile.username }),
      t('block.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('block.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser.mutateAsync(userId);
              setFeedbackToast({
                variant: 'success',
                title: t('block.blocked', { username: profile.username }),
              });
              // Sai do perfil — usuário bloqueado não deve ficar olhando o perfil
              setTimeout(() => router.back(), 800);
            } catch (e) {
              setFeedbackToast({
                variant: 'danger',
                title: e instanceof Error ? e.message : t('common.unknownError'),
              });
            }
          },
        },
      ],
    );
  };

  const handleUnblock = async () => {
    setProfileMenuOpen(false);
    if (!userId || !profile?.username) return;
    try {
      await unblockUser.mutateAsync(userId);
      setFeedbackToast({
        variant: 'success',
        title: t('block.unblocked', { username: profile.username }),
      });
    } catch (e) {
      setFeedbackToast({
        variant: 'danger',
        title: e instanceof Error ? e.message : t('common.unknownError'),
      });
    }
  };

  const handleOpenReport = () => {
    setProfileMenuOpen(false);
    setTimeout(() => setReportOpen(true), 250); // Espera ActionSheet fechar
  };
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
          <PersonCircleIcon size={56} color={tokens.color.text.tertiary} />
          <Text className="text-body-lg text-text-secondary">{t('profile.profileNotFound')}</Text>
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
        {isMe ? (
          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfile')}
          >
            <Text className="text-body text-brand-primary">{t('profile.edit')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setProfileMenuOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.open')}
            className="p-1"
          >
            <EllipsisIcon size={20} color={tokens.color.text.secondary} />
          </Pressable>
        )}
      </View>

      {/* Toast de feedback (bloquear/denunciar) */}
      {feedbackToast && (
        <View style={{ position: 'absolute', top: 56, left: 20, right: 20, zIndex: 99 }}>
          <Toast variant={feedbackToast.variant} title={feedbackToast.title} />
        </View>
      )}

      {/* Menu do perfil (não-dono) */}
      {!isMe && (
        <ActionSheet
          visible={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
          title={profile?.username ? `@${profile.username}` : ''}
          actions={[
            {
              label: t('report.reportUser'),
              onPress: handleOpenReport,
            },
            blockedByMe
              ? {
                  label: t('block.unblockUser'),
                  onPress: handleUnblock,
                }
              : {
                  label: t('block.blockUser'),
                  destructive: true,
                  onPress: handleBlock,
                },
          ]}
        />
      )}

      {/* Sheet de denúncia */}
      {!isMe && userId && (
        <ReportSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="user"
          targetId={userId}
          reportedUserId={userId}
          onSuccess={() =>
            setFeedbackToast({
              variant: 'success',
              title: t('report.successTitle'),
            })
          }
        />
      )}

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
              <View className="flex-row items-center gap-1 mt-0.5">
                <LocationIcon size={12} color={tokens.color.text.tertiary} />
                <Text className="text-caption text-text-tertiary">
                  {displayProfile.location}
                </Text>
              </View>
            )}
          </View>

          {/* Follow/Following counts */}
          {counts != null && (
            <View className="flex-row gap-6 mt-1">
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${userId}&tab=followers` as never)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.followersCountA11y', { count: counts.followers })}
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.followers}</Text>
                <Text className="text-caption text-text-secondary">{t('profile.followers')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/profile/followers?userId=${userId}&tab=following` as never)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.followingCountA11y', { count: counts.following })}
                className="items-center"
              >
                <Text className="text-body-lg font-medium text-text-primary">{counts.following}</Text>
                <Text className="text-caption text-text-secondary">{t('profile.followingPlural')}</Text>
              </Pressable>
            </View>
          )}

          {/* Follow button */}
          {!isMe && (
            <Button
              label={isFollowing ? t('common.following') : t('common.follow')}
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
          <StatCard value={stats?.reviewsCount ?? reviews?.length ?? 0} label={t('profile.reviews')} />
          <StatCard value={stats?.gamesCount ?? 0} label={t('profile.inLibrary')} />
        </View>

        {/* ─── Gêneros favoritos ─── */}
        {(displayProfile.favorite_genres?.length ?? 0) > 0 && (
          <>
            <SectionHeader title={t('profile.favoriteGenres')} />
            <View className="flex-row flex-wrap px-5 gap-2 mb-5">
              {displayProfile.favorite_genres.map((g) => (
                <Pill key={g} label={genreLabel(g, t)} variant="active" />
              ))}
            </View>
          </>
        )}

        {/* ─── Top 5 jogos ─── */}
        {(favorites?.length ?? 0) > 0 && (
          <>
            <SectionHeader title={t('profile.topGames')} />
            <View className="mb-5 mt-1">
              <TopGamesRow
                favorites={favorites!}
                onGamePress={(rawgId) => router.push(`/game/${rawgId}` as never)}
              />
            </View>
          </>
        )}

        {/* ─── Biblioteca (pública) ─── */}
        {(libraryCounts?.total ?? 0) > 0 && (
          <>
            <SectionHeader
              title={t('library.publicTitle')}
              rightSlot={
                <Pressable
                  onPress={() =>
                    router.push(
                      `/profile/library?userId=${userId}&username=${profile?.username ?? ''}` as never,
                    )
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('library.publicViewAll')}
                >
                  <Text className="text-caption text-brand-primary">
                    {t('library.publicViewAll')}
                  </Text>
                </Pressable>
              }
            />

            {/* "Jogando agora" — preview de até 3 capas */}
            {(playingNow?.length ?? 0) > 0 && (
              <View className="px-5 mb-3">
                <Text className="text-caption text-text-tertiary uppercase mb-2">
                  {t('library.publicPlayingNow')}
                </Text>
                <View className="flex-row gap-2">
                  {playingNow!.slice(0, 3).map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => router.push(`/game/${g.game.rawg_id}` as never)}
                      style={{ flex: 1, maxWidth: '32%' }}
                      accessibilityRole="button"
                      accessibilityLabel={g.game.title}
                    >
                      <View
                        style={{
                          aspectRatio: 3 / 4,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: tokens.color.bg.elevated,
                        }}
                      >
                        {g.game.cover_url ? (
                          <Image
                            source={{ uri: g.game.cover_url }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                          />
                        ) : null}
                      </View>
                      <Text
                        className="text-caption text-text-secondary mt-1"
                        numberOfLines={1}
                      >
                        {g.game.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Contadores por status — clicáveis */}
            <View className="flex-row flex-wrap mx-5 gap-2 mb-5">
              {(['playing', 'played', 'wishlist', 'dropped'] as const).map((s) => {
                const count = libraryCounts?.[s] ?? 0;
                if (count === 0) return null;
                return (
                  <Pressable
                    key={s}
                    onPress={() =>
                      router.push(
                        `/profile/library?userId=${userId}&username=${profile?.username ?? ''}` as never,
                      )
                    }
                    className="flex-row items-center gap-1.5 rounded-pill border border-border-subtle bg-bg-elevated px-3 py-1.5"
                    accessibilityRole="button"
                    accessibilityLabel={`${count} ${GAME_STATUS_LABEL[s]}`}
                  >
                    <Text
                      style={{
                        fontFamily: tokens.fontFamily.medium,
                        fontSize: 13,
                        color: tokens.color.text.primary,
                      }}
                    >
                      {count}
                    </Text>
                    <Text
                      style={{
                        fontFamily: tokens.fontFamily.regular,
                        fontSize: 12,
                        color: tokens.color.text.secondary,
                      }}
                    >
                      {GAME_STATUS_LABEL[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ─── Reviews ─── */}
        <SectionHeader title={t('profile.reviews')} />
        {reviewsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={tokens.color.brand.primary} />
          </View>
        ) : (reviews?.length ?? 0) === 0 ? (
          <View className="items-center py-12 gap-4">
            <Text className="text-display-1 text-brand-primary">G</Text>
            <Text className="text-body-lg text-text-secondary text-center px-8">
              {isMe
                ? t('profile.noReviewsOwn')
                : t('profile.noReviewsPublic')}
            </Text>
            {isMe && (
              <Button
                label={t('profile.writeReview')}
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
                onGamePress={() => router.push(`/review/${review.id}` as never)}
                onEdit={() => {
                  router.push(
                    `/review/new?rawgId=${review.game.rawg_id}&reviewId=${review.id}&initialScore=${review.score}&initialBody=${encodeURIComponent(review.body ?? '')}&initialPlaytime=${review.playtime_hours ?? ''}&initialCompleted=${review.completed}&initialSpoiler=${review.has_spoiler}&initialPublic=true` as never,
                  );
                }}
                onDelete={() => {
                  const doDelete = () =>
                    deleteReview.mutate(
                      { reviewId: review.id },
                      { onError: (e) => Alert.alert(t('common.error'), e instanceof Error ? e.message : t('review.errorDeleting')) },
                    );

                  if (Platform.OS === 'ios') {
                    ActionSheetIOS.showActionSheetWithOptions(
                      { options: [t('common.cancel'), t('review.deleteReview')], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
                      (i) => { if (i === 1) doDelete(); },
                    );
                  } else {
                    Alert.alert(t('review.deleteConfirmTitle'), t('review.deleteConfirmText'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: doDelete },
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
  const { t, i18n } = useTranslation();
  const MAX_BODY = 160;
  const [sheetOpen, setSheetOpen] = useState(false);
  const bodyText = review.body ?? '';
  const bodyTruncated = bodyText.length > MAX_BODY
    ? bodyText.slice(0, MAX_BODY).trimEnd() + '…'
    : bodyText;

  return (
    <Pressable
      onPress={onGamePress}
      accessibilityRole="button"
      accessibilityLabel={t('review.reviewOf', { title: review.game.title })}
      className="rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden"
    >
      {/* Game cover strip */}
      <View className="flex-row items-center gap-3 p-3 border-b border-border-subtle">
        <View className="rounded-lg overflow-hidden" style={{ width: 44, height: 56 }}>
          {review.game.cover_url ? (
            <Image
              source={{ uri: review.game.cover_url }}
              style={{ width: 44, height: 56 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
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
              <Text className="text-caption text-text-tertiary">{t('review.completedShort')}</Text>
            )}
            {review.has_spoiler && (
              <Text className="text-caption text-semantic-warning">{t('review.spoilerShort')}</Text>
            )}
          </View>
        </View>

        {/* ⋯ menu — só para o dono */}
        {isOwner && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setSheetOpen(true);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('review.reviewOptions')}
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
            {new Date(review.created_at).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onLikePress?.(); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? t('review.unlike') : t('review.like')}
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

      {/* Bottom sheet de opções do dono */}
      {isOwner && (
        <ActionSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={review.game.title}
          subtitle={t('review.reviewOptions')}
          actions={[
            {
              label: t('review.editReview'),
              icon: <EditIcon size={20} color={tokens.color.text.primary} />,
              onPress: () => onEdit?.(),
            },
            {
              label: t('review.deleteReview'),
              icon: <TrashIcon size={20} color={tokens.color.semantic.danger} />,
              destructive: true,
              onPress: () => onDelete?.(),
            },
          ]}
        />
      )}
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
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      className="flex-row items-center gap-1"
    >
      <ChevronLeftIcon size={20} color={tokens.color.brand.primary} />
      <Text className="text-body text-brand-primary">{t('common.back')}</Text>
    </Pressable>
  );
}

// Maps a genre slug (as stored in DB) to a localized label.
function genreLabel(slug: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    action: 'action',
    'role-playing-games-rpg': 'rpg',
    adventure: 'adventure',
    shooter: 'shooter',
    sports: 'sports',
    racing: 'racing',
    indie: 'indie',
    strategy: 'strategy',
    puzzle: 'puzzle',
    fighting: 'fighting',
    platformer: 'platformer',
    horror: 'horror',
  };
  const key = map[slug];
  return key ? t(`search.genres.${key}`) : slug;
}
