import type { Request, Response } from "express";
import { gql } from "./_lib/db";
import { getOrgIdForStepRun, getCallerRoleForOrg, requireRole } from "./_lib/auth";
import { runStepsFrom } from "./_lib/engine";

/**
 * Hasura Action handler for approveStep(step_run_id: uuid!).
 * This is the ONLY place approval_gate resumption is authorized — it cannot
 * be a plain database permission because resuming a run is a state
 * transition with side effects (re-launching execution), not a row write.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { step_run_id } = req.body.input;
    const sessionVars = req.body.session_variables ?? {};
    const userId = sessionVars["x-hasura-user-id"];
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    const orgId = await getOrgIdForStepRun(step_run_id);
    if (!orgId) return res.status(404).json({ message: "Step run not found" });

    const role = await getCallerRoleForOrg(userId, orgId);
    requireRole(role, ["owner", "editor"]);

    const stepRun = await getStepRunWithContext(step_run_id);
    if (stepRun.status !== "paused_awaiting_approval") {
      return res.status(400).json({ message: "Step is not awaiting approval" });
    }

    await gql(
      `mutation($id: uuid!, $userId: uuid!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "succeeded", approved_by: $userId, approved_at: "now()" }
        ) { id }
      }`,
      { id: step_run_id, userId }
    );

    await gql(
      `mutation($id: uuid!) {
        update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "running" }) { id }
      }`,
      { id: stepRun.workflow_run_id }
    );

    const nextOrder = stepRun.step_order + 1;
    runStepsFrom(stepRun.workflow_run_id, stepRun.workflow_id, nextOrder).catch((e) =>
      console.error("runStepsFrom (resume) error", e)
    );

    return res.status(200).json({ status: "resumed" });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

async function getStepRunWithContext(stepRunId: string) {
  const data = await gql<{
    step_runs: {
      status: string;
      workflow_run_id: string;
      step: { step_order: number; workflow_id: string };
    }[];
  }>(
    `query($id: uuid!) {
      step_runs(where: { id: { _eq: $id } }) {
        status
        workflow_run_id
        step: workflow_step { step_order workflow_id }
      }
    }`,
    { id: stepRunId }
  );
  const row = data.step_runs[0];
  return {
    status: row.status,
    workflow_run_id: row.workflow_run_id,
    step_order: row.step.step_order,
    workflow_id: row.step.workflow_id,
  };
}
