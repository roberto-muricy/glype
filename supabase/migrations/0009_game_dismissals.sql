-- Glype · Migration 0009
-- Histórico de jogos "dispensados" no swipe deck.
--
-- Quando o usuário arrasta um jogo pra esquerda na tela /discover,
-- inserimos aqui. A Edge Function games-discover filtra esses rawg_ids
-- pra que nunca mais apareçam no deck.
--
-- Pode ser revertido pelo usuário no futuro via "limpar histórico".

create table if not exists public.game_dismissals (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  game_id      uuid not null references public.games(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists idx_game_dismissals_user
  on public.game_dismissals (user_id);

-- ────────────── RLS ──────────────
alter table public.game_dismissals enable row level security;

drop policy if exists gd_select_own on public.game_dismissals;
create policy gd_select_own on public.game_dismissals
  for select using (user_id = auth.uid());

drop policy if exists gd_insert_own on public.game_dismissals;
create policy gd_insert_own on public.game_dismissals
  for insert with check (user_id = auth.uid());

drop policy if exists gd_delete_own on public.game_dismissals;
create policy gd_delete_own on public.game_dismissals
  for delete using (user_id = auth.uid());
