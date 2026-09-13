// Tela de gerenciamento de usuários bloqueados.
// Acessada via Perfil → Conta → Usuários bloqueados.

import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, EmptyState } from '@/src/components/ui';
import { useBlockedUsers, useUnblockUser } from '@/src/hooks/useModeration';
import { tokens } from '@/src/theme/tokens';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: blocked, isLoading } = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: tokens.color.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: tokens.color.text.primary, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text className="text-h1 text-text-primary">{t('block.blockedListTitle')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.color.brand.primary} />
        </View>
      ) : (blocked?.length ?? 0) === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            title={t('block.blockedEmpty')}
            subtitle={t('block.blockedEmptySubtitle')}
          />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 rounded-xl bg-bg-elevated border border-border-subtle px-3 py-3">
              <Avatar
                name={item.display_name ?? item.username}
                uri={item.avatar_url}
                size="sm"
              />
              <View className="flex-1">
                <Text className="text-body text-text-primary font-medium" numberOfLines={1}>
                  {item.display_name ?? item.username}
                </Text>
                <Text className="text-caption text-text-tertiary" numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
              <Button
                label={t('block.unblockUser')}
                size="sm"
                variant="secondary"
                onPress={() => unblock.mutate(item.id)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
