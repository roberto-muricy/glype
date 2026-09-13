// Modal de denúncia — escolher motivo + detalhes opcionais.
// Apresentado como bottom sheet sobre qualquer tela.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Toast } from './Toast';
import { useCreateReport } from '@/src/hooks/useModeration';
import { tokens } from '@/src/theme/tokens';
import type {
  ReportReason,
  ReportTargetType,
} from '@/src/services/moderation.service';

const REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'hate_speech',
  'sexual_content',
  'violence',
  'self_harm',
  'misinformation',
  'impersonation',
  'other',
];

export interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** ID do dono do conteúdo (necessário pra denunciar review/comment). */
  reportedUserId: string;
  /** Callback após denúncia bem-sucedida (ex: pra fechar e mostrar feedback no parent). */
  onSuccess?: () => void;
}

export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
  reportedUserId,
  onSuccess,
}: ReportSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createReport = useCreateReport();

  const handleClose = () => {
    setReason(null);
    setDetails('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setErrorMsg(null);
    try {
      await createReport.mutateAsync({
        targetType,
        targetId,
        reportedUserId,
        reason,
        details: details.trim() || undefined,
      });
      handleClose();
      onSuccess?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('common.unknownError'));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-border-subtle">
            <Text className="text-h2 text-text-primary">{t('report.title')}</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              className="rounded-full bg-bg-elevated p-2"
            >
              <Ionicons name="close" size={18} color={tokens.color.text.primary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-body text-text-secondary mb-5">
              {t('report.subtitle')}
            </Text>

            {/* Lista de motivos */}
            <View className="gap-2 mb-5">
              {REASONS.map((r) => {
                const selected = reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className="flex-row items-center gap-3 rounded-xl border px-4 py-3"
                    style={{
                      borderColor: selected
                        ? tokens.color.brand.primary
                        : tokens.color.border.DEFAULT,
                      backgroundColor: selected
                        ? tokens.color.bg.surface
                        : tokens.color.bg.elevated,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected
                          ? tokens.color.brand.primary
                          : tokens.color.text.tertiary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: tokens.color.brand.primary,
                          }}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-body text-text-primary font-medium">
                        {t(`report.reason.${r}.label`)}
                      </Text>
                      <Text className="text-caption text-text-tertiary mt-0.5">
                        {t(`report.reason.${r}.description`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Detalhes opcionais */}
            <Text className="text-section uppercase text-brand-muted mb-2">
              {t('report.detailsLabel')} <Text className="text-text-tertiary">· {t('common.optional')}</Text>
            </Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={t('report.detailsPlaceholder')}
              placeholderTextColor={tokens.color.text.tertiary}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={{
                backgroundColor: tokens.color.bg.elevated,
                color: tokens.color.text.primary,
                borderRadius: tokens.radius.lg,
                padding: 14,
                fontSize: tokens.fontSize.body,
                minHeight: 100,
                borderWidth: 1,
                borderColor: tokens.color.border.DEFAULT,
              }}
            />
            <Text className="text-caption text-text-tertiary mt-1 text-right">
              {details.length}/500
            </Text>

            {errorMsg && (
              <View className="mt-3">
                <Toast variant="danger" title={errorMsg} />
              </View>
            )}

            {/* Submit */}
            <View className="mt-5 gap-2">
              <Button
                label={
                  createReport.isPending
                    ? t('report.submitting')
                    : t('report.submit')
                }
                onPress={handleSubmit}
                disabled={!reason || createReport.isPending}
                loading={createReport.isPending}
              />
              <Text className="text-caption text-text-tertiary text-center px-4">
                {t('report.disclaimer')}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
