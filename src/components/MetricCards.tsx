import { ShieldAlert, IndianRupee, Briefcase, Users } from "lucide-react";

interface Props {
  flaggedCount?: number;
  totalSavings?: string;
  activeCases?: number;
  escalatedCases?: number;
}

const MetricCards = ({ flaggedCount, totalSavings, activeCases, escalatedCases }: Props) => {
  const metrics = [
    {
      icon: ShieldAlert,
      iconColor: "text-primary",
      label: "FLAGGED ANOMALIES",
      value: flaggedCount !== undefined ? flaggedCount.toString() : "1,247",
      valueColor: "text-primary",
      sub: "Last 24 hours",
      badge: "+12.3%",
      badgeColor: "text-primary",
      arrow: "↑",
    },
    {
      icon: IndianRupee,
      iconColor: "text-success",
      label: "TOTAL SAVINGS",
      value: totalSavings !== undefined ? totalSavings : "₹47.8Cr",
      valueColor: "text-success",
      sub: "YTD Recovery",
      badge: "+0.2%",
      badgeColor: "text-success",
      arrow: "↑",
    },
    {
      icon: Briefcase,
      iconColor: "text-warning",
      label: "ACTIVE CASES",
      value: activeCases !== undefined ? activeCases.toString() : "892",
      valueColor: "text-foreground",
      sub: "Under Investigation",
    },
    {
      icon: Users,
      iconColor: "text-primary",
      label: "ESCALATED CASES",
      value: escalatedCases !== undefined ? escalatedCases.toString() : "38",
      valueColor: "text-primary",
      sub: "Higher Authority Queue",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <m.icon size={20} className={m.iconColor} />
            {m.badge && (
              <span className={`text-[10px] font-mono ${m.badgeColor} flex items-center gap-0.5`}>
                {m.arrow} {m.badge}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-1">{m.label}</p>
          <p className={`text-2xl font-bold ${m.valueColor}`}>{m.value}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
        </div>
      ))}
    </div>
  );
};

export default MetricCards;