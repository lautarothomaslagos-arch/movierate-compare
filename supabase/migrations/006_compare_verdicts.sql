-- =====================================================================
-- Migration 006 — Tabla compare_verdicts (Fase G.2)
-- =====================================================================
-- Cache de veredictos IA de la página /comparar.
-- Cada veredicto cuesta ~5s y unos tokens de Gemini Flash, así que vale
-- la pena cachearlos por combinación de IDs + locale. Sin TTL — solo se
-- regen si se borra la fila manualmente.
--
-- La key combina los IDs ordenados alfanuméricamente + locale.
-- Formato: "{type}-{id}+{type}-{id}+...:{locale}"
-- Ejemplos:
--   "movie-1593+tv-12345:es"
--   "movie-100+movie-200+movie-300:en"
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

create table if not exists public.compare_verdicts (
  cache_key text primary key,
  text text not null,
  generated_at timestamptz not null default now()
);

-- Sin RLS: el cache es global, no por user. Solo se accede por el server
-- con service-role (o anon read-only). Las inserciones las hace el server.
alter table public.compare_verdicts disable row level security;

-- Política opcional: read público anónimo (por si en el futuro el cliente
-- quisiera leer directo). Para escribir, hace falta service role.
-- Descomentar si querés activar:
-- grant select on public.compare_verdicts to anon, authenticated;
