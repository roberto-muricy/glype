import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Skeleton } from '@/src/components/ui';
import { ScoresAggregateBlock } from '@/src/components/domain';
import { useGameDetail } from '@/src/hooks/useGames';
import { useMyGameStatus, useSetGameStatus, useRemoveFromLibrary } from '@/src/hooks/useLibrary';
import { ensureGame } from '@/src/services/reviews.service';
import { GAME_STATUS_LABEL, type GameStatus } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon } from '@/src/components/ui/icons';
import type { Game } from '@/src/types/models';

export default function GameDetailScreen() {
  const { rawgId } = useLocalSearchParams<{ rawgId: string }>();
  const router = useRouter();

  const id = rawgId ? parseInt(rawgId, 10) : null;
  const { data: game, isLoading, isError, error } = useGameDetail(id);

  return (
    <View className="flex-1 bg-bg-primary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        bounces
      >
        {/* ─── Hero ─── */}
        <View style={{ height: 320 }}>
          {isLoading ? (
            <Skeleton width="100%" height={320} className="rounded-none" />
          ) : game?.background_url ?? game?.cover_url ? (
            <Image
              source={{ uri: (game.background_url ?? game.cover_url)! }}
              style={{ width: '100%', height: 320 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LinearGradient
              colors={[tokens.color.brand.dark, tokens.color.bg.primary]}
              style={{ width: '100%', height: 320 }}
            />
          )}

          {/* Gradient bottom fade */}
          <LinearGradient
            colors={['transparent', tokens.color.bg.primary]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}
          />

          {/* Close button */}
          <SafeAreaView
            edges={['top']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          >
            <View className="flex-row justify-end px-4 pt-2">
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                className="rounded-full bg-bg-primary/70 p-2"
              >
                <CloseIcon size={20} color={tokens.color.text.primary} />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Title over hero */}
          {!isLoading && game && (
            <View
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
              className="px-5 pb-4"
            >
              <Text className="text-h1 text-text-primary" numberOfLines={2}>
                {game.title}
              </Text>
              {game.release_date && (
                <Text className="text-caption text-text-secondary mt-1">
                  {formatYear(game.release_date)}
                  {game.developer ? ` · ${game.developer}` : ''}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ─── Body ─── */}
        {isLoading && <LoadingSkeleton />}
        {isError && <ErrorBlock message={error instanceof Error ? error.message : 'Erro ao carregar jogo'} onRetry={() => {}} />}
        {!isLoading && !isError && game && <GameBody game={game} />}
      </ScrollView>
    </View>
  );
}

// ─── GameBody ────────────────────────────────────────────────────────────────

function GameBody({ game }: { game: Game }) {
  const router = useRouter();
  const scoreSources = buildScoreSources(game);
  const [gameId, setGameId] = useState<string | null>(null);

  // Resolve o UUID interno do jogo (necessário para library)
  const resolveGameId = async () => {
    if (gameId) return gameId;
    if (!game.rawg_id) return null;
    const id = await ensureGame(game.rawg_id);
    setGameId(id);
    return id;
  };

  return (
    <View className="px-5 gap-6 mt-2">
      {/* Plataformas + Gêneros */}
      <View className="gap-3">
        {game.platforms.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {game.platforms.map((p) => (
              <Badge key={p} label={p} variant="platform" />
            ))}
          </View>
        )}
        {game.genres.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {game.genres.map((g) => (
              <Badge key={g} label={g} variant="external" />
            ))}
          </View>
        )}
      </View>

      {/* Scores */}
      {scoreSources.length > 0 && (
        <ScoresAggregateBlock sources={scoreSources} />
      )}

      {/* Publisher */}
      {game.publisher && (
        <View className="flex-row gap-4">
          {game.developer && game.developer !== game.publisher && (
            <InfoPair label="Desenvolvedora" value={game.developer} />
          )}
          <InfoPair label="Publicadora" value={game.publisher} />
        </View>
      )}

      {/* Descrição */}
      {game.description && <DescriptionBlock text={game.description} />}

      {/* Biblioteca + Review */}
      <LibraryButton rawgId={game.rawg_id} resolveGameId={resolveGameId} />
      <Button
        label="Escrever review"
        size="lg"
        variant="secondary"
        onPress={() =>
          router.push(`/review/new?rawgId=${game.rawg_id}` as never)
        }
      />
    </View>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280;
  const displayed = isLong && !expanded ? text.slice(0, 280).trimEnd() + '…' : text;

  return (
    <View>
      <Text className="text-body-lg text-text-body leading-relaxed">{displayed}</Text>
      {isLong && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Mostrar menos' : 'Mostrar mais'}
        >
          <Text className="text-body text-brand-primary mt-1">
            {expanded ? 'Mostrar menos' : 'Mostrar mais'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-section uppercase text-brand-muted">{label}</Text>
      <Text className="text-body text-text-primary mt-0.5">{value}</Text>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-5 gap-6 mt-2">
      <View className="gap-2">
        <Skeleton width="100%" height={20} />
        <Skeleton width="60%" height={14} />
      </View>
      <Skeleton width="100%" height={160} className="rounded-xl" />
      <View className="gap-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="100%" height={12} />
        <Skeleton width="75%" height={12} />
      </View>
      <Skeleton width="100%" height={48} className="rounded-xl" />
    </View>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="px-5 mt-6 items-center gap-3">
      <Text className="text-body text-text-secondary text-center">{message}</Text>
      <Button label="Tentar novamente" size="sm" variant="secondary" onPress={onRetry} />
    </View>
  );
}

// ─── LibraryButton ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

function LibraryButton({
  rawgId,
  resolveGameId,
}: {
  rawgId: number | null;
  resolveGameId: () => Promise<string | null>;
}) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const { data: currentStatus, isLoading } = useMyGameStatus(resolvedId);
  const setStatus = useSetGameStatus();
  const remove = useRemoveFromLibrary();

  // Resolve o ID na primeira vez que o botão é renderizado
  useState(() => {
    if (rawgId) {
      resolveGameId().then((id) => setResolvedId(id));
    }
  });

  const handlePress = () => {
    const actions = STATUS_OPTIONS.map((s) => GAME_STATUS_LABEL[s]);
    const hasStatus = !!currentStatus;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions, hasStatus ? 'Remover da biblioteca' : 'Cancelar', 'Cancelar'],
          destructiveButtonIndex: hasStatus ? actions.length : undefined,
          cancelButtonIndex: actions.length + (hasStatus ? 1 : 0),
          title: 'Adicionar à biblioteca',
        },
        (idx) => {
          if (idx < STATUS_OPTIONS.length) {
            handleSetStatus(STATUS_OPTIONS[idx]);
          } else if (hasStatus && idx === STATUS_OPTIONS.length) {
            handleRemove();
          }
        },
      );
    } else {
      // Android: Alert com opções
      const buttons = STATUS_OPTIONS.map((s) => ({
        text: GAME_STATUS_LABEL[s],
        onPress: () => handleSetStatus(s),
      }));
      if (hasStatus) {
        buttons.push({ text: 'Remover', onPress: handleRemove } as typeof buttons[0]);
      }
      buttons.push({ text: 'Cancelar', onPress: () => {} } as typeof buttons[0]);
      Alert.alert('Adicionar à biblioteca', undefined, buttons);
    }
  };

  const handleSetStatus = async (status: GameStatus) => {
    const id = resolvedId ?? await resolveGameId();
    if (!id) return;
    setResolvedId(id);
    setStatus.mutate({ gameId: id, status });
  };

  const handleRemove = () => {
    if (!resolvedId) return;
    remove.mutate(resolvedId);
  };

  const label = isLoading
    ? '…'
    : currentStatus
      ? GAME_STATUS_LABEL[currentStatus]
      : 'Adicionar à biblioteca';

  return (
    <Button
      label={label}
      size="lg"
      onPress={handlePress}
      loading={setStatus.isPending || remove.isPending}
    />
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildScoreSources(game: Game) {
  const sources = [];
  if (game.metacritic_score != null) {
    sources.push({ source: 'Metacritic', score: game.metacritic_score, max: 100 });
  }
  if (game.rawg_rating != null && game.rawg_rating > 0) {
    sources.push({ source: 'RAWG', score: game.rawg_rating, max: 5 });
  }
  return sources;
}

function formatYear(dateStr: string): string {
  const year = dateStr.slice(0, 4);
  return year ?? dateStr;
}
