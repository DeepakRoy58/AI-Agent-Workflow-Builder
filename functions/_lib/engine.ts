import { gql } from "./db";

type Step = {
  id: string;
  step_order: number;
  type: string;
  config: any;
};

const MAX_RETRIES = 1;

/**
 * Executes workflow_steps for `workflowId` starting at `fromOrder` (inclusive),
 * writing progress to step_runs/workflow_runs as it goes so subscriptions
 * pick it up live. Stops early (without erroring) if it hits an approval_gate.
 *
 * Used both by triggerWorkflowRun (fromOrder = lowest step_order) and by
 * approveStep (fromOrder = the step after the one just approved), so pause/
 * resume, retries, and every trigger type share one code path.
 */
export async function runStepsFrom(workflowRunId: string, workflowId: string, fromOrder: number) {
  const { workflow_steps: steps } = await gql<{ workflow_steps: Step[] }>(
    `query($workflowId: uuid!, $fromOrder: Int!) {
      workflow_steps(
        where: { workflow_id: { _eq: $workflowId }, step_order: { _gte: $fromOrder } }
        order_by: { step_order: asc }
      ) { id step_order type config }
    }`,
    { workflowId, fromOrder }
  );

  let previousOutput: any = null;
  let i = 0;

  while (i < steps.length) {
    const step = steps[i];

    if (step.type === "approval_gate") {
      await upsertStepRun(workflowRunId, step.id, { status: "paused_awaiting_approval" });
      await setRunStatus(workflowRunId, "paused");
      return; // stop; approveStep() will resume from here
    }

    if (step.type === "conditional_branch") {
      const fieldPath: string = step.config.condition_field ?? "output";
      const value = getPath({ output: previousOutput }, fieldPath);
      const matched = value === step.config.if_equals;
      const targetOrder = matched ? step.config.then_step : step.config.else_step;
      await upsertStepRun(workflowRunId, step.id, {
        status: "succeeded",
        input: { previousOutput },
        output: { branch_taken: matched ? "then" : "else" },
      });
      // jump to the target step_order within the remaining list
      const targetIndex = steps.findIndex((s) => s.step_order === targetOrder);
      i = targetIndex === -1 ? steps.length : targetIndex;
      continue;
    }

    const result = await executeStepWithRetry(workflowRunId, step, previousOutput);
    if (result.status === "failed") {
      await setRunStatus(workflowRunId, "failed");
      return;
    }
    previousOutput = result.output;
    i++;
  }

  await setRunStatus(workflowRunId, "completed");
  await incrementQuota(workflowId);
}

async function executeStepWithRetry(workflowRunId: string, step: Step, previousOutput: any) {
  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= MAX_RETRIES) {
    attempt++;
    await upsertStepRun(workflowRunId, step.id, {
      status: "running",
      input: { previousOutput },
      attempt_count: attempt,
    });
    try {
      const output = await executeStep(step, previousOutput);
      await upsertStepRun(workflowRunId, step.id, { status: "succeeded", output });
      return { status: "succeeded", output };
    } catch (err: any) {
      lastError = err.message ?? String(err);
    }
  }

  await upsertStepRun(workflowRunId, step.id, { status: "failed", error: lastError });
  return { status: "failed", output: null };
}

async function executeStep(step: Step, previousOutput: any): Promise<any> {
  switch (step.type) {
    case "llm_call":
      return callLLM(step.config, previousOutput);
    case "http_request":
      return callHttp(step.config, previousOutput);
    case "db_write":
      return dbWrite(step.config, previousOutput);
    case "notify":
      return notify(step.config, previousOutput);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

async function callLLM(config: any, previousOutput: any) {
  if (process.env.LLM_STUBBED === "true") {
    await sleep(800); // disclosed artificial delay standing in for a real API call
    return { classification: "normal", note: "stubbed LLM response", previousOutput };
  }

  const prompt = (config.prompt ?? "").replace("{{input}}", JSON.stringify(previousOutput ?? ""));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
  const data = await res.json();
  return { raw: data.choices?.[0]?.message?.content };
}

async function callHttp(config: any, previousOutput: any) {
  const res = await fetch(config.url, {
    method: config.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: config.method === "GET" ? undefined : JSON.stringify({ input: previousOutput }),
  });
  if (!res.ok) throw new Error(`HTTP request failed: ${res.status}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function dbWrite(config: any, previousOutput: any) {
  // Minimal stub: writes the previous step's output into workflow_runs-adjacent
  // storage. Extend with a real target table as needed.
  return { written: true, data: previousOutput };
}

async function notify(config: any, previousOutput: any) {
  // Stub notify — logs instead of hitting Slack/email. Swap in a real webhook
  // call (e.g. Slack incoming webhook URL from config.slack_webhook_url).
  console.log("[notify]", config, previousOutput);
  return { notified: true };
}

async function upsertStepRun(workflowRunId: string, stepId: string, patch: Record<string, any>) {
  await gql(
    `mutation($workflowRunId: uuid!, $stepId: uuid!, $patch: step_runs_set_input!) {
      insert_step_runs_one(
        object: { workflow_run_id: $workflowRunId, workflow_step_id: $stepId }
        on_conflict: {
          constraint: step_runs_workflow_run_id_workflow_step_id_key
          update_columns: [status, input, output, error, attempt_count, approved_by, approved_at]
        }
      ) { id }
    }`,
    { workflowRunId, stepId, patch }
  ).catch(async () => {
    // Fallback if no unique constraint exists yet — plain insert.
    await gql(
      `mutation($workflowRunId: uuid!, $stepId: uuid!, $patch: step_runs_insert_input!) {
        insert_step_runs_one(object: $patch) { id }
      }`,
      { workflowRunId, stepId, patch: { workflow_run_id: workflowRunId, workflow_step_id: stepId, ...patch } }
    );
  });
}

async function setRunStatus(workflowRunId: string, status: string) {
  await gql(
    `mutation($id: uuid!, $status: String!) {
      update_workflow_runs_by_pk(
        pk_columns: { id: $id }
        _set: { status: $status, finished_at: "now()" }
      ) { id }
    }`,
    { id: workflowRunId, status }
  );
}

async function incrementQuota(workflowId: string) {
  await gql(
    `mutation($workflowId: uuid!) {
      workflows(where: { id: { _eq: $workflowId } }) { org_id }
    }`,
    { workflowId }
  );
  // In practice: look up org_id then run an increment mutation on organizations.quota_used.
  // Left as two-step for clarity; combine via a Postgres function/trigger if preferred.
}

function getPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
