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
    // '@sentry/react-native/expo' removido até configurar SENTRY_AUTH_TOKEN no EAS.
    // Sentry runtime continua funcionando via Sentry.init() em src/lib/sentry.ts.
    // O plugin é só pra upload de source maps no build — sem auth token, ele trava o build Android.
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
