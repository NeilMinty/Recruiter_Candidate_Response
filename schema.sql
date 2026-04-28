-- Closure — consolidated schema
-- Run this once in the Supabase SQL editor to create all tables from scratch.
-- Dependency order: roles → candidates → evaluations, audit_log → settings

-- ─────────────────────────────────────────────
-- Roles
-- ─────────────────────────────────────────────
create table roles (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  job_description     text not null,
  greenhouse_job_id   bigint unique,
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Candidates
-- ─────────────────────────────────────────────
create table candidates (
  id                          uuid primary key default gen_random_uuid(),
  role_id                     uuid references roles(id) on delete cascade,
  name                        text not null,
  email                       text not null,
  cv_path                     text,
  cv_text                     text,
  transcript_path             text,
  transcript_text             text,
  recruiter_notes             text,
  status                      text not null default 'active'
                                check (status in ('active', 'pending-review', 'closed-pending', 'closed-sent')),
  greenhouse_candidate_id     bigint,
  greenhouse_application_id   bigint unique,
  created_at                  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Evaluations
-- ─────────────────────────────────────────────
create table evaluations (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidates(id) on delete cascade,
  evaluation_text     text not null,
  evidence_statement  text not null,
  draft_message       text not null,
  final_message       text,
  approved_at         timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid references candidates(id) on delete cascade,
  event         text not null,
  detail        text,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Settings
-- Runtime configuration. Keys used by the application:
--   email_provider          — 'resend' (default) | 'gmail-mcp' | 'outlook-mcp'
--   gmail_oauth_token       — OAuth token for Gmail MCP delivery
--   greenhouse_api_key      — Harvest API key for Greenhouse integration
--   greenhouse_webhook_secret — HMAC secret for validating Greenhouse webhooks
-- ─────────────────────────────────────────────
create table settings (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value       text not null,
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Storage bucket
-- Create manually in the Supabase dashboard: Storage → New bucket
-- Name: candidate-files  |  Public: off
-- Or via SQL:
-- insert into storage.buckets (id, name, public)
--   values ('candidate-files', 'candidate-files', false);
-- ─────────────────────────────────────────────
