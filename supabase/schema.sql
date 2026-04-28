-- Roles
create table roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  job_description text not null,
  created_at timestamptz default now()
);

-- Candidates
create table candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references roles(id) on delete cascade,
  name text not null,
  email text not null,
  cv_path text,
  transcript_path text,
  recruiter_notes text,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now()
);

-- Evaluations
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  evaluation_text text not null,
  evidence_statement text not null,
  draft_message text not null,
  final_message text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  event text not null,
  detail text,
  created_at timestamptz default now()
);

-- Storage bucket (run via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('candidate-files', 'candidate-files', false);

-- RLS: disable for service role usage only. Enable row-level security if adding user auth.
