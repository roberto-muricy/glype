// Hooks de moderação: denúncias e bloqueios.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockUser,
  createReport,
  getBlockedUserIds,
  getBlockedUsers,
  isBlocked,
  unblockUser,
  type CreateReportInput,
} from '@/src/services/moderation.service';
import { hapticHeavy, hapticSuccess } from '@/src/utils/haptics';
import { track } from '@/src/lib/analytics';

export const moderationKeys = {
  blockedIds: ['moderation', 'blockedIds'] as const,
  blocked: ['moderation', 'blocked'] as const,
  isBlocked: (userId: string) => ['moderation', 'isBlocked', userId] as const,
};

// ─── Denúncias ────────────────────────────────────────────────────────────────

export function useCreateReport() {
  return useMutation({
    mutationFn: (input: CreateReportInput) => createReport(input),
    onMutate: () => hapticHeavy(),
    onSuccess: (_, input) => {
      hapticSuccess();
      track('content_reported', {
        target_type: input.targetType,
        reason: input.reason,
      });
    },
  });
}

// ─── Bloqueios ────────────────────────────────────────────────────────────────

/** IDs de usuários bloqueados — usado pra filtrar listas/feeds. */
export function useBlockedUserIds() {
  return useQuery({
    queryKey: moderationKeys.blockedIds,
    queryFn: getBlockedUserIds,
    staleTime: 1000 * 60 * 5,
  });
}

/** Lista de usuários bloqueados com profile data (pra UI de "gerenciar bloqueados"). */
export function useBlockedUsers() {
  return useQuery({
    queryKey: moderationKeys.blocked,
    queryFn: getBlockedUsers,
    staleTime: 1000 * 60 * 5,
  });
}

/** Verifica se um usuário específico está bloqueado. */
export function useIsBlocked(userId: string | null) {
  return useQuery({
    queryKey: moderationKeys.isBlocked(userId ?? ''),
    queryFn: () => isBlocked(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onMutate: () => hapticHeavy(),
    onSuccess: (_, userId) => {
      track('user_blocked', { target_user_id: userId });
      // Invalida tudo que pode ter conteúdo do bloqueado
      qc.invalidateQueries({ queryKey: moderationKeys.blockedIds });
      qc.invalidateQueries({ queryKey: moderationKeys.blocked });
      qc.invalidateQueries({ queryKey: moderationKeys.isBlocked(userId) });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: (_, userId) => {
      track('user_unblocked', { target_user_id: userId });
      qc.invalidateQueries({ queryKey: moderationKeys.blockedIds });
      qc.invalidateQueries({ queryKey: moderationKeys.blocked });
      qc.invalidateQueries({ queryKey: moderationKeys.isBlocked(userId) });
    },
  });
}
