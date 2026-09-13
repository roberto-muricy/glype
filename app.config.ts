import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Glype',
  slug: 'glype',
  version: '1.1.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'glype',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.glype.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#0066FF',
    },
    package: 'com.glype.app',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-build-properties',
      {
        ios: {
          // O GoogleSignIn 9.2 puxa o AppCheckCore 11.3, um pod Swift que depende
          // de GoogleUtilities e RecaptchaInterop — e esses dois não definem
          // módulos. Sem modular headers o CocoaPods recusa integrá-los como
          // biblioteca estática e o build de iOS quebra no `pod install`.
          // (Os pods do Google não ficam travados: ios/ é gerado a cada build.)
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
          ],
        },
      },
    ],
    [
      // Upload de source maps no build nativo. Antes estava removido porque, sem
      // organização configurada, o sentry-cli derrubava o build Android. Org e
      // projeto não são segredo; o SENTRY_AUTH_TOKEN fica só no EAS (sensitive).
      '@sentry/react-native/expo',
      {
        organization: 'loopwise',
        project: 'glype',
        url: 'https://sentry.io/',
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        // iosUrlScheme = client ID iOS invertido (com.googleusercontent.apps.XXXX).
        // Vem do Google Cloud Console; configurado via .env.
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
          'com.googleusercontent.apps.placeholder',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#0A0A0F',
        dark: {
          backgroundColor: '#0A0A0F',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/76ed59a4-4e45-4b2a-b1ab-eb531696ff95',
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    eas: {
      projectId: '76ed59a4-4e45-4b2a-b1ab-eb531696ff95',
    },
  },
});
