-- Glype · Migration 0011
-- Recria `cache_meta`, que nunca existiu em produção.
--
-- A 0004 consta como aplicada no histórico remoto, mas a tabela não existe
-- (provavelmente o histórico foi marcado como aplicado sem a migration rodar)
-- e nenhuma migration posterior a remove. Como `getCache` trata qualquer erro
-- como cache miss e `withCache` embrulha o `setCache` em try/catch, as 5 Edge
-- Functions que usam withCache (search, trending, recommendations, collection,
-- discover) sempre bateram na API externa, sem nenhum erro visível.
--
-- Tudo aqui é idempotente: onde a 0004 rodou de verdade (ex.: banco local),
-- isto vira no-op.

create table if not exists public.cache_meta (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cache_meta_expires on public.cache_meta(expires_at);

alter table public.cache_meta enable row level security;

drop trigger if exists set_updated_at on public.cache_meta;
create trigger set_updated_at
  before update on public.cache_meta
  for each row execute function public.update_updated_at();

-- Só o service_role (Edge Functions) acessa. Os default privileges do Supabase
-- concedem anon/authenticated em tabelas novas do public; a RLS sem policies já
-- bloquearia as linhas, mas revogamos pra deixar a intenção da 0004 explícita.
revoke all on table public.cache_meta from anon, authenticated;
grant select, insert, update, delete on table public.cache_meta to service_role;

-- Reconstrói o schema cache do PostgREST pra tabela ficar visível na hora.
notify pgrst, 'reload schema';
