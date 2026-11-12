// Aplica o update OTA durante o splash, quando o app está rodando o código
// que veio dentro do binário da loja.
//
// Por padrão o expo-updates baixa o update em segundo plano e só o usa na
// abertura seguinte. Por isso a primeira sessão de quem instala roda sempre o
// código embutido — em novembro de 2026, 170 de 179 primeiras aberturas
// rodavam o código de setembro, sem o onboarding corrigido.
//
// Só espera quando a abertura é do código embutido (instalação nova, ou logo
// depois de atualizar pela loja). Nas outras, o comportamento padrão basta.
// Os tetos de tempo impedem que uma rede ruim prenda a pessoa no splash.

import { flushAnalytics, track } from '@/src/lib/analytics';

const CHECK_TIMEOUT_MS = 3_000;
const FETCH_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);
}

/**
 * Resolve quando o app pode seguir. Se aplicar um update, recarrega o app e
 * a promessa nunca resolve — quem chama mantém o splash enquanto isso.
 */
export async function applyUpdateAtStartup(): Promise<void> {
  if (__DEV__) return;
  const started = Date.now();
  const done = (result: string, extra: Record<string, unknown> = {}) =>
    track('updates_startup', { result, ms: Date.now() - started, ...extra });

  try {
    const Updates = await import('expo-updates');
    if (!Updates.isEnabled || !Updates.isEmbeddedLaunch) return;

    const check = await withTimeout(Updates.checkForUpdateAsync(), CHECK_TIMEOUT_MS);
    if (check === 'timeout') return done('check_timeout');
    if (!check.isAvailable) return done('none');

    const fetched = await withTimeout(Updates.fetchUpdateAsync(), FETCH_TIMEOUT_MS);
    if (fetched === 'timeout') return done('fetch_timeout');
    if (!fetched.isNew) return done('not_new');

    done('applied');
    // O reload descarta a fila de eventos; sem isso o 'applied' nunca chegava.
    await withTimeout(flushAnalytics(), 1_000);
    await Updates.reloadAsync();
    // Até o reload acontecer, o splash fica: nada de mostrar o código antigo.
    await new Promise<never>(() => undefined);
  } catch (e) {
    done('error', { message: e instanceof Error ? e.message : String(e) });
  }
}
