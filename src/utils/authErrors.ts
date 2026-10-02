// Classificação de erros de login social.
//
// Cancelar (fechar a janela da Apple ou o seletor do Google) não é falha: não
// deve mostrar erro na tela, virar alerta no Sentry nem contar como
// `signin_failed` no PostHog.
//
// Classifica por `code`, como o expo-apple-authentication já faz — evita
// `instanceof` em subclasse de Error, que é frágil com o transform de classes
// do Babel. Sem imports de propósito: dá pra testar com Node puro.

/** Código do expo-apple-authentication quando o usuário fecha a janela da Apple. */
const APPLE_CANCELED_CODE = 'ERR_REQUEST_CANCELED';

/** Código nosso para o cancelamento do Google (o SDK v16 não rejeita nesse caso). */
const GOOGLE_CANCELED_CODE = 'GOOGLE_SIGN_IN_CANCELED';

const CANCELED_CODES = new Set([APPLE_CANCELED_CODE, GOOGLE_CANCELED_CODE]);

/** Erro lançado pelo serviço quando `GoogleSignin.signIn()` volta `{ type: 'cancelled' }`. */
export function googleSignInCanceledError(): Error & { code: string } {
  return Object.assign(new Error('Login com Google cancelado pelo usuário.'), {
    code: GOOGLE_CANCELED_CODE,
  });
}

function errorField(e: unknown, field: 'code' | 'message'): string {
  if (typeof e !== 'object' || e === null || !(field in e)) return '';
  return String((e as Record<string, unknown>)[field]);
}

/**
 * Credenciais recusadas no login por email.
 *
 * O Supabase devolve o mesmo erro em dois casos bem diferentes: senha errada,
 * e conta que existe mas foi criada com Apple ou Google — e portanto não tem
 * senha nenhuma. Nos dados de produção, 7 pessoas bateram nisso 19 vezes sem
 * nunca conseguir entrar, uma delas tentando 8 vezes seguidas. Por isso a
 * mensagem na tela cita os botões sociais em vez de só dizer "senha incorreta".
 */
export function isInvalidCredentials(e: unknown): boolean {
  return (
    errorField(e, 'code') === 'invalid_credentials' ||
    /invalid login credentials/i.test(errorField(e, 'message'))
  );
}

/** Email já cadastrado — o outro lado do mesmo beco sem saída. */
export function isUserAlreadyRegistered(e: unknown): boolean {
  return (
    errorField(e, 'code') === 'user_already_exists' ||
    /already registered|already been registered/i.test(errorField(e, 'message'))
  );
}

/** Conta criada mas email ainda não confirmado. */
export function isEmailNotConfirmed(e: unknown): boolean {
  return (
    errorField(e, 'code') === 'email_not_confirmed' ||
    /email not confirmed/i.test(errorField(e, 'message'))
  );
}

export function isSignInCanceled(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    CANCELED_CODES.has(String((e as { code: unknown }).code))
  );
}
