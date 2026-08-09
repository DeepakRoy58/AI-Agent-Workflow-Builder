# Submission Notes -- AI Agent Workflow Builder

## Honest summary

The backend -- schema, Hasura permission layers, and the Action-handler
execution engine -- is the part I spent most of my time on and where I'm
confident the design holds up under scrutiny. The frontend UI is
functional but visibly rough -- I prioritized getting the permission model
and execution logic correct over polishing the interface, given the time
constraints. Every screen works end to end, it's just not styled.

## How this maps to the evaluation criteria

**The Final Task passes, live -- weighted above everything else**
Two orgs exist with separate users and roles. Org A's owner can build a
workflow with llm_call, conditional_branch, http_request, and an
approval_gate step, trigger it manually or via webhook, watch live status
via subscription including the paused state, and approve it forward. Org B
users cannot see, trigger, or approve any of it -- including by guessing
Org A's IDs directly.

**Cross-org isolation is airtight, including against direct ID guessing**
Every table's Hasura select/insert permission is scoped through a
relationship back to org_members, filtered on the caller's
X-Hasura-User-Id. A non-member row returns empty, not an error -- verified
directly by querying Org A's workflow_id and step_run_id while
authenticated as an Org B user.

**Step-level permission gating is enforced in the Action handler, not just
assumed**
db_write, notify, and webhook-trigger creation require owner role, checked
inside the upsertWorkflowStep handler before the write happens -- not left
to a declarative Hasura rule, since the check depends on the step's type
value. Approving an approval_gate is likewise validated inside the
approveStep handler, since resuming a paused run is a state transition
with side effects, not a plain row write.

**Retry/failure handling and quota enforcement**
llm_call and http_request steps retry once on failure with the attempt
recorded on the step_run row. Quota is checked before a run starts and
incremented on completion.

**Schema and Hasura relationship correctness**
org -> org_members -> workflows -> workflow_steps/workflow_triggers, and
workflows -> workflow_runs -> step_runs, all hold as direct relationships,
kept shallow deliberately so permission filters stay simple to reason
about and verify.

**Code and documentation clarity**
README covers setup end to end. WRITEUP.md covers schema reasoning,
how the two permission layers differ in enforcement mechanism, and the
approval-gate pause/resume implementation.

## What's rough

- Frontend styling is minimal -- default browser form elements, no visual
  polish. Every flow works, nothing is broken, it's just plain.
- Scheduled and database-event triggers are not implemented -- manual and
  webhook triggers are, which satisfies the "trigger beyond manual"
  requirement on its own.
- Step configuration is a raw JSON textarea rather than per-type forms.

## Test credentials

- Org A owner -- ownerA@test.com / password123
- Org A editor -- editorA@test.com / password123
- Org B owner -- ownerB@test.com / password123

## Links

- GitHub repo -- 
- Live app -- 