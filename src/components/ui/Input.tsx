import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { SearchIcon } from './icons';

const containerVariants = cva(
  'flex-row items-center rounded-xl border bg-bg-elevated px-4',
  {
    variants: {
      focused: {
        true: 'border-brand-primary',
        false: 'border-border',
      },
      size: {
        md: 'h-11',
        lg: 'h-14',
      },
    },
    defaultVariants: { focused: false, size: 'md' },
  },
);

export interface InputProps
  extends Omit<TextInputProps, 'style' | 'placeholderTextColor'>,
    VariantProps<typeof containerVariants> {
  variant?: 'default' | 'search';
  containerClassName?: string;
  className?: string;
}

/** Campo de texto. `variant="search"` adiciona ícone de lupa à esquerda. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    variant = 'default',
    size,
    containerClassName,
    className,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={cn(containerVariants({ focused, size }), containerClassName)}
    >
      {variant === 'search' && (
        <View className="mr-2">
          <SearchIcon size={16} color={tokens.color.text.secondary} />
        </View>
      )}
      <TextInput
        ref={ref}
        className={cn('flex-1 text-body-lg text-text-primary font-sans', className)}
        placeholderTextColor={tokens.color.text.tertiary}
        selectionColor={tokens.color.brand.primary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
});
