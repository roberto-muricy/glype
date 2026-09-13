// SwipeCard — card individual do deck. Hero fullscreen com info + gestos.
//
// Renderiza um único jogo. O `SwipeDeck` posiciona 3 desses em stack.
// Quando `interactive=true`, captura PanGesture e dispara callbacks ao
// passar do threshold.

import { memo, useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScoreBadge } from './ScoreBadge';
import { tokens } from '@/src/theme/tokens';
import { hapticLight, hapticMedium } from '@/src/utils/haptics';
import type { Game } from '@/src/types/models';

export type SwipeDirection = 'left' | 'right' | 'up';

export interface SwipeCardProps {
  game: Game;
  /** true = topo do stack (usa os shared values do gesto). false = atrás, decorativo. */
  interactive: boolean;
  /**
   * false enquanto o card anima saindo: continua desenhando a animação de
   * saída, mas para de aceitar gestos novos. Separado de `interactive` porque
   * desligar os dois juntos cancelaria o fly-out no meio.
   */
  acceptsGestures?: boolean;
  /** Profundidade no stack (0 = topo). Define escala/opacity/offset. */
  depth?: number;
  /** Recebem o próprio game pra o deck passar callbacks estáveis (senão o memo
   *  quebra a cada render e o GestureDetector é reanexado). */
  onSwipe?: (game: Game, direction: SwipeDirection) => void;
  onPressDetails?: (game: Game) => void;
}

const SWIPE_THRESHOLD_X = 100;
const SWIPE_THRESHOLD_Y = 80;
const ROTATION_FACTOR = 0.06;

function SwipeCardComponent({
  game,
  interactive,
  acceptsGestures = true,
  depth = 0,
  onSwipe,
  onPressDetails,
}: SwipeCardProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  // Flag na UI thread: evita repetir o haptic a cada frame após o threshold.
  const hasVibrated = useSharedValue(false);
  // Profundidade animada — faz o card de trás "subir" suavemente ao ser promovido
  // em vez de pular de escala 0.95 pra 1 num frame.
  const depthProgress = useSharedValue(depth);

  // Reset valores quando o card volta a ser interativo (próximo do stack subiu).
  useEffect(() => {
    if (interactive) {
      translateX.value = 0;
      translateY.value = 0;
      cardOpacity.value = 1;
      hasVibrated.value = false;
    }
  }, [interactive, cardOpacity, hasVibrated, translateX, translateY]);

  useEffect(() => {
    depthProgress.value = withTiming(depth, { duration: 180 });
  }, [depth, depthProgress]);

  // ─── Estilo animado ─────────────────────────────────────────────────────────

  const animatedStyle = useAnimatedStyle(() => {
    const d = depthProgress.value;
    const scale = 1 - d * 0.05;
    const stackOffset = d * 8;
    const depthOpacity = 1 - d * 0.3;

    if (!interactive) {
      // Cards atrás: só o efeito de pilha.
      return {
        transform: [{ scale }, { translateY: stackOffset }],
        opacity: depthOpacity,
      };
    }
    const rotateZ = interpolate(
      translateX.value,
      [-width, 0, width],
      [-15 * ROTATION_FACTOR * 10, 0, 15 * ROTATION_FACTOR * 10],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffset },
        { rotateZ: `${rotateZ}deg` },
        { scale },
      ],
      opacity: cardOpacity.value * depthOpacity,
    };
  });

  // Overlays "LIKE" e "NOPE" que aparecem conforme arrasta
  const likeOverlayStyle = useAnimatedStyle(() => {
    if (!interactive) return { opacity: 0 };
    return {
      opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD_X], [0, 1], Extrapolation.CLAMP),
    };
  });
  const nopeOverlayStyle = useAnimatedStyle(() => {
    if (!interactive) return { opacity: 0 };
    return {
      opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD_X, 0], [1, 0], Extrapolation.CLAMP),
    };
  });

  // ─── Gesture ────────────────────────────────────────────────────────────────

  const triggerSwipe = (direction: SwipeDirection) => {
    hapticMedium();
    onSwipe?.(game, direction);
  };

  const haptic = () => {
    hapticLight();
  };

  const pan = Gesture.Pan()
    .enabled(interactive && acceptsGestures)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      // Haptic sutil ao cruzar o threshold — uma vez por travessia.
      const pastThreshold =
        Math.abs(e.translationX) > SWIPE_THRESHOLD_X * 0.6 ||
        e.translationY < -SWIPE_THRESHOLD_Y * 0.6;
      if (pastThreshold !== hasVibrated.value) {
        hasVibrated.value = pastThreshold;
        if (pastThreshold) runOnJS(haptic)();
      }
    })
    .onEnd((e) => {
      const tx = e.translationX;
      const ty = e.translationY;
      const vx = e.velocityX;

      // Threshold direita
      if (tx > SWIPE_THRESHOLD_X || (tx > 0 && vx > 600)) {
        translateX.value = withTiming(width * 1.2, { duration: 250 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(triggerSwipe)('right');
        return;
      }
      // Threshold esquerda
      if (tx < -SWIPE_THRESHOLD_X || (tx < 0 && vx < -600)) {
        translateX.value = withTiming(-width * 1.2, { duration: 250 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(triggerSwipe)('left');
        return;
      }
      // Threshold cima
      if (ty < -SWIPE_THRESHOLD_Y) {
        translateY.value = withTiming(-height, { duration: 250 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(triggerSwipe)('up');
        return;
      }
      // Spring back
      hasVibrated.value = false;
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  // ─── Render ─────────────────────────────────────────────────────────────────

  const heroUrl = game.background_url ?? game.cover_url;
  const releaseYear = game.release_date ? new Date(game.release_date).getFullYear() : null;
  const score = game.metacritic_score != null ? game.metacritic_score / 10 : game.rawg_rating ?? null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: tokens.color.bg.elevated,
          },
          animatedStyle,
        ]}
      >
        {/* Hero */}
        {heroUrl ? (
          <Image
            source={{ uri: heroUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={game.slug ?? String(game.rawg_id)}
            priority={interactive ? 'high' : 'normal'}
            transition={120}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[tokens.color.brand.dark, tokens.color.bg.primary]}
            style={{ width: '100%', height: '100%' }}
          />
        )}

        {/* Gradient escuro pra legibilidade do texto */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Overlays LIKE / NOPE */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 56,
              right: 24,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 3,
              borderColor: tokens.color.semantic.success,
              borderRadius: 8,
              transform: [{ rotate: '-15deg' }],
            },
            likeOverlayStyle,
          ]}
        >
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 28,
              color: tokens.color.semantic.success,
              letterSpacing: 2,
            }}
          >
            {t('discover.stampWant')}
          </Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 56,
              left: 24,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 3,
              borderColor: tokens.color.semantic.danger,
              borderRadius: 8,
              transform: [{ rotate: '15deg' }],
            },
            nopeOverlayStyle,
          ]}
        >
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 28,
              color: tokens.color.semantic.danger,
              letterSpacing: 2,
            }}
          >
            {t('discover.stampSkip')}
          </Text>
        </Animated.View>

        {/* Conteúdo inferior */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            paddingBottom: 28,
          }}
          pointerEvents="box-none"
        >
          {/* Score */}
          {score != null && (
            <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
              <ScoreBadge score={score} size="sm" />
            </View>
          )}

          {/* Título */}
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 26,
              color: '#fff',
              lineHeight: 32,
            }}
            numberOfLines={2}
          >
            {game.title}
          </Text>

          {/* Meta: ano · developer */}
          {(releaseYear || game.developer) && (
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: 13,
                color: 'rgba(255,255,255,0.75)',
                marginTop: 6,
              }}
              numberOfLines={1}
            >
              {[releaseYear, game.developer].filter(Boolean).join(' · ')}
            </Text>
          )}

          {/* Gêneros */}
          {game.genres.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 12,
              }}
            >
              {game.genres.slice(0, 3).map((g) => (
                <View
                  key={g}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: tokens.fontFamily.regular,
                      fontSize: 11,
                      color: '#fff',
                    }}
                  >
                    {g}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tap pra detalhes */}
          {interactive && onPressDetails && (
            <Pressable
              onPress={() => onPressDetails?.(game)}
              accessibilityRole="button"
              accessibilityLabel={t('discover.viewDetails')}
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color="#fff" />
              <Text
                style={{
                  fontFamily: tokens.fontFamily.regular,
                  fontSize: 12,
                  color: '#fff',
                }}
              >
                {t('discover.viewDetails')}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * memo: o deck re-renderiza a cada swipe. Sem isso os 3 cards remontam junto
 * e o GestureDetector do topo é reanexado no meio do gesto seguinte.
 */
export const SwipeCard = memo(SwipeCardComponent);
