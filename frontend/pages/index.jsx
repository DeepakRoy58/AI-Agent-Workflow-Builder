import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthenticationStatus, useUserId } from "@nhost/react";
import { nhost } from "../lib/nhost";
import { GET_ORG_WORKFLOWS, TRIGGER_WORKFLOW_RUN } from "../lib/queries";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const userId = useUserId();
  const router = useRouter();

  const [orgId, setOrgId] = useState(null);
  const [role, setRole] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [debug, setDebug] = useState("Starting...");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!userId) {
      setDebug((d) => d + "\nWaiting for userId...");
      return;
    }
    setDebug((d) => d + `\nuserId = ${userId}. Fetching org_members...`);

    nhost.graphql
      .request(
        `query($userId: uuid!) { org_members(where: { user_id: { _eq: $userId } }) { org_id role } }`,
        { userId }
      )
      .then(({ data, error }) => {
        setDebug((d) => d + `\norg_members result: ${JSON.stringify({ data, error })}`);
        const membership = data?.org_members?.[0];
        if (membership) {
          setOrgId(membership.org_id);
          setRole(membership.role);
        }
      })
      .catch((err) => {
        setDebug((d) => d + `\norg_members THREW: ${err.message}`);
      });
  }, [userId]);

  useEffect(() => {
    if (!orgId) return;
    setDebug((d) => d + `\norgId = ${orgId}. Fetching workflows...`);
    nhost.graphql.request(GET_ORG_WORKFLOWS, { orgId }).then(({ data, error }) => {
      setDebug((d) => d + `\nworkflows result: ${JSON.stringify({ data, error })}`);
      setWorkflows(data?.workflows ?? []);
    });
  }, [orgId]);

  async function handleRun(workflowId) {
    const { data, error } = await nhost.graphql.request(TRIGGER_WORKFLOW_RUN, { workflowId });
    if (error) {
      alert("Failed to trigger run: " + JSON.stringify(error));
      return;
    }
    router.push(`/workflows/${workflowId}/run/${data.triggerWorkflowRun.workflow_run_id}`);
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Workflows</h1>

      {workflows.length === 0 && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 12,
            fontSize: 12,
            whiteSpace: "pre-wrap",
            borderRadius: 8,
          }}
        >
          {debug}
        </pre>
      )}

      {workflows.map((wf) => (
        <div key={wf.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <strong>{wf.name}</strong>
          <div>
            <button onClick={() => router.push(`/workflows/${wf.id}/builder`)}>Edit</button>{" "}
            {role !== "viewer" && <button onClick={() => handleRun(wf.id)}>Run</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
