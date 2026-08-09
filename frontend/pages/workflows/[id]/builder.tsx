import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/router";
import { nhost } from "../../../lib/nhost";
import { UPSERT_WORKFLOW_STEP } from "../../../lib/queries";

const STEP_TYPES = ["llm_call", "http_request", "db_write", "notify", "conditional_branch", "approval_gate"];

// visual accent per step type — purely cosmetic, doesn't touch logic
const TYPE_STYLE: { [key: string]: { bg: string; fg: string; label: string } } = {
  llm_call: { bg: "#eef0ff", fg: "#4c4fd6", label: "LLM Call" },
  http_request: { bg: "#e9f6f0", fg: "#1f9d6a", label: "HTTP Request" },
  db_write: { bg: "#fef3e6", fg: "#c47d1f", label: "DB Write" },
  notify: { bg: "#fdeaf2", fg: "#c5397b", label: "Notify" },
  conditional_branch: { bg: "#eaf3fd", fg: "#2477c9", label: "Conditional Branch" },
  approval_gate: { bg: "#f3ecfb", fg: "#7b3fc4", label: "Approval Gate" },
};

export default function WorkflowBuilder() {
  const router = useRouter();
  const { id: workflowId } = router.query as { id: string };

  const [steps, setSteps] = useState<any[]>([]);
  const [newType, setNewType] = useState(STEP_TYPES[0]);
  const [newConfig, setNewConfig] = useState("{}");

  useEffect(() => {
    if (workflowId) loadSteps();
  }, [workflowId]);

  async function loadSteps() {
    const { data } = await nhost.graphql.request(
      `query($workflowId: uuid!) {
        workflow_steps(where: { workflow_id: { _eq: $workflowId } }, order_by: { step_order: asc }) {
          id step_order type config
        }
      }`,
      { workflowId }
    );
    setSteps(data?.workflow_steps ?? []);
  }

  async function addStep() {
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(newConfig);
    } catch {
      alert("Config must be valid JSON");
      return;
    }
    const nextOrder = (steps[steps.length - 1]?.step_order ?? 0) + 1;
    const { error } = await nhost.graphql.request(UPSERT_WORKFLOW_STEP, {
      workflowId,
      stepOrder: nextOrder,
      type: newType,
      config: parsedConfig,
    });
    if (error) {
      // Layer 2 gating surfaces here — e.g. non-owners get rejected for db_write/notify
      alert("Could not add step: " + JSON.stringify(error));
      return;
    }
    setNewConfig("{}");
    loadSteps();
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSteps(reordered);
    // Persist new step_order for both swapped rows
    reordered.forEach((s, i) => {
      nhost.graphql.request(UPSERT_WORKFLOW_STEP, {
        workflowId,
        stepOrder: i + 1,
        type: s.type,
        config: s.config,
      });
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <a href="/" style={styles.backLink}>
          ← Back to dashboard
        </a>

        <h1 style={styles.h1}>Edit Workflow</h1>
        <p style={styles.subtitle}>
          {steps.length} step{steps.length === 1 ? "" : "s"} · runs top to bottom
        </p>

        <div style={styles.stepList}>
          {steps.map((s, i) => {
            const tstyle = TYPE_STYLE[s.type] ?? { bg: "#f0f0f0", fg: "#555", label: s.type };
            return (
              <div key={s.id} style={styles.stepCard}>
                <div style={styles.stepRail}>
                  <div style={styles.stepIndex}>{s.step_order}</div>
                  <div style={styles.stepConnector} />
                </div>

                <div style={styles.stepBody}>
                  <div style={styles.stepHeader}>
                    <span style={{ ...styles.typeBadge, background: tstyle.bg, color: tstyle.fg }}>
                      {tstyle.label}
                    </span>
                    <div style={styles.stepControls}>
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        style={{ ...styles.iconButton, opacity: i === 0 ? 0.35 : 1 }}
                        aria-label="Move step up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === steps.length - 1}
                        style={{ ...styles.iconButton, opacity: i === steps.length - 1 ? 0.35 : 1 }}
                        aria-label="Move step down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <pre style={styles.configBlock}>{JSON.stringify(s.config, null, 2)}</pre>
                </div>
              </div>
            );
          })}

          {steps.length === 0 && (
            <div style={styles.emptyState}>No steps yet. Add the first one below.</div>
          )}
        </div>

        <div style={styles.addCard}>
          <h2 style={styles.h2}>Add step</h2>

          <label style={styles.fieldLabel}>Type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            style={styles.select}
          >
            {STEP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_STYLE[t]?.label ?? t}
              </option>
            ))}
          </select>

          <label style={styles.fieldLabel}>Config (JSON)</label>
          <textarea
            value={newConfig}
            onChange={(e) => setNewConfig(e.target.value)}
            rows={5}
            spellCheck={false}
            style={styles.textarea}
          />

          <button onClick={addStep} style={styles.cta}>
            Add step
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#fbfbfc",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
  },
  backLink: {
    fontSize: 13,
    color: "#9a9ca3",
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    color: "#1a1b1e",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 13,
    color: "#9a9ca3",
    margin: "0 0 28px",
  },
  stepList: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 32,
  },
  stepCard: {
    display: "flex",
    gap: 14,
  },
  stepRail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 32,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 7,
    background: "#f2f2f5",
    color: "#6b6f76",
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid #e5e5e9",
  },
  stepConnector: {
    flex: 1,
    width: 1,
    background: "#e5e5e9",
    margin: "4px 0",
  },
  stepBody: {
    flex: 1,
    background: "#ffffff",
    border: "1px solid #eaeaec",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
  },
  stepControls: {
    display: "flex",
    gap: 6,
  },
  iconButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: "1px solid #e5e5e9",
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1,
    color: "#6b6f76",
  },
  configBlock: {
    background: "#fafafb",
    color: "#3f4147",
    border: "1px solid #eaeaec",
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.5,
    overflowX: "auto",
    margin: 0,
  },
  emptyState: {
    textAlign: "center",
    color: "#9a9ca3",
    fontSize: 14,
    padding: "32px 0",
    border: "1px dashed #e5e5e9",
    borderRadius: 10,
    background: "#fff",
  },
  addCard: {
    background: "#ffffff",
    border: "1px solid #eaeaec",
    borderRadius: 12,
    padding: 24,
  },
  h2: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1b1e",
    margin: "0 0 16px",
  },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#9a9ca3",
    marginBottom: 6,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e5e9",
    background: "#fff",
    fontSize: 14,
    color: "#1a1b1e",
    marginBottom: 16,
    outline: "none",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #e5e5e9",
    background: "#fafafb",
    fontFamily: "'SF Mono', Menlo, monospace",
    fontSize: 12.5,
    color: "#1a1b1e",
    marginBottom: 16,
    outline: "none",
    resize: "vertical",
  },
  cta: {
    width: "100%",
    padding: "11px 0",
    borderRadius: 8,
    border: "none",
    background: "#5E6AD2",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};