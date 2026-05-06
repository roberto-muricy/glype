import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/src/utils/cn';

export interface SectionHeaderProps {
  title: string;
  rightSlot?: ReactNode;
  className?: string;
}

/** Cabeçalho de seção. Título uppercase, tracking 0.08em, brand muted. */
export function SectionHeader({ title, rightSlot, className }: SectionHeaderProps) {
  return (
    <View
      className={cn('flex-row items-center justify-between px-5 py-3', className)}
    >
      <Text className="text-section uppercase text-brand-muted">{title}</Text>
      {rightSlot != null && <View>{rightSlot}</View>}
    </View>
  );
}
