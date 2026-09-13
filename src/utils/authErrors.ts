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

export function isSignInCanceled(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    CANCELED_CODES.has(String((e as { code: unknown }).code))
  );
}
