-- =====================================================================
-- Migration 002 — Tabla watchlist
-- =====================================================================
-- Lista "Quiero ver" del usuario. Similar a history pero sin
-- last_viewed_at (acá importa added_at).
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

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
