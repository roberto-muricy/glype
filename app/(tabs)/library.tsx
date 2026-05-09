import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState, Skeleton } from '@/src/components/ui';
import { GameCard } from '@/src/components/domain';
import { useMyLibrary, useSetGameStatus, useRemoveFromLibrary } from '@/src/hooks/useLibrary';
import { GAME_STATUS_LABEL, type GameStatus, type UserGame } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';
import { LibraryIcon, SearchIcon } from '@/src/components/ui/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterValue = 'all' | GameStatus;
type SortValue = 'recent' | 'az' | 'score';

const STATUS_LIST: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'recent', label: 'Recentes' },
  { value: 'az', label: 'A–Z' },
  { value: 'score', label: 'Nota' },
];

const EMPTY_MESSAGES: Record<FilterValue, { title: string; subtitle: string }> = {
  all: { title: 'Biblioteca vazia', subtitle: 'Adicione jogos tocando em + ou na tela de detalhes.' },
  playing: { title: 'Nenhum em andamento', subtitle: 'Marque um jogo como "Jogando" para aparecer aqui.' },
  played: { title: 'Nenhum concluído', subtitle: 'Marque jogos que você já terminou.' },
  wishlist: { title: 'Wishlist vazia', subtitle: 'Salve jogos que quer jogar no futuro.' },
  dropped: { title: 'Nenhum dropado', subtitle: 'Jogos que você parou de jogar aparecem aqui.' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('recent');
  const [query, setQuery] = useState('');

  // Load all games once, filter client-side (library is typically small)
  const { data: allGames, isLoading } = useMyLibrary();
  const setGameStatus = useSetGameStatus();
  const removeGame = useRemoveFromLibrary();

  // Count per status for badges
  const counts = useMemo<Record<FilterValue, number>>(() => {
    const base = { all: 0, playing: 0, played: 0, wishlist: 0, dropped: 0 };
    for (const g of allGames ?? []) {
      base.all++;
      base[g.status]++;
    }
    return base;
  }, [allGames]);

  // Filter + search + sort
  const displayed = useMemo(() => {
    let list = allGames ?? [];
    if (filter !== 'all') list = list.filter((g) => g.status === filter);
    if (query.trim().length >= 1) {
      const q = query.toLowerCase();
      list = list.filter((g) => g.game.title.toLowerCase().includes(q));
    }
    if (sort === 'az') list = [...list].sort((a, b) => a.game.title.localeCompare(b.game.title));
    if (sort === 'score') {
      list = [...list].sort((a, b) => {
        const sa = a.game.metacritic_score ?? (a.game.rawg_rating ?? 0) * 20;
        const sb = b.game.metacritic_score ?? (b.game.rawg_rating ?? 0) * 20;
        return sb - sa;
      });
    }
    return list;
  }, [allGames, filter, query, sort]);

  const handleLongPress = useCallback((item: UserGame) => {
    const statusOptions = STATUS_LIST.filter((s) => s !== item.status).map(
      (s) => GAME_STATUS_LABEL[s],
    );
    const options = ['Cancelar', ...statusOptions, 'Remover da biblioteca'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.game.title,
          options,
          destructiveButtonIndex: options.length - 1,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 0) return;
          if (idx === options.length - 1) {
            removeGame.mutate(item.game_id);
            return;
          }
          const targetLabel = options[idx];
          const targetStatus = STATUS_LIST.find((s) => GAME_STATUS_LABEL[s] === targetLabel);
          if (targetStatus) setGameStatus.mutate({ gameId: item.game_id, status: targetStatus });
        },
      );
    } else {
      Alert.alert(item.game.title, 'O que deseja fazer?', [
        ...STATUS_LIST.filter((s) => s !== item.status).map((s) => ({
          text: GAME_STATUS_LABEL[s],
          onPress: () => setGameStatus.mutate({ gameId: item.game_id, status: s }),
        })),
        {
          text: 'Remover',
          style: 'destructive' as const,
          onPress: () => removeGame.mutate(item.game_id),
        },
        { text: 'Cancelar', style: 'cancel' as const },
      ]);
    }
  }, [setGameStatus, removeGame]);

  const renderItem: ListRenderItem<UserGame> = useCallback(
    ({ item }) => (
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
          onLongPress={() => handleLongPress(item)}
        />
        <View className="mt-1 px-1">
          <Text className="text-caption text-brand-muted">{GAME_STATUS_LABEL[item.status]}</Text>
        </View>
      </View>
    ),
    [router, handleLongPress],
  );

  const empty = EMPTY_MESSAGES[filter];

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-h1 text-text-primary">Biblioteca</Text>
        <Pressable
          onPress={() => router.push('/review/pick-game' as never)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Adicionar jogo"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: tokens.color.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 22, fontFamily: tokens.fontFamily.regular }}>+</Text>
        </Pressable>
      </View>

      {/* ─── Search bar ─── */}
      <View
        className="mx-5 mb-3 flex-row items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-3"
        style={{ height: 40 }}
      >
        <SearchIcon size={16} color={tokens.color.text.tertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar na biblioteca…"
          placeholderTextColor={tokens.color.text.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            fontFamily: tokens.fontFamily.regular,
            fontSize: 14,
            color: tokens.color.text.primary,
          }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={{ color: tokens.color.text.tertiary, fontSize: 16 }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* ─── Status filter tabs ─── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 4 }}>
        {(['all', ...STATUS_LIST] as FilterValue[]).map((v) => {
          const active = filter === v;
          const label = v === 'all' ? 'Todos' : GAME_STATUS_LABEL[v];
          const count = counts[v];
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

      {/* ─── Sort row ─── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 6 }}>
        <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.tertiary }}>
          Ordenar:
        </Text>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setSort(opt.value)}
              accessibilityRole="button"
              style={{ paddingHorizontal: 8, paddingVertical: 3 }}
            >
              <Text
                style={{
                  fontFamily: active ? tokens.fontFamily.medium : tokens.fontFamily.regular,
                  fontSize: 12,
                  color: active ? tokens.color.brand.primary : tokens.color.text.tertiary,
                  textDecorationLine: active ? 'underline' : 'none',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Result count */}
        {!isLoading && (
          <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.tertiary, marginLeft: 'auto' }}>
            {displayed.length} {displayed.length === 1 ? 'jogo' : 'jogos'}
          </Text>
        )}
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
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.length > 0 ? (
              <EmptyState
                icon={<SearchIcon size={28} color={tokens.color.text.tertiary} />}
                title="Sem resultados"
                subtitle={`Nenhum jogo com "${query}" na sua biblioteca.`}
              />
            ) : (
              <EmptyState
                icon={<LibraryIcon size={28} color={tokens.color.brand.primary} />}
                title={empty.title}
                subtitle={empty.subtitle}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
