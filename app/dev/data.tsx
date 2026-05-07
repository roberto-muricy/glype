import { useState } from 'react';
import { ScrollView, Text, TextInput, View, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui';
import { GameCard, ScoreBadge } from '@/src/components/domain';
import { SectionHeader } from '@/src/components/ui';
import {
  useTrendingGames,
  useSearchGames,
  useRecommendations,
} from '@/src/hooks/useGames';
import type { Game } from '@/src/types/models';

export default function DataSandboxScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trending = useTrendingGames(10);
  const search = useSearchGames(query, 10);
  const recommendations = useRecommendations(['action', 'role-playing-games-rpg'], 10);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <View>
          <Text className="text-h1 text-text-primary">Data Sandbox</Text>
          <Text className="text-caption text-text-secondary">Edge Functions + React Query</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={8}
          className="rounded-full bg-bg-elevated p-2"
        >
          <CloseIcon size={18} color={tokens.color.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {/* ─── Busca ─── */}
        <SectionHeader title="Search" />
        <View className="px-5 mb-4">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar jogo…"
            placeholderTextColor={tokens.color.text.tertiary}
            style={{
              backgroundColor: tokens.color.bg.elevated,
              color: tokens.color.text.primary,
              borderRadius: tokens.radius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: tokens.fontSize.body,
              borderWidth: 1,
              borderColor: tokens.color.border.DEFAULT,
            }}
          />
          <QueryStatus query={search} label="games-search" />
        </View>
        {search.data && (
          <GameList games={search.data.results} />
        )}

        {/* ─── Trending ─── */}
        <SectionHeader title="Trending" />
        <QueryStatus query={trending} label="games-trending" />
        {trending.data && (
          <GameList games={trending.data.results} />
        )}

        {/* ─── Recomendações ─── */}
        <SectionHeader title="Recomendações (action + rpg)" />
        <QueryStatus query={recommendations} label="games-recommendations" />
        {recommendations.data && (
          <GameList games={recommendations.data.results} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function QueryStatus({
  query,
  label,
}: {
  query: { isLoading: boolean; isFetching: boolean; isError: boolean; error: unknown };
  label: string;
}) {
  if (query.isLoading) {
    return (
      <View className="flex-row items-center gap-2 px-5 py-2">
        <ActivityIndicator size="small" color={tokens.color.brand.primary} />
        <Text className="text-caption text-text-secondary">{label}…</Text>
      </View>
    );
  }
  if (query.isError) {
    const msg = query.error instanceof Error ? query.error.message : 'Erro desconhecido';
    return (
      <Text className="text-caption text-semantic-danger px-5 py-1">
        ❌ {label}: {msg}
      </Text>
    );
  }
  if (query.isFetching) {
    return (
      <Text className="text-caption text-text-tertiary px-5 py-1">
        ↻ {label} atualizando…
      </Text>
    );
  }
  return null;
}

function GameList({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <Text className="text-caption text-text-tertiary px-5 py-2">
        Nenhum resultado.
      </Text>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
    >
      {games.map((game) => (
        <View key={game.rawg_id ?? game.slug ?? game.title} style={{ width: 120 }}>
          <GameCard
            title={game.title}
            genre={game.genres[0]}
            score={
              game.metacritic_score != null
                ? game.metacritic_score / 10
                : (game.rawg_rating ?? undefined)
            }
            coverUrl={game.cover_url ?? undefined}
            size="sm"
          />
          {game.metacritic_score != null && (
            <View className="mt-1 flex-row items-center gap-1">
              <Text className="text-caption text-text-tertiary">MC</Text>
              <ScoreBadge score={game.metacritic_score / 10} size="sm" variant="outline" />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
