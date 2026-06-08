// Estatísticas detalhadas do perfil do usuário.
//
// Diferente de `getProfileStats` (só counts), este service puxa as reviews
// com gêneros dos jogos e calcula tudo client-side. Volume é pequeno
// (reviews do próprio usuário, tipicamente < 200) então o custo é OK.

import { supabase } from '@/src/lib/supabase';

export interface DetailedStats {
  /** Total de reviews escritas */
  reviewsCount: number;
  /** Nota média dada (0–10). null se sem reviews. */
  averageScore: number | null;
  /** Total de horas jogadas declarado (sum playtime_hours). */
  totalPlaytimeHours: number;
  /** Quantas reviews marcaram "completou o jogo". */
  completedCount: number;
  /** Distribuição de notas em buckets. */
  scoreDistribution: ScoreBucket[];
  /** Top gêneros entre os jogos reviewed. */
  topGenres: GenreCount[];
  /** Reviews por mês nos últimos 12 meses (cronológico, do mais antigo). */
  monthlyActivity: MonthBucket[];
}

export interface ScoreBucket {
  /** Label do bucket: '1-3' | '4-5' | '6-7' | '8-9' | '10' */
  label: string;
  count: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface MonthBucket {
  /** Formato YYYY-MM */
  month: string;
  count: number;
}

const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '1-3', min: 0, max: 3.999 },
  { label: '4-5', min: 4, max: 5.999 },
  { label: '6-7', min: 6, max: 7.999 },
  { label: '8-9', min: 8, max: 9.999 },
  { label: '10', min: 10, max: 10 },
];

interface ReviewWithGenres {
  score: number;
  completed: boolean | null;
  playtime_hours: number | null;
  created_at: string;
  game: { genres: string[] | null } | null;
}

export async function getDetailedStats(userId: string): Promise<DetailedStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      score, completed, playtime_hours, created_at,
      game:games ( genres )
    `)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  const reviews = (data ?? []) as unknown as ReviewWithGenres[];

  // ─── Aggregates ───────────────────────────────────────────────────────────
  const reviewsCount = reviews.length;

  const totalPlaytimeHours = reviews.reduce(
    (sum, r) => sum + (r.playtime_hours ?? 0),
    0,
  );

  const completedCount = reviews.filter((r) => r.completed === true).length;

  const averageScore =
    reviewsCount > 0
      ? reviews.reduce((s, r) => s + r.score, 0) / reviewsCount
      : null;

  // Distribuição de notas
  const scoreDistribution: ScoreBucket[] = BUCKETS.map((b) => ({
    label: b.label,
    count: reviews.filter((r) => r.score >= b.min && r.score <= b.max).length,
  }));

  // Top gêneros — flatten genres de cada game, count, sort desc
  const genreCount = new Map<string, number>();
  for (const r of reviews) {
    const genres = r.game?.genres ?? [];
    for (const g of genres) {
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
  }
  const topGenres: GenreCount[] = Array.from(genreCount.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Atividade últimos 12 meses (inclui meses com 0 pra eixo X contínuo)
  const now = new Date();
  const monthsMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsMap.set(key, 0);
  }
  for (const r of reviews) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthsMap.has(key)) {
      monthsMap.set(key, (monthsMap.get(key) ?? 0) + 1);
    }
  }
  const monthlyActivity: MonthBucket[] = Array.from(monthsMap.entries()).map(
    ([month, count]) => ({ month, count }),
  );

  return {
    reviewsCount,
    averageScore,
    totalPlaytimeHours,
    completedCount,
    scoreDistribution,
    topGenres,
    monthlyActivity,
  };
}
