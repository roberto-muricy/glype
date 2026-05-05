// Interfaces de domínio (modelo lido pela aplicação).
// Espelha as colunas que o app realmente lê em cada tabela.

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[];
  created_at: string;
  updated_at: string;
}
