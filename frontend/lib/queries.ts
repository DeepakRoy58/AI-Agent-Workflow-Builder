export const GET_ORG_WORKFLOWS = `
  query GetOrgWorkflows($orgId: uuid!) {
    workflows(where: { org_id: { _eq: $orgId } }, order_by: { created_at: desc }) {
      id
      name
      workflow_steps(order_by: { step_order: asc }) {
        id
        step_order
        type
        config
      }
      workflow_triggers {
        id
        type
      }
      workflow_runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
      }
    }
  }
`;

export const CREATE_WORKFLOW = `
  mutation CreateWorkflow($orgId: uuid!, $name: String!, $userId: uuid!) {
    insert_workflows_one(object: { org_id: $orgId, name: $name, created_by: $userId }) {
      id
      name
    }
  }
`;

export const TRIGGER_WORKFLOW_RUN = `
  mutation TriggerWorkflowRun($workflowId: uuid!) {
    triggerWorkflowRun(workflow_id: $workflowId) {
      workflow_run_id
      status
    }
  }
`;

export const APPROVE_STEP = `
  mutation ApproveStep($stepRunId: uuid!) {
    approveStep(step_run_id: $stepRunId) {
      status
    }
  }
`;

export const UPSERT_WORKFLOW_STEP = `
  mutation UpsertWorkflowStep($workflowId: uuid!, $stepOrder: Int!, $type: String!, $config: jsonb!) {
    upsertWorkflowStep(
      workflow_id: $workflowId
      step_order: $stepOrder
      type: $type
      config: $config
    ) {
      id
    }
  }
`;

export const STEP_RUNS_SUBSCRIPTION = `
  subscription StepRunsForRun($workflowRunId: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $workflowRunId } }
      order_by: { workflow_step: { step_order: asc } }
    ) {
      id
      status
      output
      error
      attempt_count
      approved_by
      workflow_step {
        step_order
        type
      }
    }
  }
`;

export const GET_MY_ORG_ROLE = `
  query GetMyOrgRole($userId: uuid!, $orgId: uuid!) {
    org_members(where: { user_id: { _eq: $userId }, org_id: { _eq: $orgId } }) {
      role
    }
  }
`;

export const GET_ORG_USAGE = `
  query GetOrgUsage($orgId: uuid!) {
    org_usage_this_month(where: { org_id: { _eq: $orgId } }) {
      runs_this_month
      avg_duration_seconds
      quota_used
      quota_limit
    }
  }
`;
