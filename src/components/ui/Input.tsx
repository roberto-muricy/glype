import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { SearchIcon } from './icons';

// Altura MÍNIMA, não fixa: com a fonte do sistema aumentada (comum em
// aparelhos Samsung) o campo precisa crescer junto, senão o texto é cortado.
const containerVariants = cva(
  'flex-row items-center rounded-xl border bg-bg-elevated px-4',
  {
    variants: {
      focused: {
        true: 'border-brand-primary',
        false: 'border-border',
      },
      size: {
        md: 'min-h-11',
        lg: 'min-h-14',
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
        className={cn('flex-1 text-text-primary font-sans', className)}
        style={styles.input}
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

const styles = StyleSheet.create({
  // Tipografia do `text-body-lg` sem o lineHeight: no Android, lineHeight fixo
  // em TextInput corta o topo das letras quando a fonte do sistema aumenta.
  // O padding vertical explícito iguala a altura no iOS e no Android e deixa o
  // container crescer quando o texto cresce.
  input: {
    fontSize: 15,
    letterSpacing: -0.08,
    paddingVertical: 10,
  },
});
