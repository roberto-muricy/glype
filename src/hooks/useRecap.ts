import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/auth';
import { getMonthRecap } from '@/src/services/recap.service';

export const recapKeys = {
  month: (userId: string, year: number, month: number) =>
    ['recap', userId, year, month] as const,
};

/** Retrospectiva de um mês (month 0-based) do usuário logado. */
export function useMonthRecap(year: number, month: number) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: recapKeys.month(user?.id ?? '', year, month),
    queryFn: () => getMonthRecap(user!.id, year, month),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}
