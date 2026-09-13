-- Glype · Migration 0010
-- Moderação de conteúdo: denúncias + bloqueio entre usuários.
-- Requisito de Apple App Store guideline 1.2 e Google Play UGC policy:
-- apps com conteúdo gerado por usuário precisam permitir denunciar abuso
-- e bloquear usuários abusivos.

-- ────────────── Tabela: reports ──────────────
-- Registra denúncias de conteúdo (reviews, comentários, ou usuário inteiro).

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  target_type     text not null check (target_type in ('review', 'comment', 'user')),
  target_id       uuid not null,
  -- denunciado (dono do conteúdo ou usuário direto) — facilita lookups por moderador
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason          text not null check (reason in (
    'spam',
    'harassment',
    'hate_speech',
    'sexual_content',
    'violence',
    'self_harm',
    'misinformation',
    'impersonation',
    'other'
  )),
  details         text check (details is null or char_length(details) <= 500),
  status          text not null default 'pending' check (status in (
    'pending', 'reviewed', 'resolved', 'dismissed'
  )),
  resolution_note text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  -- previne denúncias duplicadas (mesmo reporter, mesmo target)
  unique (reporter_id, target_type, target_id)
);

create index if not exists idx_reports_target on public.reports (target_type, target_id);
create index if not exists idx_reports_status on public.reports (status) where status = 'pending';
create index if not exists idx_reports_reported_user on public.reports (reported_user_id);

-- ────────────── RLS reports ──────────────
alter table public.reports enable row level security;

-- Reporter pode ver as próprias denúncias (pra UI de histórico, se quisermos)
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
  for select using (reporter_id = auth.uid());

-- Qualquer autenticado pode criar denúncia (apenas em nome próprio)
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());

-- Update/delete bloqueados pra usuários (só moderador via service_role)

-- ────────────── Tabela: user_blocks ──────────────
-- Bloqueio entre usuários. Quando A bloqueia B:
--   - A não vê reviews/comentários/perfil de B
--   - B não vê reviews/comentários/perfil de A
--   - Follows mútuos são removidos automaticamente

create table if not exists public.user_blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id);

-- ────────────── RLS user_blocks ──────────────
alter table public.user_blocks enable row level security;

-- Usuário só vê os próprios bloqueios (não conseguem ver quem te bloqueou)
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select using (blocker_id = auth.uid());

drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks
  for insert with check (blocker_id = auth.uid());

drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete using (blocker_id = auth.uid());

-- ────────────── Trigger: bloqueio remove follows ──────────────
-- Quando A bloqueia B, remove follows em ambas direções pra não vazar conteúdo
-- via feed antes do filtro de bloqueio aplicar.
create or replace function public.unfollow_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists trg_unfollow_on_block on public.user_blocks;
create trigger trg_unfollow_on_block
  after insert on public.user_blocks
  for each row execute function public.unfollow_on_block();
