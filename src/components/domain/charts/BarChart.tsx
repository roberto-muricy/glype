// Bar chart vertical simples — barras com label embaixo + número em cima.
// Sem dependência externa, só View/Text — usado pra distribuição de notas
// e atividade mensal.

import { Text, View } from 'react-native';
import { tokens } from '@/src/theme/tokens';

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Altura total do gráfico em px. */
  height?: number;
  /** Mostra o número em cima de cada barra. */
  showValues?: boolean;
  /** Cor das barras. */
  color?: string;
  /** Label do eixo X mostrado apenas em barras com value > 0 (compacta vertical). */
  hideEmptyLabels?: boolean;
}

export function BarChart({
  data,
  height = 140,
  showValues = true,
  color,
  hideEmptyLabels = false,
}: BarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const barColor = color ?? tokens.color.brand.primary;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 6,
          height,
          paddingHorizontal: 4,
        }}
      >
        {data.map((d, i) => {
          const ratio = d.value / maxValue;
          // Altura mínima 4px pra barras com value > 0 — feedback visual
          const barHeight = d.value > 0 ? Math.max(4, ratio * (height - 24)) : 0;
          return (
            <View
              key={`${d.label}-${i}`}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {showValues && d.value > 0 && (
                <Text
                  style={{
                    fontFamily: tokens.fontFamily.monoMedium,
                    fontSize: 10,
                    color: tokens.color.text.secondary,
                    marginBottom: 4,
                  }}
                >
                  {d.value}
                </Text>
              )}
              <View
                style={{
                  width: '100%',
                  height: barHeight,
                  backgroundColor: barColor,
                  borderRadius: 4,
                  opacity: d.value > 0 ? 1 : 0.15,
                }}
              />
            </View>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          paddingHorizontal: 4,
          marginTop: 6,
        }}
      >
        {data.map((d, i) => {
          const showLabel = !hideEmptyLabels || d.value > 0;
          return (
            <View key={`${d.label}-label-${i}`} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: tokens.fontFamily.regular,
                  fontSize: 10,
                  color: tokens.color.text.tertiary,
                }}
                numberOfLines={1}
              >
                {showLabel ? d.label : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
