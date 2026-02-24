-- Phase 2: Supabase setup for shared calendar MVP
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  notes text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at > start_at)
);

create index if not exists idx_events_start_at on public.events (start_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_events_set_updated_at on public.events;

create trigger trg_events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

alter table public.events enable row level security;

grant select, insert, update, delete on public.events to authenticated;

-- Policy: any authenticated user can CRUD (MVP shared account model)
drop policy if exists "Authenticated can manage events" on public.events;

create policy "Authenticated can manage events"
on public.events
for all
to authenticated
using (true)
with check (true);

-- Realtime publication registration
-- Avoid duplicate add errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END
$$;
