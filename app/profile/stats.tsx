// Tela de estatísticas do usuário — gráficos de notas/gêneros/atividade.
//
// Acessada via Perfil → Estatísticas.

import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, Skeleton } from '@/src/components/ui';
import { StatTile } from '@/src/components/domain/charts/StatTile';
import { BarChart } from '@/src/components/domain/charts/BarChart';
import { GenreBar } from '@/src/components/domain/charts/GenreBar';
import { useDetailedStats } from '@/src/hooks/useProfile';
import { trackScreen } from '@/src/lib/analytics';
import { tokens } from '@/src/theme/tokens';

export default function StatsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading } = useDetailedStats();

  useEffect(() => {
    trackScreen('stats');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      {/* ─── Header ─── */}
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: tokens.color.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: tokens.color.text.primary, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text className="text-h1 text-text-primary">{t('stats.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {isLoading ? (
          <LoadingState />
        ) : !stats || stats.reviewsCount === 0 ? (
          <View className="mt-12 px-5">
            <EmptyState
              title={t('stats.empty')}
              action={
                <Button
                  label={t('stats.writeFirstReview')}
                  size="sm"
                  variant="primary"
                  onPress={() => router.push('/review/pick-game' as never)}
                />
              }
            />
          </View>
        ) : (
          <View className="gap-6">
            {/* ─── Stat tiles ─── */}
            <View className="px-5 gap-3">
              <View className="flex-row gap-3">
                <StatTile
                  value={String(stats.reviewsCount)}
                  label={t('stats.reviewsWritten')}
                />
                <StatTile
                  value={
                    stats.averageScore != null
                      ? stats.averageScore.toLocaleString(i18n.language, {
                          maximumFractionDigits: 1,
                        })
                      : '—'
                  }
                  label={t('stats.averageScore')}
                  accentColor={tokens.color.brand.primary}
                />
              </View>
              <View className="flex-row gap-3">
                <StatTile
                  value={`${stats.totalPlaytimeHours.toLocaleString(i18n.language)}${t('stats.hours')}`}
                  label={t('stats.totalPlaytime')}
                />
                <StatTile
                  value={String(stats.completedCount)}
                  label={t('stats.completedGames')}
                  hint={
                    stats.reviewsCount > 0
                      ? `${Math.round((stats.completedCount / stats.reviewsCount) * 100)}%`
                      : undefined
                  }
                />
              </View>
            </View>

            {/* ─── Distribuição de notas ─── */}
            <View>
              <SectionHeaderWithHint
                title={t('stats.scoreDistribution')}
                hint={t('stats.scoreDistributionHint')}
              />
              <View
                className="mx-5 rounded-xl bg-bg-elevated border border-border-subtle p-4"
              >
                <BarChart
                  data={stats.scoreDistribution.map((s) => ({
                    label: s.label,
                    value: s.count,
                  }))}
                  height={140}
                />
              </View>
            </View>

            {/* ─── Top gêneros ─── */}
            {stats.topGenres.length > 0 && (
              <View>
                <SectionHeaderWithHint
                  title={t('stats.topGenres')}
                  hint={t('stats.topGenresHint')}
                />
                <View
                  className="mx-5 rounded-xl bg-bg-elevated border border-border-subtle p-4"
                >
                  {stats.topGenres.map((g) => (
                    <GenreBar
                      key={g.genre}
                      label={g.genre}
                      value={g.count}
                      maxValue={stats.topGenres[0]!.count}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ─── Atividade mensal ─── */}
            <View>
              <SectionHeaderWithHint
                title={t('stats.monthlyActivity')}
                hint={t('stats.monthlyActivityHint')}
              />
              <View
                className="mx-5 rounded-xl bg-bg-elevated border border-border-subtle p-4"
              >
                <BarChart
                  data={stats.monthlyActivity.map((m) => ({
                    label: formatMonthLabel(m.month, i18n.language),
                    value: m.count,
                  }))}
                  height={120}
                  showValues={false}
                  hideEmptyLabels
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View className="px-5 gap-4 mt-2">
      <View className="flex-row gap-3">
        <Skeleton width="48%" height={96} className="rounded-xl" />
        <Skeleton width="48%" height={96} className="rounded-xl" />
      </View>
      <View className="flex-row gap-3">
        <Skeleton width="48%" height={96} className="rounded-xl" />
        <Skeleton width="48%" height={96} className="rounded-xl" />
      </View>
      <Skeleton width="100%" height={180} className="rounded-xl" />
      <Skeleton width="100%" height={200} className="rounded-xl" />
      <Skeleton width="100%" height={160} className="rounded-xl" />
    </View>
  );
}

/** Section header com hint/subtitle abaixo do título — local porque
 * o SectionHeader global não suporta. */
function SectionHeaderWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <View className="px-5 pt-3 pb-2">
      <Text className="text-section uppercase text-brand-muted">{title}</Text>
      <Text
        style={{
          fontFamily: tokens.fontFamily.regular,
          fontSize: 12,
          color: tokens.color.text.tertiary,
          marginTop: 2,
        }}
      >
        {hint}
      </Text>
    </View>
  );
}

/** Converte "2026-05" em "mai" (PT) / "May" (EN) / "may" (ES). */
function formatMonthLabel(yyyymm: string, locale: string): string {
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
}
