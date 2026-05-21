-- =====================================================================
-- MovieRate Compare — esquema de base de datos
-- =====================================================================
-- Cómo correrlo:
--   1. Entrá a tu proyecto en supabase.com
--   2. SQL Editor (sidebar izquierdo) → "New query"
--   3. Pegá TODO este archivo y dale Run
--   4. No tira error si lo corrés dos veces (usa IF NOT EXISTS y DROP POLICY IF EXISTS)
-- =====================================================================

-- ------------------------------ tabla history ------------------------------
-- media_type distingue películas ('movie') de series ('tv') porque TMDB
-- usa namespaces de id distintos (un movie con id 1 y un tv con id 1 son
-- cosas distintas).
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null default 'movie',
  title text not null,
  year int,
  poster_path text,
  last_viewed_at timestamptz not null default now(),
  unique(user_id, tmdb_id, media_type)
);

create index if not exists history_user_last_viewed_idx
  on public.history(user_id, last_viewed_at desc);

alter table public.history enable row level security;

drop policy if exists "users see own history" on public.history;
create policy "users see own history"
  on public.history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------ tabla watchlist ------------------------------
-- Lista "Quiero ver" del usuario. Similar a history pero con added_at.
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null default 'movie',
  title text not null,
  year int,
  poster_path text,
  added_at timestamptz not null default now(),
  unique(user_id, tmdb_id, media_type)
);

create index if not exists watchlist_user_added_idx
  on public.watchlist(user_id, added_at desc);

alter table public.watchlist enable row level security;

drop policy if exists "users see own watchlist" on public.watchlist;
create policy "users see own watchlist"
  on public.watchlist
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------ tabla ratings_cache ------------------------------
create table if not exists public.ratings_cache (
  tmdb_id int primary key,
  imdb_rating numeric,
  rt_score int,
  metacritic_score int,
  tmdb_score numeric,
  letterboxd_avg numeric,
  filmaffinity_score numeric,
  raw_data jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ratings_cache enable row level security;

-- Cualquiera (logueado o anon) puede LEER el caché — no hay datos personales acá
drop policy if exists "anyone can read cache" on public.ratings_cache;
create policy "anyone can read cache"
  on public.ratings_cache
  for select
  using (true);

-- Solo el service role (server con SUPABASE_SECRET_KEY) puede escribir
drop policy if exists "service role can write cache" on public.ratings_cache;
create policy "service role can write cache"
  on public.ratings_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
