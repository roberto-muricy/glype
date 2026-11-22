// Capas e fundos em tamanho de tela, não no original.
//
// A RAWG guarda a imagem como foi enviada: das capas mais populares, várias
// são 3840x2160 e passam de 3 MB. Aberta, cada uma ocupa uns 33 MB, e o
// expo-image a reduz na thread da interface. Num iPhone 7 isso travava a tela
// por mais de 2s (Sentry GLYPE-B e GLYPE-H). A RAWG e a IGDB servem versões
// reduzidas pelo próprio endereço.

/** 640 para cards e listas; 1280 para o destaque da tela do jogo e do deck. */
export type ImageWidth = 640 | 1280;

const RAWG_MEDIA = 'https://media.rawg.io/media/';
/** Só essas pastas aceitam o prefixo de resize. */
const RAWG_FOLDERS = /^(games|screenshots)\//;

export function sizedImageUrl(url: string, width: ImageWidth): string;
export function sizedImageUrl(url: string | null | undefined, width: ImageWidth): string | null;
export function sizedImageUrl(url: string | null | undefined, width: ImageWidth): string | null {
  if (!url) return null;

  if (url.startsWith(RAWG_MEDIA)) {
    const path = url.slice(RAWG_MEDIA.length);
    // Já reduzida (resize/ ou crop/) ou de uma pasta sem resize: fica como está.
    if (!RAWG_FOLDERS.test(path)) return url;
    return `${RAWG_MEDIA}resize/${width}/-/${path}`;
  }

  // IGDB: o fundo vem em t_1080p (1920 px); 1280 px basta na tela de um celular.
  if (url.includes('images.igdb.com/') && url.includes('/t_1080p/')) {
    return url.replace('/t_1080p/', '/t_720p/');
  }

  return url;
}
