-- =====================================================================
-- Migration 001 — Agregar columna media_type a history
-- =====================================================================
-- Necesaria para soportar SERIES (además de películas) en el historial.
-- Es idempotente: se puede correr más de una vez sin error.
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

-- 1) Agregar columna media_type (default 'movie' para rows existentes)
alter table public.history
  add column if not exists media_type text not null default 'movie';

-- 2) Cambiar la constraint unique para incluir media_type.
-- El nombre exacto de la constraint vieja depende de cómo Postgres la nombró
-- (típicamente history_user_id_tmdb_id_key). Hacemos un drop tolerante.
do $$
declare
  v_constraint text;
begin
  -- Buscar el nombre de la constraint vieja que covera (user_id, tmdb_id)
  select c.conname into v_constraint
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where c.conrelid = 'public.history'::regclass
    and c.contype = 'u'
    and array_length(c.conkey, 1) = 2;

  if v_constraint is not null then
    execute format('alter table public.history drop constraint %I', v_constraint);
  end if;
end $$;

-- 3) Agregar la constraint nueva (user_id, tmdb_id, media_type)
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.history'::regclass
      and c.contype = 'u'
      and array_length(c.conkey, 1) = 3
  ) then
    alter table public.history
      add constraint history_user_tmdb_media_unique
      unique (user_id, tmdb_id, media_type);
  end if;
end $$;
