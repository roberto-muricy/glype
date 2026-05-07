import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import {
  HomeIcon,
  HomeFilledIcon,
  SearchTabIcon,
  SearchIcon as SearchIconFilled,
  LibraryIcon,
  LibraryFilledIcon,
  PersonIcon,
  PersonFilledIcon,
  PlusIcon,
} from '../ui/icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mapeamento por nome de rota → par de ícones (off / on).
const TAB_ICONS: Record<string, { Off: React.FC<{ size?: number; color?: string }>; On: React.FC<{ size?: number; color?: string }> }> = {
  index: { Off: HomeIcon, On: HomeFilledIcon },
  search: { Off: SearchTabIcon, On: SearchIconFilled },
  library: { Off: LibraryIcon, On: LibraryFilledIcon },
  profile: { Off: PersonIcon, On: PersonFilledIcon },
};

const TAB_LABEL: Record<string, string> = {
  index: 'Home',
  search: 'Busca',
  library: 'Biblioteca',
  profile: 'Perfil',
};

/**
 * Tab bar custom com 4 tabs + botão central destacado de "+ review".
 * Plug direto em <Tabs tabBar={(props) => <BottomTabBar {...props} />} />.
 * O botão "+ review" é apenas visual nesta fase — destino real na Fase 3.
 */
export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const plusScale = useSharedValue(1);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusScale.value }] }));
  // Insere um item "spacer" no meio para o botão de + review se sobrepor.
  const half = Math.ceil(state.routes.length / 2);
  const left = state.routes.slice(0, half);
  const right = state.routes.slice(half);

  const renderTab = (
    route: BottomTabBarProps['state']['routes'][number],
    routeIndex: number,
  ) => {
    const isFocused = state.index === routeIndex;
    const icons = TAB_ICONS[route.name];
    if (icons == null) return null;
    const Icon = isFocused ? icons.On : icons.Off;
    const color = isFocused ? tokens.color.brand.primary : tokens.color.text.secondary;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={TAB_LABEL[route.name] ?? route.name}
        className="flex-1 items-center justify-center gap-1 py-2"
      >
        <Icon size={22} color={color} />
        <Text
          className={cn(
            'text-caption',
            isFocused ? 'text-brand-primary font-medium' : 'text-text-secondary',
          )}
        >
          {TAB_LABEL[route.name] ?? route.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="border-t border-border-subtle bg-bg-secondary"
      style={{ paddingBottom: 16 }}
    >
      <View className="flex-row items-center">
        {left.map((r) => renderTab(r, state.routes.indexOf(r)))}
        <View className="w-16" />
        {right.map((r) => renderTab(r, state.routes.indexOf(r)))}
      </View>

      {/* Botão central de + review */}
      <View className="absolute left-0 right-0 items-center" style={{ top: -22 }}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Novo review"
          hitSlop={8}
          style={plusStyle}
          className="h-14 w-14 items-center justify-center rounded-full bg-brand-primary"
          onPressIn={() => { plusScale.value = withSpring(0.92, { damping: 15, stiffness: 400 }); }}
          onPressOut={() => { plusScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/review/pick-game' as never);
          }}
        >
          <PlusIcon size={26} color={tokens.color.text.primary} />
        </AnimatedPressable>
      </View>
    </View>
  );
}
