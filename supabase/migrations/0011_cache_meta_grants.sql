-- Glype · Migration 0011
-- Expõe `cache_meta` ao PostgREST para o service_role.
--
-- A 0004 criou a tabela com RLS ligada e sem policies, contando que o
-- service_role (que tem BYPASSRLS) conseguisse ler/escrever. Mas sem GRANT a
-- tabela fica fora do schema cache do PostgREST, e as Edge Functions acessam
-- justamente por lá (`createClient(url, SERVICE_ROLE_KEY).from('cache_meta')`).
-- Resultado: PGRST205 em toda chamada.
--
-- E o erro era invisível: `getCache` retorna null em qualquer erro (vira
-- cache miss) e `withCache` embrulha o `setCache` em try/catch. Então as 5
-- functions que usam withCache (search, trending, recommendations,
-- collection, discover) sempre bateram na API externa, sem nunca cachear.
--
-- O grant é só pro service_role: anon/authenticated continuam sem acesso e a
-- RLS sem policies segue valendo pra eles, preservando a intenção da 0004.

grant select, insert, update, delete on table public.cache_meta to service_role;

-- Força o PostgREST a reconstruir o schema cache — senão o grant só passa a
-- valer no próximo reload dele.
notify pgrst, 'reload schema';
