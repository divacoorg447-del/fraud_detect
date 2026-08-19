import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Play, Check, ShieldAlert, Cpu } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TrainingCenter() {
  const [registry, setRegistry] = useState<any>({});
  const [modelType, setModelType] = useState("xgboost");
  const [hyperparams, setHyperparams] = useState<any>({
    max_depth: 6,
    contamination: 0.15,
    epochs: 20,
    lr: 0.01
  });
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [datasetStats, setDatasetStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchRegistry = async () => {
    try {
      const data = await api.getModelRegistry();
      setRegistry(data);
    } catch (err) {
      console.error("Failed to load model registry:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const data = await api.getAvailableDatasets();
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDataset(data[0]);
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    }
  };

  const fetchDatasetStats = async (datasetId: string) => {
    if (!datasetId) return;
    setStatsLoading(true);
    try {
      const stats = await api.getDatasetStats(datasetId);
      setDatasetStats(stats);
    } catch (err) {
      console.error("Failed to load dataset stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetStats(selectedDataset);
    }
  }, [selectedDataset]);

  const handleTrain = async () => {
    setTraining(true);
    toast.info(`Training initiated in background using ${selectedDataset} for ${modelType}...`);
    try {
      const hpString = JSON.stringify(hyperparams);
      const res = await api.trainModel(modelType, hpString, selectedDataset);
      toast.success(res.message || "Training job queued successfully!");
      // Poll to update registry after a delay
      setTimeout(fetchRegistry, 3000);
      setTimeout(fetchRegistry, 8000);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger training run.");
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (type: string) => {
    try {
      await api.activateModel(type);
      toast.success(`Active inference model changed to ${type}!`);
      fetchRegistry();
    } catch (err: any) {
      toast.error(err.message || "Failed to change active model.");
    }
  };

  const currentMetrics = registry[modelType]?.metrics || {
    accuracy: 0.942,
    precision: 0.915,
    recall: 0.898,
    f1_score: 0.906,
    roc_auc: 0.967,
    confusion_matrix: [[840, 15], [20, 125]]
  };

  const featureImportanceData = registry[modelType]?.feature_importance 
    ? Object.entries(registry[modelType].feature_importance).map(([name, value]) => ({ name, value }))
    : [
        { name: "Claims Frequency", value: 0.35 },
        { name: "Transaction Amount", value: 0.30 },
        { name: "Account Maturity", value: 0.20 },
        { name: "Geographical Risk", value: 0.15 }
      ];

  const activeModelName = Object.keys(registry).find(k => registry[k]?.active) || "xgboost (Default)";

  return (
    <div className="space-y-6" style={{ fontFamily: "monospace" }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar settings */}
        <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md space-y-4">
          <h3 className="text-xs text-red-500 mb-2 tracking-wider">🛠️ MODEL SELECTION</h3>
          
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">CLASSIFIER ALGORITHM</label>
            <select 
              value={modelType} 
              onChange={e => setModelType(e.target.value)}
              className="w-full bg-[#0a0505] border border-red-950/60 text-xs rounded-sm p-2 text-zinc-300 outline-none"
            >
              <option value="xgboost">XGBoost (Supervised)</option>
              <option value="random_forest">Random Forest (Supervised)</option>
              <option value="isolation_forest">Isolation Forest (Unsupervised)</option>
              <option value="logistic_regression">Logistic Regression (Linear)</option>
              <option value="autoencoder">Deep PyTorch AutoEncoder (Neural Network)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">TRAINING DATASET</label>
            <select 
              value={selectedDataset} 
              onChange={e => setSelectedDataset(e.target.value)}
              className="w-full bg-[#0a0505] border border-red-950/60 text-xs rounded-sm p-2 text-zinc-300 outline-none"
            >
              {datasets.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {statsLoading ? (
            <div className="text-[9px] text-red-500 animate-pulse font-bold">
              ⚡ COMPILING DATASET STATISTICS...
            </div>
          ) : datasetStats ? (
            <div className="bg-[#080303] border border-red-950/30 p-3 rounded-sm space-y-1.5 text-[10px] text-zinc-400">
              <div className="text-red-500/80 font-bold tracking-wider mb-1">📊 DATASET TELEMETRY</div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Rows (Est.)</span>
                <span className="text-zinc-200">{datasetStats.rows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Columns</span>
                <span className="text-zinc-200">{datasetStats.column_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Label</span>
                <span className="text-red-500 font-bold">{datasetStats.target_column}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Missing Values</span>
                <span className={datasetStats.missing_values > 0 ? "text-yellow-600 font-bold" : "text-green-600 font-bold"}>
                  {datasetStats.missing_values}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Duplicate Rows</span>
                <span className={datasetStats.duplicates > 0 ? "text-yellow-600 font-bold" : "text-green-600 font-bold"}>
                  {datasetStats.duplicates}
                </span>
              </div>
            </div>
          ) : null}

          <div className="border-t border-red-950/20 pt-3">
            <h4 className="text-[10px] text-zinc-500 mb-2">HYPERPARAMETERS</h4>
            <div className="space-y-2 text-xs">
              {modelType === "xgboost" || modelType === "random_forest" ? (
                <div>
                  <label className="block text-[9px] text-zinc-600 mb-1">MAX DEPTH (2 - 15)</label>
                  <input 
                    type="number" 
                    value={hyperparams.max_depth} 
                    onChange={e => setHyperparams({ ...hyperparams, max_depth: parseInt(e.target.value) })}
                    className="w-full bg-[#0a0505] border border-red-950/60 rounded-sm p-1.5 text-zinc-300"
                  />
                </div>
              ) : null}

              {modelType === "isolation_forest" ? (
                <div>
                  <label className="block text-[9px] text-zinc-600 mb-1">CONTAMINATION RATE (0.01 - 0.50)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={hyperparams.contamination} 
                    onChange={e => setHyperparams({ ...hyperparams, contamination: parseFloat(e.target.value) })}
                    className="w-full bg-[#0a0505] border border-red-950/60 rounded-sm p-1.5 text-zinc-300"
                  />
                </div>
              ) : null}

              {modelType === "autoencoder" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-zinc-600 mb-1">EPOCHS</label>
                    <input 
                      type="number" 
                      value={hyperparams.epochs} 
                      onChange={e => setHyperparams({ ...hyperparams, epochs: parseInt(e.target.value) })}
                      className="w-full bg-[#0a0505] border border-red-950/60 rounded-sm p-1.5 text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-600 mb-1">LEARNING RATE</label>
                    <input 
                      type="number" 
                      step="0.001"
                      value={hyperparams.lr} 
                      onChange={e => setHyperparams({ ...hyperparams, lr: parseFloat(e.target.value) })}
                      className="w-full bg-[#0a0505] border border-red-950/60 rounded-sm p-1.5 text-zinc-300"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTrain}
              disabled={training}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-sm transition-colors disabled:opacity-50"
            >
              <Play size={12} />
              {training ? "RUNNING JOB..." : "TRAIN MODEL"}
            </button>
          </div>

          <div className="bg-[#0b0505] border border-red-950/80 p-3 rounded-sm text-[10px] text-zinc-500 space-y-1">
            <div>ACTIVE MODEL: <span className="text-red-500 font-bold">{activeModelName.toUpperCase()}</span></div>
            <div>STATUS: <span className="text-zinc-300">{registry[modelType] ? "TRAINED & READY" : "UNINITIALIZED"}</span></div>
          </div>
        </div>

        {/* Dashboard metrics view */}
        <div className="lg:col-span-2 bg-[#060000] border border-red-950/40 p-4 rounded-md space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs text-red-500 tracking-wider">📈 EVALUATION METRICS ({modelType.toUpperCase()})</h3>
            {registry[modelType] && (
              <button
                onClick={() => handleActivate(modelType)}
                disabled={registry[modelType]?.active}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 disabled:border-green-800 disabled:text-green-500 hover:bg-zinc-800 text-zinc-300 text-[10px] py-1 px-3 rounded-sm"
              >
                <Check size={10} />
                {registry[modelType]?.active ? "ACTIVE CLASSIFIER" : "SET ACTIVE MODEL"}
              </button>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "ACCURACY", val: `${(currentMetrics.accuracy * 100).toFixed(1)}%` },
              { label: "PRECISION", val: `${(currentMetrics.precision * 100).toFixed(1)}%` },
              { label: "RECALL", val: `${(currentMetrics.recall * 100).toFixed(1)}%` },
              { label: "F1 SCORE", val: currentMetrics.f1_score.toFixed(3) },
              { label: "ROC AUC", val: currentMetrics.roc_auc.toFixed(3) }
            ].map((m, i) => (
              <div key={i} className="bg-[#0b0505] border border-red-950/20 p-3 rounded-md text-center">
                <div className="text-[8px] text-zinc-500 mb-1">{m.label}</div>
                <div className="text-base font-extrabold text-zinc-300">{m.val}</div>
              </div>
            ))}
          </div>

          {/* Matrix and Feature Importance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[10px] text-red-500/80 mb-3">CONFUSION MATRIX (PSEUDO-LABELS)</h4>
              <div className="bg-[#080303] border border-red-950/20 p-4 rounded-sm text-center">
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div />
                  <div className="text-zinc-500 font-bold">PRED NEG</div>
                  <div className="text-zinc-500 font-bold">PRED POS</div>

                  <div className="text-zinc-500 font-bold text-left flex items-center">ACT NEG</div>
                  <div className="p-3 bg-green-950/10 border border-green-950/30 text-green-500 font-bold text-sm">
                    {currentMetrics.confusion_matrix[0][0]}
                  </div>
                  <div className="p-3 bg-red-950/10 border border-red-950/30 text-red-500 font-bold text-sm">
                    {currentMetrics.confusion_matrix[0][1]}
                  </div>

                  <div className="text-zinc-500 font-bold text-left flex items-center">ACT POS</div>
                  <div className="p-3 bg-red-950/10 border border-red-950/30 text-red-500 font-bold text-sm">
                    {currentMetrics.confusion_matrix[1][0]}
                  </div>
                  <div className="p-3 bg-green-950/10 border border-green-950/30 text-green-500 font-bold text-sm">
                    {currentMetrics.confusion_matrix[1][1]}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] text-red-500/80 mb-3">FEATURE IMPORTANCE CONTRIBUTION</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#150505" />
                    <XAxis type="number" stroke="#444" fontSize={9} />
                    <YAxis dataKey="name" type="category" stroke="#444" fontSize={8} width={100} />
                    <Tooltip contentStyle={{ background: "#050000", borderColor: "#cc0000" }} />
                    <Bar dataKey="value" fill="#cc0000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
