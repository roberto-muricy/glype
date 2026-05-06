import { Redirect, Stack } from 'expo-router';
import { tokens } from '@/src/theme/tokens';

// Bloqueia acesso ao sandbox em produção. Em DEV, deixa passar livre.
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.color.bg.primary },
      }}
    />
  );
}
