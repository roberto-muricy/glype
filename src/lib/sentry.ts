// Sentry — crash reporting / error monitoring.
//
// Iniciado no `_layout.tsx` antes do primeiro render.
// Se EXPO_PUBLIC_SENTRY_DSN não estiver configurado (ex.: dev local),
// o Sentry fica desativado — todas as funções viram no-op.
//
// Uso:
//   import { captureException, addBreadcrumb } from '@/src/lib/sentry';
//   try { ... } catch (e) { captureException(e); }

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const SENTRY_DSN = (extra['sentryDsn'] as string | undefined) ?? '';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!SENTRY_DSN) {
    // Sem DSN: nada a inicializar. Logs ficam só no console em dev.
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // Em prod, capturamos 10% das transações para performance monitoring.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Em dev, desabilitamos envio pra não poluir o dashboard.
    enabled: !__DEV__,
    // Captura erros que escaparam de Error Boundaries do React.
    enableAutoSessionTracking: true,
    // Anexa breadcrumbs de navegação automaticamente.
    integrations: [],
    // Não enviamos PII por default (email, IP, etc.).
    sendDefaultPii: false,
    // Aplicação reconhecível no dashboard
    release: Constants.expoConfig?.version,
    environment: __DEV__ ? 'development' : 'production',
    // Filtra ruído típico de RN/Expo
    ignoreErrors: [
      // network errors transientes — agrupa demais e gera spam
      'Network request failed',
      'AbortError',
    ],
  });

  initialized = true;
}

/** Captura uma exceção manualmente. No-op se Sentry não inicializado. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) {
    if (__DEV__) console.error('[Sentry/dev]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureException(error);
  });
}

/** Mensagem custom (info/warning/error). Útil pra "shouldn't happen" sem throw. */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!initialized) {
    if (__DEV__) console.log(`[Sentry/dev/${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}

/** Adiciona breadcrumb (rastro) — aparece anexado a erros futuros. */
export function addBreadcrumb(
  message: string,
  category: string = 'app',
  data?: Record<string, unknown>,
): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/** Identifica o usuário atual (id apenas — sem PII). Chamar no login. */
export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
