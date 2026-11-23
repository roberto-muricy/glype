// "Seu mês": retrospectiva mensal do próprio usuário.
//
// Tudo é calculado no app a partir de consultas pequenas (um usuário, um mês).
// Zerados, largados e matches vêm de `user_game_events` (migration 0015), que
// só existe desde 22/11/2026: meses anteriores não têm esses números. Eventos
// 'backfill' são ignorados, porque a data deles é a de entrada na biblioteca.

import { supabase } from '@/src/lib/supabase';

/** Primeiro mês com histórico de status (0015 aplicada em 22/11/2026). */
export const RECAP_FIRST_MONTH = { year: 2026, month: 10 } as const; // month 0-based
/** Dia em que o histórico começou, para avisar que novembro é parcial. */
export const RECAP_HISTORY_START = '2026-11-22T00:00:00Z';

export interface RecapGame {
  id: string;
  rawgId: number | null;
  title: string;
  coverUrl: string | null;
}

export interface RecapReviewHighlight {
  reviewId: string;
  game: RecapGame;
  score: number;
}

export type RecapPersona = 'contrarian' | 'generous' | 'aligned';
export type DeckStyle = 'picky' | 'balanced' | 'easy';

export interface MonthRecap {
  /** Zerados no mês: status 'played' ou review marcada como completa. */
  completed: RecapGame[];
  dropped: RecapGame[];
  started: RecapGame[];
  matches: number;
  dismissed: number;
  deckStyle: DeckStyle | null;
  reviews: {
    count: number;
    average: number | null;
    hours: number;
    highest: RecapReviewHighlight | null;
    lowest: RecapReviewHighlight | null;
  };
  /** Comparação das notas do mês com o Metacritic. Nulo com menos de 2 jogos. */
  persona: {
    kind: RecapPersona;
    /** Média do usuário menos média do Metacritic, na escala 0–10. */
    diff: number;
    userAverage: number;
    criticAverage: number;
  } | null;
  /** Até 3 gêneros, com a fração dos jogos do mês (0–1). */
  genres: { genre: string; share: number }[];
  social: {
    likes: number;
    comments: number;
    followers: number;
    topReview: { reviewId: string; title: string; likes: number } | null;
  };
  /** Uma entrada por semana (segunda a domingo) que toca o mês. */
  weeks: boolean[];
  /** Mês tem dados anteriores ao começo do histórico de status. */
  partialHistory: boolean;
  isEmpty: boolean;
}

interface GameRow {
  id: string;
  rawg_id: number | null;
  title: string;
  cover_url: string | null;
  genres: string[] | null;
  metacritic_score?: number | null;
}

const GAME_COLUMNS = 'id, rawg_id, title, cover_url, genres';

function toRecapGame(g: GameRow): RecapGame {
  return { id: g.id, rawgId: g.rawg_id, title: g.title, coverUrl: g.cover_url };
}

/** Início e fim (exclusivo) do mês no fuso do aparelho. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
}

/** Segunda-feira da semana de `d`, à meia-noite local. */
function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (s.getDay() + 6) % 7; // segunda = 0
  s.setDate(s.getDate() - offset);
  return s;
}

function deckStyleFor(matches: number, dismissed: number): DeckStyle | null {
  const seen = matches + dismissed;
  if (seen < 10) return null;
  const rate = matches / seen;
  if (rate < 0.25) return 'picky';
  if (rate > 0.5) return 'easy';
  return 'balanced';
}

export async function getMonthRecap(
  userId: string,
  year: number,
  month: number,
): Promise<MonthRecap> {
  const { start, end } = monthRange(year, month);
  const from = start.toISOString();
  const to = end.toISOString();

  const [eventsRes, reviewsRes, dismissalsRes, likesRes, commentsRes, followersRes] =
    await Promise.all([
      supabase
        .from('user_game_events')
        .select(`to_status, source, changed_at, game:games ( ${GAME_COLUMNS} )`)
        .eq('user_id', userId)
        .gte('changed_at', from)
        .lt('changed_at', to)
        .or('source.is.null,source.neq.backfill')
        .order('changed_at', { ascending: true }),
      supabase
        .from('reviews')
        .select(`id, score, playtime_hours, completed, created_at, game:games ( ${GAME_COLUMNS}, metacritic_score )`)
        .eq('user_id', userId)
        .gte('created_at', from)
        .lt('created_at', to),
      supabase
        .from('game_dismissals')
        .select('dismissed_at')
        .eq('user_id', userId)
        .gte('dismissed_at', from)
        .lt('dismissed_at', to),
      supabase
        .from('review_likes')
        .select('review_id, review:reviews!inner ( user_id, game:games ( title ) )')
        .eq('review.user_id', userId)
        .neq('user_id', userId)
        .gte('created_at', from)
        .lt('created_at', to)
        .limit(2000),
      supabase
        .from('review_comments')
        .select('id, review:reviews!inner ( user_id )', { count: 'exact', head: true })
        .eq('review.user_id', userId)
        .neq('user_id', userId)
        .gte('created_at', from)
        .lt('created_at', to),
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', userId)
        .gte('created_at', from)
        .lt('created_at', to),
    ]);

  for (const res of [eventsRes, reviewsRes, dismissalsRes, likesRes, commentsRes, followersRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const events = (eventsRes.data ?? []) as unknown as {
    to_status: string | null;
    source: string | null;
    changed_at: string;
    game: GameRow | null;
  }[];
  const reviews = (reviewsRes.data ?? []) as unknown as {
    id: string;
    score: number;
    playtime_hours: number | null;
    completed: boolean | null;
    created_at: string;
    game: GameRow | null;
  }[];
  const dismissals = (dismissalsRes.data ?? []) as { dismissed_at: string }[];
  const likes = (likesRes.data ?? []) as unknown as {
    review_id: string;
    review: { game: { title: string } | null } | null;
  }[];

  // ─── Biblioteca ──────────────────────────────────────────────────────────
  // Um jogo conta uma vez por categoria, mesmo que o status vá e volte.
  const completed = new Map<string, RecapGame>();
  const dropped = new Map<string, RecapGame>();
  const started = new Map<string, RecapGame>();
  let matches = 0;
  for (const e of events) {
    if (!e.game) continue;
    if (e.to_status === 'played') completed.set(e.game.id, toRecapGame(e.game));
    if (e.to_status === 'dropped') dropped.set(e.game.id, toRecapGame(e.game));
    if (e.to_status === 'playing') started.set(e.game.id, toRecapGame(e.game));
    if (e.to_status === 'wishlist' && e.source === 'discover') matches += 1;
  }
  for (const r of reviews) {
    if (r.completed && r.game) completed.set(r.game.id, toRecapGame(r.game));
  }
  // Zerado no mesmo mês não aparece também como "começou".
  for (const id of completed.keys()) started.delete(id);

  // ─── Reviews ─────────────────────────────────────────────────────────────
  const scored = reviews.filter((r) => r.game);
  const average = scored.length
    ? scored.reduce((s, r) => s + Number(r.score), 0) / scored.length
    : null;
  const hours = scored.reduce((s, r) => s + (r.playtime_hours ?? 0), 0);
  const byScore = [...scored].sort((a, b) => Number(b.score) - Number(a.score));
  const highlight = (r: (typeof scored)[number] | undefined): RecapReviewHighlight | null =>
    r && r.game ? { reviewId: r.id, game: toRecapGame(r.game), score: Number(r.score) } : null;
  const highest = highlight(byScore[0]);
  // Menor nota só faz sentido com pelo menos duas reviews.
  const lowest = byScore.length >= 2 ? highlight(byScore[byScore.length - 1]) : null;

  // ─── Perfil: notas contra o Metacritic ───────────────────────────────────
  const withCritic = scored.filter((r) => r.game?.metacritic_score != null);
  let persona: MonthRecap['persona'] = null;
  if (withCritic.length >= 2) {
    const userAverage = withCritic.reduce((s, r) => s + Number(r.score), 0) / withCritic.length;
    const criticAverage =
      withCritic.reduce((s, r) => s + (r.game!.metacritic_score as number) / 10, 0) /
      withCritic.length;
    const diff = userAverage - criticAverage;
    const kind: RecapPersona = diff <= -1 ? 'contrarian' : diff >= 1 ? 'generous' : 'aligned';
    persona = { kind, diff, userAverage, criticAverage };
  }

  // ─── Gêneros: jogos zerados, largados, começados e avaliados ─────────────
  const monthGames = new Map<string, string[]>();
  for (const e of events) {
    if (e.game && e.to_status && e.to_status !== 'wishlist') {
      monthGames.set(e.game.id, e.game.genres ?? []);
    }
  }
  for (const r of scored) monthGames.set(r.game!.id, r.game!.genres ?? []);
  const genreCount = new Map<string, number>();
  for (const genres of monthGames.values()) {
    for (const g of genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  }
  const totalGames = monthGames.size;
  const genres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, share: totalGames ? count / totalGames : 0 }));

  // ─── Social ──────────────────────────────────────────────────────────────
  const likesByReview = new Map<string, { title: string; likes: number }>();
  for (const l of likes) {
    const cur = likesByReview.get(l.review_id);
    if (cur) cur.likes += 1;
    else likesByReview.set(l.review_id, { title: l.review?.game?.title ?? '', likes: 1 });
  }
  let topReview: MonthRecap['social']['topReview'] = null;
  for (const [reviewId, v] of likesByReview) {
    if (v.likes >= 2 && (!topReview || v.likes > topReview.likes)) {
      topReview = { reviewId, title: v.title, likes: v.likes };
    }
  }

  // ─── Semanas ativas ──────────────────────────────────────────────────────
  // Conta como atividade: mudança na biblioteca, review ou carta do deck.
  const firstWeek = weekStart(start);
  const lastDay = new Date(end.getTime() - 1);
  const weekCount =
    Math.round((weekStart(lastDay).getTime() - firstWeek.getTime()) / (7 * 86400000)) + 1;
  const weeks = new Array<boolean>(weekCount).fill(false);
  const mark = (iso: string) => {
    const idx = Math.round(
      (weekStart(new Date(iso)).getTime() - firstWeek.getTime()) / (7 * 86400000),
    );
    if (idx >= 0 && idx < weekCount) weeks[idx] = true;
  };
  events.forEach((e) => mark(e.changed_at));
  reviews.forEach((r) => mark(r.created_at));
  dismissals.forEach((d) => mark(d.dismissed_at));

  const dismissed = dismissals.length;
  const isEmpty =
    events.length === 0 && reviews.length === 0 && dismissed === 0 && likes.length === 0;

  return {
    completed: [...completed.values()],
    dropped: [...dropped.values()],
    started: [...started.values()],
    matches,
    dismissed,
    deckStyle: deckStyleFor(matches, dismissed),
    reviews: { count: scored.length, average, hours, highest, lowest },
    persona,
    genres,
    social: {
      likes: likes.length,
      comments: commentsRes.count ?? 0,
      followers: followersRes.count ?? 0,
      topReview,
    },
    weeks,
    partialHistory: start < new Date(RECAP_HISTORY_START),
    isEmpty,
  };
}
