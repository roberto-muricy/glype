import { Image, Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const avatarVariants = cva('items-center justify-center rounded-full', {
  variants: {
    size: {
      sm: 'h-7 w-7',
      md: 'h-10 w-10',
      lg: 'h-16 w-16',
    },
  },
  defaultVariants: { size: 'md' },
});

const labelVariants = cva('font-medium text-text-primary', {
  variants: {
    size: {
      sm: 'text-caption',
      md: 'text-body',
      lg: 'text-h2',
    },
  },
  defaultVariants: { size: 'md' },
});

// Paleta determinística pelo hash do username — variações suaves
// para distinguir avatares sem destoar do tema dark.
const FALLBACK_BGS = [
  '#1a3a6a',
  '#2a3a5a',
  '#1f2d4a',
  '#2d2447',
  '#1a4a4a',
  '#3a2a4a',
] as const;

function hashIndex(input: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  uri?: string | null;
  name: string;
  className?: string;
}

/** Avatar circular. Mostra `uri` quando disponível, senão iniciais sobre cor derivada do nome. */
export function Avatar({ uri, name, size, className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  const bg = FALLBACK_BGS[hashIndex(name, FALLBACK_BGS.length)];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        className={cn(avatarVariants({ size }), className)}
      />
    );
  }

  return (
    <View
      style={{ backgroundColor: bg }}
      className={cn(avatarVariants({ size }), className)}
    >
      <Text className={labelVariants({ size })}>{initials || '?'}</Text>
    </View>
  );
}
