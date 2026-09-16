import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ActionSheet, Avatar, Button, ReportSheet, Tag, Toast } from '@/src/components/ui';
import { EllipsisIcon } from '@/src/components/ui/icons';
import { useBlockUser, useIsBlocked, useUnblockUser } from '@/src/hooks/useModeration';
import { ScoreBadge } from '@/src/components/domain';
import { useReviewDetail } from '@/src/hooks/useProfile';
import { useIsFollowing, useFollowUser, useUnfollowUser } from '@/src/hooks/useFeed';
import { useBatchLikes, useLikeReview, useUnlikeReview } from '@/src/hooks/useLikes';
import {
  useReviewComments,
  useCreateComment,
  useDeleteComment,
} from '@/src/hooks/useComments';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { relativeTime } from '@/src/utils/relativeTime';
import {
  ChevronLeftIcon,
  HeartIcon,
  HeartOutlineIcon,
  ChatBubbleIcon,
  SendIcon,
  TrashIcon,
} from '@/src/components/ui/icons';
import type { ReviewComment } from '@/src/types/models';

export default function ReviewDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
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

  const { data: comments, isLoading: commentsLoading } = useReviewComments(reviewId ?? null);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [commentText, setCommentText] = useState('');
  const [reviewMenuOpen, setReviewMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<
    | { type: 'review'; id: string; userId: string }
    | { type: 'comment'; id: string; userId: string }
    | null
  >(null);
  const [modToast, setModToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);
  const { data: blockedByMe } = useIsBlocked(isMe ? null : review?.user.id ?? null);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  // Auto-dismiss toast
  useEffect(() => {
    if (!modToast) return;
    const id = setTimeout(() => setModToast(null), 3000);
    return () => clearTimeout(id);
  }, [modToast]);

  const handleReportReview = () => {
    if (!review) return;
    setReviewMenuOpen(false);
    setTimeout(() => {
      setReportTarget({ type: 'review', id: review.id, userId: review.user.id });
    }, 250);
  };

  const handleBlockAuthor = () => {
    if (!review) return;
    setReviewMenuOpen(false);
    const targetId = review.user.id;
    const username = review.user.username;
    Alert.alert(
      t('block.confirmTitle', { username }),
      t('block.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('block.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser.mutateAsync(targetId);
              setModToast({ variant: 'success', title: t('block.blocked', { username }) });
              setTimeout(() => router.back(), 800);
            } catch (e) {
              setModToast({
                variant: 'danger',
                title: e instanceof Error ? e.message : t('common.unknownError'),
              });
            }
          },
        },
      ],
    );
  };

  const handleUnblockAuthor = async () => {
    if (!review) return;
    setReviewMenuOpen(false);
    try {
      await unblockUser.mutateAsync(review.user.id);
      setModToast({
        variant: 'success',
        title: t('block.unblocked', { username: review.user.username }),
      });
    } catch (e) {
      setModToast({
        variant: 'danger',
        title: e instanceof Error ? e.message : t('common.unknownError'),
      });
    }
  };

  const handleReportComment = (commentId: string, commentUserId: string) => {
    setReportTarget({ type: 'comment', id: commentId, userId: commentUserId });
  };

  const handleSendComment = async () => {
    const body = commentText.trim();
    if (!body || !reviewId) return;
    try {
      await createComment.mutateAsync({ reviewId, body });
      setCommentText('');
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('review.couldNotSend'));
    }
  };

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
          <ChatBubbleIcon size={40} color={tokens.color.text.tertiary} />
          <Text className="text-body-lg text-text-secondary">{t('review.notFound')}</Text>
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
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() =>
              liked
                ? unlike.mutate({ reviewId: reviewId! })
                : like.mutate({ reviewId: reviewId! })
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? t('review.unlike') : t('review.like')}
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
          {!isMe && (
            <Pressable
              onPress={() => setReviewMenuOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.open')}
              className="p-1"
            >
              <EllipsisIcon size={20} color={tokens.color.text.secondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Toast de feedback */}
      {modToast && (
        <View style={{ position: 'absolute', top: 56, left: 20, right: 20, zIndex: 99 }}>
          <Toast variant={modToast.variant} title={modToast.title} />
        </View>
      )}

      {/* Menu da review (não-dono) */}
      {!isMe && review && (
        <ActionSheet
          visible={reviewMenuOpen}
          onClose={() => setReviewMenuOpen(false)}
          title={`@${review.user.username}`}
          actions={[
            {
              label: t('report.reportReview'),
              onPress: handleReportReview,
            },
            blockedByMe
              ? {
                  label: t('block.unblockUser'),
                  onPress: handleUnblockAuthor,
                }
              : {
                  label: t('block.blockUser'),
                  destructive: true,
                  onPress: handleBlockAuthor,
                },
          ]}
        />
      )}

      {/* Sheet de denúncia (review ou comentário) */}
      {reportTarget && (
        <ReportSheet
          visible={reportTarget !== null}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          reportedUserId={reportTarget.userId}
          onSuccess={() =>
            setModToast({ variant: 'success', title: t('report.successTitle') })
          }
        />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Game cover hero ─── */}
        <Pressable
          onPress={() => review.game.rawg_id != null && router.push(`/game/${review.game.rawg_id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={t('review.viewDetailsOfGame', { title: review.game.title })}
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
            <Tag label={t('review.completedTag')} variant="success" />
          )}
          {review.has_spoiler && (
            <Tag label={t('review.spoilerTag')} variant="danger" />
          )}
          {review.playtime_hours != null && (
            <Tag label={t('review.hoursPlayedTag', { hours: review.playtime_hours })} variant="neutral" />
          )}
        </View>

        {/* ─── Author ─── */}
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-border-subtle">
          <Pressable
            onPress={() => router.push(`/profile/${review.user.id}` as never)}
            className="flex-row items-center gap-3"
            accessibilityRole="button"
            accessibilityLabel={t('review.viewProfileOf', { name: displayName })}
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
              label={isFollowing ? t('common.following') : t('common.follow')}
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

        {/* ─── Review body (opcional) + data ─── */}
        <View className="px-5 pt-5">
          {review.body && (
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: 16,
                lineHeight: 26,
                color: tokens.color.text.body,
                marginBottom: 20,
              }}
            >
              {review.body}
            </Text>
          )}

          <Text className="text-caption text-text-tertiary">
            {new Date(review.created_at).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* ─── Comentários ─── */}
        <View className="px-5 mt-8 pt-5 border-t border-border-subtle">
          <View className="flex-row items-center gap-2 mb-3">
            <ChatBubbleIcon size={18} color={tokens.color.text.primary} />
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 16,
                color: tokens.color.text.primary,
              }}
            >
              {t('review.comments')}
              {(comments?.length ?? 0) > 0 && (
                <Text style={{ color: tokens.color.text.secondary }}> · {comments!.length}</Text>
              )}
            </Text>
          </View>

          {/* Input de novo comentário */}
          {currentUser && (
            <View
              className="flex-row items-end gap-2 mb-4 rounded-xl bg-bg-elevated border border-border-subtle px-3 py-2"
            >
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={t('review.commentPlaceholder')}
                placeholderTextColor={tokens.color.text.tertiary}
                multiline
                maxLength={500}
                style={{
                  flex: 1,
                  color: tokens.color.text.primary,
                  fontFamily: tokens.fontFamily.regular,
                  fontSize: 14,
                  maxHeight: 100,
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              />
              <Pressable
                onPress={handleSendComment}
                disabled={!commentText.trim() || createComment.isPending}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('review.sendComment')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: commentText.trim()
                    ? tokens.color.brand.primary
                    : tokens.color.bg.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: createComment.isPending ? 0.5 : 1,
                }}
              >
                <SendIcon
                  size={14}
                  color={commentText.trim() ? '#fff' : tokens.color.text.tertiary}
                />
              </Pressable>
            </View>
          )}

          {/* Lista */}
          {commentsLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={tokens.color.brand.primary} />
            </View>
          ) : (comments?.length ?? 0) === 0 ? (
            <Text className="text-caption text-text-tertiary text-center py-4">
              {t('review.firstComment')}
            </Text>
          ) : (
            <View className="gap-3">
              {comments!.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  isOwn={c.user.id === currentUser?.id}
                  onUserPress={() => router.push(`/profile/${c.user.id}` as never)}
                  onDelete={() =>
                    Alert.alert(
                      t('review.deleteCommentTitle'),
                      t('review.deleteCommentText'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () =>
                            deleteComment.mutate({ commentId: c.id, reviewId: reviewId! }),
                        },
                      ],
                    )
                  }
                  onReport={() => handleReportComment(c.id, c.user.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ─── Ver jogo CTA ─── */}
        {review.game.rawg_id != null && (
          <View className="px-5 mt-6">
            <Button
              label={t('review.viewGame', { title: review.game.title })}
              variant="secondary"
              onPress={() => router.push(`/game/${review.game.rawg_id}` as never)}
            />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── CommentRow ───────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  isOwn,
  onUserPress,
  onDelete,
  onReport,
}: {
  comment: ReviewComment;
  isOwn: boolean;
  onUserPress: () => void;
  onDelete: () => void;
  onReport?: () => void;
}) {
  const { t } = useTranslation();
  const displayName = comment.user.display_name ?? comment.user.username;
  return (
    <View className="flex-row gap-3">
      <Pressable onPress={onUserPress} accessibilityRole="button">
        <Avatar name={displayName} uri={comment.user.avatar_url} size="sm" />
      </Pressable>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={onUserPress} accessibilityRole="button" className="flex-row items-center gap-2">
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 13,
                color: tokens.color.text.primary,
              }}
            >
              {displayName}
            </Text>
            <Text className="text-caption text-text-tertiary">
              {relativeTime(comment.created_at)}
            </Text>
          </Pressable>
          {isOwn ? (
            <Pressable
              onPress={onDelete}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('review.deleteComment')}
              style={{ padding: 4 }}
            >
              <TrashIcon size={14} color={tokens.color.text.tertiary} />
            </Pressable>
          ) : onReport ? (
            <Pressable
              onPress={onReport}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('report.reportComment')}
              style={{ padding: 4 }}
            >
              <Text style={{ fontSize: 16, color: tokens.color.text.tertiary }}>⋯</Text>
            </Pressable>
          ) : null}
        </View>
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 14,
            lineHeight: 20,
            color: tokens.color.text.body,
            marginTop: 2,
          }}
        >
          {comment.body}
        </Text>
      </View>
    </View>
  );
}

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
