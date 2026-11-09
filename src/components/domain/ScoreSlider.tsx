import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';

export interface ScoreSliderProps {
  /** null = a pessoa ainda não escolheu. */
  value: number | null;
  onValueChange: (value: number) => void;
  className?: string;
}

/**
 * Onde o slider fica parado antes da primeira escolha. Só posição visual:
 * enquanto `value` é null, nenhuma nota é exibida nem publicada.
 */
const UNSET_POSITION = 5;

// Faixas semânticas inspiradas em rótulos editoriais (Metacritic-ish).
function semanticLabelKey(value: number): string {
  if (value <= 0) return 'none';
  if (value < 3) return 'weak';
  if (value < 5) return 'average';
  if (value < 7) return 'good';
  if (value < 8.5) return 'veryGood';
  if (value < 9.5) return 'excellent';
  return 'masterpiece';
}

/**
 * Slider 0–10 com step 0.5, número grande e label semântica.
 *
 * Começa sem nota. Antes abria em 8,0 com o botão de publicar ativo, e um
 * toque publicava uma review que a pessoa não escreveu: 74% das reviews
 * tinham nota 8, e a mediana entre abrir o editor e publicar era de 4s.
 */
export function ScoreSlider({ value, onValueChange, className }: ScoreSliderProps) {
  const { t } = useTranslation();
  const unset = value == null;
  return (
    <View className={cn('gap-3', className)}>
      <View className="flex-row items-baseline gap-2">
        <Text
          className={cn('text-display-1', unset ? 'text-text-tertiary' : 'text-text-primary')}
          style={{ fontFamily: tokens.fontFamily.monoMedium }}
        >
          {unset ? '–' : value.toFixed(1)}
        </Text>
        <Text
          className="text-body text-text-secondary"
          style={{ fontFamily: tokens.fontFamily.mono }}
        >
          / 10
        </Text>
      </View>
      <Text className="text-section uppercase text-brand-muted">
        {unset ? t('review.scoreHint') : t(`review.scoreLabels.${semanticLabelKey(value)}`)}
      </Text>
      <Slider
        value={value ?? UNSET_POSITION}
        minimumValue={0}
        maximumValue={10}
        step={0.5}
        onValueChange={onValueChange}
        minimumTrackTintColor={unset ? tokens.color.bg.surface : tokens.color.brand.primary}
        maximumTrackTintColor={tokens.color.bg.surface}
        thumbTintColor={unset ? tokens.color.text.tertiary : tokens.color.brand.primary}
        accessibilityLabel={t('review.scoreLabel')}
        accessibilityValue={unset ? { text: t('review.scoreUnset') } : { text: `${value.toFixed(1)} / 10` }}
      />
    </View>
  );
}
