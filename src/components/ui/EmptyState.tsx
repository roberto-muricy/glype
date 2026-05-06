import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/src/utils/cn';

export interface EmptyStateProps {
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
      {icon != null && (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
          {icon}
        </View>
      )}
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
