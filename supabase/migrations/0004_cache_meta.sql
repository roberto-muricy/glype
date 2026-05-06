-- Glype · Fase 3 · Migration 0004
-- Tabela de metadados de cache para queries das Edge Functions
-- (search, trending, recommendations, detail). Mantém o JSON normalizado
-- da resposta + TTL. Acesso é só via service_role (Edge Functions);
-- por isso a tabela fica com RLS habilitada e SEM policies para clientes.

create table cache_meta (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_cache_meta_expires on cache_meta(expires_at);

alter table cache_meta enable row level security;

-- Sem policies: só service_role (que bypassa RLS) pode ler/escrever.
-- Nenhum cliente autenticado tem acesso direto a esta tabela.

-- Trigger para manter updated_at em sync nos upserts.
drop trigger if exists set_updated_at on cache_meta;
create trigger set_updated_at
  before update on cache_meta
  for each row execute function public.update_updated_at();
