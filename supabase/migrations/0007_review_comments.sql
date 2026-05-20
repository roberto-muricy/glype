-- Glype · Migration 0007
-- Comentários em reviews + extensão do sistema de notificações.
--
-- Qualquer usuário autenticado pode comentar em reviews públicas.
-- O dono da review recebe uma notificação automática via trigger.

create table if not exists public.review_comments (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_review_comments_review
  on public.review_comments (review_id, created_at desc);

create index if not exists idx_review_comments_user
  on public.review_comments (user_id);

-- updated_at automático (trigger já existente em 0003)
drop trigger if exists set_updated_at on public.review_comments;
create trigger set_updated_at
  before update on public.review_comments
  for each row execute function public.update_updated_at();

-- ────────────── RLS ──────────────
alter table public.review_comments enable row level security;

drop policy if exists review_comments_select_public on public.review_comments;
create policy review_comments_select_public on public.review_comments
  for select using (true);

drop policy if exists review_comments_insert_own on public.review_comments;
create policy review_comments_insert_own on public.review_comments
  for insert with check (user_id = auth.uid());

drop policy if exists review_comments_update_own on public.review_comments;
create policy review_comments_update_own on public.review_comments
  for update using (user_id = auth.uid());

drop policy if exists review_comments_delete_own on public.review_comments;
create policy review_comments_delete_own on public.review_comments
  for delete using (user_id = auth.uid());

-- ────────────── Extensão de notifications ──────────────
-- O check antigo da coluna type só aceitava ('like', 'follow').
-- Agora aceita 'comment' também.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'follow', 'comment'));

-- Coluna opcional para guardar o id do comentário que originou a notificação.
-- Útil pra rolagem direto ao comentário em versões futuras.
alter table public.notifications
  add column if not exists comment_id uuid references public.review_comments(id) on delete cascade;

-- ────────────── Trigger: novo comentário ──────────────
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_owner uuid;
begin
  select user_id into v_review_owner
    from public.reviews where id = new.review_id;

  -- não notifica se comentou na própria review
  if v_review_owner is not null and v_review_owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, review_id, comment_id)
    values (v_review_owner, new.user_id, 'comment', new.review_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment on public.review_comments;
create trigger trg_notify_on_comment
  after insert on public.review_comments
  for each row execute function public.notify_on_comment();

-- Remove a notificação se o comentário for deletado (cascade já mata via FK,
-- mas isso garante caso o comment_id seja null em registros antigos)
create or replace function public.unnotify_on_comment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
   where type = 'comment'
     and actor_id = old.user_id
     and review_id = old.review_id
     and (comment_id = old.id or comment_id is null);
  return old;
end;
$$;

drop trigger if exists trg_unnotify_on_comment_delete on public.review_comments;
create trigger trg_unnotify_on_comment_delete
  after delete on public.review_comments
  for each row execute function public.unnotify_on_comment_delete();
