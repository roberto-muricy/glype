import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthBootstrap } from '@/src/hooks/useAuth';
import { useAuthStore } from '@/src/stores/auth';
import { queryClient } from '@/src/lib/queryClient';
import { tokens } from '@/src/theme/tokens';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inDev = segments[0] === 'dev';
    if (inDev) return;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && inAuthGroup) {
      // Após login/signup: onboarding se sem gêneros, tabs se já configurado
      const needsOnboarding = profile && (profile.favorite_genres?.length ?? 0) === 0;
      router.replace(needsOnboarding ? '/onboarding' : '/(tabs)');
      return;
    }

    if (session && !inOnboarding && !inAuthGroup && segments[0] !== '(tabs)') {
      // Garante que rotas desconhecidas com sessão vão para tabs
      return;
    }
  }, [isLoading, session, profile, segments, router]);

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
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="game/[rawgId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review/pick-game" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review/[reviewId]" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/[userId]" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/followers" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile/top-games" options={{ presentation: 'card' }} />
      <Stack.Screen name="collection/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
      <Stack.Screen name="dev/components" options={{ presentation: 'modal' }} />
      <Stack.Screen name="dev/data" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useAuthBootstrap();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
