import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Avatar, EmptyState } from '@/src/components/ui';
import { ChevronLeftIcon, HeartIcon, PersonAddIcon, BellIcon, ChatBubbleFilledIcon } from '@/src/components/ui/icons';
import { useNotifications, useMarkAllAsRead } from '@/src/hooks/useNotifications';
import { relativeTime } from '@/src/utils/relativeTime';
import { tokens } from '@/src/theme/tokens';
import type { NotificationItem } from '@/src/types/models';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllAsRead();

  // Marca tudo como lido ao abrir a tela (uma vez).
  useEffect(() => {
    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-2 gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="flex-row items-center gap-1"
        >
          <ChevronLeftIcon size={20} color={tokens.color.brand.primary} />
          <Text className="text-body text-brand-primary">Voltar</Text>
        </Pressable>
      </View>

      <View className="px-5 pb-2">
        <Text className="text-h1 text-text-primary">Notificações</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.color.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-px bg-border-subtle" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(280).springify()}>
              <NotificationRow notification={item} />
            </Animated.View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<BellIcon size={28} color={tokens.color.text.tertiary} />}
              title="Nada por aqui ainda"
              subtitle="Quando alguém curtir suas reviews ou te seguir, aparece aqui."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const router = useRouter();
  const { type, actor, review, created_at, is_read } = notification;
  const displayName = actor.display_name ?? actor.username;

  const handlePress = () => {
    if (type === 'follow') {
      router.push(`/profile/${actor.id}` as never);
    } else if ((type === 'like' || type === 'comment') && review) {
      router.push(`/review/${review.id}` as never);
    }
  };

  // Cor e ícone do badge variam pelo tipo
  const badgeColor =
    type === 'like'
      ? tokens.color.semantic.danger
      : type === 'comment'
        ? tokens.color.brand.primary
        : tokens.color.brand.primary;
  const BadgeIcon =
    type === 'like' ? HeartIcon : type === 'comment' ? ChatBubbleFilledIcon : PersonAddIcon;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 py-3"
      style={{ opacity: is_read ? 0.7 : 1 }}
    >
      {/* Avatar do ator com badge do tipo de ação */}
      <View>
        <Avatar name={displayName} uri={actor.avatar_url} size="md" />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: badgeColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: tokens.color.bg.primary,
          }}
        >
          <BadgeIcon size={9} color="#fff" />
        </View>
      </View>

      {/* Texto */}
      <View className="flex-1">
        <Text className="text-body text-text-primary" numberOfLines={2}>
          <Text style={{ fontFamily: tokens.fontFamily.medium }}>{displayName}</Text>
          {type === 'follow'
            ? ' começou a te seguir'
            : type === 'comment'
              ? ` comentou na sua review de ${review?.game_title ?? 'um jogo'}`
              : ` curtiu sua review de ${review?.game_title ?? 'um jogo'}`}
        </Text>
        <Text className="text-caption text-text-secondary mt-0.5">
          {relativeTime(created_at)}
        </Text>
      </View>

      {/* Indicador de não lida */}
      {!is_read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: tokens.color.brand.primary,
          }}
        />
      )}
    </Pressable>
  );
}
