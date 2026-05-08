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
      style={{
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        borderColor: tokens.color.border.accent,
        padding: 20,
      }}
      className={cn(className)}
    >
      {/* Média */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text className="text-display-1 text-text-primary">
          {avg.toFixed(1)}
        </Text>
        <Text className="text-body text-text-secondary">/ 10</Text>
      </View>
      <Text className="text-section uppercase text-brand-muted" style={{ marginTop: 4 }}>
        Média agregada
      </Text>

      {/* Fontes individuais */}
      <View style={{ marginTop: 16, gap: 12 }}>
        {sources.map((s) => {
          const pct = Math.max(0, Math.min(100, (s.score / s.max) * 100));
          return (
            <View key={s.source}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text className="text-body text-text-body">{s.source}</Text>
                <Text className="text-body font-medium text-text-primary">
                  {s.score} / {s.max}
                </Text>
              </View>
              <View
                style={{
                  height: 4,
                  width: '100%',
                  borderRadius: 999,
                  backgroundColor: tokens.color.bg.surface,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: tokens.color.brand.primary,
                    width: `${pct}%`,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}
