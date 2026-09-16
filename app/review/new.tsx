import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch as RNSwitch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Toast } from '@/src/components/ui';
import { ScoreSlider } from '@/src/components/domain';
import { useCreateReview, useUpdateReview, useMyReview } from '@/src/hooks/useReviews';
import { useGameDetail, useGameByRawgId } from '@/src/hooks/useGames';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui/icons';
import type { ReviewDraft } from '@/src/types/models';

// Body é opcional desde a migration 0008; mantemos só um limite máximo defensivo no client.
const BODY_MAX = 5000;

export default function NewReviewScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    rawgId: rawgIdParam,
    reviewId,      // se presente → modo edição
    initialScore,
    initialBody,
    initialPlaytime,
    initialCompleted,
    initialSpoiler,
    initialPublic,
  } = useLocalSearchParams<{
    rawgId: string;
    reviewId?: string;
    initialScore?: string;
    initialBody?: string;
    initialPlaytime?: string;
    initialCompleted?: string;
    initialSpoiler?: string;
    initialPublic?: string;
  }>();

  const rawgId = rawgIdParam ? parseInt(rawgIdParam, 10) : null;

  const { data: game } = useGameDetail(rawgId);
  // Procura o jogo no cache local pra ter o UUID (se já existir) e descobrir
  // se o usuário já tem uma review desse jogo.
  const { data: localGame } = useGameByRawgId(rawgId);
  const { data: existingReview } = useMyReview(localGame?.id ?? null);

  const effectiveReviewId = reviewId ?? existingReview?.id;
  const isEditing = !!effectiveReviewId;

  // ─── form state ──────────────────────────────────────────────────
  const [score, setScore] = useState(initialScore ? parseFloat(initialScore) : 8.0);
  const [body, setBody] = useState(initialBody ?? '');
  const [playtime, setPlaytime] = useState(initialPlaytime ?? '');
  const [completed, setCompleted] = useState(initialCompleted === 'true');
  const [hasSpoiler, setHasSpoiler] = useState(initialSpoiler === 'true');
  const [isPublic, setIsPublic] = useState(initialPublic !== 'false');
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);

  // Se o usuário entrou em "Nova review" mas já existe uma review desse jogo,
  // pré-preenche o formulário com os dados existentes (modo edição automático).
  useEffect(() => {
    if (hydrated) return;
    if (reviewId) {
      // Já veio em modo edição via URL — nada a fazer
      return;
    }
    if (existingReview && !initialBody) {
      setScore(existingReview.score);
      setBody(existingReview.body ?? '');
      setPlaytime(existingReview.playtime_hours?.toString() ?? '');
      setCompleted(existingReview.completed);
      setHasSpoiler(existingReview.has_spoiler);
      setIsPublic(existingReview.is_public);
      setHydrated(true);
    }
  }, [existingReview, reviewId, initialBody, hydrated]);

  const bodyRef = useRef<TextInput>(null);
  const bodyLen = body.trim().length;
  // Body é opcional agora. Sempre válido.
  // Mantemos a variável só pra UI mostrar contagem de caracteres.

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const isSubmitting = createReview.isPending || updateReview.isPending;

  // Limpa toast após 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async () => {
    if (!rawgId) return;

    const draft: ReviewDraft = {
      score,
      // body opcional — vazio vira null (service também normaliza)
      body: body.trim() || null,
      playtime_hours: playtime ? parseInt(playtime, 10) : null,
      completed,
      has_spoiler: hasSpoiler,
      is_public: isPublic,
    };

    try {
      if (effectiveReviewId) {
        await updateReview.mutateAsync({
          reviewId: effectiveReviewId,
          draft,
          gameId: localGame?.id,
        });
      } else {
        await createReview.mutateAsync({ rawgId, draft });
      }
      setToast({ variant: 'success', title: isEditing ? t('review.reviewUpdated') : t('review.reviewPublished') });
      setTimeout(() => router.back(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.unknownError');
      setToast({ variant: 'danger', title: msg });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('review.deleteConfirmTitle'),
      t('review.deleteConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* ─── Header ─── */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-border-subtle">
          <View className="flex-1 mr-3">
            <Text className="text-caption text-text-tertiary uppercase">
              {isEditing ? t('review.editReview') : t('review.newReview')}
            </Text>
            {game && (
              <Text className="text-body-lg font-medium text-text-primary mt-0.5" numberOfLines={1}>
                {game.title}
              </Text>
            )}
          </View>
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
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Score ─── */}
          <View className="px-5 pt-6">
            <Text className="text-section uppercase text-brand-muted mb-3">{t('review.scoreLabel')}</Text>
            <ScoreSlider value={score} onValueChange={setScore} />
          </View>

          {/* ─── Texto ─── */}
          <View className="px-5 mt-6">
            <View className="flex-row items-baseline justify-between mb-2">
              <Text className="text-section uppercase text-brand-muted">
                {t('review.textLabel')} <Text className="text-text-tertiary">· {t('common.optional')}</Text>
              </Text>
              {bodyLen > 0 && (
                <Text className="text-caption text-text-tertiary">
                  {t('review.textCharCount', { count: bodyLen })}
                </Text>
              )}
            </View>
            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={setBody}
              placeholder={t('review.textPlaceholderOptional')}
              placeholderTextColor={tokens.color.text.tertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{
                backgroundColor: tokens.color.bg.elevated,
                color: tokens.color.text.primary,
                borderRadius: tokens.radius.lg,
                padding: 14,
                fontSize: tokens.fontSize['body-lg'],
                minHeight: 140,
                borderWidth: 1,
                borderColor: tokens.color.border.DEFAULT,
              }}
            />
          </View>

          {/* ─── Tempo de jogo ─── */}
          <View className="px-5 mt-5">
            <Text className="text-section uppercase text-brand-muted mb-2">
              {t('review.playtimeOptional')}
            </Text>
            <TextInput
              value={playtime}
              onChangeText={(v) => setPlaytime(v.replace(/\D/g, ''))}
              placeholder={t('review.playtimePlaceholder')}
              placeholderTextColor={tokens.color.text.tertiary}
              keyboardType="number-pad"
              style={{
                backgroundColor: tokens.color.bg.elevated,
                color: tokens.color.text.primary,
                borderRadius: tokens.radius.md,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: tokens.fontSize.body,
                borderWidth: 1,
                borderColor: tokens.color.border.DEFAULT,
                width: 120,
              }}
            />
          </View>

          {/* ─── Toggles ─── */}
          <View className="px-5 mt-5 gap-0">
            <ToggleRow
              label={t('review.completedToggle')}
              value={completed}
              onValueChange={setCompleted}
            />
            <ToggleRow
              label={t('review.spoilerToggle')}
              value={hasSpoiler}
              onValueChange={setHasSpoiler}
            />
            <ToggleRow
              label={t('review.publicToggle')}
              value={isPublic}
              onValueChange={setIsPublic}
            />
          </View>

          {/* ─── Toast ─── */}
          {toast && (
            <View className="px-5 mt-4">
              <Toast variant={toast.variant} title={toast.title} />
            </View>
          )}

          {/* ─── Ações ─── */}
          <View className="px-5 mt-6 gap-3">
            <Button
              label={isSubmitting ? t('common.saving') : isEditing ? t('review.saveChanges') : t('review.publishReview')}
              size="lg"
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={handleSubmit}
            />
            {isEditing && (
              <Button
                label={t('review.deleteReview')}
                size="lg"
                variant="ghost"
                onPress={handleDelete}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-border-subtle">
      <Text className="text-body-lg text-text-body">{label}</Text>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: tokens.color.bg.surface,
          true: tokens.color.brand.primary,
        }}
        thumbColor={tokens.color.text.primary}
        accessibilityLabel={label}
      />
    </View>
  );
}
