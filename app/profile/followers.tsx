import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Avatar, Button, EmptyState } from '@/src/components/ui';
import { useFollowers, useFollowingList, useFollowUser, useUnfollowUser, useIsFollowing } from '@/src/hooks/useFeed';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { ChevronLeftIcon } from '@/src/components/ui/icons';

type Tab = 'followers' | 'following';

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId, tab: initialTab } = useLocalSearchParams<{ userId: string; tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === 'following' ? 'following' : 'followers',
  );

  const followers = useFollowers(userId ?? null);
  const following = useFollowingList(userId ?? null);

  const list = activeTab === 'followers' ? followers : following;
  const data = (list.data ?? []) as Profile[];

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-2 gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          className="flex-row items-center gap-1"
        >
          <ChevronLeftIcon size={20} color={tokens.color.brand.primary} />
          <Text className="text-body text-brand-primary">{t('common.back')}</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border-subtle mx-5 mb-2">
        <TabButton
          label={t('profile.tabFollowers')}
          active={activeTab === 'followers'}
          onPress={() => setActiveTab('followers')}
        />
        <TabButton
          label={t('profile.tabFollowing')}
          active={activeTab === 'following'}
          onPress={() => setActiveTab('following')}
        />
      </View>

      {list.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.color.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-px bg-border-subtle" />}
          renderItem={({ item }) => <UserRow profile={item} />}
          ListEmptyComponent={
            <EmptyState
              title={activeTab === 'followers' ? t('profile.noFollowersTitle') : t('profile.noFollowingTitle')}
              subtitle={
                activeTab === 'followers'
                  ? t('profile.noFollowersSubtitle')
                  : t('profile.noFollowingSubtitle')
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── TabButton ────────────────────────────────────────────────────────────────

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="flex-1 items-center pb-3 pt-1"
      style={{
        borderBottomWidth: 2,
        borderBottomColor: active ? tokens.color.brand.primary : 'transparent',
      }}
    >
      <Text
        style={{
          fontFamily: active ? tokens.fontFamily.medium : tokens.fontFamily.regular,
          fontSize: 14,
          color: active ? tokens.color.brand.primary : tokens.color.text.secondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const isMe = profile.id === currentUser?.id;
  const { data: following } = useIsFollowing(isMe ? null : profile.id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const displayName = profile.display_name ?? profile.username;

  return (
    <Pressable
      onPress={() => router.push(`/profile/${profile.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={t('profile.viewProfileOf', { name: displayName })}
      className="flex-row items-center gap-3 py-3"
    >
      <Avatar name={displayName} uri={profile.avatar_url} size="md" />

      <View className="flex-1">
        <Text className="text-body-lg font-medium text-text-primary" numberOfLines={1}>
          {displayName}
        </Text>
        {profile.display_name && (
          <Text className="text-caption text-text-secondary">@{profile.username}</Text>
        )}
      </View>

      {!isMe && (
        <Button
          label={following ? t('common.following') : t('common.follow')}
          size="sm"
          variant={following ? 'secondary' : 'primary'}
          loading={follow.isPending || unfollow.isPending}
          onPress={(e) => {
            e?.stopPropagation?.();
            following ? unfollow.mutate(profile.id) : follow.mutate(profile.id);
          }}
        />
      )}
    </Pressable>
  );
}
