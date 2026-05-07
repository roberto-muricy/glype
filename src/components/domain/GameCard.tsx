import { Image, Pressable, Text, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { ScoreBadge } from './ScoreBadge';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const cardVariants = cva('overflow-hidden rounded-xl bg-bg-elevated', {
  variants: {
    size: {
      sm: 'w-[130px]',
      md: 'w-[100px]',
      lg: 'w-full',
    },
  },
  defaultVariants: { size: 'sm' },
});

const coverVariants = cva('w-full', {
  variants: {
    size: {
      sm: 'h-[160px]',
      md: 'h-[100px]',
      lg: 'aspect-[16/9]',
    },
  },
  defaultVariants: { size: 'sm' },
});

export interface GameCardProps
  extends Omit<PressableProps, 'children' | 'style'>,
    VariantProps<typeof cardVariants> {
  title: string;
  genre?: string;
  coverUrl?: string | null;
  score?: number | null;
  className?: string;
}

/** Capa de jogo. Score canto inferior; gradient fallback quando sem cover. */
export function GameCard({
  title,
  genre,
  coverUrl,
  score,
  size,
  className,
  ...rest
}: GameCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      className={cn(cardVariants({ size }), className)}
      style={animatedStyle}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      {...rest}
    >
      <View className="relative">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            accessibilityIgnoresInvertColors
            className={coverVariants({ size })}
          />
        ) : (
          <LinearGradient
            colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
            className={coverVariants({ size })}
          >
            <View className="flex-1 items-center justify-center p-2">
              <Text
                className="text-center text-body font-medium text-text-secondary"
                numberOfLines={3}
              >
                {title}
              </Text>
            </View>
          </LinearGradient>
        )}
        {score != null && (
          <View className="absolute bottom-2 left-2">
            <ScoreBadge score={score} size="sm" />
          </View>
        )}
      </View>
      {(size === 'sm' || size === 'lg') && (
        <View className="px-3 py-2">
          <Text
            className="text-body font-medium text-text-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          {genre != null && (
            <Text className="text-caption text-text-secondary mt-0.5">
              {genre}
            </Text>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}
