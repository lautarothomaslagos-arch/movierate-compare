-- =====================================================================
-- Migration 005 — Tabla user_reviews (Fase F.3)
-- =====================================================================
-- Reviews personales del usuario por peli o serie:
-- - rating numérico de 0 a 10 (medio punto: numeric(3,1))
-- - notas en texto libre (opcional)
-- - una review única por (user_id, tmdb_id, media_type)
-- - updated_at se mantiene automáticamente con trigger
--
-- Cómo correrla:
--   1. Supabase → SQL Editor → New query
--   2. Pegar TODO este archivo
--   3. Run
-- =====================================================================

create table if not exists public.user_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating numeric(3, 1) not null check (rating >= 0 and rating <= 10),
  notes text,
  -- Snapshot del título/año/poster al momento del guardado, para no tener
  -- que pegarle a TMDB por cada review al renderizar /mis-reviews.
  title text not null,
  year int,
  poster_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

-- Índice para listar las reviews del usuario por orden de creación
create index if not exists user_reviews_user_created_idx
  on public.user_reviews (user_id, created_at desc);

-- RLS: cada user solo accede a sus propias reviews
alter table public.user_reviews enable row level security;

drop policy if exists "users see own reviews" on public.user_reviews;
create policy "users see own reviews"
  on public.user_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para mantener updated_at automáticamente.
-- Si ya existe la función (de otra migration), no la pisamos.
create or replace function public.set_user_reviews_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_reviews_set_updated_at on public.user_reviews;
create trigger user_reviews_set_updated_at
  before update on public.user_reviews
  for each row execute function public.set_user_reviews_updated_at();
