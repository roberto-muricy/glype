import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { tokens } from '@/src/theme/tokens';
import { CheckIcon } from './icons';

export interface ActionSheetItem {
  label: string;
  /** Texto pequeno de apoio abaixo do label (opcional). */
  sublabel?: string;
  /** Ícone à esquerda (opcional). Use o componente bruto, ex: <TrashIcon size={20} color={...} /> */
  icon?: ReactNode;
  onPress: () => void;
  /** Estilo destrutivo (texto vermelho). */
  destructive?: boolean;
  /** Marca a opção como selecionada (destaque + checkmark à direita). */
  selected?: boolean;
  disabled?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Título opcional acima das ações. */
  title?: string;
  /** Subtítulo opcional pequeno abaixo do título. */
  subtitle?: string;
  actions: ActionSheetItem[];
  /** Label do botão de cancelar. Default: "Cancelar". */
  cancelLabel?: string;
}

/**
 * Bottom sheet customizado, tema dark, animado.
 * Substitui ActionSheetIOS/Alert nas telas que precisam de menu de ações.
 */
export function ActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
  cancelLabel = 'Cancelar',
}: ActionSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop com fade */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>

        {/* Sheet com slide */}
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={styles.sheetWrapper}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            {/* Drag handle decorativo */}
            <View style={styles.handle} />

            {/* Título / subtítulo */}
            {(title || subtitle) && (
              <View style={styles.header}>
                {title && (
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            )}

            {/* Ações */}
            <View style={styles.actionsList}>
              {actions.map((action, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    onClose();
                    // pequeno delay pro fechamento ficar suave antes da ação
                    setTimeout(action.onPress, 100);
                  }}
                  disabled={action.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityState={{ selected: action.selected, disabled: action.disabled }}
                  android_ripple={{ color: tokens.color.bg.surface }}
                  style={[
                    styles.actionRow,
                    action.selected && styles.actionRowSelected,
                    action.disabled && styles.actionRowDisabled,
                  ]}
                >
                  {action.icon && <View style={styles.actionIcon}>{action.icon}</View>}
                  <View style={styles.actionTextWrap}>
                    <Text
                      style={[
                        styles.actionLabel,
                        action.destructive && styles.actionLabelDestructive,
                        action.selected && styles.actionLabelSelected,
                      ]}
                    >
                      {action.label}
                    </Text>
                    {action.sublabel && (
                      <Text style={styles.actionSublabel}>{action.sublabel}</Text>
                    )}
                  </View>
                  {action.selected && (
                    <CheckIcon size={18} color={tokens.color.brand.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Cancelar */}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              android_ripple={{ color: tokens.color.bg.surface }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: tokens.color.bg.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: tokens.color.border.subtle,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.border.DEFAULT,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontFamily: tokens.fontFamily.medium,
    fontSize: 16,
    color: tokens.color.text.primary,
  },
  subtitle: {
    fontFamily: tokens.fontFamily.regular,
    fontSize: 12,
    color: tokens.color.text.secondary,
    marginTop: 2,
  },
  actionsList: {
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  actionRowSelected: {
    backgroundColor: tokens.color.bg.surface,
  },
  actionRowDisabled: {
    opacity: 0.4,
  },
  actionIcon: {
    width: 24,
    alignItems: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: tokens.fontFamily.medium,
    fontSize: 16,
    color: tokens.color.text.primary,
  },
  actionLabelDestructive: {
    color: tokens.color.semantic.danger,
  },
  actionLabelSelected: {
    color: tokens.color.brand.primary,
  },
  actionSublabel: {
    fontFamily: tokens.fontFamily.regular,
    fontSize: 12,
    color: tokens.color.text.secondary,
    marginTop: 2,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: tokens.color.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.color.border.subtle,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: tokens.fontFamily.medium,
    fontSize: 15,
    color: tokens.color.text.secondary,
  },
});
