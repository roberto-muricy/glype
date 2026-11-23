// "Seu mês": retrospectiva mensal do usuário logado.
//
// Acessada via Perfil → Seu mês. O botão de compartilhar entra na 1.1.4, que
// traz os módulos nativos para gerar a imagem do card.

import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Skeleton } from '@/src/components/ui';
import { useMonthRecap } from '@/src/hooks/useRecap';
import {
  RECAP_FIRST_MONTH,
  type MonthRecap,
  type RecapGame,
} from '@/src/services/recap.service';
import { sizedImageUrl } from '@/src/lib/imageUrl';
import { tokens } from '@/src/theme/tokens';
import { genreLabel } from '@/src/utils/genres';

const COLORS = {
  completed: tokens.color.semantic.success,
  dropped: tokens.color.semantic.danger,
  matches: tokens.color.brand.light,
  muted: '#8E8E9C',
  personaBg: '#0B1428',
  personaLabel: '#8FB6FF',
};

type YearMonth = { year: number; month: number };

function compare(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

function shift(m: YearMonth, delta: number): YearMonth {
  const d = new Date(m.year, m.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Na primeira semana do mês, abre no mês que acabou de fechar. */
function initialMonth(): YearMonth {
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() };
  const target = now.getDate() <= 7 ? shift(current, -1) : current;
  return compare(target, RECAP_FIRST_MONTH) < 0 ? { ...RECAP_FIRST_MONTH } : target;
}

export default function MonthRecapScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [ym, setYm] = useState<YearMonth>(initialMonth);
  const { data: recap, isLoading, isError, refetch } = useMonthRecap(ym.year, ym.month);

  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() };
  const canPrev = compare(ym, RECAP_FIRST_MONTH) > 0;
  const canNext = compare(ym, current) < 0;

  const monthDate = new Date(ym.year, ym.month, 1);
  const monthName = monthDate.toLocaleDateString(i18n.language, { month: 'long' });
  const monthShort = monthDate
    .toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(' de ', ' ');

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={roundButton}
          >
            <Text style={{ color: tokens.color.text.primary, fontSize: 18 }}>‹</Text>
          </Pressable>
          <Text className="text-h1 text-text-primary">{t('recap.title')}</Text>
        </View>

        <View
          className="flex-row items-center rounded-full border border-border bg-bg-elevated"
          style={{ height: 36 }}
        >
          <MonthArrow
            icon="chevron-back"
            disabled={!canPrev}
            label={t('recap.previousMonth')}
            onPress={() => setYm((m) => shift(m, -1))}
          />
          <Text
            style={{
              fontFamily: tokens.fontFamily.mono,
              fontSize: 12,
              color: tokens.color.text.body,
              textTransform: 'capitalize',
            }}
          >
            {monthShort}
          </Text>
          <MonthArrow
            icon="chevron-forward"
            disabled={!canNext}
            label={t('recap.nextMonth')}
            onPress={() => setYm((m) => shift(m, 1))}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? (
          <LoadingState />
        ) : isError || !recap ? (
          <View className="mt-12 px-5">
            <EmptyState
              title={t('recap.error')}
              action={
                <Button label={t('common.retry')} size="sm" variant="secondary" onPress={() => refetch()} />
              }
            />
          </View>
        ) : recap.isEmpty ? (
          <View className="mt-12 px-5">
            <EmptyState
              title={t('recap.empty', { month: monthName })}
              subtitle={t('recap.emptyHint')}
              action={
                <Button
                  label={t('recap.openDeck')}
                  size="sm"
                  variant="primary"
                  onPress={() => router.push('/discover' as never)}
                />
              }
            />
          </View>
        ) : (
          <RecapBody recap={recap} monthName={monthName} year={ym.year} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Conteúdo ──────────────────────────────────────────────────────────────

function RecapBody({ recap, monthName, year }: { recap: MonthRecap; monthName: string; year: number }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const fmt = (n: number) => n.toLocaleString(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const openGame = (g: RecapGame) => {
    if (g.rawgId != null) router.push(`/game/${g.rawgId}` as never);
  };
  const openReview = (id: string) => router.push(`/review/${id}` as never);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (recap.completed.length) parts.push(t('recap.summaryCompleted', { count: recap.completed.length }));
    if (recap.dropped.length) parts.push(t('recap.summaryDropped', { count: recap.dropped.length }));
    if (recap.matches) parts.push(t('recap.summaryMatches', { count: recap.matches }));
    if (recap.reviews.count) parts.push(t('recap.summaryReviews', { count: recap.reviews.count }));
    if (!parts.length) return t('recap.summaryQuiet');
    const list =
      parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(', ')} ${t('recap.and')} ${parts[parts.length - 1]}`;
    const sentence = t('recap.summary', { list });
    // Em espanhol a frase começa pelo verbo, que pode não ser o primeiro item.
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }, [recap, t]);

  const seen = recap.matches + recap.dismissed;
  const matchRate = seen > 0 ? recap.matches / seen : 0;
  const activeWeeks = recap.weeks.filter(Boolean).length;

  return (
    <View>
      {/* ─── Abertura ─── */}
      <View className="px-5 pt-4 pb-2 gap-2">
        <Text style={eyebrow}>{`${monthName} ${year}`.toUpperCase()}</Text>
        <Text
          style={{
            fontFamily: tokens.fontFamily.medium,
            fontSize: 32,
            lineHeight: 36,
            color: tokens.color.text.primary,
            letterSpacing: -0.8,
          }}
        >
          {t('recap.headline')}
        </Text>
        <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 15, lineHeight: 22, color: tokens.color.text.body }}>
          {summary}
        </Text>
        {recap.partialHistory && (
          <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, lineHeight: 17, color: tokens.color.text.secondary }}>
            {t('recap.partialHistory')}
          </Text>
        )}
      </View>

      {/* ─── Números ─── */}
      <View className="flex-row gap-2 px-5 pt-4">
        <NumberTile value={recap.completed.length} label={t('recap.completed')} color={COLORS.completed} />
        <NumberTile value={recap.dropped.length} label={t('recap.dropped')} color={COLORS.dropped} />
        <NumberTile value={recap.matches} label={t('recap.matches')} color={COLORS.matches} />
      </View>

      {/* ─── Perfil do mês ─── */}
      {recap.persona && (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 20,
            padding: 20,
            borderRadius: 16,
            backgroundColor: COLORS.personaBg,
            borderWidth: 1,
            borderColor: tokens.color.border.accent,
            gap: 12,
          }}
        >
          <Text style={[eyebrow, { color: COLORS.personaLabel }]}>
            {t('recap.personaLabel', { month: monthName }).toUpperCase()}
          </Text>
          <Text style={{ fontFamily: tokens.fontFamily.medium, fontSize: 30, lineHeight: 32, color: tokens.color.text.primary }}>
            {t(`recap.persona.${recap.persona.kind}`)}
          </Text>
          <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 14, lineHeight: 20, color: tokens.color.text.body }}>
            {recap.persona.kind === 'aligned'
              ? t('recap.personaAligned')
              : t(recap.persona.diff < 0 ? 'recap.personaBelow' : 'recap.personaAbove', {
                  diff: fmt(Math.abs(recap.persona.diff)),
                })}
          </Text>
          <View className="flex-row gap-2">
            <Chip text={t('recap.yourAverage', { value: fmt(recap.persona.userAverage) })} />
            <Chip text={t('recap.criticAverage', { value: fmt(recap.persona.criticAverage) })} />
          </View>
        </View>
      )}

      {/* ─── Biblioteca ─── */}
      {(recap.completed.length > 0 || recap.started.length > 0 || recap.dropped.length > 0) && (
        <Section title={t('recap.library')}>
          {recap.completed.length > 0 && (
            <View className="gap-3">
              <RowTitle label={t('recap.completedTitle')} value={recap.completed.length} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recap.completed.map((g) => (
                  <Cover key={g.id} game={g} onPress={() => openGame(g)} />
                ))}
              </ScrollView>
            </View>
          )}
          {recap.started.length > 0 && (
            <GameListRow label={t('recap.startedTitle')} games={recap.started} />
          )}
          {recap.dropped.length > 0 && (
            <View className="gap-1">
              <GameListRow label={t('recap.droppedTitle')} games={recap.dropped} />
              <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.secondary }}>
                {t('recap.droppedQuip')}
              </Text>
            </View>
          )}
        </Section>
      )}

      {/* ─── Deck ─── */}
      {seen > 0 && (
        <Section title={t('recap.deck')}>
          <View className="flex-row items-center justify-between">
            <Text style={{ fontFamily: tokens.fontFamily.medium, fontSize: 18, color: tokens.color.text.primary }}>
              {t('recap.cardsSeen', { count: seen })}
            </Text>
            {recap.deckStyle && <Chip text={t(`recap.deckStyle.${recap.deckStyle}`)} />}
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: tokens.color.bg.surface, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.max(2, matchRate * 100)}%`,
                backgroundColor: tokens.color.brand.primary,
                borderRadius: 4,
              }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text style={monoSmall}>
              {t('recap.matchesRate', { count: recap.matches, rate: Math.round(matchRate * 100) })}
            </Text>
            <Text style={monoSmall}>{t('recap.dismissed', { count: recap.dismissed })}</Text>
          </View>
        </Section>
      )}

      {/* ─── Reviews ─── */}
      {recap.reviews.count > 0 && (
        <Section title={t('recap.reviews')}>
          <View className="flex-row">
            <BigNumber value={String(recap.reviews.count)} label={t('recap.reviewsWritten', { count: recap.reviews.count })} />
            <BigNumber
              value={recap.reviews.average != null ? fmt(recap.reviews.average) : '—'}
              label={t('recap.averageScore')}
            />
            <BigNumber value={`${recap.reviews.hours}h`} label={t('recap.hoursDeclared')} />
          </View>
          {recap.reviews.highest && (
            <HighlightRow
              label={t('recap.highest')}
              title={recap.reviews.highest.game.title}
              score={fmt(recap.reviews.highest.score)}
              color={COLORS.completed}
              onPress={() => openReview(recap.reviews.highest!.reviewId)}
            />
          )}
          {recap.reviews.lowest && (
            <HighlightRow
              label={t('recap.lowest')}
              title={recap.reviews.lowest.game.title}
              score={fmt(recap.reviews.lowest.score)}
              color={COLORS.dropped}
              onPress={() => openReview(recap.reviews.lowest!.reviewId)}
            />
          )}
        </Section>
      )}

      {/* ─── Gêneros ─── */}
      {recap.genres.length > 0 && (
        <Section title={t('recap.genres')}>
          {recap.genres.map((g, i) => (
            <View key={g.genre} className="gap-1.5">
              <View className="flex-row justify-between">
                <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 14, color: tokens.color.text.primary }}>
                  {genreLabel(g.genre, t)}
                </Text>
                <Text style={monoSmall}>{`${Math.round(g.share * 100)}%`}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: tokens.color.bg.surface, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(2, g.share * 100)}%`,
                    backgroundColor: tokens.color.brand.primary,
                    opacity: 1 - i * 0.25,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* ─── Social ─── */}
      {(recap.social.likes > 0 || recap.social.comments > 0 || recap.social.followers > 0) && (
        <Section title={t('recap.social')}>
          <View className="flex-row flex-wrap gap-2">
            {recap.social.likes > 0 && <Chip text={t('recap.likes', { count: recap.social.likes })} />}
            {recap.social.comments > 0 && <Chip text={t('recap.comments', { count: recap.social.comments })} />}
            {recap.social.followers > 0 && <Chip text={t('recap.followers', { count: recap.social.followers })} />}
          </View>
          {recap.social.topReview && (
            <HighlightRow
              label={t('recap.topReview')}
              title={recap.social.topReview.title}
              score={t('recap.likes', { count: recap.social.topReview.likes })}
              color={tokens.color.text.body}
              onPress={() => openReview(recap.social.topReview!.reviewId)}
            />
          )}
        </Section>
      )}

      {/* ─── Semanas ─── */}
      <Section title={t('recap.weeks')}>
        <Text style={{ fontFamily: tokens.fontFamily.medium, fontSize: 18, color: tokens.color.text.primary }}>
          {t('recap.activeWeeks', { count: activeWeeks, total: recap.weeks.length })}
        </Text>
        <View className="flex-row gap-1.5">
          {recap.weeks.map((on, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                backgroundColor: on ? tokens.color.brand.primary : tokens.color.bg.surface,
              }}
            />
          ))}
        </View>
        <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.secondary }}>
          {t('recap.weeksHint')}
        </Text>
      </Section>
    </View>
  );
}

// ─── Peças ─────────────────────────────────────────────────────────────────

const roundButton = {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: tokens.color.bg.elevated,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const eyebrow = {
  fontFamily: tokens.fontFamily.mono,
  fontSize: 11,
  letterSpacing: 1.8,
  color: COLORS.muted,
};

const monoSmall = {
  fontFamily: tokens.fontFamily.mono,
  fontSize: 12,
  color: tokens.color.text.secondary,
};

function MonthArrow({
  icon,
  disabled,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ paddingHorizontal: 8, height: '100%', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}
    >
      <Ionicons name={icon} size={14} color={tokens.color.text.body} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mx-5 mt-5 rounded-xl bg-bg-elevated border border-border-subtle p-4 gap-4">
      <Text style={eyebrow}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function NumberTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View
      className="flex-1 bg-bg-elevated border border-border-subtle"
      style={{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, gap: 6 }}
    >
      <Text style={{ fontFamily: tokens.fontFamily.monoMedium, fontSize: 34, lineHeight: 38, color: tokens.color.text.primary }}>
        {value}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontFamily: tokens.fontFamily.mono, fontSize: 10, letterSpacing: 1, color }} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tokens.color.bg.surface }}>
      <Text style={{ fontFamily: tokens.fontFamily.mono, fontSize: 12, color: tokens.color.text.primary }}>{text}</Text>
    </View>
  );
}

function RowTitle({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row justify-between items-baseline">
      <Text style={{ fontFamily: tokens.fontFamily.medium, fontSize: 15, color: tokens.color.text.primary }}>{label}</Text>
      <Text style={{ fontFamily: tokens.fontFamily.monoMedium, fontSize: 15, color: tokens.color.text.primary }}>{value}</Text>
    </View>
  );
}

function GameListRow({ label, games }: { label: string; games: RecapGame[] }) {
  return (
    <View className="gap-1">
      <RowTitle label={label} value={games.length} />
      <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 13, color: tokens.color.text.secondary }} numberOfLines={2}>
        {games.map((g) => g.title).join(' · ')}
      </Text>
    </View>
  );
}

function Cover({ game, onPress }: { game: RecapGame; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={game.title} style={{ width: 72 }}>
      <View style={{ width: 72, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: tokens.color.bg.surface }}>
        {game.coverUrl && (
          <Image
            source={{ uri: sizedImageUrl(game.coverUrl, 640) }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        )}
      </View>
    </Pressable>
  );
}

function BigNumber({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text style={{ fontFamily: tokens.fontFamily.monoMedium, fontSize: 24, color: tokens.color.text.primary }}>{value}</Text>
      <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.secondary }}>{label}</Text>
    </View>
  );
}

function HighlightRow({
  label,
  title,
  score,
  color,
  onPress,
}: {
  label: string;
  title: string;
  score: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-between rounded-lg bg-bg-surface px-3 py-3 active:opacity-80"
    >
      <View className="flex-1 gap-0.5 pr-3">
        <Text style={[eyebrow, { fontSize: 10 }]}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: tokens.fontFamily.medium, fontSize: 15, color: tokens.color.text.primary }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={{ fontFamily: tokens.fontFamily.monoMedium, fontSize: 16, color }}>{score}</Text>
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="px-5 gap-4 mt-4">
      <Skeleton width="40%" height={14} className="rounded-md" />
      <Skeleton width="80%" height={36} className="rounded-md" />
      <Skeleton width="100%" height={40} className="rounded-md" />
      <View className="flex-row gap-2">
        <Skeleton width="32%" height={80} className="rounded-xl" />
        <Skeleton width="32%" height={80} className="rounded-xl" />
        <Skeleton width="32%" height={80} className="rounded-xl" />
      </View>
      <Skeleton width="100%" height={160} className="rounded-xl" />
      <Skeleton width="100%" height={180} className="rounded-xl" />
    </View>
  );
}
