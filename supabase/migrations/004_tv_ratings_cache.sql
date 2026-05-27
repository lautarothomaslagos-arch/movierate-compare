-- =====================================================================
-- Migration 004 — Cache de ratings para series
-- =====================================================================
-- Similar a ratings_cache pero exclusivo de series (TV).
-- TMDB usa namespaces de IDs distintos para movies vs tv, así que no
-- podemos mezclar en la misma tabla con (id, type) sin reescribir el
-- read-through de movies. Más simple: tabla separada.
--
-- Estructura: igual a ratings_cache pero sin filmaffinity_score (la
-- sacamos del flow porque siempre estaba bloqueada por Cloudflare).
-- Tampoco incluye letterboxd_avg porque Letterboxd no indexa series.
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

create table if not exists public.tv_ratings_cache (
  tmdb_id int primary key,
  imdb_rating numeric,
  rt_score int,
  metacritic_score int,
  tmdb_score numeric,
  raw_data jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tv_ratings_cache enable row level security;

drop policy if exists "anyone can read tv cache" on public.tv_ratings_cache;
create policy "anyone can read tv cache"
  on public.tv_ratings_cache
  for select
  using (true);

drop policy if exists "service role can write tv cache" on public.tv_ratings_cache;
create policy "service role can write tv cache"
  on public.tv_ratings_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
