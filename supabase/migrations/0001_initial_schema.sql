-- EXECUTIVE HUB · Initial data model
-- All records are scoped to an authenticated owner. RLS is enabled on every user table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Madrid',
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  project text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  event_type text not null default 'meeting' check (event_type in ('meeting', 'focus', 'reminder', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_valid_range check (ends_at > starts_at)
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  attendees text[] not null default '{}',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_valid_range check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nota sin título',
  content text not null default '',
  meeting_id uuid references public.meetings(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists calendar_events_user_start_idx on public.calendar_events(user_id, starts_at);
create index if not exists meetings_user_start_idx on public.meetings(user_id, starts_at);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.meetings enable row level security;
alter table public.notes enable row level security;

create policy "Users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage own tasks" on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own calendar events" on public.calendar_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own meetings" on public.meetings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own notes" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep updated_at current when a row changes.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at before update on public.meetings for each row execute function public.set_updated_at();
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();
