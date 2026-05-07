import { useState } from 'react';
import { FlatList, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState, SectionHeader, Skeleton } from '@/src/components/ui';
import { GameCard, FilterTabs } from '@/src/components/domain';
import { useMyLibrary } from '@/src/hooks/useLibrary';
import { GAME_STATUS_LABEL, type GameStatus, type UserGame } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';
import { LibraryIcon } from '@/src/components/ui/icons';

type FilterValue = 'all' | GameStatus;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'playing', label: GAME_STATUS_LABEL.playing },
  { value: 'played', label: GAME_STATUS_LABEL.played },
  { value: 'wishlist', label: GAME_STATUS_LABEL.wishlist },
  { value: 'dropped', label: GAME_STATUS_LABEL.dropped },
];

const EMPTY_MESSAGES: Record<FilterValue, { title: string; subtitle: string }> = {
  all: {
    title: 'Biblioteca vazia',
    subtitle: 'Adicione jogos à sua biblioteca a partir da tela de detalhes.',
  },
  playing: { title: 'Nenhum jogo em andamento', subtitle: 'Marque um jogo como "Jogando" para aparecer aqui.' },
  played: { title: 'Nenhum jogo concluído', subtitle: 'Marque jogos que você já terminou.' },
  wishlist: { title: 'Wishlist vazia', subtitle: 'Salve jogos que quer jogar no futuro.' },
  dropped: { title: 'Nenhum jogo dropado', subtitle: 'Jogos que você parou de jogar aparecem aqui.' },
};

export default function LibraryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('all');

  const status = filter === 'all' ? undefined : filter;
  const { data, isLoading } = useMyLibrary(status);

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

  const empty = EMPTY_MESSAGES[filter];

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <SectionHeader title="Biblioteca" />

      <FilterTabs
        options={FILTER_OPTIONS}
        selected={filter}
        onSelect={(v) => setFilter(v as FilterValue)}
      />

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
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 32 }}
          ListEmptyComponent={
            <EmptyState
              icon={<LibraryIcon size={28} color={tokens.color.brand.primary} />}
              title={empty.title}
              subtitle={empty.subtitle}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
