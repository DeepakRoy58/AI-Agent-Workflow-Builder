-- AI Agent Workflow Builder — initial schema
create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quota_limit int not null default 1000,
  quota_used int not null default 0,
  quota_period_start timestamptz not null default date_trunc('month', now()),
  created_at timestamptz not null default now()
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id), nhost-managed schema
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index idx_org_members_user on org_members(user_id);

create table workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_workflows_org on workflows(org_id);

create table workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  step_order int not null,
  type text not null check (type in
    ('llm_call','http_request','db_write','notify','conditional_branch','approval_gate')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);
create index idx_steps_workflow on workflow_steps(workflow_id);

create table workflow_triggers (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  type text not null check (type in ('manual','webhook','scheduled','db_event')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_triggers_workflow on workflow_triggers(workflow_id);

create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  status text not null check (status in
    ('pending','running','paused','completed','failed')) default 'pending',
  trigger_type text not null default 'manual',
  triggered_by uuid,
  started_at timestamptz default now(),
  finished_at timestamptz
);
create index idx_runs_workflow on workflow_runs(workflow_id);

create table step_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references workflow_steps(id) on delete cascade,
  status text not null check (status in
    ('pending','running','paused_awaiting_approval','succeeded','failed')) default 'pending',
  input jsonb,
  output jsonb,
  error text,
  attempt_count int not null default 0,
  approved_by uuid,
  approved_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz
);
create index idx_step_runs_run on step_runs(workflow_run_id);

-- Org-level usage aggregation, exposed to Hasura as a read-only tracked view
create view org_usage_this_month as
select
  o.id as org_id,
  count(r.id) filter (where r.started_at >= date_trunc('month', now())) as runs_this_month,
  avg(extract(epoch from (r.finished_at - r.started_at)))
    filter (where r.finished_at is not null) as avg_duration_seconds,
  o.quota_used,
  o.quota_limit
from organizations o
left join workflow_runs r on r.workflow_id in (select id from workflows w where w.org_id = o.id)
group by o.id, o.quota_used, o.quota_limit;
