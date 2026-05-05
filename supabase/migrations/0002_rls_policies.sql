-- PSN Review · Fase 1 · Migration 0002
-- Habilita RLS em todas as tabelas e cria as policies.
-- Convenção: leitura pública onde a spec pede, escrita restrita ao dono.
-- Tabelas alimentadas externamente (games, external_reviews) só permitem
-- escrita via service_role (RLS bloqueia anon/authenticated por padrão
-- quando não há policy — service_role bypassa RLS).

-- ───────────────────────── Habilita RLS ─────────────────────────
alter table profiles         enable row level security;
alter table games            enable row level security;
alter table reviews          enable row level security;
alter table external_reviews enable row level security;
alter table follows          enable row level security;
alter table review_likes     enable row level security;
alter table user_games       enable row level security;

-- ───────────────────────────── profiles ─────────────────────────
-- leitura pública; update apenas pelo dono
create policy "profiles_select_public"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────── games ──────────────────────────
-- leitura pública; escrita só via service_role (sem policies de
-- insert/update/delete — RLS bloqueia anon/authenticated por default)
create policy "games_select_public"
  on games for select
  using (true);

-- ────────────────────────────── reviews ─────────────────────────
-- leitura pública apenas para reviews públicos OU para o próprio autor
create policy "reviews_select_public_or_own"
  on reviews for select
  using (is_public = true or auth.uid() = user_id);

create policy "reviews_insert_own"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own"
  on reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_delete_own"
  on reviews for delete
  using (auth.uid() = user_id);

-- ────────────────────────── external_reviews ────────────────────
-- leitura pública; escrita só via service_role
create policy "external_reviews_select_public"
  on external_reviews for select
  using (true);

-- ────────────────────────────── follows ─────────────────────────
-- leitura pública; só o follower pode criar/remover suas linhas
create policy "follows_select_public"
  on follows for select
  using (true);

create policy "follows_insert_own"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "follows_delete_own"
  on follows for delete
  using (auth.uid() = follower_id);

-- ────────────────────────── review_likes ────────────────────────
-- leitura pública; só o dono cria/remove o próprio like
create policy "review_likes_select_public"
  on review_likes for select
  using (true);

create policy "review_likes_insert_own"
  on review_likes for insert
  with check (auth.uid() = user_id);

create policy "review_likes_delete_own"
  on review_likes for delete
  using (auth.uid() = user_id);

-- ──────────────────────────── user_games ────────────────────────
-- leitura pública; CRUD apenas pelo dono
create policy "user_games_select_public"
  on user_games for select
  using (true);

create policy "user_games_insert_own"
  on user_games for insert
  with check (auth.uid() = user_id);

create policy "user_games_update_own"
  on user_games for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_games_delete_own"
  on user_games for delete
  using (auth.uid() = user_id);
