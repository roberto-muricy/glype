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

// Tipo canônico de jogo — produzido pelas Edge Functions (normalizeRawg/mergeRawgIgdb)
// e armazenado na tabela `games`. O app só lê este formato.
export interface Game {
  rawg_id: number | null;
  igdb_id: number | null;
  title: string;
  slug: string | null;
  cover_url: string | null;
  background_url: string | null;
  description: string | null;
  genres: string[];
  platforms: string[];
  developer: string | null;
  publisher: string | null;
  release_date: string | null; // ISO date YYYY-MM-DD
  rawg_rating: number | null;  // 0-5 (escala RAWG)
  metacritic_score: number | null; // 0-100
}

export interface ExternalReview {
  id: string;
  game_id: string;
  source: string;        // ex: 'Metacritic', 'OpenCritic', 'IGN'
  score: number;         // 0-100
  score_display: string | null; // ex: '9/10', '90%'
  url: string | null;
  excerpt: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Resposta paginada das Edge Functions de listagem
export interface GamesListResponse {
  results: Game[];
  count: number;
  genres?: string[]; // presente em recommendations
}

export interface Review {
  id: string;
  user_id: string;
  game_id: string;
  score: number;          // 0–10, step 0.5
  body: string;           // mínimo 50 chars
  playtime_hours: number | null;
  completed: boolean;
  has_spoiler: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewDraft {
  score: number;
  body: string;
  playtime_hours: number | null;
  completed: boolean;
  has_spoiler: boolean;
  is_public: boolean;
}

export type GameStatus = 'playing' | 'played' | 'wishlist' | 'dropped';

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  status: GameStatus;
  added_at: string;
  game: Game; // join com games
}

// Review enriquecida para o feed (join com profile + game)
export interface FeedItem {
  id: string;
  score: number;
  body: string;
  has_spoiler: boolean;
  completed: boolean;
  playtime_hours: number | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  game: {
    id: string;
    title: string;
    cover_url: string | null;
    rawg_id: number | null;
  };
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FavoriteGame {
  rank: number;
  game: {
    id: string;
    rawg_id: number | null;
    title: string;
    cover_url: string | null;
  };
}

export type NotificationType = 'like' | 'follow' | 'comment';

export interface ReviewComment {
  id: string;
  review_id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  /** Presente apenas em notificações do tipo 'like' */
  review: {
    id: string;
    game_title: string;
    game_rawg_id: number | null;
  } | null;
}

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  playing: 'Jogando',
  played: 'Jogado',
  wishlist: 'Wishlist',
  dropped: 'Dropado',
};
