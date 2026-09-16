// Hook helper que resolve title/subtitle traduzidos de uma coleção.
// As coleções vivem em `src/config/collections.ts` com fallback em PT-BR;
// este hook consulta o namespace `collections.<id>` no i18n.
//
// Uso:
//   const { title, subtitle } = useCollectionLabels(collection);

import { useTranslation } from 'react-i18next';
import type { CollectionDef } from '@/src/config/collections';

export interface CollectionLabels {
  title: string;
  subtitle: string;
}

export function useCollectionLabels(
  collection: CollectionDef | undefined,
): CollectionLabels {
  const { t } = useTranslation();
  if (!collection) return { title: '', subtitle: '' };
  // i18next aceita hífen no path desde que o separador seja `.`.
  // Se a chave não existir, t() devolve o defaultValue (PT-BR fallback).
  return {
    title: t(`collections.${collection.id}.title`, { defaultValue: collection.title }),
    subtitle: t(`collections.${collection.id}.subtitle`, {
      defaultValue: collection.subtitle,
    }),
  };
}
