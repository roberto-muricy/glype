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
import { Button, Toast } from '@/src/components/ui';
import { ScoreSlider } from '@/src/components/domain';
import { useCreateReview, useUpdateReview } from '@/src/hooks/useReviews';
import { useGameDetail } from '@/src/hooks/useGames';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui/icons';
import type { ReviewDraft } from '@/src/types/models';

const BODY_MIN = 50;

export default function NewReviewScreen() {
  const router = useRouter();
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
  const isEditing = !!reviewId;

  const { data: game } = useGameDetail(rawgId);

  // ─── form state ──────────────────────────────────────────────────
  const [score, setScore] = useState(initialScore ? parseFloat(initialScore) : 8.0);
  const [body, setBody] = useState(initialBody ?? '');
  const [playtime, setPlaytime] = useState(initialPlaytime ?? '');
  const [completed, setCompleted] = useState(initialCompleted === 'true');
  const [hasSpoiler, setHasSpoiler] = useState(initialSpoiler === 'true');
  const [isPublic, setIsPublic] = useState(initialPublic !== 'false');
  const [toast, setToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);

  const bodyRef = useRef<TextInput>(null);
  const bodyLen = body.trim().length;
  const bodyValid = bodyLen >= BODY_MIN;

  const createReview = useCreateReview();
  const updateReview = useUpdateReview(''); // gameId resolvido no submit

  const isSubmitting = createReview.isPending || updateReview.isPending;

  // Limpa toast após 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async () => {
    if (!rawgId) return;
    if (!bodyValid) {
      setToast({ variant: 'danger', title: `Mínimo de ${BODY_MIN} caracteres no texto` });
      bodyRef.current?.focus();
      return;
    }

    const draft: ReviewDraft = {
      score,
      body: body.trim(),
      playtime_hours: playtime ? parseInt(playtime, 10) : null,
      completed,
      has_spoiler: hasSpoiler,
      is_public: isPublic,
    };

    try {
      if (isEditing && reviewId) {
        await updateReview.mutateAsync({ reviewId, draft });
      } else {
        await createReview.mutateAsync({ rawgId, draft });
      }
      setToast({ variant: 'success', title: isEditing ? 'Review atualizado!' : 'Review publicado!' });
      setTimeout(() => router.back(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setToast({ variant: 'danger', title: msg });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir review',
      'Tem certeza? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
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
              {isEditing ? 'Editar review' : 'Nova review'}
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
            accessibilityLabel="Fechar"
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
            <Text className="text-section uppercase text-brand-muted mb-3">Sua nota</Text>
            <ScoreSlider value={score} onValueChange={setScore} />
          </View>

          {/* ─── Texto ─── */}
          <View className="px-5 mt-6">
            <View className="flex-row items-baseline justify-between mb-2">
              <Text className="text-section uppercase text-brand-muted">Texto</Text>
              <Text
                className={`text-caption ${bodyValid ? 'text-semantic-success' : 'text-text-tertiary'}`}
              >
                {bodyLen}/{BODY_MIN} mín.
              </Text>
            </View>
            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={setBody}
              placeholder="Escreva sua opinião sobre o jogo…"
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
                borderColor: bodyLen > 0 && !bodyValid
                  ? tokens.color.semantic.danger
                  : tokens.color.border.DEFAULT,
              }}
            />
          </View>

          {/* ─── Tempo de jogo ─── */}
          <View className="px-5 mt-5">
            <Text className="text-section uppercase text-brand-muted mb-2">
              Horas jogadas (opcional)
            </Text>
            <TextInput
              value={playtime}
              onChangeText={(v) => setPlaytime(v.replace(/\D/g, ''))}
              placeholder="ex: 60"
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
              label="Jogo completado"
              value={completed}
              onValueChange={setCompleted}
            />
            <ToggleRow
              label="Contém spoilers"
              value={hasSpoiler}
              onValueChange={setHasSpoiler}
            />
            <ToggleRow
              label="Review pública"
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
              label={isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Publicar review'}
              size="lg"
              disabled={isSubmitting || !bodyValid}
              loading={isSubmitting}
              onPress={handleSubmit}
            />
            {isEditing && (
              <Button
                label="Excluir review"
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
