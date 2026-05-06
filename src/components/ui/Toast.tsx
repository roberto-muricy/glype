import { Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { CheckIcon, InfoIcon, WarningIcon } from './icons';

const toastVariants = cva(
  'flex-row items-center gap-3 rounded-xl bg-bg-elevated px-4 py-3 border-l-4',
  {
    variants: {
      variant: {
        success: 'border-l-semantic-success',
        danger: 'border-l-semantic-danger',
        info: 'border-l-brand-primary',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const ICON_BY_VARIANT = {
  success: { Icon: CheckIcon, color: tokens.color.semantic.success },
  danger: { Icon: WarningIcon, color: tokens.color.semantic.danger },
  info: { Icon: InfoIcon, color: tokens.color.brand.primary },
} as const;

export interface ToastProps extends VariantProps<typeof toastVariants> {
  title: string;
  description?: string;
  className?: string;
}

/** Notificação inline. Border esquerda colorida + ícone + texto. */
export function Toast({ title, description, variant = 'info', className }: ToastProps) {
  const { Icon, color } = ICON_BY_VARIANT[variant ?? 'info'];
  return (
    <View className={cn(toastVariants({ variant }), className)}>
      <Icon size={20} color={color} />
      <View className="flex-1">
        <Text className="text-body-lg font-medium text-text-primary">{title}</Text>
        {description != null && (
          <Text className="text-body text-text-body mt-0.5">{description}</Text>
        )}
      </View>
    </View>
  );
}
