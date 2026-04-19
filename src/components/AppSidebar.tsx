import { useState, useEffect } from "react";
import { LayoutDashboard, Bell, Users, BarChart3, Settings, PanelLeftClose, PanelLeftOpen, HelpCircle, MessageCircle, FileText } from "lucide-react";
import HexShieldLogo from "./HexShieldLogo";
import { tx, TKey } from "./DashboardHeader";

// ── PIPELINE ─────────────────────────────────────────────────────────────
interface PipelineStep {
  label:  string;
  status: "green" | "amber" | "red" | "grey";
  detail: string;
}

const BASE_PIPELINE: PipelineStep[] = [
  { label: "Data Ingestion",    status: "green", detail: "2.4M records/hr"   },
  { label: "Validation Layer",  status: "green", detail: "99.7% pass rate"   },
  { label: "ETL Processing",    status: "amber", detail: "Batch #7802"       },
  { label: "ML Analysis",       status: "green", detail: "Model v3.2.1"      },
  { label: "Anomaly Detection", status: "green", detail: "Queue"             },
  { label: "Alert Generation",  status: "red",   detail: "Live"              },
];

const dotColor: Record<string, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red:   "#cc0000",
  grey:  "#333",
};

// Simulates live pipeline fluctuations
function useLivePipeline() {
  const [steps, setSteps] = useState<PipelineStep[]>(BASE_PIPELINE);
  const [tick,  setTick]  = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setSteps(prev => prev.map((step, i) => {
        // ETL Processing randomly flips amber/green
        if (i === 2) return { ...step, status: Math.random() > 0.3 ? "amber" : "green", detail: `Batch #${7800 + Math.floor(Math.random()*20)}` };
        // Data Ingestion shows fluctuating record count
        if (i === 0) return { ...step, detail: `${(2.3 + Math.random()*0.4).toFixed(1)}M records/hr` };
        // Validation pass rate fluctuates slightly
        if (i === 1) return { ...step, detail: `${(99.2 + Math.random()*0.7).toFixed(1)}% pass rate` };
        // Anomaly Detection alternates queue depth
        if (i === 4) return { ...step, detail: `Queue: ${Math.floor(Math.random()*12)}` };
        return step;
      }));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return steps;
}

// ── PROPS ─────────────────────────────────────────────────────────────────
interface Props {
  activePage:    string;
  setActivePage: (page: string) => void;
  isOpen?:       boolean;
  isMobile?:     boolean;
  onToggle?:     () => void;
  language?:     string;
  alertCount?:   number;   // live count passed from parent
  caseStats?:    { open: number; escalated: number; resolved: number };
}

const AppSidebar = ({
  activePage, setActivePage,
  isOpen = true, isMobile = false, onToggle,
  language = "en",
  alertCount = 0,
  caseStats,
}: Props) => {
  const pipeline = useLivePipeline();
  const expandedWidth  = isMobile ? "260px" : "200px";
  const collapsedWidth = isMobile ? "260px" : "72px";

  const navItems = [
    { icon: LayoutDashboard, labelKey: "overview"  as TKey, id: "overview"  },
    { icon: Bell,            labelKey: "alerts"    as TKey, id: "alerts",    badge: alertCount > 0 ? alertCount : null },
    { icon: Users,           labelKey: "accounts"  as TKey, id: "accounts"  },
    { icon: BarChart3,       labelKey: "analytics" as TKey, id: "analytics" },
    { icon: Settings,        labelKey: "settings"  as TKey, id: "settings"  },
    { icon: HelpCircle,      labelKey: "helpFaq"   as TKey, id: "help"      },
    { icon: MessageCircle,   label:    "FAQ",               id: "faq"       },
    { icon: FileText,        labelKey: "terms"     as TKey, id: "terms"     },
  ];

  return (
    <aside
      className={`fixed left-0 top-[3px] bottom-0 bg-background border-r border-border flex flex-col z-40 transition-all duration-300 ease-in-out ${
        isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
      }`}
      style={{ width: isOpen ? expandedWidth : collapsedWidth }}
    >
      {/* Logo */}
      <div className={`px-4 py-5 flex items-center ${isOpen ? "gap-3 justify-between" : "justify-center"}`}>
        <div className={`flex items-center ${isOpen ? "gap-3" : ""}`}>
          <HexShieldLogo size={32} />
          {isOpen && (
            <div>
              <span className="text-sm font-bold text-foreground tracking-wide">FraudGuard</span>
              <p className="text-[9px] font-mono tracking-[0.25em] text-primary">WAR ROOM</p>
            </div>
          )}
        </div>
        {!isMobile && onToggle && (
          <button onClick={onToggle}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        )}
      </div>

      {/* Case stats mini bar (only when open) */}
      {isOpen && caseStats && (
        <div style={{ margin: "0 12px 8px", background: "#0a0a0a", borderRadius: 8, padding: "8px 12px", border: "1px solid #1a1a1a" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#444", letterSpacing: 1, marginBottom: 6 }}>CASE OVERVIEW</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[{ label: "OPEN", val: caseStats.open, color: "#f59e0b" }, { label: "ESC", val: caseStats.escalated, color: "#cc0000" }, { label: "DONE", val: caseStats.resolved, color: "#22c55e" }].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ color: s.color, fontSize: 14, fontWeight: 800, fontFamily: "monospace", lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "#333", fontSize: 8, fontFamily: "monospace", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Mini resolve bar */}
          {caseStats.open + caseStats.escalated + caseStats.resolved > 0 && (
            <div style={{ marginTop: 8, height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(caseStats.open / (caseStats.open + caseStats.escalated + caseStats.resolved)) * 100}%`, background: "#f59e0b", transition: "width 0.5s" }} />
              <div style={{ width: `${(caseStats.escalated / (caseStats.open + caseStats.escalated + caseStats.resolved)) * 100}%`, background: "#cc0000", transition: "width 0.5s" }} />
              <div style={{ width: `${(caseStats.resolved / (caseStats.open + caseStats.escalated + caseStats.resolved)) * 100}%`, background: "#22c55e", transition: "width 0.5s" }} />
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 mt-1">
        {navItems.map(item => {
          const label = (item as any).labelKey ? tx(language, (item as any).labelKey as TKey) : (item as any).label;
          const badge = (item as any).badge;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm mb-0.5 transition-colors ${isOpen ? "gap-3 justify-start" : "justify-center"} ${activePage === item.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <item.icon size={16} />
              {isOpen && <span>{label}</span>}
              {isOpen && badge != null && badge > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full" style={{ animation: badge > 0 ? "pulse 2s infinite" : "none" }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {/* Collapsed badge dot */}
              {!isOpen && badge != null && badge > 0 && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, background: "#cc0000", borderRadius: "50%", animation: "pulse 2s infinite" }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Pipeline — live animated */}
      <div className={`px-4 pb-4 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <p className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground mb-3">SYSTEM PIPELINE</p>
        <div className="relative">
          <div className="absolute left-[5px] top-[10px] bottom-[10px] w-px bg-border" />
          <div className="space-y-3">
            {pipeline.map((step, i) => (
              <div key={step.label} className="flex items-start gap-3 relative">
                <div style={{
                  width: 11, height: 11, borderRadius: "50%",
                  background: dotColor[step.status],
                  flexShrink: 0, marginTop: 1,
                  boxShadow: step.status === "red" ? "0 0 6px #cc0000" : step.status === "amber" ? "0 0 4px #f59e0b" : "none",
                  animation: step.status === "red" ? "pipelinePulse 1.5s ease-in-out infinite" : step.status === "amber" ? "pipelinePulse 2.5s ease-in-out infinite" : "none",
                }} />
                <div>
                  <p className="text-[10px] text-foreground leading-none">{step.label}</p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5" style={{ transition: "all 0.5s", color: step.status === "amber" ? "#f59e0b" : step.status === "red" ? "#cc0000" : undefined }}>
                    {step.detail}
                  </p>
                </div>
                {/* Status indicator */}
                {step.status !== "green" && (
                  <span style={{ marginLeft: "auto", fontSize: 8, fontFamily: "monospace", color: dotColor[step.status], fontWeight: 700, flexShrink: 0 }}>
                    {step.status === "amber" ? "WARN" : "LIVE"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes pipelinePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}</style>
      </div>
    </aside>
  );
};

export default AppSidebar;
