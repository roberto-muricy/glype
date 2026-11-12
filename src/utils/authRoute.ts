// Para onde o app deve mandar a pessoa depois de saber quem ela é.
//
// Isso morava solto dentro do AuthGate e tinha um furo que só apareceu nos
// dados: em 30 dias, 72 cadastros e zero eventos de onboarding — 118 das 119
// contas novas ficaram sem gênero favorito. O motivo era a decisão ser tomada
// com `profile` ainda nulo (a busca do perfil não tinha voltado), e nulo caía
// no mesmo galho de "já configurado".
//
// Aqui a ausência de perfil é um estado próprio — "ainda não sei" — e quem
// chama precisa esperar em vez de adivinhar.
//
// O segundo furo: o onboarding só era oferecido a quem vinha do login. Quem
// já estava logado ao abrir o app nunca o via. Agora vale em qualquer
// abertura, para quem não tem gênero favorito e ainda não passou por ele.

export type Segmento = string | undefined;

export interface EstadoDeRota {
  temSessao: boolean;
  /** null = perfil ainda não carregado. */
  generosFavoritos: string[] | null;
  /** Se a conta já viu o onboarding neste aparelho. null = ainda lendo. */
  onboardingVisto: boolean | null;
  /** Primeiro segmento da rota atual: '(auth)', 'onboarding', '(tabs)'… */
  segmento: Segmento;
}

export type Destino = '/(auth)/login' | '/onboarding' | '/(tabs)' | null;

/**
 * Telas de onde dá para levar a pessoa ao onboarding. Fora delas (a página de
 * um jogo aberta por link, um modal) não se sequestra a navegação.
 */
const ENTRADAS: Segmento[] = [undefined, '(auth)', '(tabs)'];

/** Ainda falta informação para decidir; quem chama segura a tela. */
export function aguardandoRota({ temSessao, generosFavoritos, onboardingVisto }: EstadoDeRota): boolean {
  if (!temSessao) return false;
  if (generosFavoritos === null) return true;
  return generosFavoritos.length === 0 && onboardingVisto === null;
}

export function decidirRota(estado: EstadoDeRota): Destino {
  const { temSessao, generosFavoritos, onboardingVisto, segmento } = estado;
  const emAuth = segmento === '(auth)';

  if (!temSessao) return emAuth ? null : '/(auth)/login';
  if (aguardandoRota(estado)) return null;

  const faltaOnboarding = generosFavoritos!.length === 0 && onboardingVisto === false;
  if (faltaOnboarding && ENTRADAS.includes(segmento)) return '/onboarding';
  if (emAuth) return '/(tabs)';
  return null;
}
