import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Skeleton, ActionSheet } from '@/src/components/ui';
import type { ActionSheetItem } from '@/src/components/ui';
import { ScoresAggregateBlock } from '@/src/components/domain';
import { useGameDetail } from '@/src/hooks/useGames';
import { useMyGameStatus, useSetGameStatus, useRemoveFromLibrary } from '@/src/hooks/useLibrary';
import { ensureGame } from '@/src/services/reviews.service';
import { getGameByRawgId } from '@/src/services/games.service';
import { captureException } from '@/src/lib/sentry';
import { hapticError } from '@/src/utils/haptics';
import { useGameStatusLabel } from '@/src/i18n/useGameStatusLabel';
import { type GameStatus } from '@/src/types/models';
import { tokens } from '@/src/theme/tokens';
import { CloseIcon, TrashIcon, CheckIcon } from '@/src/components/ui/icons';
import type { Game } from '@/src/types/models';

export default function GameDetailScreen() {
  const { rawgId } = useLocalSearchParams<{ rawgId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

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
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
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
        {isError && <ErrorBlock message={error instanceof Error ? error.message : t('gameDetail.errorLoading')} onRetry={() => {}} />}
        {!isLoading && !isError && game && <GameBody game={game} />}
      </ScrollView>

      {/* Close button — overlay fixo, sempre visível independente do scroll */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <View
          pointerEvents="box-none"
          className="flex-row justify-end px-4 pt-2"
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size={20} color={tokens.color.text.primary} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── GameBody ────────────────────────────────────────────────────────────────

function GameBody({ game }: { game: Game }) {
  const router = useRouter();
  const { t } = useTranslation();
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
            <InfoPair label={t('gameDetail.developer')} value={game.developer} />
          )}
          <InfoPair label={t('gameDetail.publisher')} value={game.publisher} />
        </View>
      )}

      {/* Descrição */}
      {game.description && <DescriptionBlock text={game.description} />}

      {/* Biblioteca + Review */}
      <LibraryButton rawgId={game.rawg_id} resolveGameId={resolveGameId} />
      <Button
        label={t('gameDetail.writeReview')}
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
  const { t } = useTranslation();
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
          accessibilityLabel={expanded ? t('gameDetail.showLess') : t('gameDetail.showMore')}
        >
          <Text className="text-body text-brand-primary mt-1">
            {expanded ? t('gameDetail.showLess') : t('gameDetail.showMore')}
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
  const { t } = useTranslation();
  return (
    <View className="px-5 mt-6 items-center gap-3">
      <Text className="text-body text-text-secondary text-center">{message}</Text>
      <Button label={t('common.retry')} size="sm" variant="secondary" onPress={onRetry} />
    </View>
  );
}

// ─── LibraryButton ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: GameStatus[] = ['playing', 'played', 'wishlist', 'dropped'];

const STATUS_ICON: Record<GameStatus, keyof typeof Ionicons.glyphMap> = {
  playing: 'game-controller-outline',
  played: 'trophy-outline',
  wishlist: 'bookmark-outline',
  dropped: 'pause-circle-outline',
};

function LibraryButton({
  rawgId,
  resolveGameId,
}: {
  rawgId: number | null;
  resolveGameId: () => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const GAME_STATUS_LABEL = useGameStatusLabel();
  const STATUS_HINT: Record<GameStatus, string> = {
    playing: t('gameStatus.hintPlaying'),
    played: t('gameStatus.hintPlayedShort'),
    wishlist: t('gameStatus.hintWishlistShort'),
    dropped: t('gameStatus.hintDroppedShort'),
  };
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: currentStatus, isLoading } = useMyGameStatus(resolvedId);
  const setStatus = useSetGameStatus();
  const remove = useRemoveFromLibrary();

  // Na abertura só LÊ o cadastro do jogo. Antes chamava o ensure-game aqui: ver
  // um jogo sem cadastro gravava na tabela `games` e esperava RAWG + IGDB, e a
  // promise sem .catch virava rejeição não tratada (GLYPE-2 no Sentry). Jogo sem
  // cadastro não pode estar na biblioteca, então não há status a buscar.
  useEffect(() => {
    if (!rawgId) return;
    let cancelled = false;
    getGameByRawgId(rawgId)
      .then((existing) => {
        if (!cancelled && existing?.id) setResolvedId(existing.id);
      })
      .catch((e) => captureException(e, { scope: 'game_status_lookup', rawg_id: rawgId }));
    return () => {
      cancelled = true;
    };
  }, [rawgId]);

  const handleSetStatus = async (status: GameStatus) => {
    try {
      // Só aqui garantimos o cadastro: é a única ação que precisa dele.
      const id = resolvedId ?? (await resolveGameId());
      if (!id) return;
      setResolvedId(id);
      setStatus.mutate({ gameId: id, status });
    } catch (e) {
      hapticError();
      captureException(e, { scope: 'game_set_status', rawg_id: rawgId });
      Alert.alert(t('common.error'), t('gameStatus.errorSaving'));
    }
  };

  const handleRemove = () => {
    if (!resolvedId) return;
    remove.mutate(resolvedId);
  };

  const hasStatus = !!currentStatus;

  const label = isLoading
    ? '…'
    : currentStatus
      ? GAME_STATUS_LABEL[currentStatus]
      : t('gameStatus.addToLibrary');

  const actions: ActionSheetItem[] = STATUS_OPTIONS.map((s) => {
    const selected = currentStatus === s;
    return {
      label: GAME_STATUS_LABEL[s],
      sublabel: STATUS_HINT[s],
      selected,
      icon: (
        <Ionicons
          name={STATUS_ICON[s]}
          size={22}
          color={selected ? tokens.color.brand.primary : tokens.color.text.secondary}
        />
      ),
      onPress: () => handleSetStatus(s),
    };
  });

  if (hasStatus) {
    actions.push({
      label: t('gameStatus.removeFromLibrary'),
      icon: <TrashIcon size={20} color={tokens.color.semantic.danger} />,
      destructive: true,
      onPress: handleRemove,
    });
  }

  return (
    <>
      <Button
        label={label}
        size="lg"
        onPress={() => setSheetOpen(true)}
        loading={setStatus.isPending || remove.isPending}
        icon={
          hasStatus ? (
            <CheckIcon size={18} color={tokens.color.text.primary} />
          ) : undefined
        }
      />
      <ActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={hasStatus ? t('gameStatus.statusInLibrary') : t('gameStatus.addToLibrary')}
        subtitle={
          hasStatus
            ? t('gameStatus.currently', { status: GAME_STATUS_LABEL[currentStatus] })
            : t('gameStatus.howToMark')
        }
        actions={actions}
      />
    </>
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
