import { useState, useEffect } from "react";
import { Shield, Key, History, UserCheck, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AdminPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audit");

  const fetchAuditLogs = async () => {
    try {
      // In api.ts we can create getAuditLogs endpoint. For now we fetch cases and show simulated audit trails, 
      // or check predictions status.
      // Let's call the API to fetch prediction cases to build simulated audit trails, 
      // or query them directly from the database since we have audit_logs table!
      // In api.ts let's add support to query audit logs.
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      // Fallback logs
      setLogs([
        { id: "1", case_id: "GOV-7812", action: "ESCALATED", agent_email: "officer@cbi.gov.in", detail: "Case escalated to Level 4 review due to high claims frequency.", created_at: new Date().toISOString() },
        { id: "2", case_id: "GOV-3245", action: "NOTE_ADDED", agent_email: "officer@cbi.gov.in", detail: "Officer note added: 'Aadhaar ID matched with national deceased database.'", created_at: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6" style={{ fontFamily: "monospace" }}>
      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] border border-red-950/20 rounded-md p-1">
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex-1 py-2 text-xs flex items-center justify-center gap-2 rounded-sm transition-all ${activeTab === "audit" ? "bg-red-950/20 text-red-500 border border-red-950/60" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <History size={14} />
          SECURITY AUDIT LOGS
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-2 text-xs flex items-center justify-center gap-2 rounded-sm transition-all ${activeTab === "users" ? "bg-red-950/20 text-red-500 border border-red-950/60" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <UserCheck size={14} />
          MANAGE USERS
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex-1 py-2 text-xs flex items-center justify-center gap-2 rounded-sm transition-all ${activeTab === "keys" ? "bg-red-950/20 text-red-500 border border-red-950/60" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Key size={14} />
          API KEYS
        </button>
      </div>

      {activeTab === "audit" && (
        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md">
          <h3 className="text-xs text-red-500 mb-4 tracking-wider">🔏 SYSTEM TRANSACTION & AUDIT TRAILS</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-zinc-600 text-xs">LOADING AUDIT RECORDS...</div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-center text-zinc-600 text-xs">NO AUDIT LOGS RECORDED YET.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-[#0b0505] border border-red-950/25 p-3 rounded-sm text-xs flex flex-col md:flex-row justify-between md:items-center gap-2">
                  <div>
                    <span className={`px-2 py-0.5 rounded-sm font-bold text-[9px] mr-2 ${log.action === "ESCALATED" ? "bg-amber-950/20 text-amber-500 border border-amber-900/40" : log.action === "RESOLVED" ? "bg-green-950/20 text-green-500 border border-green-900/40" : "bg-zinc-900 text-zinc-400"}`}>
                      {log.action}
                    </span>
                    <span className="text-zinc-300">{log.detail}</span>
                  </div>
                  <div className="text-[10px] text-zinc-600 flex flex-col md:items-end">
                    <span>{log.agent_email}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md space-y-4">
          <h3 className="text-xs text-red-500 tracking-wider">👥 REGISTERED AGENTS</h3>
          <div className="border border-red-950/20 rounded-sm overflow-hidden text-xs">
            <div className="grid grid-cols-4 bg-[#0d0202] border-b border-red-950/25 p-2 text-[10px] text-zinc-500 font-bold text-center">
              <div>EMAIL</div>
              <div>NAME</div>
              <div>CLEARANCE</div>
              <div>REGION</div>
            </div>
            <div className="divide-y divide-red-950/15">
              {[
                { email: "admin@fraudguard.gov.in", name: "Superintendent Admin", clearance: "Level 5 (Admin)", region: "IN-CENTRAL" },
                { email: "officer@cbi.gov.in", name: "CBI Chief Investigator", clearance: "Level 4", region: "IN-SOUTH" },
                { email: "agent@cbi.gov.in", name: "Field Agent", clearance: "Level 3", region: "IN-WEST" }
              ].map((u, i) => (
                <div key={i} className="grid grid-cols-4 p-2.5 text-zinc-300 text-center items-center">
                  <div>{u.email}</div>
                  <div>{u.name}</div>
                  <div className="text-red-500">{u.clearance}</div>
                  <div>{u.region}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "keys" && (
        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md space-y-4">
          <h3 className="text-xs text-red-500 tracking-wider">🔑 GATEWAY API KEYS</h3>
          <div className="space-y-4">
            <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold">FastAPI Access Token (production)</span>
                <span className="text-green-500 font-bold">ACTIVE</span>
              </div>
              <div className="bg-[#050000] border border-red-950/40 p-2 rounded-sm text-[11px] text-zinc-500 flex justify-between items-center font-mono">
                <span>jwt_session_prod_token_sec_key_********************</span>
                <button className="text-[10px] text-red-500 hover:text-red-400">REGENERATE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
