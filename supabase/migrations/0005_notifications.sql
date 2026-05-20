-- Glype · Migration 0005
-- Sistema de notificações: tabela + triggers automáticos.
--
-- Notificações são criadas por triggers (SECURITY DEFINER) quando
-- alguém curte uma review ou segue um usuário. Apenas o destinatário
-- pode ler/atualizar suas próprias notificações.

-- ────────────── Tabela ──────────────
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  actor_id      uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('like', 'follow')),
  review_id     uuid references public.reviews(id) on delete cascade,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now(),
  -- ninguém se notifica a si mesmo
  constraint notifications_no_self check (recipient_id <> actor_id)
);

create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, created_at desc);

create index if not exists idx_notifications_unread
  on public.notifications (recipient_id)
  where is_read = false;

-- ────────────── RLS ──────────────
alter table public.notifications enable row level security;

-- Destinatário lê só as próprias notificações
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (recipient_id = auth.uid());

-- Destinatário pode marcar como lida (update)
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (recipient_id = auth.uid());

-- Inserts acontecem só via triggers SECURITY DEFINER (sem policy de insert).

-- ────────────── Trigger: curtida em review ──────────────
create or replace function public.notify_on_like()
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

  -- não notifica se curtiu a própria review
  if v_review_owner is not null and v_review_owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, review_id)
    values (v_review_owner, new.user_id, 'like', new.review_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_like on public.review_likes;
create trigger trg_notify_on_like
  after insert on public.review_likes
  for each row execute function public.notify_on_like();

-- Remove a notificação quando a curtida é desfeita (evita spam)
create or replace function public.unnotify_on_unlike()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
   where type = 'like'
     and actor_id = old.user_id
     and review_id = old.review_id;
  return old;
end;
$$;

drop trigger if exists trg_unnotify_on_unlike on public.review_likes;
create trigger trg_unnotify_on_unlike
  after delete on public.review_likes
  for each row execute function public.unnotify_on_unlike();

-- ────────────── Trigger: novo seguidor ──────────────
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Remove a notificação quando deixa de seguir
create or replace function public.unnotify_on_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
   where type = 'follow'
     and actor_id = old.follower_id
     and recipient_id = old.following_id;
  return old;
end;
$$;

drop trigger if exists trg_unnotify_on_unfollow on public.follows;
create trigger trg_unnotify_on_unfollow
  after delete on public.follows
  for each row execute function public.unnotify_on_unfollow();
