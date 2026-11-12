-- 0014: título normalizado, para ligar jogos da IGDB aos que já estão no banco.
--
-- A RAWG e a IGDB escrevem o mesmo jogo de jeitos diferentes: "God of War
-- (2018)" × "God of War", "Thief’s End" × "Thief's End", "DOOM" × "Doom".
-- Sem ligar os dois, um jogo vindo da IGDB ganharia um rawg_id novo e as
-- reviews que já existem ficariam penduradas no antigo.
--
-- A chave: minúsculas, sem o "(ano)" do fim e sem nada além de letras a-z e
-- dígitos. A mesma regra está em titleKey(), em supabase/functions/_shared/catalog.ts.
-- Só acrescenta uma coluna calculada; nenhum dado muda.

alter table public.games
  add column if not exists title_key text
  generated always as (
    regexp_replace(
      regexp_replace(lower(title), '\s*\(\d{4}\)\s*$', ''),
      '[^a-z0-9]+', '', 'g'
    )
  ) stored;

create index if not exists idx_games_title_key on public.games (title_key);
