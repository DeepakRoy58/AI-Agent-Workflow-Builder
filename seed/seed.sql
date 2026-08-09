-- Seed two orgs with users for local testing.
-- NOTE: user_id values below must match real auth.users(id) rows created via
-- nhost auth (sign up each test user first, then copy their UUIDs in here,
-- or query `select id, email from auth.users;` after signup and replace below).

-- Org A
insert into organizations (id, name, quota_limit, quota_used)
values ('11111111-1111-1111-1111-111111111111', 'Org A', 100, 0);

insert into org_members (org_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', '<ORG_A_OWNER_USER_ID>', 'owner'),
  ('11111111-1111-1111-1111-111111111111', '<ORG_A_EDITOR_USER_ID>', 'editor'),
  ('11111111-1111-1111-1111-111111111111', '<ORG_A_VIEWER_USER_ID>', 'viewer');

-- Org B
insert into organizations (id, name, quota_limit, quota_used)
values ('22222222-2222-2222-2222-222222222222', 'Org B', 100, 0);

insert into org_members (org_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', '<ORG_B_OWNER_USER_ID>', 'owner');

-- A sample workflow in Org A for quick manual testing
insert into workflows (id, org_id, name, created_by) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Demo Workflow', '<ORG_A_OWNER_USER_ID>');

insert into workflow_steps (workflow_id, step_order, type, config) values
  ('33333333-3333-3333-3333-333333333333', 1, 'llm_call',
   '{"prompt": "Classify this support ticket as urgent or normal: {{input}}"}'),
  ('33333333-3333-3333-3333-333333333333', 2, 'conditional_branch',
   '{"condition_field": "output.classification", "if_equals": "urgent", "then_step": 3, "else_step": 4}'),
  ('33333333-3333-3333-3333-333333333333', 3, 'approval_gate', '{}'),
  ('33333333-3333-3333-3333-333333333333', 4, 'http_request',
   '{"method": "POST", "url": "https://httpbin.org/post"}');

insert into workflow_triggers (workflow_id, type, config) values
  ('33333333-3333-3333-3333-333333333333', 'manual', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'webhook', '{"secret_env": "WEBHOOK_SHARED_SECRET"}');
