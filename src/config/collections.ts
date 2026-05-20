/**
 * Definição das coleções curadas do Glype.
 * Cada coleção mapeia para parâmetros específicos da RAWG API.
 * Nenhuma mudança de banco necessária — os jogos vêm da RAWG em tempo real.
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface CollectionDef {
  id: string;
  title: string;
  subtitle: string;
  /** Nome do ícone Ionicons */
  icon: IoniconName;
  /** Cor accent do card (hex) */
  color: string;
  /** Cor mais escura para o gradiente do card */
  colorDark: string;
  /** Parâmetros extras enviados para a Edge Function games-collection */
  rawgParams: Record<string, string>;
}

export const COLLECTIONS: CollectionDef[] = [
  {
    id: 'monthly-releases',
    title: 'Lançamentos do mês',
    subtitle: 'Novidades de maio 2026',
    icon: 'calendar-outline',
    color: '#0066FF',
    colorDark: '#0033AA',
    rawgParams: {
      dates: '2026-05-01,2026-05-31',
      ordering: '-rating',
    },
  },
  {
    id: 'editors-pick',
    title: 'Escolha do editor',
    subtitle: 'Metacritic 85+',
    icon: 'trophy-outline',
    color: '#F59E0B',
    colorDark: '#B45309',
    rawgParams: {
      metacritic: '85,100',
      ordering: '-metacritic',
    },
  },
  {
    id: 'sci-fi',
    title: 'Sci-Fi',
    subtitle: 'Mundos do futuro',
    icon: 'rocket-outline',
    color: '#8B5CF6',
    colorDark: '#5B21B6',
    rawgParams: {
      tags: 'science-fiction',
      ordering: '-rating',
    },
  },
  {
    id: 'cyberpunk',
    title: 'Coleção Cyberpunk',
    subtitle: 'Neon, hackers e distopia',
    icon: 'hardware-chip-outline',
    color: '#06B6D4',
    colorDark: '#0E7490',
    rawgParams: {
      tags: 'cyberpunk',
      ordering: '-rating',
    },
  },
  {
    id: 'bestsellers',
    title: 'Mais Vendidos',
    subtitle: 'Os favoritos da comunidade',
    icon: 'flame-outline',
    color: '#EF4444',
    colorDark: '#991B1B',
    rawgParams: {
      ordering: '-added',
    },
  },
  {
    id: 'ps4-classics',
    title: 'Clássicos PS4',
    subtitle: 'Os melhores de 2013–2020',
    icon: 'game-controller-outline',
    color: '#3B82F6',
    colorDark: '#1D4ED8',
    rawgParams: {
      dates: '2013-01-01,2020-12-31',
      ordering: '-metacritic',
    },
  },
  {
    id: 'open-world',
    title: 'Mundo Aberto',
    subtitle: 'Explore sem limites',
    icon: 'earth-outline',
    color: '#10B981',
    colorDark: '#065F46',
    rawgParams: {
      tags: 'open-world',
      ordering: '-rating',
    },
  },
  {
    id: 'horror',
    title: 'Terror & Suspense',
    subtitle: 'Se tiver coragem…',
    icon: 'skull-outline',
    color: '#6B21A8',
    colorDark: '#3B0764',
    rawgParams: {
      tags: 'horror',
      ordering: '-rating',
    },
  },
  {
    id: 'soulslike',
    title: 'Souls-like',
    subtitle: 'Difíceis por design',
    icon: 'bonfire-outline',
    color: '#DC2626',
    colorDark: '#7F1D1D',
    rawgParams: {
      tags: 'souls-like',
      ordering: '-rating',
    },
  },
];

export function getCollectionById(id: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}
