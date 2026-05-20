/**
 * Formata um timestamp ISO em texto relativo curto em português.
 * Ex: "agora", "há 5 min", "há 3 h", "há 2 d", "há 4 sem", "12 mai"
 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'agora';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour} h`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `há ${diffDay} d`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `há ${diffWeek} sem`;

  // Mais de ~1 mês: data abreviada
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}
