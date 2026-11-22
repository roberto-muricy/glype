-- Glype · Migration 0015
-- Histórico de mudanças de status na biblioteca.
--
-- `user_games` guarda só o status atual e `added_at`. Para o "Seu mês"
-- (zerados, largados e matches no mês) é preciso saber QUANDO cada status
-- mudou, e isso não dá para reconstruir depois. Esta migration:
--   1. cria `user_game_events`, uma linha por mudança (entrada, troca de
--      status, saída da biblioteca);
--   2. adiciona `user_games.source`, de onde veio o status atual (biblioteca,
--      página do jogo, deck, review);
--   3. grava os eventos por trigger, sem o app precisar escrever nada;
--   4. preenche um evento por linha que já existe, marcado como 'backfill'.
--
-- O app não escreve em `user_game_events`: não há policy de insert, só o
-- trigger (SECURITY DEFINER) grava.

-- ────────────── Origem do status ──────────────
-- Nulo para escritas de versões do app anteriores a esta coluna.
alter table public.user_games
  add column if not exists source text
  check (source in ('library', 'game', 'discover', 'review'));

-- ────────────── Histórico ──────────────
create table if not exists public.user_game_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_id     uuid not null references public.games(id) on delete cascade,
  -- nulo: o jogo entrou na biblioteca
  from_status text check (from_status in ('playing', 'played', 'wishlist', 'dropped')),
  -- nulo: o jogo saiu da biblioteca
  to_status   text check (to_status in ('playing', 'played', 'wishlist', 'dropped')),
  source      text check (source in ('library', 'game', 'discover', 'review', 'backfill')),
  changed_at  timestamptz not null default now(),
  check (from_status is not null or to_status is not null)
);

create index if not exists idx_user_game_events_user_time
  on public.user_game_events (user_id, changed_at desc);

alter table public.user_game_events enable row level security;

drop policy if exists uge_select_own on public.user_game_events;
create policy uge_select_own on public.user_game_events
  for select using (user_id = auth.uid());

revoke insert, update, delete on table public.user_game_events from anon, authenticated;

-- ────────────── Trigger ──────────────
create or replace function public.log_user_game_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_game_events (user_id, game_id, from_status, to_status, source)
    values (new.user_id, new.game_id, null, new.status, new.source);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- O upsert do app reescreve a linha mesmo sem mudar o status.
    if new.status is distinct from old.status then
      insert into public.user_game_events (user_id, game_id, from_status, to_status, source)
      values (new.user_id, new.game_id, old.status, new.status, new.source);
    end if;
    return new;
  end if;

  -- DELETE. Quando a linha some em cascata (conta excluída, jogo apagado), o
  -- dono já não existe e o insert quebraria a FK, derrubando a exclusão da
  -- conta. Nesse caso não há o que registrar.
  if exists (select 1 from public.profiles where id = old.user_id)
     and exists (select 1 from public.games where id = old.game_id) then
    insert into public.user_game_events (user_id, game_id, from_status, to_status, source)
    values (old.user_id, old.game_id, old.status, null, null);
  end if;
  return old;
end;
$$;

revoke all on function public.log_user_game_event() from public;

drop trigger if exists log_user_game_event on public.user_games;
create trigger log_user_game_event
  after insert or update or delete on public.user_games
  for each row execute function public.log_user_game_event();

-- ────────────── Backfill ──────────────
-- Um evento de entrada por jogo já na biblioteca, com o status atual e a data
-- em que entrou. É aproximado (um jogo adicionado como "jogando" em agosto e
-- zerado em novembro aparece como zerado em agosto), por isso 'backfill': o
-- "Seu mês" pode ignorar esses eventos.
insert into public.user_game_events (user_id, game_id, from_status, to_status, source, changed_at)
select ug.user_id, ug.game_id, null, ug.status, 'backfill', coalesce(ug.added_at, now())
from public.user_games ug
where not exists (
  select 1 from public.user_game_events e
  where e.user_id = ug.user_id and e.game_id = ug.game_id
);
