-- Generic per-user key/value store. Mirrors what the app already keeps in
-- localStorage (one row per "sproutWork_*" key), just scoped to auth.uid().
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null,
  data_value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, data_key)
);

alter table public.user_data enable row level security;

create policy "select own data" on public.user_data
  for select using (auth.uid() = user_id);

create policy "insert own data" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "update own data" on public.user_data
  for update using (auth.uid() = user_id);

create policy "delete own data" on public.user_data
  for delete using (auth.uid() = user_id);
