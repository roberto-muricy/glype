// SwipeDeck — orquestra o stack de 3 cards visíveis no swipe deck.
//
// Recebe a queue + callbacks. Posiciona os primeiros 3 cards em stack.
// Quando o card do topo é swipado, ele anima saindo e o próximo "sobe".

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SwipeCard, type SwipeDirection } from './SwipeCard';
import type { Game } from '@/src/types/models';

export interface SwipeDeckProps {
  /** Queue completa (o deck pega os primeiros N). */
  queue: Game[];
  /** Callback de swipe — recebe o game e a direção. */
  onSwipe: (game: Game, direction: SwipeDirection) => void;
  /** Callback de tap em "Ver detalhes" no card do topo. */
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

  // Tracking de qual card está animando saindo — pra não ficar interativo enquanto sai
  const [animatingOut, setAnimatingOut] = useState<number | null>(null);

  const handleSwipe = (game: Game, direction: SwipeDirection) => {
    if (game.rawg_id == null) return;
    setAnimatingOut(game.rawg_id);
    // Pequeno delay pra animação terminar visualmente antes de remover do queue
    setTimeout(() => {
      setAnimatingOut(null);
      onSwipe(game, direction);
    }, 220);
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Renderiza de trás pra frente: índice maior = mais ao fundo */}
      {visible
        .map((game, idx) => ({ game, idx }))
        .reverse()
        .map(({ game, idx }) => {
          const isTop = idx === 0;
          const isLeaving = animatingOut === game.rawg_id;
          return (
            <SwipeCard
              key={game.rawg_id ?? `${game.slug}-${idx}`}
              game={game}
              interactive={isTop && !isLeaving}
              depth={idx}
              onSwipe={(direction) => handleSwipe(game, direction)}
              onPressDetails={isTop ? () => onPressDetails?.(game) : undefined}
            />
          );
        })}
    </View>
  );
}
