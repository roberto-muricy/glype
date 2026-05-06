import { Pressable, Text, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const pillVariants = cva(
  'flex-row items-center justify-center rounded-pill border px-4 py-2',
  {
    variants: {
      variant: {
        default: 'border-border bg-bg-elevated',
        active: 'border-brand-primary bg-brand-primary/10',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const labelVariants = cva('text-body font-medium', {
  variants: {
    variant: {
      default: 'text-text-body',
      active: 'text-brand-primary',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface PillProps
  extends Omit<PressableProps, 'children' | 'style'>,
    VariantProps<typeof pillVariants> {
  label: string;
  className?: string;
}

/** Pill clicável para gêneros, filtros e categorias. */
export function Pill({ label, variant, className, ...rest }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: variant === 'active' }}
      className={cn(pillVariants({ variant }), className)}
      {...rest}
    >
      <Text className={labelVariants({ variant })}>{label}</Text>
    </Pressable>
  );
}
