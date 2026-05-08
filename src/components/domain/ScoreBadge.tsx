import { Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

const badgeVariants = cva('items-center justify-center rounded-md px-2 py-1', {
  variants: {
    variant: {
      solid: 'bg-brand-primary',
      outline: 'border border-brand-primary bg-transparent',
    },
    size: {
      sm: 'min-w-[28px]',
      md: 'min-w-[36px]',
    },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});

const labelVariants = cva('font-medium', {
  variants: {
    variant: {
      solid: 'text-text-primary',
      outline: 'text-brand-primary',
    },
    size: {
      sm: 'text-caption',
      md: 'text-body',
    },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});

export interface ScoreBadgeProps extends VariantProps<typeof badgeVariants> {
  score: number;
  className?: string;
}

/** Exibe um score numérico (0–10) com a paleta do design system. */
export function ScoreBadge({ score, variant, size, className }: ScoreBadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant, size }), className)}>
      <Text
        className={labelVariants({ variant, size })}
        style={{ fontFamily: tokens.fontFamily.monoMedium }}
      >
        {score.toFixed(1)}
      </Text>
    </View>
  );
}
