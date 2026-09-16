-- Glype · Migration 0012
-- Alerta de denúncias para admins, via notificações do próprio app.
--
-- Até aqui as denúncias (0010) caíam na tabela `reports` e ninguém era
-- avisado. Apple (guideline 1.2) e Google (política de UGC) esperam não só o
-- botão de denunciar, mas alguém que responda. Esta migration:
--   1. cria `app_admins` (quem recebe os alertas);
--   2. deixa admins lerem as denúncias (base pra uma tela de moderação);
--   3. cria o tipo de notificação 'report';
--   4. notifica cada admin a cada denúncia nova.
--
-- Os admins NÃO são inseridos aqui: o repositório é público e o id do usuário
-- não precisa ficar nele. Inserir à parte, via service_role.

-- ────────────── Admins ──────────────
create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- Sem policies e sem grants pro app: só service_role e funções SECURITY DEFINER
-- enxergam a lista de admins.
revoke all on table public.app_admins from anon, authenticated;

-- Checagem usada por policies. SECURITY DEFINER porque, rodando com o usuário
-- logado, a RLS de app_admins (sem policies) sempre devolveria "não é admin".
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ────────────── Admins leem denúncias ──────────────
drop policy if exists reports_select_admin on public.reports;
create policy reports_select_admin on public.reports
  for select using (public.is_app_admin());

-- ────────────── Notificação do tipo 'report' ──────────────
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'follow', 'comment', 'report'));

alter table public.notifications
  add column if not exists report_id uuid references public.reports(id) on delete cascade;

-- ────────────── Trigger: nova denúncia ──────────────
create or replace function public.notify_admins_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Quem aparece no avatar: o denunciado. Se a conta dele já foi apagada
  -- (reported_user_id vira null), mostra quem denunciou.
  v_actor  uuid := coalesce(new.reported_user_id, new.reporter_id);
  v_review uuid;
begin
  -- Review relacionada, pra notificação abrir direto no conteúdo.
  if new.target_type = 'review' then
    select id into v_review from public.reviews where id = new.target_id;
  elsif new.target_type = 'comment' then
    select review_id into v_review from public.review_comments where id = new.target_id;
  end if;

  begin
    insert into public.notifications (recipient_id, actor_id, type, review_id, report_id)
    select a.user_id, v_actor, 'report', v_review, new.id
      from public.app_admins a
     where a.user_id <> v_actor;  -- notifications_no_self
  exception when others then
    -- Falha no alerta nunca pode impedir a denúncia de ser registrada.
    raise warning 'notify_admins_on_report falhou para report %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_on_report on public.reports;
create trigger trg_notify_admins_on_report
  after insert on public.reports
  for each row execute function public.notify_admins_on_report();

notify pgrst, 'reload schema';
