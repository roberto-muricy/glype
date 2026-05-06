import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

export interface ScoreSource {
  source: string;
  score: number;
  max: number;
}

export interface ScoresAggregateBlockProps {
  sources: ScoreSource[];
  className?: string;
}

/** Bloco com gradient brand mostrando média ponderada + fontes individuais. */
export function ScoresAggregateBlock({ sources, className }: ScoresAggregateBlockProps) {
  // Normaliza tudo em 0–10 e tira média simples — ponderação real fica
  // a cargo do consumidor se quiser, mas o default é fair quando todas
  // as fontes têm peso similar.
  const normalized = sources.map((s) => (s.score / s.max) * 10);
  const avg =
    normalized.length > 0
      ? normalized.reduce((sum, n) => sum + n, 0) / normalized.length
      : 0;

  return (
    <LinearGradient
      colors={[tokens.color.brand.dark, tokens.color.bg.elevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={cn('rounded-xl border border-border-accent p-5', className)}
    >
      <View className="flex-row items-baseline gap-2">
        <Text className="text-display-1 text-text-primary">
          {avg.toFixed(1)}
        </Text>
        <Text className="text-body text-text-secondary">/ 10</Text>
      </View>
      <Text className="text-section uppercase text-brand-muted mt-1">
        Média agregada
      </Text>

      <View className="mt-4 gap-3">
        {sources.map((s) => {
          const pct = Math.max(0, Math.min(100, (s.score / s.max) * 100));
          return (
            <View key={s.source}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-body text-text-body">{s.source}</Text>
                <Text className="text-body font-medium text-text-primary">
                  {s.score} / {s.max}
                </Text>
              </View>
              <View className="h-1 w-full rounded-full bg-bg-surface overflow-hidden">
                <View
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${pct}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}
