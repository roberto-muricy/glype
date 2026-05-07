import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

const buttonVariants = cva('flex-row items-center justify-center rounded-xl', {
  variants: {
    variant: {
      primary: 'bg-brand-primary',
      secondary: 'bg-bg-elevated border border-border',
      ghost: 'bg-transparent',
      icon: 'bg-bg-elevated rounded-full',
    },
    size: {
      sm: 'h-8 px-3 gap-1.5',
      md: 'h-11 px-5 gap-2',
      lg: 'h-14 px-6 gap-2',
    },
    disabled: {
      true: 'opacity-50',
      false: '',
    },
  },
  compoundVariants: [
    { variant: 'icon', size: 'sm', class: 'h-8 w-8 px-0' },
    { variant: 'icon', size: 'md', class: 'h-11 w-11 px-0' },
    { variant: 'icon', size: 'lg', class: 'h-14 w-14 px-0' },
  ],
  defaultVariants: { variant: 'primary', size: 'md', disabled: false },
});

const labelVariants = cva('font-medium', {
  variants: {
    variant: {
      primary: 'text-text-primary',
      secondary: 'text-text-primary',
      ghost: 'text-brand-primary',
      icon: 'text-text-primary',
    },
    size: {
      sm: 'text-caption',
      md: 'text-body-lg',
      lg: 'text-body-lg',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export interface ButtonProps
  extends Omit<PressableProps, 'children' | 'disabled' | 'style'>,
    VariantProps<typeof buttonVariants> {
  label?: string;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Botão padrão do design system com animação de pressão e haptic. */
export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    icon,
    loading = false,
    variant,
    size,
    disabled,
    className,
    children,
    accessibilityLabel,
    onPress,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled === true || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (!isDisabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress?.(e);
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className={cn(
          buttonVariants({ variant, size, disabled: isDisabled }),
          className,
        )}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'ghost' ? tokens.color.brand.primary : tokens.color.text.primary
            }
          />
        ) : (
          <>
            {icon}
            {label != null && (
              <Text className={labelVariants({ variant, size })}>{label}</Text>
            )}
            {children}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
});
