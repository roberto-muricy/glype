import { Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const badgeVariants = cva('flex-row items-center justify-center rounded-md px-2 py-1', {
  variants: {
    variant: {
      score: 'bg-brand-primary',
      platform: 'border border-brand-primary bg-transparent',
      external: 'bg-brand-primary/20',
    },
  },
  defaultVariants: { variant: 'score' },
});

const labelVariants = cva('text-caption font-medium', {
  variants: {
    variant: {
      score: 'text-text-primary',
      platform: 'text-brand-primary',
      external: 'text-brand-light',
    },
  },
  defaultVariants: { variant: 'score' },
});

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  className?: string;
}

/** Badge compacto. Use `score` para notas, `platform` para plataformas, `external` para fontes externas. */
export function Badge({ label, variant, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className={labelVariants({ variant })}>{label}</Text>
    </View>
  );
}
