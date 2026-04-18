import { LayoutDashboard, Bell, Users, BarChart3, Settings, PanelLeftClose, PanelLeftOpen, HelpCircle, MessageCircle, FileText } from "lucide-react";
import HexShieldLogo from "./HexShieldLogo";
import { tx, TKey } from "./DashboardHeader";

const pipelineSteps = [
  { label: "Data Ingestion",    status: "green", detail: "2.4M records/hr" },
  { label: "Validation Layer",  status: "green", detail: "99.7% pass rate"  },
  { label: "ETL Processing",    status: "amber", detail: "Batch #7802"       },
  { label: "ML Analysis",       status: "green", detail: "Model v3.2.1"      },
  { label: "Anomaly Detection", status: "green", detail: "Queue"             },
  { label: "Alert Generation",  status: "red",   detail: "Live"              },
];

const dotColor: Record<string, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red:   "bg-primary animate-pulse-dot",
};

interface Props {
  activePage:    string;
  setActivePage: (page: string) => void;
  isOpen?:       boolean;
  isMobile?:     boolean;
  onToggle?:     () => void;
  language?:     string;
}

const AppSidebar = ({ activePage, setActivePage, isOpen = true, isMobile = false, onToggle, language = "en" }: Props) => {
  const expandedWidth  = isMobile ? "260px" : "200px";
  const collapsedWidth = isMobile ? "260px" : "72px";

  const navItems = [
    { icon: LayoutDashboard, labelKey: "overview"  as TKey, id: "overview"  },
    { icon: Bell,            labelKey: "alerts"    as TKey, id: "alerts",    badge: 23 },
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

      {/* Nav */}
      <nav className="flex-1 px-2 mt-2">
        {navItems.map((item) => {
          const label = (item as any).labelKey ? tx(language, (item as any).labelKey as TKey) : (item as any).label;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm mb-0.5 transition-colors ${isOpen ? "gap-3 justify-start" : "justify-center"} ${activePage === item.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <item.icon size={16} />
              {isOpen && <span>{label}</span>}
              {isOpen && (item as any).badge && (
                <span className="ml-auto text-[10px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  {(item as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pipeline */}
      <div className={`px-4 pb-4 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <p className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground mb-3">SYSTEM PIPELINE</p>
        <div className="relative">
          <div className="absolute left-[5px] top-[10px] bottom-[10px] w-px bg-border" />
          <div className="space-y-3">
            {pipelineSteps.map((step) => (
              <div key={step.label} className="flex items-start gap-3 relative">
                <div className={`w-[11px] h-[11px] rounded-full ${dotColor[step.status]} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-[10px] text-foreground leading-none">{step.label}</p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
