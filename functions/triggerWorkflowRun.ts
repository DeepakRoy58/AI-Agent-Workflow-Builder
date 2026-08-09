import type { Request, Response } from "express";
import { gql } from "./_lib/db";
import { getCallerRoleForWorkflow, requireRole } from "./_lib/auth";
import { runStepsFrom } from "./_lib/engine";

/**
 * Hasura Action handler for triggerWorkflowRun(workflow_id: uuid!).
 *
 * Doubles as the WEBHOOK trigger endpoint: if the request carries the shared
 * secret header instead of a user session, it skips the role check (external
 * systems have no org_members row) and proceeds straight to quota + execution.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { workflow_id } = req.body.input;
    const sessionVars = req.body.session_variables ?? {};
    const isWebhookCall = req.headers["x-webhook-secret"] === process.env.WEBHOOK_SHARED_SECRET;
    const userId = sessionVars["x-hasura-user-id"];

    if (!isWebhookCall) {
      if (!userId) return res.status(401).json({ message: "Unauthenticated" });
      const role = await getCallerRoleForWorkflow(userId, workflow_id);
      requireRole(role, ["owner", "editor"]);
    }

    const org = await getOrgForWorkflow(workflow_id);
    if (!org) return res.status(404).json({ message: "Workflow not found" });
    if (org.quota_used >= org.quota_limit) {
      return res.status(429).json({ message: "Org quota exhausted" });
    }

    const { insert_workflow_runs_one: run } = await gql<{ insert_workflow_runs_one: { id: string } }>(
      `mutation($workflowId: uuid!, $triggerType: String!, $userId: uuid) {
        insert_workflow_runs_one(object: {
          workflow_id: $workflowId,
          status: "running",
          trigger_type: $triggerType,
          triggered_by: $userId
        }) { id }
      }`,
      { workflowId: workflow_id, triggerType: isWebhookCall ? "webhook" : "manual", userId: userId ?? null }
    );

    const { workflow_steps } = await gql<{ workflow_steps: { step_order: number }[] }>(
      `query($workflowId: uuid!) {
        workflow_steps(
          where: { workflow_id: { _eq: $workflowId } }
          order_by: { step_order: asc }
          limit: 1
        ) { step_order }
      }`,
      { workflowId: workflow_id }
    );
    const firstOrder = workflow_steps[0]?.step_order ?? 0;

    // Fire-and-forget: don't block the HTTP response on full execution,
    // the frontend follows progress via the step_runs subscription instead.
    runStepsFrom(run.id, workflow_id, firstOrder).catch((e) =>
      console.error("runStepsFrom error", e)
    );

    return res.status(200).json({ workflow_run_id: run.id, status: "running" });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

async function getOrgForWorkflow(workflowId: string) {
  const data = await gql<{ workflows: { org: { id: string; quota_used: number; quota_limit: number } }[] }>(
    `query($workflowId: uuid!) {
      workflows(where: { id: { _eq: $workflowId } }) {
        org { id quota_used quota_limit }
      }
    }`,
    { workflowId }
  );
  return data.workflows[0]?.org ?? null;
}
