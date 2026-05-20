-- Glype · Migration 0006
-- Top 5 jogos favoritos do usuário (ranqueado 1–5).
--
-- Cada usuário tem até 5 jogos favoritos com posição (rank) de 1 a 5.
-- Leitura pública (aparece no perfil); escrita só pelo dono.

create table if not exists public.favorite_games (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_id     uuid not null references public.games(id) on delete cascade,
  rank        integer not null check (rank between 1 and 5),
  created_at  timestamptz not null default now(),
  -- uma posição por usuário, e um jogo não repete no top
  primary key (user_id, rank),
  unique (user_id, game_id)
);

create index if not exists idx_favorite_games_user
  on public.favorite_games (user_id, rank);

-- ────────────── RLS ──────────────
alter table public.favorite_games enable row level security;

-- Qualquer um lê (aparece no perfil público)
drop policy if exists favorite_games_select_public on public.favorite_games;
create policy favorite_games_select_public on public.favorite_games
  for select using (true);

-- Só o dono escreve
drop policy if exists favorite_games_insert_own on public.favorite_games;
create policy favorite_games_insert_own on public.favorite_games
  for insert with check (user_id = auth.uid());

drop policy if exists favorite_games_update_own on public.favorite_games;
create policy favorite_games_update_own on public.favorite_games
  for update using (user_id = auth.uid());

drop policy if exists favorite_games_delete_own on public.favorite_games;
create policy favorite_games_delete_own on public.favorite_games
  for delete using (user_id = auth.uid());
