import { Tabs } from 'expo-router';
import { tokens } from '@/src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.color.bg.primary },
        tabBarStyle: {
          backgroundColor: tokens.color.bg.secondary,
          borderTopColor: tokens.color.border.subtle,
        },
        tabBarActiveTintColor: tokens.color.brand.primary,
        tabBarInactiveTintColor: tokens.color.text.secondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Busca' }} />
      <Tabs.Screen name="library" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
