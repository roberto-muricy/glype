import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

export interface EmptyStateProps {
  /** Ícone customizado (ReactNode). Se omitido usa o símbolo da marca em texto. */
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/** Bloco para listas vazias. Ícone redondo + título + subtítulo opcional. */
export function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <View
      className={cn(
        'flex-1 items-center justify-center px-8 py-12',
        className,
      )}
    >
      <View
        className="mb-5 items-center justify-center rounded-full bg-bg-elevated"
        style={{ width: 64, height: 64 }}
      >
        {icon ?? (
          /* Marca Glype em texto — não depende de react-native-svg */
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 22,
              color: tokens.color.brand.primary,
              letterSpacing: -0.5,
            }}
          >
            G
          </Text>
        )}
      </View>
      <Text className="text-h2 text-text-primary text-center">{title}</Text>
      {subtitle != null && (
        <Text className="mt-2 text-body text-text-secondary text-center">
          {subtitle}
        </Text>
      )}
      {action != null && <View className="mt-5">{action}</View>}
    </View>
  );
}
