// Marca, por conta e por aparelho, que a pessoa já passou pelo onboarding.
//
// O onboarding só aparecia para quem vinha da tela de login. Quem pulou, quem
// entrou pelo binário antigo da loja (que nem tinha a decisão certa) e quem
// já estava logado nunca o via: 170 de 179 primeiras aberturas desde 19/10.
// Agora ele aparece para quem não tem gênero favorito e ainda não o viu —
// e "viu" precisa ficar guardado, senão quem pula recebe de novo toda vez.

import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `glype:onboarding-seen:${userId}`;

export async function wasOnboardingSeen(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    // Sem como ler, não insiste: melhor pular o onboarding que prender a pessoa nele.
    return true;
  }
}

export async function markOnboardingSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), '1');
  } catch {
    /* best-effort */
  }
}
