import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
} from '@/src/services/notifications.service';

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
};

/** Lista de notificações para a tela dedicada. */
export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => getNotifications(limit),
    staleTime: 1000 * 60, // 1min
  });
}

/** Contador de não lidas — usado no badge do sino. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: getUnreadCount,
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 60, // revalida a cada 1min
  });
}

/** Marca todas como lidas (chamada ao abrir a tela de notificações). */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}
