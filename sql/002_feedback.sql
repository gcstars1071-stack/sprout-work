create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null default 'other', -- 'bug' | 'feature' | 'widget' | 'other'
  message text not null,
  page text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- users can submit feedback, but cannot read anyone's (including their own) submissions back —
-- you (the project owner) read these from the Supabase Table Editor / SQL Editor with full access.
create policy "anyone signed in can submit feedback" on public.feedback
  for insert with check (auth.uid() = user_id);
