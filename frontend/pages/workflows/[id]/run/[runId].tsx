import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "graphql-ws";
import { nhost } from "../../../../lib/nhost";
import { STEP_RUNS_SUBSCRIPTION, APPROVE_STEP } from "../../../../lib/queries";

const STATUS_COLORS: Record<string, string> = {
  pending: "#999",
  running: "#2563eb",
  paused_awaiting_approval: "#d97706",
  succeeded: "#16a34a",
  failed: "#dc2626",
};

export default function RunView() {
  const router = useRouter();
  const { runId } = router.query as { runId: string };
  const [stepRuns, setStepRuns] = useState<any[]>([]);

  useEffect(() => {
    if (!runId) return;

    const wsUrl = nhost.graphql.getUrl().replace(/^http/, "ws");
    const client = createClient({
      url: wsUrl,
      connectionParams: async () => ({
        headers: { Authorization: `Bearer ${nhost.auth.getAccessToken()}` },
      }),
    });

    const unsubscribe = client.subscribe(
      { query: STEP_RUNS_SUBSCRIPTION, variables: { workflowRunId: runId } },
      {
        next: (result: any) => setStepRuns(result.data?.step_runs ?? []),
        error: (err) => console.error("subscription error", err),
        complete: () => {},
      }
    );

    return () => {
      unsubscribe();
      client.dispose();
    };
  }, [runId]);

  async function handleApprove(stepRunId: string) {
    const { error } = await nhost.graphql.request(APPROVE_STEP, { stepRunId });
    if (error) alert("Approval failed: " + JSON.stringify(error));
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Run Progress</h1>
      {stepRuns.map((sr) => (
        <div
          key={sr.id}
          style={{
            border: `2px solid ${STATUS_COLORS[sr.status] ?? "#ccc"}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>
              #{sr.workflow_step.step_order} — {sr.workflow_step.type}
            </strong>
            <span style={{ color: STATUS_COLORS[sr.status], fontWeight: 600 }}>{sr.status}</span>
          </div>
          {sr.output && (
            <pre style={{ background: "#f7f7f7", padding: 8, fontSize: 12, marginTop: 6 }}>
              {JSON.stringify(sr.output, null, 2)}
            </pre>
          )}
          {sr.error && <p style={{ color: "#dc2626" }}>Error: {sr.error}</p>}
          {sr.status === "paused_awaiting_approval" && (
            <button onClick={() => handleApprove(sr.id)} style={{ marginTop: 8 }}>
              Approve & Resume
            </button>
          )}
        </div>
      ))}
      <p>
        <a href="/">← Back to dashboard</a>
      </p>
    </div>
  );
}
