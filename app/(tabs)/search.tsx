import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input, SectionHeader, Skeleton, EmptyState, Avatar, Button } from '@/src/components/ui';
import { GameCard, FilterTabs, SearchFilters } from '@/src/components/domain';
import { useSearchGames, useRecommendations } from '@/src/hooks/useGames';
import { useProfileSearch, useFollowUser, useUnfollowUser, useIsFollowing } from '@/src/hooks/useFeed';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import { useDebounce } from '@/src/hooks/useDebounce';
import { SearchIcon } from '@/src/components/ui/icons';
import { applyFilters } from '@/src/utils/filterGames';
import { DEFAULT_FILTERS, hasActiveFilters } from '@/src/components/domain/SearchFilters';
import type { Game } from '@/src/types/models';
import type { SearchFiltersState } from '@/src/components/domain/SearchFilters';

const GENRE_OPTIONS = [
  { value: 'action', label: 'Ação' },
  { value: 'role-playing-games-rpg', label: 'RPG' },
  { value: 'adventure', label: 'Aventura' },
  { value: 'shooter', label: 'Shooter' },
  { value: 'sports', label: 'Esportes' },
  { value: 'racing', label: 'Corrida' },
  { value: 'indie', label: 'Indie' },
  { value: 'strategy', label: 'Estratégia' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('action');
  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef(null);

  const isSearching = debouncedQuery.trim().length >= 2;

  const search = useSearchGames(debouncedQuery, 40);
  const profileSearch = useProfileSearch(debouncedQuery);
  const discover = useRecommendations([genre], 40);
  const currentUser = useAuthStore((s) => s.user);

  // Apply filters + sort to whichever list is active
  const searchResults = useMemo(
    () => applyFilters(search.data?.results ?? [], filters),
    [search.data, filters],
  );

  const discoverResults = useMemo(
    () => applyFilters(discover.data?.results ?? [], { ...filters, sort: 'relevance' }),
    [discover.data, filters],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.platform !== 'all') n++;
    if (filters.score !== 'any') n++;
    if (filters.sort !== 'relevance') n++;
    return n;
  }, [filters]);

  const handleGamePress = useCallback(
    (game: Game) => {
      Keyboard.dismiss();
      router.push(`/game/${game.rawg_id}` as never);
    },
    [router],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
  }, []);

  const renderGame: ListRenderItem<Game> = useCallback(
    ({ item, index }) => (
      <Animated.View
        style={{ flex: 1, maxWidth: '50%', padding: 6 }}
        entering={FadeInDown.delay(index * 40).duration(300).springify()}
      >
        <GameCard
          title={item.title}
          genre={item.genres[0]}
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

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Search bar ─── */}
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <View className="flex-1">
          <Input
            ref={inputRef}
            variant="search"
            placeholder="Buscar jogos de PS4 / PS5…"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {query.length > 0 && (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
          >
            <Text className="text-body text-brand-primary">Limpar</Text>
          </Pressable>
        )}
      </View>

      {/* ─── Filter bar (always visible) ─── */}
      <View>
        <SearchFilters
          filters={filters}
          onChange={setFilters}
          showSort={isSearching}
        />
        {activeFilterCount > 0 && (
          <Pressable
            onPress={() => setFilters(DEFAULT_FILTERS)}
            hitSlop={8}
            accessibilityRole="button"
            className="px-5 pb-1"
          >
            <Text className="text-caption text-brand-primary">
              {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''} · Limpar
            </Text>
          </Pressable>
        )}
      </View>

      {isSearching && (profileSearch.data?.length ?? 0) > 0 && (
        /* ─── Usuários encontrados ─── */
        <View>
          <SectionHeader title="Usuários" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
          >
            {profileSearch.data!.map((profile) => (
              <UserPill
                key={profile.id}
                profile={profile}
                currentUserId={currentUser?.id}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {isSearching ? (
        /* ─── Resultados da busca ─── */
        <FlatList
          data={search.isLoading ? SKELETON_ITEMS : searchResults}
          keyExtractor={(item, i) =>
            search.isLoading ? String(i) : String(item.rawg_id ?? item.slug ?? i)
          }
          renderItem={search.isLoading ? renderSkeletonItem : renderGame}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="px-2 pb-2">
              <Text className="text-caption text-text-secondary">
                {search.isLoading
                  ? 'Buscando…'
                  : search.isError
                    ? 'Erro ao buscar'
                    : searchResults.length === 0 && hasActiveFilters(filters)
                      ? `Nenhum resultado com os filtros ativos`
                      : `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${debouncedQuery}"`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            !search.isLoading ? (
              <EmptyState
                icon={<SearchIcon size={28} color={tokens.color.text.tertiary} />}
                title={hasActiveFilters(filters) ? 'Sem resultados' : 'Nenhum resultado'}
                subtitle={
                  hasActiveFilters(filters)
                    ? 'Tente remover alguns filtros.'
                    : `Não encontramos jogos para "${debouncedQuery}".`
                }
                action={
                  hasActiveFilters(filters) ? (
                    <Button
                      label="Limpar filtros"
                      size="sm"
                      variant="secondary"
                      onPress={() => setFilters(DEFAULT_FILTERS)}
                    />
                  ) : undefined
                }
              />
            ) : null
          }
        />
      ) : (
        /* ─── Descobrir por gênero ─── */
        <FlatList
          data={discover.isLoading ? SKELETON_ITEMS : discoverResults}
          keyExtractor={(item, i) =>
            discover.isLoading ? String(i) : String(item.rawg_id ?? item.slug ?? i)
          }
          renderItem={discover.isLoading ? renderSkeletonItem : renderGame}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <SectionHeader title="Descobrir" className="px-2" />
              <FilterTabs
                options={GENRE_OPTIONS}
                selected={genre}
                onSelect={setGenre}
              />
              {discoverResults.length === 0 && !discover.isLoading && hasActiveFilters(filters) && (
                <View className="px-4 pt-3">
                  <Text className="text-caption text-text-tertiary">
                    Sem jogos neste gênero com os filtros ativos.{' '}
                  </Text>
                  <Pressable onPress={() => setFilters(DEFAULT_FILTERS)}>
                    <Text className="text-caption text-brand-primary">Limpar filtros</Text>
                  </Pressable>
                </View>
              )}
              <View className="h-3" />
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── UserPill ────────────────────────────────────────────────────────────────

function UserPill({
  profile,
  currentUserId,
}: {
  profile: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  currentUserId?: string;
}) {
  const router = useRouter();
  const isMe = profile.id === currentUserId;
  const { data: following } = useIsFollowing(isMe ? null : profile.id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  return (
    <Pressable
      onPress={() => router.push(`/profile/${profile.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${profile.display_name ?? profile.username}`}
      className="items-center gap-2"
      style={{ width: 80 }}
    >
      <Avatar
        name={profile.display_name ?? profile.username}
        uri={profile.avatar_url}
        size="md"
      />
      <Text className="text-caption text-text-body text-center" numberOfLines={1}>
        @{profile.username}
      </Text>
      {!isMe && (
        <Button
          label={following ? 'Seguindo' : 'Seguir'}
          size="sm"
          variant={following ? 'secondary' : 'primary'}
          onPress={(e) => {
            e?.stopPropagation?.();
            following
              ? unfollow.mutate(profile.id)
              : follow.mutate(profile.id);
          }}
        />
      )}
    </Pressable>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

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
