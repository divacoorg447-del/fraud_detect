import { useState, useEffect, useRef } from "react";
import { Send, Cpu, AlertCircle, Trash2, ArrowRight, Paperclip } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AICopilot() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [defaultChatModel, setDefaultChatModel] = useState("");
  const [imageAnalysisModel, setImageAnalysisModel] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Greetings Officer. I am the FraudGuard AI Copilot, running locally with NVIDIA CUDA acceleration. Query me about predictions, audit histories, or dataset statistics." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.endsWith(".csv");
    const isImage = file.type.startsWith("image/");

    if (!isCsv && !isImage) {
      toast.error("Please upload a CSV file or an image.");
      return;
    }

    setLoading(true);
    const fileName = file.name;
    
    // Add user message to chat log indicating upload
    setMessages(prev => [...prev, { 
      role: "user", 
      content: `[Uploaded File: ${fileName}] - Initiating automated AI analysis...` 
    }]);

    // Append blank assistant card for loading state
    setMessages(prev => [...prev, { role: "assistant", content: `Analyzing ${fileName}...` }]);

    const startTime = Date.now();

    try {
      let result;
      if (isCsv) {
        result = await api.analyzeCSV(file, "Perform a comprehensive risk analysis on this transaction data.");
      } else {
        result = await api.analyzeImage(file, "Analyze this image for potential documents or transaction evidence.");
      }

      const duration = (Date.now() - startTime) / 1000;

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          role: "assistant", 
          content: `### ANALYSIS REPORT FOR ${fileName}\n**Model**: ${result.model_used}\n\n${result.analysis}` 
        };
        return updated;
      });

      setStats({
        model: result.model_used,
        latency_s: duration.toFixed(2),
        tokens_per_sec: (result.analysis.split(/\s+/).length * 1.3 / duration).toFixed(1),
        gpu_enabled: true
      });

      // Clear the file input value
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "File analysis failed.");
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          role: "assistant", 
          content: `Error: File analysis failed. Make sure local Ollama is active.` 
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const data = await api.getCopilotModels();
      if (data.online && data.models.length > 0) {
        setModels(data.models);
        setDefaultChatModel(data.default_chat_model || "");
        setImageAnalysisModel(data.image_analysis_model || "");

        // Auto-select: prefer the server-configured default chat model if it is installed
        const modelNames: string[] = data.models.map((m: any) => m.name);
        const preferred = data.default_chat_model && modelNames.includes(data.default_chat_model)
          ? data.default_chat_model
          : data.models[0].name;
        setSelectedModel(preferred);
      } else {
        const fallbackList = [
          { name: "gemma3:4b", size_bytes: 4000000000, family: "gemma", parameter_size: "4B", quantization_level: "Q4_K_M" },
          { name: "qwen2.5vl:3b", size_bytes: 3000000000, family: "qwen", parameter_size: "3B", quantization_level: "Q4_K_M" }
        ];
        setModels(fallbackList);
        setDefaultChatModel("gemma3:4b");
        setImageAnalysisModel("qwen2.5vl:3b");
        setSelectedModel("gemma3:4b");
      }
    } catch (err) {
      console.error("Failed to fetch Ollama models:", err);
      const fallbackList = [
        { name: "gemma3:4b", size_bytes: 4000000000, family: "gemma", parameter_size: "4B", quantization_level: "Q4_K_M" },
        { name: "qwen2.5vl:3b", size_bytes: 3000000000, family: "qwen", parameter_size: "3B", quantization_level: "Q4_K_M" }
      ];
      setModels(fallbackList);
      setDefaultChatModel("gemma3:4b");
      setImageAnalysisModel("qwen2.5vl:3b");
      setSelectedModel("gemma3:4b");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!selectedModel) {
      toast.error("Please select a local model first!");
      return;
    }

    setMessages(prev => [...prev, { role: "user", content: query }]);
    setInput("");
    setLoading(true);
    
    // Append blank assistant card for streaming
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    let fullReply = "";
    const startTime = Date.now();
    
    try {
      // Send chat
      await api.chatWithCopilot(selectedModel, query, messages, (chunk) => {
        fullReply += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullReply };
          return updated;
        });
      });
      
      const duration = (Date.now() - startTime) / 1000;
      const tokCount = fullReply.split(/\s+/).length * 1.3; // Estimate token size
      
      setStats({
        model: selectedModel,
        latency_s: duration.toFixed(2),
        tokens_per_sec: (tokCount / duration).toFixed(1),
        gpu_enabled: true
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to contact Ollama client.");
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error: Local Ollama instance is offline or model failed to generate response." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: "assistant", content: "Dossier cleared. Ask me a question about flagged fraud accounts or active ML settings." }
    ]);
    setStats(null);
  };

  const suggestions = [
    "Why was transaction GOV-9000 flagged?",
    "Show the highest risk accounts from Bihar.",
    "Explain the XGBoost model accuracy metrics.",
    "Compare CPU vs GPU inference times."
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] font-mono text-zinc-300">
      {/* Left Settings Sidebar */}
      <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md flex flex-col justify-between h-full">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs text-red-500 mb-2 tracking-wider">🤖 LOCAL COGNITIVE CORE</h3>
            <label className="text-[9px] text-zinc-500 block mb-1">ACTIVE LLM</label>
            {models.length === 0 ? (
              <div className="text-[10px] text-yellow-600 bg-yellow-950/10 border border-yellow-950/30 p-2 rounded-sm flex items-center gap-1.5">
                <AlertCircle size={12} />
                <span>Ollama offline / no models</span>
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[#0a0505] border border-red-950/60 text-xs rounded-sm p-2 text-zinc-300 outline-none"
              >
                {models.map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name}{m.name === defaultChatModel ? " ★" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Model role badges */}
          {(defaultChatModel || imageAnalysisModel) && models.length > 0 && (
            <div className="text-[9px] space-y-1 border border-red-950/15 bg-[#080303] rounded-sm p-2">
              <div className="text-red-600/70 font-bold tracking-wider mb-1">ROLE ASSIGNMENTS</div>
              {defaultChatModel && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">CHAT DEFAULT</span>
                  <span className="text-green-600 truncate max-w-[120px]">{defaultChatModel}</span>
                </div>
              )}
              {imageAnalysisModel && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">IMAGE ANALYSIS</span>
                  <span className="text-blue-500 truncate max-w-[120px]">{imageAnalysisModel}</span>
                </div>
              )}
            </div>
          )}

          {stats && (
            <div className="border-t border-red-950/20 pt-4 space-y-2">
              <h4 className="text-[10px] text-red-500/80">⚡ TELEMETRY DIAGNOSTICS</h4>
              <div className="bg-[#0b0505] border border-red-950/25 p-3 rounded-sm space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ACCELERATION</span>
                  <span className="text-green-500 font-bold flex items-center gap-1"><Cpu size={10} /> CUDA GPU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GENERATION TIME</span>
                  <span className="text-zinc-300">{stats.latency_s} s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">THROUGHPUT</span>
                  <span className="text-red-500 font-bold">{stats.tokens_per_sec} tok/s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={clearChat}
          className="w-full flex items-center justify-center gap-2 bg-[#0c0505] border border-red-950 hover:bg-red-950/20 text-red-500 text-xs py-2 rounded-sm transition-all"
        >
          <Trash2 size={12} />
          CLEAR CONVERSATION
        </button>
      </div>

      {/* Main Chat Workspace */}
      <div className="lg:col-span-3 bg-[#060000] border border-red-950/40 rounded-md flex flex-col justify-between h-full overflow-hidden">
        {/* Messages list */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-250px)]">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              <div className={`p-2.5 rounded-md text-xs leading-relaxed ${m.role === "user" ? "bg-red-950/20 border border-red-900/40 text-zinc-200" : "bg-[#0b0505] border border-red-950/20 text-zinc-300"}`}>
                <div className="text-[9px] text-zinc-500 mb-1 font-bold tracking-wider">{m.role === "user" ? "OFFICER ASSIGNMENT" : "AI COPILOT CORE"}</div>
                <div className="whitespace-pre-wrap">{m.content || "Generating thoughts..."}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input box and suggestion chips */}
        <div className="border-t border-red-950/20 p-4 bg-[#050000]">
          {/* Suggestion Chips */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="bg-[#0b0505] border border-red-950/45 hover:border-red-900/60 text-zinc-400 hover:text-zinc-200 text-[10px] py-1 px-2.5 rounded-sm transition-all flex items-center gap-1"
                >
                  {s} <ArrowRight size={8} />
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,image/*"
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-[#0b0505] border border-red-950/60 text-zinc-400 hover:text-zinc-200 hover:border-red-900 rounded-sm px-3 flex items-center justify-center transition-colors"
              title="Upload CSV or Image for AI analysis"
            >
              <Paperclip size={14} />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask Copilot about fraud investigations..."
              className="flex-1 bg-[#0b0505] border border-red-950/60 rounded-sm text-xs p-2.5 text-zinc-200 outline-none focus:border-red-900"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-sm px-4 flex items-center justify-center transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
