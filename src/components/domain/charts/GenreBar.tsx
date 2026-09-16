// Barra horizontal pra ranking de gêneros (lista vertical, cada item com
// barra de largura proporcional + count à direita).

import { Text, View } from 'react-native';
import { tokens } from '@/src/theme/tokens';

export interface GenreBarProps {
  label: string;
  value: number;
  /** O maior valor da lista — usado pra calcular largura proporcional. */
  maxValue: number;
  /** Cor da barra (default: brand.primary com opacity por posição). */
  color?: string;
}

export function GenreBar({ label, value, maxValue, color }: GenreBarProps) {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  const barColor = color ?? tokens.color.brand.primary;

  return (
    <View style={{ paddingVertical: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 13,
            color: tokens.color.text.primary,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontFamily.monoMedium,
            fontSize: 12,
            color: tokens.color.text.tertiary,
            marginLeft: 8,
          }}
        >
          {value}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: tokens.color.bg.surface,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.max(2, ratio * 100)}%`,
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
