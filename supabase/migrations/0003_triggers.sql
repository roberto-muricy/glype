-- PSN Review · Fase 1 · Migration 0003
-- Triggers e funções utilitárias.

-- ────────────── handle_new_user: cria profile no signup ──────────────
-- Quando um novo registro é inserido em auth.users (via signUp do
-- Supabase Auth), cria automaticamente uma linha em public.profiles
-- usando o campo `username` enviado em raw_user_meta_data.
-- Roda como SECURITY DEFINER para conseguir inserir em public.profiles
-- mesmo com RLS ativa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      -- fallback: parte antes do @ no email + sufixo do uid
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)
    ),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────── update_updated_at: mantém updated_at em sync ──────────────
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on profiles;
create trigger set_updated_at
  before update on profiles
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at on games;
create trigger set_updated_at
  before update on games
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at on reviews;
create trigger set_updated_at
  before update on reviews
  for each row execute function public.update_updated_at();
