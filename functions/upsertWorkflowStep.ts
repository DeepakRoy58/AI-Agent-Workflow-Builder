import type { Request, Response } from "express";
import { gql } from "./_lib/db";
import { getCallerRoleForWorkflow, requireRole } from "./_lib/auth";

const OWNER_ONLY_TYPES = new Set(["db_write", "notify"]);

/**
 * Hasura Action handler for upsertWorkflowStep(...).
 * Layer 2 gating: db_write, notify, and webhook-trigger creation require
 * `owner`. This can't be a declarative Hasura permission because it depends
 * on the value of a JSONB/enum field at insert time — so it's enforced here.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { workflow_id, step_order, type, config, id } = req.body.input;
    const sessionVars = req.body.session_variables ?? {};
    const userId = sessionVars["x-hasura-user-id"];
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    const role = await getCallerRoleForWorkflow(userId, workflow_id);
    requireRole(role, ["owner", "editor"]);

    if (OWNER_ONLY_TYPES.has(type)) {
      requireRole(role, ["owner"]);
    }

    const data = await gql<{ insert_workflow_steps_one: { id: string } }>(
      `mutation($id: uuid, $workflowId: uuid!, $stepOrder: Int!, $type: String!, $config: jsonb!) {
        insert_workflow_steps_one(
          object: { id: $id, workflow_id: $workflowId, step_order: $stepOrder, type: $type, config: $config }
          on_conflict: { constraint: workflow_steps_pkey, update_columns: [step_order, type, config] }
        ) { id }
      }`,
      { id: id ?? null, workflowId: workflow_id, stepOrder: step_order, type, config }
    );

    return res.status(200).json({ id: data.insert_workflow_steps_one.id });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

/**
 * Same principle applies to creating a `webhook` trigger — call this check
 * from an analogous upsertWorkflowTrigger handler:
 *
 *   if (trigger.type === "webhook") requireRole(role, ["owner"]);
 */
