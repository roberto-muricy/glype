// Tile genérico: número grande + label + (opcional) sub-stat.
// Usado na grid de estatísticas no topo da tela de Stats.

import { Text, View } from 'react-native';
import { tokens } from '@/src/theme/tokens';

export interface StatTileProps {
  value: string;
  label: string;
  /** Texto auxiliar abaixo do label (ex.: "+5 esse mês") */
  hint?: string;
  /** Cor do número grande. Default: text-primary. */
  accentColor?: string;
}

export function StatTile({ value, label, hint, accentColor }: StatTileProps) {
  return (
    <View
      className="flex-1 rounded-xl bg-bg-elevated border border-border-subtle p-4"
      style={{ minHeight: 96 }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamily.medium,
          fontSize: 28,
          color: accentColor ?? tokens.color.text.primary,
          lineHeight: 32,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontFamily.regular,
          fontSize: 12,
          color: tokens.color.text.secondary,
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {hint && (
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 11,
            color: tokens.color.text.tertiary,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
