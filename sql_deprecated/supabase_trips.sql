-- Create trips table
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  country text not null,
  travel_date date not null,
  people_count integer not null check (people_count > 0),
  currency text not null check (currency in ('COP', 'USD')),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.trips enable row level security;

-- Create Policies
-- Users can view their own trips
create policy "Users can view their own trips"
  on public.trips for select
  using (auth.uid() = user_id);

-- Users can insert their own trips
create policy "Users can insert their own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

-- Users can update their own trips
create policy "Users can update their own trips"
  on public.trips for update
  using (auth.uid() = user_id);

-- Users can delete their own trips
create policy "Users can delete their own trips"
  on public.trips for delete
  using (auth.uid() = user_id);
