// Tela fullscreen de descoberta (swipe deck Tinder-style).
//
// Acessível via:
// - Home → card "Descobrir jogos"
// - Onboarding (passo 3, opcional)
//
// Comportamento:
// - Carrega queue da Edge Function games-discover
// - Prefetch automático quando faltam 5 cards na queue
// - Swipe right → wishlist | left → dismiss | up/tap → game detail

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SwipeDeck, type SwipeDirection } from '@/src/components/domain';
import { Button, Toast } from '@/src/components/ui';
import {
  useDiscoverQueue,
  useDismissGame,
  useWishlistFromDiscover,
} from '@/src/hooks/useDiscover';
import { useAuthStore } from '@/src/stores/auth';
import { track } from '@/src/lib/analytics';
import { tokens } from '@/src/theme/tokens';
import type { Game } from '@/src/types/models';

const PREFETCH_THRESHOLD = 5;

export default function DiscoverScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const genres = profile?.favorite_genres ?? [];

  const { queue, isLoading, error, hasMore, prefetchMore, pop } = useDiscoverQueue(genres);
  const { mutate: dismissGame } = useDismissGame();
  const { mutate: addToWishlist } = useWishlistFromDiscover();

  const [toast, setToast] = useState<{ variant: 'success' | 'info'; title: string } | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  // Ref espelha o contador: lê a posição dentro do handler sem colocar
  // `swipeCount` nas deps (o que trocaria a identidade do callback a cada swipe).
  const swipeCountRef = useRef(0);

  // Track open event uma vez
  useEffect(() => {
    track('discover_opened', { source: 'home' });
  }, []);

  // Track queue exhausted
  useEffect(() => {
    if (!isLoading && queue.length === 0 && !hasMore && swipeCount > 0) {
      track('discover_queue_exhausted', { swipes_in_session: swipeCount });
    }
  }, [isLoading, queue.length, hasMore, swipeCount]);

  // Prefetch quando queue fica curta
  useEffect(() => {
    if (queue.length <= PREFETCH_THRESHOLD && hasMore && !isLoading) {
      prefetchMore();
    }
  }, [queue.length, hasMore, isLoading, prefetchMore]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(handle);
  }, [toast]);

  const handleSwipe = useCallback(
    (game: Game, direction: SwipeDirection) => {
      const rawgId = game.rawg_id;
      // Tira o card da fila ANTES de qualquer I/O. Este handler era `async` e
      // dava `await` na mutation: como ensure-game + getUser + upsert rodam em
      // sequência, o deck ficava 1-3s sem avançar e o usuário repetia o gesto
      // achando que tinha travado. Nada na UI depende do resultado da rede.
      pop(rawgId);
      if (rawgId == null) return;

      const position = swipeCountRef.current;
      swipeCountRef.current += 1;
      setSwipeCount(swipeCountRef.current);

      if (direction === 'right') {
        setToast({ variant: 'success', title: t('discover.wishlistAdded') });
        addToWishlist({ rawgId, position });
      } else if (direction === 'left') {
        dismissGame({ rawgId, position });
      } else if (direction === 'up') {
        track('discover_view_details', { rawg_id: rawgId });
        router.push(`/game/${rawgId}` as never);
      }
    },
    [pop, t, addToWishlist, dismissGame, router],
  );

  const handlePressDetails = useCallback(
    (game: Game) => {
      if (game.rawg_id == null) return;
      track('discover_view_details', { rawg_id: game.rawg_id });
      router.push(`/game/${game.rawg_id}` as never);
    },
    [router],
  );

  const handleManualSwipe = (direction: SwipeDirection) => {
    const top = queue[0];
    if (top) handleSwipe(top, direction);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Text className="text-h1 text-text-primary">{t('discover.title')}</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tokens.color.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={20} color={tokens.color.text.primary} />
        </Pressable>
      </View>

      {/* Toast */}
      {toast && (
        <View style={{ position: 'absolute', top: 80, left: 20, right: 20, zIndex: 99 }}>
          <Toast variant={toast.variant} title={toast.title} />
        </View>
      )}

      {/* Conteúdo */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        {isLoading && queue.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={tokens.color.brand.primary} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Text className="text-body text-text-secondary text-center">
              {t('discover.errorLoading')}
            </Text>
            <Button
              label={t('discover.tryAgain')}
              variant="secondary"
              onPress={() => router.replace('/discover' as never)}
            />
          </View>
        ) : queue.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="checkmark-circle-outline" size={56} color={tokens.color.text.tertiary} />
            <Text
              style={{
                fontFamily: tokens.fontFamily.medium,
                fontSize: 18,
                color: tokens.color.text.primary,
                textAlign: 'center',
              }}
            >
              {t('discover.emptyTitle')}
            </Text>
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: 13,
                color: tokens.color.text.secondary,
                textAlign: 'center',
                marginHorizontal: 16,
              }}
            >
              {t('discover.emptySubtitle')}
            </Text>
            <View style={{ marginTop: 8 }}>
              <Button
                label={t('discover.backToHome')}
                variant="primary"
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <SwipeDeck
                queue={queue}
                onSwipe={handleSwipe}
                onPressDetails={handlePressDetails}
              />
            </View>

            {/* Botões fallback (acessibilidade + alternativa pra quem não curte gesto) */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 28,
                marginTop: 20,
              }}
            >
              <CircleBtn
                icon="close"
                onPress={() => handleManualSwipe('left')}
                color={tokens.color.semantic.danger}
                accessibilityLabel={t('discover.swipeLeft')}
              />
              <CircleBtn
                icon="information"
                onPress={() => queue[0] && handlePressDetails(queue[0])}
                color={tokens.color.text.secondary}
                size={50}
                accessibilityLabel={t('discover.viewDetails')}
              />
              <CircleBtn
                icon="heart"
                onPress={() => handleManualSwipe('right')}
                color={tokens.color.semantic.success}
                accessibilityLabel={t('discover.swipeRight')}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function CircleBtn({
  icon,
  onPress,
  color,
  size = 60,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color: string;
  size?: number;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tokens.color.bg.elevated,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}
