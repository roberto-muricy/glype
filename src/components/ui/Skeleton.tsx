import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { cn } from '@/src/utils/cn';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  count?: number;
  className?: string;
}

/** Bloco animado para loading. Use `count` para múltiplas linhas. */
export function Skeleton({
  width = '100%',
  height = 12,
  count = 1,
  className,
}: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.5, 1]),
  }));

  const lines = Array.from({ length: count });

  return (
    <View className={cn('gap-2', className)}>
      {lines.map((_, i) => (
        <Animated.View
          key={i}
          style={[animatedStyle, { width, height }]}
          className="rounded-md bg-bg-surface"
        />
      ))}
    </View>
  );
}
