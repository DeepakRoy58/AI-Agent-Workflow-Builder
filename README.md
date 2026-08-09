# AI Agent Workflow Builder

A mini n8n for chaining AI agent steps, built on **nhost + Hasura + PostgreSQL + GraphQL + Next.js**.

Users inside an organization build workflows out of ordered steps (`llm_call`, `http_request`, `db_write`, `notify`, `conditional_branch`, `approval_gate`), start them manually or via webhook, and watch execution stream live via GraphQL subscriptions. Every action is checked against two permission layers: org/role scoping (Hasura row-level permissions) and step-level gating (enforced in Action handlers).

**Note on the frontend:** functional, not polished. Every flow works end
to end -- login, workflow builder, live run view with subscriptions,
approval gate -- but the styling is minimal/default. Time went into the
schema, permission layers, and Action-handler logic rather than UI design.

**Live app:** `<add Vercel URL>`
**GitHub repo:** `<add repo link>`

**Test credentials:**
| Org | Role | Email | Password |
|---|---|---|---|
| Org A | owner | ownerA@test.com | password123 |
| Org A | editor | editorA@test.com | password123 |
| Org B | owner | ownerB@test.com | password123 |

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Permission Layers](#permission-layers)
- [Hasura Actions](#hasura-actions)
- [Triggers](#triggers)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Testing Cross-Org Isolation](#testing-cross-org-isolation)
- [Final Task Walkthrough](#final-task-walkthrough)
- [Project Structure](#project-structure)
- [Known Limitations / Stubs](#known-limitations--stubs)

---

## Tech Stack

| Layer | Tool |
|---|---|
| Database | PostgreSQL (via nhost) |
| API layer | Hasura GraphQL Engine |
| Auth | nhost Auth |
| Serverless functions | nhost Functions (Hasura Actions handlers) |
| Frontend | Next.js (React) |
| LLM calls | [Groq / OpenRouter / Gemini — fill in which one you used] |
| Hosting (frontend) | Vercel |
| Hosting (backend) | nhost Cloud |

---

## Architecture Overview


Execution is **stateless and resumable**: `triggerWorkflowRun` runs steps in order starting at position 0; `approveStep` re-invokes the same execution logic starting from the step *after* the approved gate. This means pause/resume, retries, and webhook-triggered runs all share one code path instead of three.

---

## Prerequisites

- Node.js 20 (Node 22+ currently breaks Next.js 14's dev-server TypeScript
  check with an unrelated internal error -- see [Known Limitations](#known-limitations--stubs))
- A free nhost Cloud project (this build was done entirely against nhost
  Cloud, not local Docker -- see note below)
- A Vercel account (for frontend deploy)
- An LLM API key (Groq/OpenRouter/Gemini free tier) — **or** leave `LLM_STUBBED=true` to use a stubbed call with an artificial delay (see [Known Limitations](#known-limitations--stubs))

**Note on local vs cloud development:** this project was built and tested
directly against an nhost Cloud project rather than the local Docker
environment (`nhost up`). Local Docker setup did work (see the CLI
commands below if you want to try it), but schema, permissions, and
testing were all done in the cloud dashboard, which turned out to be more
reliable for a first pass. Both approaches are supported; the setup steps
below reflect the cloud path actually used for this submission.

---

## Setup (cloud-first, as actually built)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd ai-agent-workflow-builder
```

**2. Create an nhost Cloud project** at [nhost.io](https://nhost.io) --
sign up, create a new project, note its subdomain and region (shown on the
project's Settings > Environment Variables page as `NHOST_SUBDOMAIN` /
`NHOST_REGION`).

**3. Load the schema.** Open the project's dashboard, go to
**Database > Table Editor & Browser > SQL Editor**, paste the full
contents of `migrations/001_init.sql`, and run it. Confirm all 7 tables
plus the `org_usage_this_month` view appear in the table list.

**4. Set up relationships.** For each table with a foreign key
(`org_members`, `workflows`, `workflow_steps`, `workflow_triggers`,
`workflow_runs`, `step_runs`), click the table's "..." menu > **Edit
Relationships**, and add every suggested relationship shown. Hasura
auto-detects these from the foreign keys in the schema.

**5. Add custom roles.** Hasura's default roles (`admin`, `user`,
`public`, etc.) don't include this project's roles. Open any table's
"..." menu > **Edit Permissions** > click **"Settings page"** in the blue
banner > **"+ Create Allowed Role"** > add `owner`, `editor`, `viewer`.

**6. Set permissions on every table.** For each table, for each of the
three roles, add a `select` permission with **"With custom check"**, using
the **JSON** editor mode (faster and less error-prone than the visual
query builder for nested relationships). See [Permission
Layers](#permission-layers) below for the exact filters -- they chain
through each table's relationship back to `org_members`. Remember to
check **"Select All"** on columns before saving each permission.

**7. Create test users.** Dashboard > **Auth > Users** > create users with
email/password (e.g. `ownerA@test.com` / `password123`). New users need
`email_verified = true` to log in -- either toggle it in the user's detail
panel, or run in SQL Editor:
```sql
update auth.users set email_verified = true where email = 'ownerA@test.com';
```
Each user also needs a `default_role` matching their intended app role
(Hasura's default role for new sign-ups is `user`, which has no
permissions in this schema):
```sql
update auth.users set default_role = 'owner' where email = 'ownerA@test.com';
insert into auth.user_roles (user_id, role)
select id, 'owner' from auth.users where email = 'ownerA@test.com'
on conflict do nothing;
```

**8. Seed org data.** Fill in the real user UUIDs (from `select id, email
from auth.users;`) into `seed/seed.sql`'s placeholders, then run the whole
file in SQL Editor. This creates two orgs, memberships, and one sample
workflow.

**9. Add CORS origins.** Dashboard > **Settings > General** (or wherever
your dashboard version places it) -- add `http://localhost:3000` and
later your Vercel URL to the allowed origins, or the frontend's requests
will be silently blocked by the browser.

**10. Run the frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
```
Edit `.env.local` to use your actual cloud values, not `local`:
```
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=your-region
```
```bash
npm run dev
```

Frontend will be live at `http://localhost:3000`.

### Optional: local Docker environment instead of cloud

```bash
npm install -g nhost-cli
nhost init      # only if not already initialized
nhost up        # spins up Postgres + Hasura + Auth in Docker
```
This prints local URLs (Hasura console, GraphQL endpoint, Auth endpoint).
From here the same migration/permission/seed steps apply, run against the
local dashboard instead of the cloud one. Note: the CLI's own migration/
metadata-apply commands (`nhost hasura migrate apply`, `nhost hasura
metadata apply`) expect a specific nhost folder structure
(`nhost/migrations/<timestamp>_name/`) that this repo's flatter
`migrations/` and `metadata/` folders don't match out of the box --
pasting the SQL/permissions through the dashboard UI (as described above)
sidesteps that entirely and is what was actually used.

---

## Environment Variables

**`frontend/.env.local`**

```bash
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain   # from nhost dashboard > Settings > Environment Variables
NEXT_PUBLIC_NHOST_REGION=your-region         # e.g. ap-south-1
```

If pointed at a local Docker environment instead, use `local` for both.

**nhost Functions / Actions secrets** (set via `nhost secrets set` or the nhost dashboard, not committed):

```bash
LLM_API_KEY=<your key>              # Groq/OpenRouter/Gemini key
LLM_STUBBED=false                   # set true to skip real calls
WEBHOOK_SHARED_SECRET=<random string>  # validates inbound webhook trigger calls
HASURA_ADMIN_SECRET=<from nhost project settings>
HASURA_GRAPHQL_ENDPOINT=<your hasura endpoint>/v1/graphql
```

---

## Database Schema

Core tables (full DDL in `migrations/`):

- **organizations** — `id, name, quota_limit, quota_used, quota_period_start`
- **org_members** — `id, org_id, user_id, role (owner|editor|viewer)`
- **workflows** — `id, org_id, name, created_by`
- **workflow_steps** — `id, workflow_id, step_order, type, config (jsonb)`
- **workflow_triggers** — `id, workflow_id, type (manual|webhook|scheduled|db_event), config (jsonb)`
- **workflow_runs** — `id, workflow_id, status (pending|running|paused|completed|failed), started_at, finished_at, triggered_by, trigger_type`
- **step_runs** — `id, workflow_run_id, workflow_step_id, status, input, output, error, attempt_count, approved_by, approved_at`

Relationship chain: `organizations → org_members → workflows → workflow_steps/workflow_triggers`, and `workflows → workflow_runs → step_runs`.

An aggregation view exposes org-level usage:

```sql
create view org_usage_this_month as
select org_id, count(*) as runs_this_month, avg(extract(epoch from (finished_at - started_at))) as avg_duration_seconds
from workflow_runs
where started_at >= date_trunc('month', now())
group by org_id;
```

Tracked in Hasura as a computed field / read-only table so it's queryable via GraphQL.

---

## Permission Layers

### Layer 1 — Org + role scoping (Hasura row-level permissions)

Declared per-table in Hasura metadata (`metadata/databases/default/tables/*.yaml`). Every table's `select`/`insert`/`update` permission filters through a relationship to `org_members`:

```yaml
# example: workflows select permission for role "editor"
filter:
  org:
    members:
      _and:
        - user_id: { _eq: X-Hasura-User-Id }
```

This guarantees a user only ever sees/touches rows in orgs they belong to — regardless of role, and regardless of guessing another org's row ID (the filter makes non-member rows simply not exist from that user's point of view; Hasura returns an empty result, not an error).

Applied identically across `workflows`, `workflow_steps`, `workflow_triggers`, `workflow_runs`, `step_runs`, each with its own rule since Hasura permissions don't cascade automatically.

### Layer 2 — Step-level gating (enforced in code, not Hasura permissions)

Some step types reach outside the sandbox and can't be safely gated by a declarative row filter alone:

- Creating a `db_write`, `webhook` trigger, or `notify` step requires `owner` role — checked inside the `upsertWorkflowStep` Action handler before the insert happens.
- Approving an `approval_gate` requires the approver's `org_members.role` to be `owner` or `editor` — checked inside the `approveStep` Action handler before the run is resumed, because this is a mid-execution state transition, not a plain row read/write.

This is intentional: Hasura's declarative permission DSL can't easily branch conditionally on a JSONB/enum field value at insert time, so both of these checks live in application code where they're testable and auditable.

---

## Hasura Actions

### `triggerWorkflowRun(workflow_id: uuid!)`

1. Verifies caller is `owner`/`editor` in the workflow's org (queries `org_members` directly inside the handler — Actions execute with admin secret, so they must re-check auth themselves).
2. Checks `organizations.quota_used < quota_limit`; rejects with an error if exhausted.
3. Inserts a `workflow_runs` row (`status = running`).
4. Executes `workflow_steps` in `step_order`, updating the corresponding `step_runs` row before/after each step so the frontend subscription reflects progress live:
   - `llm_call` / `http_request`: real external call, wrapped in try/catch, **one retry on failure** with a short backoff.
   - `conditional_branch`: reads the previous step's `output`, decides which step index executes next.
   - `approval_gate`: sets `step_runs.status = paused_awaiting_approval` and `workflow_runs.status = paused`, then returns — execution stops here until approved.
5. On completing all steps: increments `organizations.quota_used`, sets `workflow_runs.status = completed`.

### `approveStep(step_run_id: uuid!)`

1. Resolves `step_run → workflow_run → workflow → org`.
2. Checks caller's role in that org is `owner`/`editor`.
3. Sets `approved_by`, `approved_at`, flips status back to `running`.
4. Re-invokes the same execution loop starting immediately after the approved step, until completion or the next `approval_gate`.

### `upsertWorkflowStep(...)`

Handles Layer 2 gating for step creation (see above) before writing to `workflow_steps`.

---

## Triggers

| Type | How it's wired |
|---|---|
| **Manual** | Frontend calls `triggerWorkflowRun` directly, gated behind role check in UI (button hidden for viewers) *and* re-checked server-side. |
| **Webhook** | `triggerWorkflowRun` is itself exposed as an HTTP Action endpoint. External callers hit it with a shared secret header instead of a user JWT; the handler validates the secret in place of the normal auth check. |
| **Scheduled** | [Implemented / Stubbed — state which] via nhost scheduled function on a cron expression from `workflow_triggers.config`. |
| **Database event** | [Implemented / Stubbed — state which] via a Hasura Event Trigger on the watched table, calling `triggerWorkflowRun` on insert/update. |

> Fill in the bracketed lines above with what you actually built — the assignment only requires manual + one other, so it's fine if scheduled/db_event are noted as not implemented due to time.

---

## Running Locally — Quick Smoke Test

```bash
# With nhost up + frontend dev server running:

# 1. Log in as seeded Org A owner in the UI
# 2. Create a workflow with llm_call -> conditional_branch -> approval_gate -> http_request
# 3. Click Run — watch step_runs update live via subscription
# 4. When it pauses at approval_gate, click Approve (as Org A owner/editor)
# 5. Confirm it resumes and completes
```

---

## Deployment

### Backend (nhost Cloud)

The backend is already the nhost Cloud project set up in [Setup](#setup-cloud-first-as-actually-built)
above -- there's no separate "deploy" step for schema/permissions/Actions,
since everything was built directly against the live cloud project via its
dashboard. It's reachable at its GraphQL/Auth URLs the moment it's
configured.

### Frontend (Vercel)

1. Push this repo to GitHub.
2. Import the repo in Vercel, set the **root directory** to `frontend/`.
3. Add environment variables in Vercel project settings: `NEXT_PUBLIC_NHOST_SUBDOMAIN`, `NEXT_PUBLIC_NHOST_REGION` (the real cloud values).
4. Deploy. Vercel provides a live URL.
5. **Add the Vercel URL to nhost's CORS allowed origins** (dashboard > Settings > General) -- without this, the deployed frontend's requests will be blocked by the browser exactly like local requests are blocked without `http://localhost:3000` allowed.
6. Smoke-test the live URL end-to-end before recording the demo.

---

## Testing Cross-Org Isolation

This is explicitly graded, so verify it directly rather than assuming Layer 1 works:

1. Log in as an Org B user.
2. In GraphQL Playground (or the app's network tab), manually query/mutate using an Org A `workflow_id` or `step_run_id` copied from Org A's session.
3. Confirm: `select` returns an empty result (not an error, not data), `insert`/`update`/the `approveStep`/`triggerWorkflowRun` Actions all reject with an authorization error.
4. Repeat for at least one guessed/copied ID per table (`workflows`, `workflow_runs`, `step_runs`).

---

## Final Task Walkthrough

Matches the assignment's required live scenario:

1. Two orgs (A, B) exist, each with their own seeded users/roles.
2. Org A owner builds a workflow: `llm_call → conditional_branch → http_request`, with the branch outcome depending on the LLM's output.
3. Run it manually — confirm live status streams via subscription.
4. Trigger it again via the webhook endpoint (curl or Postman) — confirm a second run starts without any button click.
5. Add an `approval_gate` step; run again; confirm it pauses; approve as Org A owner; confirm it resumes and completes.
6. Log in as an Org B user; attempt to view/trigger/approve anything belonging to Org A, including by ID — confirm all attempts fail per [Testing Cross-Org Isolation](#testing-cross-org-isolation).

A recording of this sequence is in `/demo/final-task.mp4` (or linked here: `<link>`).

---

## Project Structure

```
.
├── frontend/                  # Next.js app
│   ├── pages/ or app/
│   ├── components/
│   └── .env.example
├── functions/                 # nhost Functions = Hasura Action handlers
│   ├── triggerWorkflowRun.ts
│   ├── approveStep.ts
│   └── upsertWorkflowStep.ts
├── migrations/                 # SQL schema migrations
├── metadata/                   # Hasura metadata (tables, relationships, permissions, actions)
├── seed/
│   └── seed.sql                # two orgs, users, roles for local testing
├── demo/
│   └── final-task.mp4
└── README.md
```

---

## Known Limitations / Stubs

- [ ] LLM calls: `<real / stubbed with artificial delay — state which and why>`
- [ ] Scheduled trigger: not implemented (manual + webhook satisfy the "trigger beyond manual" requirement on their own)
- [ ] DB event trigger: not implemented, same reasoning
- [ ] Step reordering UI: up/down buttons, not drag-and-drop
- [ ] Step config: raw JSON textarea rather than per-type forms
- [ ] **Frontend visual polish**: functional but plain -- default form styling throughout, no design pass. Every flow (login, workflow builder, run view with live subscription, approval) works end to end; time went into the schema, permission layers, and Action-handler logic instead.
- [ ] Node 22+ crashes Next.js 14's dev server with an unrelated internal
      TypeScript-verification error (`Cannot read properties of undefined
      (reading 'endsWith')`). Use Node 20. Also note: declaring
      `typescript`/`@types/react`/`@types/node` as explicit devDependencies
      (rather than letting Next.js auto-install them on first run) avoids a
      separate, unrelated crash in that auto-install path.
- [ ] New users' Hasura role isn't set automatically on signup in this
      build -- each test user needs `default_role` and a matching
      `auth.user_roles` row set manually (see setup step 7). A production
      version would set this via an Auth hook on signup instead.

---

## Write-up (schema reasoning, permission enforcement, approval-gate flow)

See `WRITEUP.md` for the required ~1 page write-up covering schema design decisions, how the two permission layers differ in enforcement mechanism, and the pause/resume implementation for `approval_gate`.