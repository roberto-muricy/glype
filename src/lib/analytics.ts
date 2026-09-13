// Analytics — PostHog para tracking de eventos / funis / feature flags.
//
// Se EXPO_PUBLIC_POSTHOG_API_KEY não estiver configurado, tudo vira no-op.
// Em dev (__DEV__) também não envia eventos por default — pra não poluir.
//
// Uso:
//   import { track, identify, reset } from '@/src/lib/analytics';
//   track('review_created', { score: 9, hasSpoiler: true });

import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const API_KEY = (extra['posthogApiKey'] as string | undefined) ?? '';
const HOST = (extra['posthogHost'] as string | undefined) ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;
let initPromise: Promise<void> | null = null;

export function initAnalytics(): Promise<void> {
  if (initPromise) return initPromise;
  if (!API_KEY) {
    initPromise = Promise.resolve();
    return initPromise;
  }

  initPromise = (async () => {
    try {
      client = new PostHog(API_KEY, {
        host: HOST,
        // Em dev, capturamos eventos mas não enviamos automaticamente (debug local).
        // Pra ativar em dev: defina NODE_ENV=production ou remova a flag.
        flushAt: __DEV__ ? 100 : 20,
        flushInterval: __DEV__ ? 60000 : 10000,
        // Não capturamos screen views automaticamente — fazemos via expo-router.
        captureAppLifecycleEvents: true,
      });
    } catch (e) {
      if (__DEV__) console.warn('[analytics] init failed', e);
    }
  })();
  return initPromise;
}

// ─── API pública ────────────────────────────────────────────────────────────

type EventProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Tracka um evento. Convenção: snake_case (ex.: 'review_created').
 *
 * Padrões já em uso (mantenha consistência):
 *   - `screen_viewed` { screen }
 *   - `review_created` { score, hasSpoiler, completed }
 *   - `game_added_to_library` { status, rawg_id }
 *   - `game_removed_from_library` { rawg_id }
 *   - `user_followed` { target_user_id }
 *   - `user_unfollowed` { target_user_id }
 *   - `collection_opened` { collection_id }
 *   - `language_changed` { from, to }
 *   - `signup_succeeded` { method }  // method: 'email' | 'apple' | 'google'
 *   - `signin_succeeded` { method }
 *   - `signin_failed` { method }     // falha real — também vai pro Sentry
 *   - `signin_canceled` { method }   // usuário fechou a janela da Apple/Google
 *   - `signout` {}
 */
export function track(event: string, props?: EventProps): void {
  if (!client) {
    if (__DEV__) console.log('[analytics/dev]', event, props ?? {});
    return;
  }
  // PostHog aceita JsonType — nossos EventProps são todos JSON-safe (string/number/boolean/null/undefined).
  client.capture(event, props as never);
}

/**
 * Identifica o usuário pra ligar eventos anônimos prévios ao perfil dele.
 * Chamar no login (success). Use o `user.id` do Supabase — não o email.
 */
export function identify(userId: string, traits?: EventProps): void {
  if (!client) return;
  client.identify(userId, traits as never);
}

/**
 * Limpa identidade — chamar no logout / delete account.
 * Próximos eventos voltam a ser anônimos.
 */
export function resetAnalytics(): void {
  if (!client) return;
  client.reset();
}

/** Eventos relacionados a feature flags. */
export async function isFeatureEnabled(flag: string): Promise<boolean> {
  if (!client) return false;
  try {
    return (await client.isFeatureEnabled(flag)) ?? false;
  } catch {
    return false;
  }
}

/** Hook helper: trackeia screen view. Chame em useEffect das telas-chave. */
export function trackScreen(screenName: string, props?: EventProps): void {
  track('screen_viewed', { screen: screenName, ...(props ?? {}) });
}

export { client as posthogClient };
