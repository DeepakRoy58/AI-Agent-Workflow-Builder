import { gql } from "./db";

export type Role = "owner" | "editor" | "viewer";

/**
 * Looks up the caller's role in the org that owns `workflowId`.
 * Returns null if the caller is not a member of that org at all —
 * callers MUST treat null as "not found / forbidden", never assume access.
 */
export async function getCallerRoleForWorkflow(
  userId: string,
  workflowId: string
): Promise<Role | null> {
  const data = await gql<{ workflows: { org_id: string }[] }>(
    `query($workflowId: uuid!) {
      workflows(where: { id: { _eq: $workflowId } }) { org_id }
    }`,
    { workflowId }
  );

  const workflow = data.workflows[0];
  if (!workflow) return null;

  return getCallerRoleForOrg(userId, workflow.org_id);
}

export async function getCallerRoleForOrg(userId: string, orgId: string): Promise<Role | null> {
  const data = await gql<{ org_members: { role: Role }[] }>(
    `query($userId: uuid!, $orgId: uuid!) {
      org_members(where: { user_id: { _eq: $userId }, org_id: { _eq: $orgId } }) { role }
    }`,
    { userId, orgId }
  );
  return data.org_members[0]?.role ?? null;
}

/** Resolves org_id for a step_run by walking step_run -> workflow_run -> workflow. */
export async function getOrgIdForStepRun(stepRunId: string): Promise<string | null> {
  const data = await gql<{
    step_runs: { workflow_run: { workflow: { org_id: string } } }[];
  }>(
    `query($stepRunId: uuid!) {
      step_runs(where: { id: { _eq: $stepRunId } }) {
        workflow_run { workflow { org_id } }
      }
    }`,
    { stepRunId }
  );
  return data.step_runs[0]?.workflow_run?.workflow?.org_id ?? null;
}

export function requireRole(role: Role | null, allowed: Role[]) {
  if (!role || !allowed.includes(role)) {
    const err: any = new Error("Forbidden: insufficient role");
    err.statusCode = 403;
    throw err;
  }
}
