-- Glype · Migration 0008
-- Torna o `body` da review opcional.
--
-- Antes: body NOT NULL com char_length >= 50 (bem restritivo, gerava atrito)
-- Depois: body pode ser NULL ou string vazia. O usuário pode dar só uma nota,
-- sem escrever nada — estilo Letterboxd.
--
-- Mantemos um limite máximo (5000) só pra evitar abuso.

-- 1. Remove o CHECK antigo (min length)
alter table public.reviews
  drop constraint if exists reviews_body_check;

-- 2. Permite NULL
alter table public.reviews
  alter column body drop not null;

-- 3. Normaliza strings vazias para NULL (queries de "tem texto?" ficam mais simples)
update public.reviews
   set body = null
 where body is not null and char_length(trim(body)) = 0;

-- 4. Adiciona novo CHECK opcional (NULL OK, ou tamanho razoável quando presente)
alter table public.reviews
  add constraint reviews_body_check
  check (body is null or char_length(body) <= 5000);
