-- =====================================================================
-- Migration 003 — Tabla movie_trivia (cache de IA)
-- =====================================================================
-- Cachea los "datos curiosos" generados por Gemini Flash.
-- Cache FOREVER (no TTL) porque la trivia no cambia. Si querés
-- regenerar uno específico: DELETE FROM movie_trivia WHERE tmdb_id = X;
--
-- PK compuesta (tmdb_id, media_type, locale) — el mismo film tiene
-- una trivia distinta en español y otra en inglés.
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

create table if not exists public.movie_trivia (
  tmdb_id int not null,
  media_type text not null default 'movie',
  locale text not null default 'es',
  text text not null,
  generated_at timestamptz not null default now(),
  primary key (tmdb_id, media_type, locale)
);

alter table public.movie_trivia enable row level security;

-- Lectura pública (no hay datos sensibles)
drop policy if exists "anyone can read trivia" on public.movie_trivia;
create policy "anyone can read trivia"
  on public.movie_trivia
  for select
  using (true);

-- Escritura solo service role
drop policy if exists "service role can write trivia" on public.movie_trivia;
create policy "service role can write trivia"
  on public.movie_trivia
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
