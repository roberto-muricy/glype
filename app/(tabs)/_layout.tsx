import { Tabs } from 'expo-router';
import { tokens } from '@/src/theme/tokens';
import { BottomTabBar } from '@/src/components/domain/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.color.bg.primary },
      }}
    >
      {/* Os labels visuais vêm do BottomTabBar via t() — title aqui só é usado em accessibility/devtools */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
