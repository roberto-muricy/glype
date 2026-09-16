// SwipeDeck — orquestra o stack de 3 cards visíveis no swipe deck.
//
// Recebe a queue + callbacks. Posiciona os primeiros 3 cards em stack.
// Quando o card do topo é swipado, ele anima saindo e o próximo "sobe".

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SwipeCard, type SwipeDirection } from './SwipeCard';
import type { Game } from '@/src/types/models';

/** Casa com a animação de saída do SwipeCard (withTiming 250ms). */
const EXIT_DURATION = 240;
/** Quantos heróis além do stack visível pré-carregar em disco. */
const PREFETCH_AHEAD = 4;

export interface SwipeDeckProps {
  /** Queue completa (o deck pega os primeiros N). */
  queue: Game[];
  /**
   * Callback de swipe. Precisa ser estável (useCallback) e **sincrono**:
   * qualquer I/O aqui vira congelamento visível do deck.
   */
  onSwipe: (game: Game, direction: SwipeDirection) => void;
  /** Callback de tap em "Ver detalhes" no card do topo. Também precisa ser estável. */
  onPressDetails?: (game: Game) => void;
  /** Quantos cards mostrar empilhados (default 3). */
  visibleCount?: number;
}

export function SwipeDeck({
  queue,
  onSwipe,
  onPressDetails,
  visibleCount = 3,
}: SwipeDeckProps) {
  // Slice dos próximos cards. Renderizamos no reverso pra que o primeiro
  // fique POR CIMA dos demais (zIndex implícito de render order em RN).
  const visible = useMemo(() => queue.slice(0, visibleCount), [queue, visibleCount]);

  // Card que está animando saindo — para de aceitar gestos, mas continua
  // desenhando o fly-out (por isso não mexemos no `interactive` dele).
  const [leavingId, setLeavingId] = useState<number | null>(null);
  // Guard contra repetir o gesto no mesmo card enquanto ele sai: sem isso um
  // segundo swipe duplicaria a mutation e o contador de posição.
  const leavingRef = useRef<Set<number>>(new Set());

  const handleSwipe = useCallback(
    (game: Game, direction: SwipeDirection) => {
      const id = game.rawg_id;
      if (id == null || leavingRef.current.has(id)) return;
      leavingRef.current.add(id);
      setLeavingId(id);
      // Só a saída visual espera. O `onSwipe` é sincrono e dispara a rede
      // em background, então a fila avança sempre em ~240ms.
      setTimeout(() => {
        onSwipe(game, direction);
        leavingRef.current.delete(id);
        setLeavingId((cur) => (cur === id ? null : cur));
      }, EXIT_DURATION);
    },
    [onSwipe],
  );

  // Aquece o cache dos heróis que ainda não estão montados, pra o card novo
  // do fundo do stack não entrar com placeholder.
  useEffect(() => {
    const urls = queue
      .slice(visibleCount, visibleCount + PREFETCH_AHEAD)
      .map((g) => g.background_url ?? g.cover_url)
      .filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;
    Image.prefetch(urls, { cachePolicy: 'memory-disk' }).catch(() => undefined);
  }, [queue, visibleCount]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Renderiza de trás pra frente: índice maior = mais ao fundo */}
      {visible
        .map((game, idx) => ({ game, idx }))
        .reverse()
        .map(({ game, idx }) => (
          <SwipeCard
            key={game.rawg_id ?? `${game.slug}-${idx}`}
            game={game}
            interactive={idx === 0}
            acceptsGestures={leavingId !== game.rawg_id}
            depth={idx}
            onSwipe={handleSwipe}
            onPressDetails={onPressDetails}
          />
        ))}
    </View>
  );
}
