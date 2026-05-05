import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import { useAuthBootstrap } from '@/src/hooks/useAuth';
import { useAuthStore } from '@/src/stores/auth';
import { tokens } from '@/src/theme/tokens';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, session, segments, router]);

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-bg-primary"
        style={{ backgroundColor: tokens.color.bg.primary }}
      >
        <ActivityIndicator color={tokens.color.brand.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.color.bg.primary },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  useAuthBootstrap();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <AuthGate />
    </>
  );
}
