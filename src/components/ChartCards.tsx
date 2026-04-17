import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { Activity } from "lucide-react";

const anomalyData = Array.from({ length: 24 }, () => ({
  v: Math.floor(Math.random() * 80) + 20,
}));

const savingsData = Array.from({ length: 24 }, () => ({
  v: Math.floor(Math.random() * 60) + 30,
}));

interface Row {
  amount: number;
  claims_per_month: number;
  scheme: string;
  state: string;
}

interface Props {
  data?: Row[];
  fileUploaded?: boolean;
}

const ChartCards = ({ data = [], fileUploaded = false }: Props) => {
  const totalFlagged = fileUploaded ? data.length : 1247;
  const totalSavings = fileUploaded
    ? `₹${(data.reduce((s, r) => s + r.amount, 0) / 100000).toFixed(1)}L`
    : "₹47.8Cr";

  const uploadedChartData = data.slice(0, 24).map(r => ({ v: r.amount / 1000 }));
  const chartAnomaly = fileUploaded && uploadedChartData.length > 0 ? uploadedChartData : anomalyData;
  const chartSavings = fileUploaded && uploadedChartData.length > 0 ? uploadedChartData : savingsData;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Anomalies */}
      <div className="bg-card border border-border rounded-lg p-5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground">FLAGGED ANOMALIES</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
            <span className="text-[10px] font-mono text-primary">LIVE</span>
          </div>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mb-3">ALERT_STATUS::CRITICAL</p>
        <p className="text-4xl font-bold text-primary mb-2">{totalFlagged}</p>
        <p className="text-[10px] text-muted-foreground mb-4">
          {fileUploaded ? `${data.length} fraud cases detected` : "+12.3% vs last week | 847 HIGH / 400 MED"}
        </p>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartAnomaly}>
              <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                {chartAnomaly.map((_, i) => (
                  <Cell key={i} fill="hsl(0, 100%, 40%)" fillOpacity={0.6 + 0.4 * (i % 3) / 2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings */}
      <div className="bg-card border border-border rounded-lg p-5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground">TOTAL SAVINGS</p>
          <Activity size={14} className="text-success" />
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mb-3">RECOVERY_STATUS::ACTIVE</p>
        <p className="text-4xl font-bold text-success mb-2">{totalSavings}</p>
        <p className="text-[10px] text-muted-foreground mb-4">
          {fileUploaded ? "Recovered from flagged cases" : "+₹3.2Cr this month | YTD 2026"}
        </p>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartSavings}>
              <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                {chartSavings.map((_, i) => (
                  <Cell key={i} fill="hsl(142, 71%, 45%)" fillOpacity={0.5 + 0.5 * (i % 3) / 2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartCards;