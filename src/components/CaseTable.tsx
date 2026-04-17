import { useState } from "react";

export interface FraudCase {
  id: string;
  scheme: string;
  state: string;
  amount: number;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ESCALATED" | "RESOLVED";
  assignedTo: string;
  createdAt: string;
  escalatedAt: string | null;
  resolvedAt: string | null;
}

interface Props {
  cases: FraudCase[];
  processingCaseIds: string[];
  exitingCaseIds: string[];
  onEscalate: (caseId: string) => void;
  onResolve: (caseId: string) => void;
  searchQuery?: string;
}

const CaseTable = ({ cases, processingCaseIds, exitingCaseIds, onEscalate, onResolve, searchQuery = "" }: Props) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [confirmEscalateId, setConfirmEscalateId] = useState<string | null>(null);

  const selectedCase = selectedCaseId ? cases.find((c) => c.id === selectedCaseId) ?? null : null;

  const formatAmount = (amount: number) => `₹${(amount / 100000).toFixed(1)}L`;
  const severityClasses = {
    CRITICAL: "bg-primary text-primary-foreground",
    HIGH: "bg-orange-600/20 text-orange-400",
    MEDIUM: "bg-yellow-600/20 text-yellow-400",
  } as const;
  const statusClasses = {
    OPEN: "bg-orange-600/20 text-orange-400",
    ESCALATED: "bg-primary/20 text-primary",
    RESOLVED: "bg-success/20 text-success",
  } as const;

  if (searchQuery) {
    cases = cases.filter(c =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.scheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  const visibleCases = cases.filter((c) => c.status !== "RESOLVED");

  return (
    <>
      {confirmEscalateId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #cc0000", borderRadius: 12, padding: 24, width: 380 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Escalate Case</div>
            <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, marginBottom: 16 }}>
              Are you sure you want to escalate this case?
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setConfirmEscalateId(null)}
                style={{ background: "#1a1a1a", color: "#ccc", border: "1px solid #333", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEscalate(confirmEscalateId);
                  setConfirmEscalateId(null);
                }}
                style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 12 }}
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedCase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #cc0000", borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ color: "#cc0000", fontFamily: "monospace", fontWeight: 700 }}>{selectedCase.id}</span>
              <button onClick={() => setSelectedCaseId(null)} style={{ color: "hsl(var(--muted-foreground))", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Scheme", selectedCase.scheme],
                ["State", selectedCase.state],
                ["Amount", formatAmount(selectedCase.amount)],
                ["Severity", selectedCase.severity],
                ["Status", selectedCase.status],
                ["Assigned To", selectedCase.assignedTo],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#1a1a1a", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }}>{label}</div>
                  <div style={{ color: "#fff", fontSize: 13, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                disabled={selectedCase.status !== "OPEN" || processingCaseIds.includes(selectedCase.id)}
                onClick={() => setConfirmEscalateId(selectedCase.id)}
                style={{
                  flex: 1,
                  background: selectedCase.status !== "OPEN" ? "#450000" : "#cc0000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px",
                  cursor: selectedCase.status !== "OPEN" ? "not-allowed" : "pointer",
                  fontSize: 12,
                  opacity: processingCaseIds.includes(selectedCase.id) ? 0.6 : 1,
                }}
              >
                {processingCaseIds.includes(selectedCase.id) ? "Processing..." : "Escalate Case"}
              </button>
              <button
                disabled={selectedCase.status === "RESOLVED" || processingCaseIds.includes(selectedCase.id)}
                onClick={() => {
                  onResolve(selectedCase.id);
                  setSelectedCaseId(null);
                }}
                style={{
                  flex: 1,
                  background: "#1a1a1a",
                  color: "#22c55e",
                  border: "1px solid #22c55e",
                  borderRadius: 6,
                  padding: "8px",
                  cursor: selectedCase.status === "RESOLVED" ? "not-allowed" : "pointer",
                  fontSize: 12,
                  opacity: processingCaseIds.includes(selectedCase.id) ? 0.6 : 1,
                }}
              >
                {processingCaseIds.includes(selectedCase.id) ? "Processing..." : "Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg border-l-2 border-l-primary hover:bg-secondary/30 transition-colors">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-semibold text-foreground">Suspicious Scheme Activity</h2>
          <span className="text-[10px] font-mono text-muted-foreground">{visibleCases.length} cases found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-5 py-3 font-mono text-[10px] tracking-wider">CASE ID</th>
                <th className="text-left px-3 py-3 font-mono text-[10px] tracking-wider">SCHEME</th>
                <th className="text-left px-3 py-3 font-mono text-[10px] tracking-wider">STATE</th>
                <th className="text-left px-3 py-3 font-mono text-[10px] tracking-wider">AMOUNT</th>
                <th className="text-left px-3 py-3 font-mono text-[10px] tracking-wider">SEVERITY</th>
                <th className="text-left px-3 py-3 font-mono text-[10px] tracking-wider">STATUS</th>
                <th className="text-right px-5 py-3 font-mono text-[10px] tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visibleCases.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-border/50 hover:bg-secondary/50 transition-all duration-300 ${c.status === "ESCALATED" ? "shadow-[inset_2px_0_0_0_#cc0000] bg-primary/5" : ""} ${exitingCaseIds.includes(c.id) ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
                >
                  <td className="px-5 py-3 font-mono text-primary font-medium">{c.id}</td>
                  <td className="px-3 py-3 text-foreground">{c.scheme}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.state}</td>
                  <td className="px-3 py-3 text-foreground font-semibold">{formatAmount(c.amount)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${severityClasses[c.severity]}`}>{c.severity}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${statusClasses[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setSelectedCaseId(c.id)}
                      className="text-[10px] font-mono text-primary hover:text-primary/80 border border-primary/30 px-2 py-1 rounded transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CaseTable;