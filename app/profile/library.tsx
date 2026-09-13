// Biblioteca pública de outro usuário.
// Acessada via /profile/library?userId=xxx&username=yyy
// (param `username` é opcional, só pra título — o id é o que importa).

import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Skeleton } from '@/src/components/ui';
import { GameCard } from '@/src/components/domain';
import { useUserLibrary, useUserLibraryCounts } from '@/src/hooks/useLibrary';
import { useGameStatusLabel } from '@/src/i18n/useGameStatusLabel';
import { type GameStatus, type UserGame } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';
import { LibraryIcon } from '@/src/components/ui/icons';

type FilterValue = 'all' | GameStatus;
const STATUS_LIST: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

export default function PublicLibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId, username } = useLocalSearchParams<{
    userId: string;
    username?: string;
  }>();
  const GAME_STATUS_LABEL = useGameStatusLabel();
  const [filter, setFilter] = useState<FilterValue>('all');

  const { data: counts } = useUserLibraryCounts(userId ?? null);
  const { data: games, isLoading } = useUserLibrary(
    userId ?? null,
    filter === 'all' ? undefined : filter,
  );

  const totalCount = useMemo(() => counts?.total ?? 0, [counts]);

  const renderItem: ListRenderItem<UserGame> = ({ item }) => (
    <View style={{ flex: 1, maxWidth: '50%', padding: 6 }}>
      <GameCard
        title={item.game.title}
        genre={item.game.genres?.[0]}
        coverUrl={item.game.cover_url}
        score={
          item.game.metacritic_score != null
            ? item.game.metacritic_score / 10
            : (item.game.rawg_rating ?? undefined)
        }
        size="sm"
        className="w-full"
        onPress={() => router.push(`/game/${item.game.rawg_id}` as never)}
      />
      <View className="mt-1 px-1">
        <Text className="text-caption text-brand-muted">
          {GAME_STATUS_LABEL[item.status]}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
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
        <View style={{ flex: 1 }}>
          <Text className="text-h1 text-text-primary" numberOfLines={1}>
            {username
              ? t('library.publicLibraryOf', { username })
              : t('library.publicTitle')}
          </Text>
        </View>
      </View>

      {/* ─── Filter tabs ─── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 8 }}>
        {(['all', ...STATUS_LIST] as FilterValue[]).map((v) => {
          const active = filter === v;
          const label = v === 'all' ? t('library.all') : GAME_STATUS_LABEL[v];
          const count = v === 'all' ? totalCount : counts?.[v] ?? 0;
          return (
            <Pressable
              key={v}
              onPress={() => setFilter(v)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: active ? tokens.color.brand.primary : 'transparent',
                borderColor: active ? tokens.color.brand.primary : tokens.color.border.DEFAULT,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: active ? tokens.fontFamily.medium : tokens.fontFamily.regular,
                  fontSize: 12,
                  color: active ? '#ffffff' : tokens.color.text.secondary,
                }}
              >
                {label}
              </Text>
              {count > 0 && (
                <View
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : tokens.color.bg.surface,
                    borderRadius: 8,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: tokens.fontFamily.monoMedium,
                      fontSize: 10,
                      color: active ? '#ffffff' : tokens.color.text.tertiary,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ─── List ─── */}
      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 6, paddingTop: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: '50%', padding: 6 }}>
              <Skeleton width="100%" height={160} className="rounded-xl" />
              <View className="mt-2 gap-1.5 px-1">
                <Skeleton width="80%" height={10} />
                <Skeleton width="50%" height={8} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={games ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon={<LibraryIcon size={28} color={tokens.color.brand.primary} />}
              title={
                filter === 'all'
                  ? t('library.publicEmpty')
                  : t('library.publicEmptyForStatus')
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
