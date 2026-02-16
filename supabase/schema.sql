-- ==========================================
-- Planning Poker — Supabase Schema
-- ==========================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Drop existing tables if re-running
drop table if exists public.votes cascade;
drop table if exists public.participants cascade;
drop table if exists public.rooms cascade;
drop table if exists public.app_users cascade;

-- App users table (managed by admin, not Supabase Auth)
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  role text not null default 'normal' check (role in ('admin', 'normal')),
  created_at timestamptz default now()
);

-- Seed default admin user
insert into public.app_users (id, name, email, password, role)
values ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@poker.local', 'admin123', 'admin');

-- Create rooms table
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  host_id uuid references public.app_users(id),
  is_revealed boolean default false,
  host_vote integer,
  current_ticket_id uuid,
  current_story_name text
);

-- Create tickets table
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  ticket_id text not null,
  description text,
  position integer not null default 0,
  avg_score real,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Create participants table
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Create votes table
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  value integer,
  created_at timestamptz default now(),
  unique(room_id, ticket_id, participant_id)
);

-- Enable RLS (required for Realtime)
alter table public.app_users enable row level security;
alter table public.rooms enable row level security;
alter table public.tickets enable row level security;
alter table public.participants enable row level security;
alter table public.votes enable row level security;

-- Open policies (auth handled at app layer)
create policy "Allow all on app_users" on public.app_users
  for all using (true) with check (true);

create policy "Allow all on rooms" on public.rooms
  for all using (true) with check (true);

create policy "Allow all on participants" on public.participants
  for all using (true) with check (true);

create policy "Allow all on votes" on public.votes
  for all using (true) with check (true);

create policy "Allow all on tickets" on public.tickets
  for all using (true) with check (true);

-- Enable Realtime (add tables to existing publication — DO NOT drop it)
do $$
begin
  -- Remove tables first (in case they were previously added), then re-add
  alter publication supabase_realtime add table public.rooms;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.participants;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.votes;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tickets;
exception when others then null;
end $$;
