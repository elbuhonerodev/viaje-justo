-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  role text not null default 'usuario',
  updated_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'usuario');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically add a profile when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
