// Hook helper que retorna o label localizado de cada GameStatus.
// Use no lugar da constante estática GAME_STATUS_LABEL para garantir
// que o texto acompanhe a troca de idioma sem precisar re-render manual.

import { useTranslation } from 'react-i18next';
import type { GameStatus } from '@/src/types/models';

export function useGameStatusLabel(): Record<GameStatus, string> {
  const { t } = useTranslation();
  return {
    playing: t('gameStatus.playing'),
    played: t('gameStatus.played'),
    wishlist: t('gameStatus.wishlist'),
    dropped: t('gameStatus.dropped'),
  };
}
