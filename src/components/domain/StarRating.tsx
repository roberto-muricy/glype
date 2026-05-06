import { Pressable, View } from 'react-native';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { StarIcon, StarHalfIcon, StarOutlineIcon } from '../ui/icons';

export interface StarRatingProps {
  /** Valor 0–10. Cada estrela representa 2 pontos; meio ponto suportado. */
  value: number;
  /** Tamanho de cada estrela em pixels. */
  size?: number;
  /** Quando definido, vira interativo e chama com novo valor (0–10, step 1). */
  onChange?: (value: number) => void;
  className?: string;
}

const STARS = 5;

/** 5 estrelas representando 0–10, com meio ponto. */
export function StarRating({ value, size = 20, onChange, className }: StarRatingProps) {
  const interactive = onChange != null;
  // Cada estrela = 2 pontos; clique no índice i preenche até (i+1)*2.
  const cells = Array.from({ length: STARS });

  return (
    <View
      className={cn('flex-row gap-1', className)}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={`${value.toFixed(1)} de 10`}
    >
      {cells.map((_, i) => {
        const filledThreshold = (i + 1) * 2;
        const halfThreshold = i * 2 + 1;
        let Icon = StarOutlineIcon;
        if (value >= filledThreshold) Icon = StarIcon;
        else if (value >= halfThreshold) Icon = StarHalfIcon;

        const star = (
          <Icon
            size={size}
            color={
              value >= halfThreshold
                ? tokens.color.brand.primary
                : tokens.color.text.tertiary
            }
          />
        );

        if (!interactive) return <View key={i}>{star}</View>;
        return (
          <Pressable
            key={i}
            onPress={() => onChange?.(filledThreshold)}
            accessibilityRole="button"
            accessibilityLabel={`${filledThreshold} de 10`}
            hitSlop={6}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
