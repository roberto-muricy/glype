// Hook helper que resolve title/subtitle traduzidos de uma coleção.
// As coleções vivem em `src/config/collections.ts` com fallback em PT-BR;
// este hook consulta o namespace `collections.<id>` no i18n.
//
// Uso:
//   const { title, subtitle } = useCollectionLabels(collection);

import { useTranslation } from 'react-i18next';
import type { CollectionDef } from '@/src/config/collections';

const MONTHS: Record<string, string[]> = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

/**
 * Nome do mês corrente no idioma do app. A coleção do mês dizia "maio 2026",
 * fixo no texto, em novembro. Lista própria em vez de Intl, para não depender
 * do suporte do Hermes a nomes de mês.
 */
function currentMonthName(language: string): string {
  const names = MONTHS[language.slice(0, 2)] ?? MONTHS.pt;
  return names[new Date().getMonth()];
}

export interface CollectionLabels {
  title: string;
  subtitle: string;
}

export function useCollectionLabels(
  collection: CollectionDef | undefined,
): CollectionLabels {
  const { t, i18n } = useTranslation();
  if (!collection) return { title: '', subtitle: '' };
  // i18next aceita hífen no path desde que o separador seja `.`.
  // Se a chave não existir, t() devolve o defaultValue (PT-BR fallback).
  return {
    title: t(`collections.${collection.id}.title`, { defaultValue: collection.title }),
    subtitle: t(`collections.${collection.id}.subtitle`, {
      defaultValue: collection.subtitle,
      month: currentMonthName(i18n.language ?? 'pt'),
    }),
  };
}
