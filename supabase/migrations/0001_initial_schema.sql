-- PSN Review · Fase 1 · Migration 0001
-- Schema inicial: tabelas + índices.
-- RLS está em 0002_rls_policies.sql.
-- Triggers/funções estão em 0003_triggers.sql.

-- Profiles (1:1 com auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  favorite_genres text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cache local de jogos (vindos da API RAWG/IGDB)
create table games (
  id uuid primary key default gen_random_uuid(),
  rawg_id integer unique,
  igdb_id integer unique,
  title text not null,
  slug text unique,
  cover_url text,
  background_url text,
  description text,
  genres text[] default '{}',
  platforms text[] default '{}',
  developer text,
  publisher text,
  release_date date,
  rawg_rating numeric(3,2),
  metacritic_score integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reviews dos usuários
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  body text not null check (char_length(body) >= 50),
  playtime_hours integer,
  completed boolean default false,
  has_spoiler boolean default false,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, game_id)
);

-- Reviews agregadas de fontes externas (Metacritic, OpenCritic, IGN, etc.)
create table external_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  source text not null,
  score numeric(5,2) not null,
  score_max numeric(5,2) not null,
  summary text,
  url text,
  published_at timestamptz,
  fetched_at timestamptz default now()
);

-- Sistema de follows
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Likes em reviews
create table review_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, review_id)
);

-- Biblioteca do usuário
create table user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  status text not null check (status in ('playing', 'played', 'wishlist', 'dropped')),
  added_at timestamptz default now(),
  unique(user_id, game_id)
);

-- Índices essenciais
create index idx_reviews_game on reviews(game_id);
create index idx_reviews_user on reviews(user_id);
create index idx_reviews_created on reviews(created_at desc);
create index idx_external_reviews_game on external_reviews(game_id);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_user_games_user on user_games(user_id, status);
create index idx_games_rawg on games(rawg_id);
