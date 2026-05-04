import { Stack } from 'expo-router';
import '../global.css';

// Root layout. A navegação condicional baseada em sessão é
// implementada no Entregável 8.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
