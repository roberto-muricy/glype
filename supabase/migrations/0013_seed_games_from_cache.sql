-- 0013: catálogo de reserva a partir do cache.
--
-- Em novembro de 2026 a RAWG ficou mais de uma semana sem responder, e o
-- catálogo do app caiu junto. As Edge Functions agora respondem a partir da
-- tabela `games` quando a RAWG falha e o cache não tem a chamada exata, mas a
-- tabela só tinha os ~240 jogos que alguém já tinha avaliado ou guardado.
--
-- O cache tinha ~2.000 jogos distintos nas respostas guardadas (buscas, listas
-- e páginas de jogo). Esta migration os copia para `games`. Só acrescenta:
-- jogo que já existe fica como está, e nada é apagado.
--
-- Só dados públicos de catálogo; nenhum dado de usuário.

insert into public.games (
  rawg_id, igdb_id, title, slug, cover_url, background_url, description,
  genres, platforms, developer, publisher, release_date, rawg_rating, metacritic_score
)
select distinct on ((g->>'rawg_id')::integer)
  (g->>'rawg_id')::integer,
  nullif(g->>'igdb_id', '')::integer,
  g->>'title',
  nullif(g->>'slug', ''),
  nullif(g->>'cover_url', ''),
  nullif(g->>'background_url', ''),
  nullif(g->>'description', ''),
  coalesce(array(select jsonb_array_elements_text(
    case jsonb_typeof(g->'genres') when 'array' then g->'genres' else '[]'::jsonb end)), '{}'),
  coalesce(array(select jsonb_array_elements_text(
    case jsonb_typeof(g->'platforms') when 'array' then g->'platforms' else '[]'::jsonb end)), '{}'),
  nullif(g->>'developer', ''),
  nullif(g->>'publisher', ''),
  nullif(g->>'release_date', '')::date,
  nullif(g->>'rawg_rating', '')::numeric,
  nullif(g->>'metacritic_score', '')::integer
from public.cache_meta c
cross join lateral jsonb_array_elements(
  case jsonb_typeof(c.payload)
    when 'array' then c.payload
    when 'object' then jsonb_build_array(c.payload)
    else '[]'::jsonb
  end
) as g
where jsonb_typeof(g) = 'object'
  and g->>'rawg_id' ~ '^[0-9]+$'
  and coalesce(g->>'title', '') <> ''
-- Entre cópias do mesmo jogo, a que tem descrição (página do jogo) e a mais recente.
order by (g->>'rawg_id')::integer, (g->>'description') is null, c.updated_at desc
-- Sem alvo: pula qualquer conflito único (rawg_id, slug ou igdb_id), inclusive
-- entre linhas desta mesma inserção.
on conflict do nothing;
