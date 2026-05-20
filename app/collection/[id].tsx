import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Skeleton } from '@/src/components/ui';
import { GameCard } from '@/src/components/domain';
import { useCollection } from '@/src/hooks/useGames';
import { getCollectionById } from '@/src/config/collections';
import { tokens } from '@/src/theme/tokens';
import type { Game } from '@/src/types/models';

// Skeleton placeholder
const SKELETON_ITEMS: Game[] = Array.from({ length: 8 }, (_, i) => ({
  rawg_id: -(i + 1),
  igdb_id: null,
  title: '',
  slug: null,
  cover_url: null,
  background_url: null,
  description: null,
  genres: [],
  platforms: [],
  developer: null,
  publisher: null,
  release_date: null,
  rawg_rating: null,
  metacritic_score: null,
}));

const renderSkeletonItem: ListRenderItem<Game> = ({ index }) => (
  <View style={{ flex: 1, maxWidth: '50%', padding: 6 }} key={index}>
    <Skeleton width="100%" height={160} className="rounded-xl" />
    <View className="mt-2 gap-1.5 px-1">
      <Skeleton width="80%" height={10} />
      <Skeleton width="55%" height={8} />
    </View>
  </View>
);

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const collection = getCollectionById(id ?? '');
  const { data, isLoading, isError } = useCollection(id ?? '', 40);

  const handleGamePress = useCallback(
    (game: Game) => {
      router.push(`/game/${game.rawg_id}` as never);
    },
    [router],
  );

  const renderGame: ListRenderItem<Game> = useCallback(
    ({ item, index }) => (
      <Animated.View
        style={{ flex: 1, maxWidth: '50%', padding: 6 }}
        entering={FadeInDown.delay(index * 30).duration(280).springify()}
      >
        <GameCard
          title={item.title}
          genre={item.genres?.[0]}
          coverUrl={item.cover_url}
          score={
            item.metacritic_score != null
              ? item.metacritic_score / 10
              : (item.rawg_rating ?? undefined)
          }
          size="sm"
          className="w-full"
          onPress={() => handleGamePress(item)}
        />
      </Animated.View>
    ),
    [handleGamePress],
  );

  if (!collection) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
        <EmptyState title="Coleção não encontrada" subtitle="Essa lista não existe." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header com gradiente da coleção ─── */}
      <View style={{ position: 'relative' }}>
        <LinearGradient
          colors={[collection.color + '40', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
          pointerEvents="none"
        />
        <View className="flex-row items-center gap-3 px-5 pt-4 pb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: tokens.color.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: tokens.color.text.primary, fontSize: 16 }}>‹</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <View className="flex-row items-center gap-2">
              <Ionicons name={collection.icon} size={20} color={collection.color} />
              <Text
                style={{
                  fontFamily: tokens.fontFamily.medium,
                  fontSize: tokens.fontSize.h1,
                  color: tokens.color.text.primary,
                }}
                numberOfLines={1}
              >
                {collection.title}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: tokens.fontSize.caption,
                color: tokens.color.text.secondary,
                marginTop: 2,
              }}
            >
              {collection.subtitle}
              {!isLoading && data && ` · ${data.results.length} jogos`}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Lista de jogos ─── */}
      {isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            title="Erro ao carregar"
            subtitle="Não foi possível buscar os jogos dessa coleção."
          />
        </View>
      ) : (
        <FlatList
          data={isLoading ? SKELETON_ITEMS : (data?.results ?? [])}
          keyExtractor={(item, i) =>
            isLoading ? String(i) : String(item.rawg_id ?? item.slug ?? i)
          }
          renderItem={isLoading ? renderSkeletonItem : renderGame}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title="Nenhum jogo encontrado"
                subtitle="Essa coleção ainda não tem jogos disponíveis."
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
