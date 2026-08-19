import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Gauge, Zap, HardDrive } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AIBenchmark() {
  const [testing, setTesting] = useState(false);
  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [activeModel, setActiveModel] = useState("");
  const [statsData, setStatsData] = useState<any[]>([]);

  // Fetch available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await api.getCopilotModels();
        if (data.online && data.models.length > 0) {
          setInstalledModels(data.models);
          // Default to the server-configured default_chat_model if available
          const preferred =
            data.default_chat_model &&
            data.models.some((m: any) => m.name === data.default_chat_model)
              ? data.default_chat_model
              : data.models[0].name;
          setActiveModel(preferred);

          // Populate chart with placeholder stats for installed models only
          setStatsData(
            data.models.map((m: any) => ({
              name: m.name,
              latency: 0,
              tokens: 0,
              vram: 0
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch models for benchmark:", err);
      }
    };
    loadModels();
  }, []);

  const runBenchmarkTest = async () => {
    if (!activeModel) {
      toast.error("No model selected.");
      return;
    }
    setTesting(true);
    toast.info(`Running benchmark on ${activeModel}...`);
    try {
      const res = await api.benchmarkCopilotModel(activeModel);
      toast.success(`Benchmark finished: ${res.tokens_per_sec} tok/s — model: ${res.model}`);

      setStatsData(prev =>
        prev.map(item =>
          item.name === res.model
            ? { ...item, latency: res.latency_s, tokens: res.tokens_per_sec, vram: res.vram_used_mb || 0 }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Benchmark query failed.");
    } finally {
      setTesting(false);
    }
  };

  const bestThroughput = statsData.reduce<any>(
    (best, m) => (m.tokens > best.tokens ? m : best),
    { name: "—", tokens: 0 }
  );
  const lowestVram = statsData.reduce<any>(
    (best, m) => (m.vram > 0 && (best.vram === 0 || m.vram < best.vram) ? m : best),
    { name: "—", vram: 0 }
  );

  return (
    <div className="space-y-6 font-mono text-zinc-300" style={{ fontFamily: "monospace" }}>
      {/* Benchmark trigger card */}
      <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xs text-red-500 font-bold tracking-wider mb-1">🧭 LLM SPEED &amp; EFFICIENCY COMPARISON</h3>
          <p className="text-[10px] text-zinc-500">
            Run query load tests on installed models to evaluate generation speeds and GPU load.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {installedModels.length === 0 ? (
            <span className="text-[10px] text-yellow-600 px-2">Ollama offline / no models</span>
          ) : (
            <select
              value={activeModel}
              onChange={e => setActiveModel(e.target.value)}
              className="bg-[#0a0505] border border-red-950/60 text-xs rounded-sm p-2 text-zinc-300 outline-none"
            >
              {installedModels.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={runBenchmarkTest}
            disabled={testing || installedModels.length === 0}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-sm transition-colors whitespace-nowrap"
          >
            <Zap size={12} />
            {testing ? "RUNNING SPEED TEST..." : "RUN BENCHMARK"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md flex items-center gap-3">
          <div className="p-3 bg-red-950/20 text-red-500 rounded-md">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-[9px] text-zinc-500">BEST THROUGHPUT</div>
            <div className="text-sm font-bold text-zinc-300">
              {bestThroughput.tokens > 0 ? `${bestThroughput.name} (${bestThroughput.tokens} tok/s)` : "Run a test first"}
            </div>
          </div>
        </div>

        <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md flex items-center gap-3">
          <div className="p-3 bg-red-950/20 text-red-500 rounded-md">
            <HardDrive size={24} />
          </div>
          <div>
            <div className="text-[9px] text-zinc-500">LOWEST VRAM LOAD</div>
            <div className="text-sm font-bold text-zinc-300">
              {lowestVram.vram > 0
                ? `${lowestVram.name} (${(lowestVram.vram / 1024).toFixed(1)} GB)`
                : "Run a test first"}
            </div>
          </div>
        </div>

        <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md flex items-center gap-3">
          <div className="p-3 bg-red-950/20 text-red-500 rounded-md">
            <Gauge size={24} />
          </div>
          <div>
            <div className="text-[9px] text-zinc-500">INFERENCE EFFICIENCY</div>
            <div className="text-sm font-bold text-zinc-300">NVIDIA CUDA Accelerated</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md">
          <h3 className="text-xs text-red-500 mb-4 tracking-wider">🚀 GENERATION THROUGHPUT (TOKENS / SEC)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#150505" />
                <XAxis dataKey="name" stroke="#444" fontSize={9} />
                <YAxis stroke="#444" fontSize={9} />
                <Tooltip contentStyle={{ background: "#050000", borderColor: "#cc0000" }} />
                <Bar dataKey="tokens" fill="#cc0000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md">
          <h3 className="text-xs text-red-500 mb-4 tracking-wider">💾 GPU VRAM OCCUPANCY (MB)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#150505" />
                <XAxis dataKey="name" stroke="#444" fontSize={9} />
                <YAxis stroke="#444" fontSize={9} />
                <Tooltip contentStyle={{ background: "#050000", borderColor: "#cc0000" }} />
                <Bar dataKey="vram" fill="#444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
