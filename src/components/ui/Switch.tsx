import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

const TRACK_W = 44;
const TRACK_H = 26;
const KNOB = 22;

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

/** Toggle iOS-style. `bg-bg-surface` (off) / `bg-brand-primary` (on). */
export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  className,
}: SwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [tokens.color.bg.surface, tokens.color.brand.primary],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - KNOB - 2) }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      className={cn(disabled && 'opacity-50', className)}
    >
      <Animated.View
        style={[
          trackStyle,
          { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, padding: 1 },
        ]}
      >
        <Animated.View
          style={[
            knobStyle,
            {
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              backgroundColor: tokens.color.text.primary,
            },
          ]}
        />
      </Animated.View>
      <View />
    </Pressable>
  );
}
