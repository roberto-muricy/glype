import { useEffect, useMemo, useState } from 'react';
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
import { Toast } from '@/src/components/ui';
import { ChevronLeftIcon, CloseIcon, SearchTabIcon } from '@/src/components/ui/icons';
import { useSearchGames, useTrendingGames } from '@/src/hooks/useGames';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useFavoriteGames, useSetFavoriteGames } from '@/src/hooks/useFavorites';
import { ensureGame } from '@/src/services/reviews.service';
import { useAuthStore } from '@/src/stores/auth';
import { hapticLight, hapticError } from '@/src/utils/haptics';
import { tokens } from '@/src/theme/tokens';
import type { Game } from '@/src/types/models';

// Estado unificado: jogo escolhido com UUID opcional (resolvido no save).
interface PickedGame {
  rawgId: number;
  gameId: string | null; // UUID já conhecido (vindo do top atual) ou null
  title: string;
  coverUrl: string | null;
}

const MAX = 5;

export default function TopGamesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const { data: favorites, isLoading: favLoading } = useFavoriteGames(userId);
  const setFavorites = useSetFavoriteGames(userId);

  const [picked, setPicked] = useState<PickedGame[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ variant: 'success' | 'danger'; title: string } | null>(null);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = debouncedQuery.trim().length >= 2;
  const { data: searchResults, isFetching: searchFetching } = useSearchGames(debouncedQuery);
  const { data: trending, isLoading: trendingLoading } = useTrendingGames(12);

  // Hidrata o estado com o top atual (uma vez).
  useEffect(() => {
    if (!hydrated && favorites) {
      setPicked(
        favorites.map((f) => ({
          rawgId: f.game.rawg_id ?? 0,
          gameId: f.game.id,
          title: f.game.title,
          coverUrl: f.game.cover_url,
        })),
      );
      setHydrated(true);
    }
  }, [favorites, hydrated]);

  // Limpa o toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const results: Game[] = isSearching
    ? (searchResults?.results ?? [])
    : (trending?.results ?? []);
  const resultsLoading = isSearching ? searchFetching : trendingLoading;

  const pickedRawgIds = useMemo(() => new Set(picked.map((p) => p.rawgId)), [picked]);
  const isFull = picked.length >= MAX;

  // ─── Ações ───
  const addGame = (game: Game) => {
    if (isFull || game.rawg_id == null || pickedRawgIds.has(game.rawg_id)) return;
    hapticLight();
    setPicked((prev) => [
      ...prev,
      {
        rawgId: game.rawg_id!,
        gameId: null,
        title: game.title,
        coverUrl: game.cover_url,
      },
    ]);
  };

  const removeAt = (index: number) => {
    hapticLight();
    setPicked((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= picked.length) return;
    hapticLight();
    setPicked((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Resolve UUIDs faltantes via ensure-game
      const gameIds: string[] = [];
      for (const p of picked) {
        if (p.gameId) {
          gameIds.push(p.gameId);
        } else {
          const id = await ensureGame(p.rawgId);
          gameIds.push(id);
        }
      }
      await setFavorites.mutateAsync(gameIds);
      setToast({ variant: 'success', title: 'Top 5 salvo!' });
      setTimeout(() => router.back(), 800);
    } catch (e) {
      hapticError();
      setToast({
        variant: 'danger',
        title: e instanceof Error ? e.message : 'Erro ao salvar',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-4 py-2">
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

        <Pressable
          onPress={handleSave}
          disabled={saving}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text
            className="text-body"
            style={{
              color: saving ? tokens.color.text.tertiary : tokens.color.brand.primary,
              fontFamily: tokens.fontFamily.medium,
            }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Text>
        </Pressable>
      </View>

      {toast && (
        <View className="px-5 pb-1">
          <Toast variant={toast.variant} title={toast.title} />
        </View>
      )}

      <FlatList
        data={isFull ? [] : results}
        keyExtractor={(item) => String(item.rawg_id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Título */}
            <View className="px-5 pt-1 pb-3">
              <Text className="text-h1 text-text-primary">Top 5 Jogos</Text>
              <Text className="text-caption text-text-secondary mt-1">
                Escolha e ordene seus 5 jogos favoritos. #1 é o seu preferido.
              </Text>
            </View>

            {/* Lista ranqueada atual */}
            {favLoading && !hydrated ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={tokens.color.brand.primary} />
              </View>
            ) : picked.length === 0 ? (
              <View className="mx-5 mb-4 rounded-xl border border-dashed border-border p-6 items-center">
                <Text className="text-body text-text-secondary text-center">
                  Seu Top 5 está vazio. Busque jogos abaixo para começar.
                </Text>
              </View>
            ) : (
              <View className="px-5 pb-4 gap-2">
                {picked.map((p, i) => (
                  <PickedRow
                    key={p.rawgId}
                    game={p}
                    rank={i + 1}
                    isFirst={i === 0}
                    isLast={i === picked.length - 1}
                    onRemove={() => removeAt(i)}
                    onMoveUp={() => move(i, -1)}
                    onMoveDown={() => move(i, 1)}
                  />
                ))}
              </View>
            )}

            {/* Busca */}
            {isFull ? (
              <View className="mx-5 mb-2 rounded-xl bg-bg-surface p-4 items-center">
                <Text className="text-body text-text-secondary">
                  Top 5 completo ✓ — remova um jogo para trocar.
                </Text>
              </View>
            ) : (
              <>
                <View className="px-4 pb-2">
                  <View
                    className="flex-row items-center gap-2 bg-bg-elevated rounded-xl px-3"
                    style={{ height: 44 }}
                  >
                    <SearchTabIcon size={18} color={tokens.color.text.tertiary} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Buscar jogo para adicionar…"
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
                </View>
                <View className="px-5 pt-1 pb-2">
                  <Text className="text-section uppercase text-brand-muted">
                    {isSearching ? 'Resultados' : 'Em alta'}
                  </Text>
                </View>
                {resultsLoading && results.length === 0 && (
                  <View className="py-6 items-center">
                    <ActivityIndicator color={tokens.color.brand.primary} />
                  </View>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <SearchResultRow
            game={item}
            disabled={item.rawg_id != null && pickedRawgIds.has(item.rawg_id)}
            onAdd={() => addGame(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─── PickedRow — item da lista ranqueada ─────────────────────────────────────

function PickedRow({
  game,
  rank,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  game: PickedGame;
  rank: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 bg-bg-elevated rounded-xl p-2">
      {/* Rank */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: tokens.color.brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontFamily.monoMedium,
            fontSize: 12,
            color: '#fff',
          }}
        >
          {rank}
        </Text>
      </View>

      {/* Capa */}
      <View style={{ width: 40, height: 54, borderRadius: 6, overflow: 'hidden' }}>
        {game.coverUrl ? (
          <Image
            source={{ uri: game.coverUrl }}
            style={{ width: 40, height: 54 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
            style={{ width: 40, height: 54 }}
          />
        )}
      </View>

      {/* Título */}
      <Text className="flex-1 text-body text-text-primary" numberOfLines={2}>
        {game.title}
      </Text>

      {/* Controles */}
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={onMoveUp}
          disabled={isFirst}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Subir"
          style={{ padding: 4, opacity: isFirst ? 0.25 : 1 }}
        >
          <Text style={{ color: tokens.color.text.primary, fontSize: 16 }}>▲</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={isLast}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Descer"
          style={{ padding: 4, opacity: isLast ? 0.25 : 1 }}
        >
          <Text style={{ color: tokens.color.text.primary, fontSize: 16 }}>▼</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Remover"
          style={{ padding: 4 }}
        >
          <CloseIcon size={16} color={tokens.color.semantic.danger} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── SearchResultRow — resultado da busca ────────────────────────────────────

function SearchResultRow({
  game,
  disabled,
  onAdd,
}: {
  game: Game;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <Pressable
      onPress={onAdd}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${game.title}`}
      className="flex-row items-center gap-3 px-5 py-2"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ width: 44, height: 58, borderRadius: 6, overflow: 'hidden' }}>
        {game.cover_url ? (
          <Image
            source={{ uri: game.cover_url }}
            style={{ width: 44, height: 58 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
            style={{ width: 44, height: 58 }}
          />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-body text-text-primary" numberOfLines={1}>
          {game.title}
        </Text>
        {game.release_date != null && (
          <Text className="text-caption text-text-tertiary mt-0.5">
            {game.release_date.slice(0, 4)}
          </Text>
        )}
      </View>

      <Text
        style={{
          fontSize: 24,
          color: disabled ? tokens.color.text.tertiary : tokens.color.brand.primary,
        }}
      >
        {disabled ? '✓' : '+'}
      </Text>
    </Pressable>
  );
}
