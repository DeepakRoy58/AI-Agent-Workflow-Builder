# AI Agent Workflow Builder

A mini n8n, scoped down to one idea: chain AI agent steps together, run them for real, and make sure two different orgs sharing the same database can never see or touch each other's data — even if someone tries to guess an ID.

Built on **nhost + Hasura + PostgreSQL + GraphQL + Next.js**.

**Live app:** [`website`](https://ai-agent-workflow-builder-node.vercel.app/login)
**GitHub repo:** [`repo`](https://github.com/DeepakRoy58/AI-Agent-Workflow-Builder)

**Test credentials:**
| Org | Role | Email | Password |
|---|---|---|---|
| Org A | owner | ownerA@test.com | password123 |
| Org A | editor | editorA@test.com | password123 |
| Org B | owner | ownerB@test.com | password123 |


## The one design decision worth reading before anything else

Workflow execution is **stateless and resumable**, and that single choice is why the rest of the codebase is smaller than it looks.

`triggerWorkflowRun` doesn't just "start" a run — it's the *entire* execution engine. It steps through `workflow_steps` in order starting from position 0, updates `step_runs` as it goes, and either finishes or hits an `approval_gate` and stops. `approveStep` doesn't have separate resume logic; it calls the exact same execution loop, just starting one step later. A fresh run, a webhook-triggered run, and a paused-then-approved run are the same code path with a different starting index — not three different systems that all have to agree with each other.

That's the thing to understand before diving into the schema or the permission tables below. Everything else in this README is in service of that one loop.


## Two permission layers, and why one isn't enough

Every request is checked twice, and deliberately in two different places:

**Layer 1 — org/role scoping, enforced by Hasura itself.** Every table's row-level permission filters through a relationship chain back to `org_members`. A user querying a workflow that isn't theirs doesn't get an error — the row simply doesn't exist from their point of view. This is declarative, applied per-table (Hasura doesn't cascade permissions across relationships, so each of `workflows`, `workflow_steps`, `workflow_triggers`, `workflow_runs`, and `step_runs` has its own rule), and it's what makes cross-org isolation hold even against a raw GraphQL query with a guessed UUID.

**Layer 2 — step-level gating, enforced in code.** Some actions can't be expressed as a row filter because they depend on *what* is being written, not just *who's* writing it. Creating a `db_write`, `webhook`, or `notify` step requires the `owner` role specifically — checked inside the `upsertWorkflowStep` Action handler, before the insert happens, because Hasura's permission DSL can't branch on a JSONB `type` field at insert time. Approving an `approval_gate` requires `owner` or `editor` — checked inside `approveStep`, because that's a mid-execution state transition, not a plain read or write, and needs to happen *before* the run is allowed to resume.

Short version: if a rule can be expressed as "which rows can this role see," it lives in Hasura. If it depends on branching logic mid-action, it lives in a handler. Mixing those up is where most permission bugs in Hasura projects come from.


## What's real vs. what's a placeholder

Being upfront about this rather than burying it in a checklist at the bottom:

- **LLM calls:** `<real / stubbed with artificial delay — state which and why>`
- **Triggers implemented:** manual + webhook (the assignment only requires one beyond manual). Scheduled and DB-event triggers are **not** built — noted here rather than left to be discovered.
- **Frontend:** every flow works end to end (login → build a workflow → run it → watch it stream live → approve a gate → see it resume and complete) but styling is default/unstyled throughout. Time went into the schema, the two permission layers, and the Action-handler logic instead of a design pass.
- **Step config editing** is a raw JSON textarea, not per-type forms. Step reordering is up/down buttons, not drag-and-drop.
- **New user roles aren't set automatically on signup** — each test user needs `default_role` and a matching `auth.user_roles` row set by hand (step 7 below). A real version would do this with an Auth hook.


## Tech Stack

| Layer | Tool |
|---|---|
| Database | PostgreSQL (via nhost) |
| API layer | Hasura GraphQL Engine |
| Auth | nhost Auth |
| Serverless functions | nhost Functions (Hasura Action handlers) |
| Frontend | Next.js (React) |
| LLM calls | `[Groq / OpenRouter / Gemini — fill in which one you used]` |
| Hosting (frontend) | Vercel |
| Hosting (backend) | nhost Cloud |


<img width="1324" height="552" alt="image" src="https://github.com/user-attachments/assets/00eccfcc-aa0f-4cd7-9a3d-ff3133e1e624" />


## Setup — cloud-first, because that's how this was actually built

Local Docker (`nhost up`) does work and the steps are the same once it's running, but this project was built and tested against nhost Cloud directly, because schema/permission iteration in the cloud dashboard was faster and more reliable than fighting the CLI's expected folder structure. If you want the local path, see the [Optional: local Docker](#optional-local-docker-instead-of-cloud) note at the end of this section — otherwise, follow this as written.

**1. Clone the repo**
```bash
git clone <your-repo-url>
cd ai-agent-workflow-builder
```

**2. Create an nhost Cloud project** at [nhost.io](https://nhost.io). Note the subdomain and region from **Settings → Environment Variables** — you'll need both for the frontend env file.

**3. Load the schema.** In the dashboard: **Database → SQL Editor**, paste the full contents of `migrations/001_init.sql`, run it. Confirm 7 tables plus the `org_usage_this_month` view show up.

**4. Wire up relationships.** For each table with a foreign key (`org_members`, `workflows`, `workflow_steps`, `workflow_triggers`, `workflow_runs`, `step_runs`): table's "..." menu → **Edit Relationships** → add every suggested relationship. Hasura detects these from the FKs automatically.

**5. Add the three custom roles.** Hasura ships with `admin`/`user`/`public`, none of which this schema uses. On any table: "..." → **Edit Permissions** → **Settings page** (blue banner) → **+ Create Allowed Role** → add `owner`, `editor`, `viewer`.

**6. Set permissions, table by table, role by role.** Use **"With custom check"** in **JSON** editor mode — genuinely faster than the visual builder once relationships get nested. The exact filters are in [Permission Layers](#two-permission-layers-and-why-one-isnt-enough) above; they all chain back to `org_members`. Don't forget **"Select All"** on columns before saving each one — it's not the default.

**7. Create test users.** **Auth → Users** → add each with email/password. Two things Hasura doesn't do for you on signup, both required before login works:

```sql
-- email must be verified
update auth.users set email_verified = true where email = 'ownerA@test.com';

-- default_role must match the app role — new signups get 'user', which has zero permissions here
update auth.users set default_role = 'owner' where email = 'ownerA@test.com';
insert into auth.user_roles (user_id, role)
select id, 'owner' from auth.users where email = 'ownerA@test.com'
on conflict do nothing;
```

**8. Seed the orgs.** Grab real UUIDs with `select id, email from auth.users;`, drop them into `seed/seed.sql`'s placeholders, run the whole file. This creates two orgs, their memberships, and one sample workflow.

**9. Add CORS origins.** **Settings → General** → add `http://localhost:3000`, and later your Vercel URL. Skip this and every frontend request gets silently blocked by the browser with no obvious error.

**10. Run the frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
```
Edit `.env.local` with your real cloud values (not `local`):
```
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=your-region
```
```bash
npm run dev
```
Live at `http://localhost:3000`.

### Optional: local Docker instead of cloud

```bash
npm install -g nhost-cli
nhost init      # only if not already initialized
nhost up        # Postgres + Hasura + Auth in Docker
```
Same migration/permission/seed steps apply against the local dashboard. One gotcha: the CLI's own `nhost hasura migrate apply` / `nhost hasura metadata apply` expect an `nhost/migrations/<timestamp>_name/` layout that this repo's flatter `migrations/`/`metadata/` folders don't match — pasting SQL and permissions through the dashboard UI sidesteps that entirely, which is why that's the documented path above.


## Environment Variables

**`frontend/.env.local`**
```bash
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain   # dashboard > Settings > Environment Variables
NEXT_PUBLIC_NHOST_REGION=your-region         # e.g. ap-south-1
```
Use `local` for both if pointed at Docker instead of cloud.

**nhost Functions / Actions secrets** (set via `nhost secrets set` or the dashboard — never committed):
```bash
LLM_API_KEY=<your key>                 # Groq/OpenRouter/Gemini
LLM_STUBBED=false                      # true skips real calls, adds artificial delay instead
WEBHOOK_SHARED_SECRET=<random string>  # validates inbound webhook-trigger calls
HASURA_ADMIN_SECRET=<from nhost project settings>
HASURA_GRAPHQL_ENDPOINT=<your hasura endpoint>/v1/graphql
```


## Database Schema

Full DDL in `migrations/`. The relationship chain is `organizations → org_members → workflows → workflow_steps/workflow_triggers`, and separately `workflows → workflow_runs → step_runs`.

| Table | Purpose |
|---|---|
| `organizations` | `id, name, quota_limit, quota_used, quota_period_start` |
| `org_members` | `id, org_id, user_id, role (owner\|editor\|viewer)` — the table everything else's permissions chain back to |
| `workflows` | `id, org_id, name, created_by` |
| `workflow_steps` | `id, workflow_id, step_order, type, config (jsonb)` |
| `workflow_triggers` | `id, workflow_id, type (manual\|webhook\|scheduled\|db_event), config (jsonb)` |
| `workflow_runs` | `id, workflow_id, status (pending\|running\|paused\|completed\|failed), started_at, finished_at, triggered_by, trigger_type` |
| `step_runs` | `id, workflow_run_id, workflow_step_id, status, input, output, error, attempt_count, approved_by, approved_at` |

```sql
-- exposed as a computed/read-only table so it's queryable via GraphQL
create view org_usage_this_month as
select org_id, count(*) as runs_this_month,
       avg(extract(epoch from (finished_at - started_at))) as avg_duration_seconds
from workflow_runs
where started_at >= date_trunc('month', now())
group by org_id;
```


## Hasura Actions

**`triggerWorkflowRun(workflow_id: uuid!)`** — this is the execution engine described above.
1. Re-checks the caller's role in `org_members` directly (Actions run with the admin secret, so auth is never inherited — it has to be re-verified inside the handler).
2. Checks `organizations.quota_used < quota_limit`; rejects if exhausted.
3. Inserts a `workflow_runs` row (`status = running`).
4. Walks `workflow_steps` in `step_order`, updating `step_runs` before/after each step so the live subscription reflects real progress:
   - `llm_call` / `http_request` — real external call, try/catch, one retry with backoff on failure.
   - `conditional_branch` — reads the previous step's `output`, picks the next step index.
   - `approval_gate` — sets `step_runs.status = paused_awaiting_approval` and `workflow_runs.status = paused`, then returns. Execution stops here until someone approves.
5. On finishing all steps: increments `quota_used`, sets `workflow_runs.status = completed`.

**`approveStep(step_run_id: uuid!)`**
1. Resolves `step_run → workflow_run → workflow → org`.
2. Confirms caller's role in that org is `owner`/`editor`.
3. Sets `approved_by`, `approved_at`, flips status back to `running`.
4. Re-invokes the same execution loop starting right after the approved step.

**`upsertWorkflowStep(...)`** — where Layer 2's create-time role check actually lives (see above).

## Triggers

| Type | Status |
|---|---|
| **Manual** | Frontend calls `triggerWorkflowRun` directly; button hidden for viewers in the UI *and* the role check is re-run server-side regardless. |
| **Webhook** | `triggerWorkflowRun` is also exposed as an HTTP endpoint. External callers authenticate with a shared secret header instead of a user JWT — the handler swaps in secret validation in place of the normal role check. |
| **Scheduled** | `[Implemented / Stubbed — state which]` |
| **Database event** | `[Implemented / Stubbed — state which]` |

Manual + webhook satisfies the assignment's "one trigger beyond manual" requirement on its own, so scheduled/DB-event were left out rather than rushed.

## Smoke Test (local)

```
1. Log in as seeded Org A owner
2. Build: llm_call -> conditional_branch -> approval_gate -> http_request
3. Run it — watch step_runs update live via subscription
4. When it pauses at approval_gate, approve as Org A owner/editor
5. Confirm it resumes and completes
```

## Deployment

**Backend** — already live the moment the nhost Cloud project is configured; there's no separate deploy step since schema/permissions/Actions were built directly against the live project.

**Frontend (Vercel):**
1. Push to GitHub.
2. Import in Vercel, set root directory to `frontend/`.
3. Add `NEXT_PUBLIC_NHOST_SUBDOMAIN` / `NEXT_PUBLIC_NHOST_REGION` (real cloud values) in project settings.
4. Deploy.
5. Add the resulting Vercel URL to nhost's CORS allowed origins — same failure mode as skipping `localhost:3000` locally, just harder to debug in prod.
6. Smoke-test the live URL end to end before recording the demo.

## Testing Cross-Org Isolation

This is graded directly, so verify it rather than trust that Layer 1 works:

1. Log in as an Org B user.
2. In GraphQL Playground (or the app's network tab), query/mutate using an Org A `workflow_id` or `step_run_id` copied from an Org A session.
3. Confirm: `select` returns an empty result — not an error, not data. `insert`/`update`/`approveStep`/`triggerWorkflowRun` all reject with an authorization error.
4. Repeat for at least one guessed ID per table (`workflows`, `workflow_runs`, `step_runs`).
5. 
## Final Task Walkthrough

1. Org A and Org B both exist, each with their own seeded users/roles.
2. Org A owner builds `llm_call → conditional_branch → http_request`, branch outcome depending on the LLM's output.
3. Run manually — confirm live status streams via subscription.
4. Trigger again via the webhook endpoint (curl/Postman) — confirm a second run starts with zero UI interaction.
5. Add an `approval_gate`; run again; confirm it pauses; approve as Org A owner; confirm it resumes and completes.
6. Log in as an Org B user; attempt to view/trigger/approve anything belonging to Org A, including by guessed ID — confirm every attempt fails per [Testing Cross-Org Isolation](#testing-cross-org-isolation).


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
│   └── seed.sql                # two orgs, users, roles
├── demo/
│   └── final-task.mp4
└── README.md
```

## Environment gotchas worth knowing before you hit them

- **Node 22+ breaks Next.js 14's dev server** with an unrelated internal TypeScript-check error (`Cannot read properties of undefined (reading 'endsWith')`). Use Node 20.
- Declaring `typescript` / `@types/react` / `@types/node` as explicit devDependencies (rather than letting Next.js auto-install them on first run) avoids a separate crash in that auto-install path.

---

## Write-up

`WRITEUP.md` covers the schema reasoning, how the two permission layers differ in enforcement mechanism, and the pause/resume implementation for `approval_gate` in more depth than fits here.
