import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getAuthHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export const api = {
  // Upload CSV file
  async uploadCSV(file: File): Promise<any> {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "File upload failed");
    }
    return res.json();
  },

  // Get fraud cases
  async getCases(search?: string): Promise<any[]> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/predictions`);
    if (search) url.searchParams.append("search", search);

    const res = await fetch(url.toString(), {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch cases");
    return res.json();
  },

  // Update case status (OPEN, ESCALATED, RESOLVED)
  async updateCaseStatus(caseId: string, status: "OPEN" | "ESCALATED" | "RESOLVED"): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/predictions/${caseId}/status`, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return res.json();
  },

  // Add notes to case
  async addCaseNote(caseId: string, note: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/predictions/${caseId}/note`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error("Failed to save note");
    return res.json();
  },

  // Get aggregated dashboard metrics and charts
  async getAnalytics(): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/analytics`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },

  // Get upload records log
  async getUploads(): Promise<any[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/uploads`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch uploads log");
    return res.json();
  },

  // Get GPU Status
  async getGPUStatus(): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/gpu/status`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch GPU status");
    return res.json();
  },

  // Get Model Registry
  async getModelRegistry(): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/models/registry`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch model registry");
    return res.json();
  },

  // Get Available Datasets
  async getAvailableDatasets(): Promise<string[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/models/datasets`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch available datasets");
    return res.json();
  },

  // Get Dataset Stats
  async getDatasetStats(datasetId: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/models/datasets/${datasetId}/stats`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch dataset stats");
    return res.json();
  },

  // Train model
  async trainModel(modelType: string, hyperparams: string, datasetName: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/models/train`);
    url.searchParams.append("model_type", modelType);
    url.searchParams.append("hyperparams", hyperparams);
    url.searchParams.append("dataset_name", datasetName);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to trigger model training");
    return res.json();
  },

  // Activate model
  async activateModel(modelType: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/models/activate`);
    url.searchParams.append("model_type", modelType);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to activate model");
    return res.json();
  },

  // Get Audit Logs
  async getAuditLogs(): Promise<any[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/predictions/audit-logs`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  // Download PDF Report
  async downloadPDFReport(): Promise<Blob> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/reports/pdf`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to download PDF report");
    return res.blob();
  },

  // Download Excel Report
  async downloadExcelReport(): Promise<Blob> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/reports/excel`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to download Excel report");
    return res.blob();
  },

  // Get Prediction Explanation (SHAP)
  async getPredictionExplanation(caseId: string): Promise<any[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/predictions/${caseId}/explain`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch SHAP explanations");
    return res.json();
  },

  // Get Copilot Models
  async getCopilotModels(): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/copilot/models`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to fetch Copilot models");
    return res.json();
  },

  // Download Copilot Model
  async downloadCopilotModel(modelName: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/copilot/models/download`);
    url.searchParams.append("model_name", modelName);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to trigger model download");
    return res.json();
  },

  // Remove Copilot Model
  async removeCopilotModel(modelName: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/copilot/models`);
    url.searchParams.append("model_name", modelName);
    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to delete model");
    return res.json();
  },

  // Benchmark Copilot Model
  async benchmarkCopilotModel(modelName: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE}/api/copilot/benchmark`);
    url.searchParams.append("model_name", modelName);
    const res = await fetch(url.toString(), {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to benchmark model");
    return res.json();
  },

  // Analyze multimodal image
  async analyzeImage(file: File, prompt: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prompt", prompt);
    const res = await fetch(`${API_BASE}/api/copilot/analyze-image`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });
    if (!res.ok) throw new Error("Image analysis failed");
    return res.json();
  },

  // Analyze CSV datasets
  async analyzeCSV(file: File, prompt: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prompt", prompt);
    const res = await fetch(`${API_BASE}/api/copilot/analyze-csv`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });
    if (!res.ok) throw new Error("CSV analysis failed");
    return res.json();
  },

  // Stream chat responses from Copilot
  async chatWithCopilot(model: string, message: string, history: any[], onChunk: (text: string) => void): Promise<void> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/copilot/chat`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, message, history })
    });
    
    if (!res.ok) throw new Error("Chat request failed");
    
    const reader = res.body?.getReader();
    if (!reader) return;
    
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            // Ignore incomplete JSON stream lines
          }
        }
      }
    }
  }
};
