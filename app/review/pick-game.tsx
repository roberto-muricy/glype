import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSearchGames, useTrendingGames } from '@/src/hooks/useGames';
import { useDebounce } from '@/src/hooks/useDebounce';
import { CloseIcon, SearchTabIcon } from '@/src/components/ui/icons';
import { tokens } from '@/src/theme/tokens';
import type { Game } from '@/src/types/models';

export default function PickGameScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);

  const isSearching = debouncedQuery.trim().length >= 2;

  const { data: searchResults, isFetching: searchFetching } = useSearchGames(debouncedQuery);
  const { data: trending, isLoading: trendingLoading } = useTrendingGames(12);

  const games: Game[] = isSearching
    ? (searchResults?.results ?? [])
    : (trending?.results ?? []);

  const loading = isSearching ? searchFetching : trendingLoading;

  const handleSelect = (game: Game) => {
    router.replace(`/review/new?rawgId=${game.rawg_id}` as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-3 border-b border-border-subtle">
        <View
          className="flex-1 flex-row items-center gap-2 bg-bg-elevated rounded-xl px-3"
          style={{ height: 44 }}
        >
          <SearchTabIcon size={18} color={tokens.color.text.tertiary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar jogo…"
            placeholderTextColor={tokens.color.text.tertiary}
            returnKeyType="search"
            style={{
              flex: 1,
              color: tokens.color.text.primary,
              fontSize: tokens.fontSize['body-lg'],
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <CloseIcon size={16} color={tokens.color.text.tertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text className="text-body-lg text-brand-primary">Cancelar</Text>
        </Pressable>
      </View>

      {/* ─── Section label ─── */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-section uppercase text-brand-muted">
          {isSearching ? 'Resultados' : 'Em Alta'}
        </Text>
      </View>

      {/* ─── List ─── */}
      {loading && games.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.color.brand.primary} />
        </View>
      ) : games.length === 0 && isSearching ? (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <SearchTabIcon size={40} color={tokens.color.text.tertiary} />
          <Text className="text-body-lg text-text-secondary text-center">
            Nenhum jogo encontrado para "{debouncedQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => String(item.rawg_id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border-subtle" />
          )}
          renderItem={({ item }) => (
            <GameRow game={item} onPress={() => handleSelect(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── GameRow ─────────────────────────────────────────────────────────────────

function GameRow({ game, onPress }: { game: Game; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Selecionar ${game.title}`}
      className="flex-row items-center gap-3 py-3"
    >
      {/* Cover thumbnail */}
      <View
        className="rounded-lg overflow-hidden"
        style={{ width: 52, height: 68 }}
      >
        {game.cover_url ? (
          <Image
            source={{ uri: game.cover_url }}
            style={{ width: 52, height: 68 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
            style={{ width: 52, height: 68, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-caption text-text-tertiary text-center px-1" numberOfLines={2}>
              {game.title}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-body-lg font-medium text-text-primary" numberOfLines={1}>
          {game.title}
        </Text>
        {game.genres?.[0] != null && (
          <Text className="text-caption text-text-secondary mt-0.5">
            {game.genres[0]}
          </Text>
        )}
        {game.release_date != null && (
          <Text className="text-caption text-text-tertiary mt-0.5">
            {game.release_date.slice(0, 4)}
          </Text>
        )}
      </View>

      {/* Chevron */}
      <Text className="text-body-lg text-text-tertiary">›</Text>
    </Pressable>
  );
}
