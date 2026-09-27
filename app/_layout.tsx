import { useEffect, useRef, useState } from 'react';
import { Stack, useNavigationContainerRef, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { initI18n } from '@/src/i18n';
import { initSentry } from '@/src/lib/sentry';
import { initAnalytics, track, trackScreen } from '@/src/lib/analytics';
import { ErrorBoundary } from '@/src/components/ui/ErrorBoundary';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Inicia i18n o quanto antes (top-level) — a Promise resolve antes do
// primeiro render que precisa de traduções.
const i18nReady = initI18n();

// Sentry deve ser inicializado antes de qualquer código que possa falhar.
// É síncrono — não precisa await.
initSentry();

// Analytics é assíncrono — inicia em background; eventos antes do init ficam buffered.
initAnalytics();

/**
 * Reporta cada tela ao PostHog a partir do roteador — num lugar só, em vez de
 * um useEffect em cada uma das 25 telas (onde a próxima tela sempre nasce sem
 * instrumentação). O nome vem do padrão da rota, `game/[rawgId]`, então os IDs
 * não viram telas diferentes no relatório.
 */
/**
 * Manda uma vez por abertura o estado do mecanismo de update.
 *
 * Em setembro descobrimos que os updates OTA não chegavam: de 27 pessoas
 * ativas depois de publicar, 2 rodavam o código novo. Só os eventos dizem se
 * o app chega a perguntar por update e o que o servidor responde — do lado de
 * cá tudo parecia certo. Falha nada disso derruba a abertura do app.
 */
function UpdatesReporter() {
  useEffect(() => {
    if (__DEV__) return; // em dev o expo-updates não roda

    const report = async () => {
      try {
        const Updates = await import('expo-updates');
        track('updates_status', {
          update_id: Updates.updateId ?? null,
          is_embedded: Updates.isEmbeddedLaunch,
          channel: Updates.channel ?? null,
          runtime_version: Updates.runtimeVersion ?? null,
          created_at: Updates.createdAt?.toISOString() ?? null,
          check_automatically: String(Updates.checkAutomatically),
        });

        const check = await Updates.checkForUpdateAsync();
        track('updates_check', {
          is_available: check.isAvailable,
          reason: 'reason' in check ? String(check.reason) : null,
        });
      } catch (e) {
        track('updates_check_failed', {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    };

    report();
  }, []);

  return null;
}

function ScreenTracker() {
  const navigation = useNavigationContainerRef();
  const lastScreen = useRef<string | null>(null);

  useEffect(() => {
    const report = () => {
      // Antes do container montar, getCurrentRoute só loga erro.
      if (!navigation.isReady()) return;
      const name = navigation.getCurrentRoute()?.name;
      // Trocar de aba emite vários eventos de state para a mesma tela.
      if (!name || name === lastScreen.current) return;
      // `__root`, `_sitemap` e afins são andaimes do expo-router, não tela.
      if (name.startsWith('_')) return;
      lastScreen.current = name;
      trackScreen(name);
    };

    report();
    // addListener antes do container montar entra numa fila do react-navigation.
    return navigation.addListener('state', report);
  }, [navigation]);

  return null;
}

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
      <Stack.Screen name="profile/language" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/stats" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/library" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/blocked" options={{ presentation: 'card' }} />
      <Stack.Screen name="collection/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="discover" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useAuthBootstrap();

  const [i18nLoaded, setI18nLoaded] = useState(false);
  useEffect(() => {
    i18nReady.then(() => setI18nLoaded(true));
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded && i18nLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, i18nLoaded]);

  if (!fontsLoaded || !i18nLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <ScreenTracker />
            <UpdatesReporter />
            <AuthGate />
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
