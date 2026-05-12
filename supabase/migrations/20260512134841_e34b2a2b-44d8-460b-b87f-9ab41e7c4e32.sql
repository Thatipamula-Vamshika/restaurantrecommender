create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  theme text not null default 'casual',
  city text,
  state text,
  expected_size int not null default 4,
  created_at timestamptz not null default now()
);

create table public.group_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.group_sessions(id) on delete cascade,
  cuisines text[] not null default '{}',
  budget_max int not null default 600,
  allergies text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index group_submissions_session_idx on public.group_submissions(session_id);

alter table public.group_sessions enable row level security;
alter table public.group_submissions enable row level security;

-- Anonymous group flow: anyone with the code can read sessions and add/read submissions.
create policy "anyone read sessions" on public.group_sessions for select using (true);
create policy "anyone insert sessions" on public.group_sessions for insert with check (true);
create policy "anyone delete sessions" on public.group_sessions for delete using (true);
create policy "anyone read submissions" on public.group_submissions for select using (true);
create policy "anyone insert submissions" on public.group_submissions for insert with check (true);

alter publication supabase_realtime add table public.group_submissions;