import { forwardRef, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const cardVariants = cva('rounded-xl', {
  variants: {
    variant: {
      default: 'bg-bg-elevated border border-border',
      flat: 'bg-bg-elevated',
      gradient: 'bg-brand-dark border border-border-accent',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md' },
});

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  className?: string;
  children?: ReactNode;
}

/** Container com bg/border/radius do design system. */
export const Card = forwardRef<View, CardProps>(function Card(
  { variant, padding, className, children, ...rest },
  ref,
) {
  return (
    <View
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...rest}
    >
      {children}
    </View>
  );
});
