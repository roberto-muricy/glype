import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

export interface ScoreSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
}

// Faixas semânticas inspiradas em rótulos editoriais (Metacritic-ish).
function semanticLabel(value: number): string {
  if (value <= 0) return 'sem nota';
  if (value < 3) return 'fraco';
  if (value < 5) return 'mediano';
  if (value < 7) return 'bom';
  if (value < 8.5) return 'muito bom';
  if (value < 9.5) return 'excelente';
  return 'obra-prima';
}

/** Slider 0–10 com step 0.5, número grande e label semântica. */
export function ScoreSlider({ value, onValueChange, className }: ScoreSliderProps) {
  return (
    <View className={cn('gap-3', className)}>
      <View className="flex-row items-baseline gap-2">
        <Text className="text-display-1 text-text-primary">
          {value.toFixed(1)}
        </Text>
        <Text className="text-body text-text-secondary">/ 10</Text>
      </View>
      <Text className="text-section uppercase text-brand-muted">
        {semanticLabel(value)}
      </Text>
      <Slider
        value={value}
        minimumValue={0}
        maximumValue={10}
        step={0.5}
        onValueChange={onValueChange}
        minimumTrackTintColor={tokens.color.brand.primary}
        maximumTrackTintColor={tokens.color.bg.surface}
        thumbTintColor={tokens.color.brand.primary}
        accessibilityLabel="Nota"
      />
    </View>
  );
}
