// Para onde o app deve mandar a pessoa depois de saber quem ela é.
//
// Isso morava solto dentro do AuthGate e tinha um furo que só apareceu nos
// dados: em 30 dias, 72 cadastros e zero eventos de onboarding — 118 das 119
// contas novas ficaram sem gênero favorito. O motivo era a decisão ser tomada
// com `profile` ainda nulo (a busca do perfil não tinha voltado), e nulo caía
// no mesmo galho de "já configurado". Como depois disso a pessoa já não está
// mais no grupo (auth), a decisão nunca era revista.
//
// Aqui a ausência de perfil é um estado próprio — "ainda não sei" — e quem
// chama precisa esperar em vez de adivinhar.

export type Segmento = string | undefined;

export interface EstadoDeRota {
  temSessao: boolean;
  /** null = perfil ainda não carregado. */
  generosFavoritos: string[] | null;
  /** Primeiro segmento da rota atual: '(auth)', 'onboarding', '(tabs)'… */
  segmento: Segmento;
}

export type Destino = '/(auth)/login' | '/onboarding' | '/(tabs)' | null;

export function decidirRota({ temSessao, generosFavoritos, segmento }: EstadoDeRota): Destino {
  const emAuth = segmento === '(auth)';

  if (!temSessao) return emAuth ? null : '/(auth)/login';

  // Com sessão e ainda sem perfil, não dá para saber se falta onboarding.
  // Quem chama segura a navegação até o perfil chegar.
  if (generosFavoritos === null) return null;

  if (emAuth) {
    return generosFavoritos.length === 0 ? '/onboarding' : '/(tabs)';
  }

  return null;
}
