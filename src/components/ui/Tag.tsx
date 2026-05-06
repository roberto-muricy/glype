import { Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const tagVariants = cva('flex-row items-center self-start rounded-md px-2 py-0.5', {
  variants: {
    variant: {
      success: 'bg-semantic-success/15',
      danger: 'bg-semantic-danger/15',
      neutral: 'bg-bg-surface',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

const labelVariants = cva('text-caption font-medium', {
  variants: {
    variant: {
      success: 'text-semantic-success',
      danger: 'text-semantic-danger',
      neutral: 'text-text-body',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface TagProps extends VariantProps<typeof tagVariants> {
  label: string;
  className?: string;
}

/** Tag de metadata (Completou / Spoiler / Plataforma…). Sentence case, sem uppercase. */
export function Tag({ label, variant, className }: TagProps) {
  return (
    <View className={cn(tagVariants({ variant }), className)}>
      <Text className={labelVariants({ variant })}>{label}</Text>
    </View>
  );
}
