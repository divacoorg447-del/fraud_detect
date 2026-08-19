import { useState } from "react";
import { FileText, Table, Download, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ReportsPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadPDF = async () => {
    setDownloading("pdf");
    toast.info("Generating PDF dossier. Please wait...");
    try {
      const blob = await api.downloadPDFReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fraudguard_investigation_dossier.pdf";
      a.click();
      toast.success("PDF dossier downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate PDF dossier.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading("excel");
    toast.info("Generating Excel sheet. Please wait...");
    try {
      const blob = await api.downloadExcelReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fraudguard_cases.xlsx";
      a.click();
      toast.success("Excel spreadsheet downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate Excel report.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "monospace" }}>
      <div className="bg-[#060000] border border-red-950/40 p-6 rounded-md space-y-6">
        <div>
          <h3 className="text-sm text-red-500 mb-2 tracking-wider">📋 INVESTIGATION REPORTS EXPORTER</h3>
          <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
            Generate and export system-wide case files, telemetry reports, and historical transaction logs. 
            All files are generated dynamically from live Supabase tables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md flex flex-col justify-between h-44">
            <div className="flex gap-3">
              <div className="p-2.5 bg-red-950/20 text-red-500 rounded-md h-fit">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs text-zinc-300 font-bold">PDF DOSSIER REPORT</h4>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Includes executive summary, model statistics, active investigations, and the top critical fraud cases formatted for audit printouts.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDownloadPDF}
              disabled={downloading !== null}
              className="flex items-center justify-center gap-2 bg-red-950/20 border border-red-900/60 hover:bg-red-900/40 text-red-400 text-xs font-bold py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              {downloading === "pdf" ? "GENERATING PDF..." : "EXPORT PDF DOSSIER"}
            </button>
          </div>

          <div className="bg-[#0b0505] border border-red-950/20 p-4 rounded-md flex flex-col justify-between h-44">
            <div className="flex gap-3">
              <div className="p-2.5 bg-red-950/20 text-red-500 rounded-md h-fit">
                <Table size={20} />
              </div>
              <div>
                <h4 className="text-xs text-zinc-300 font-bold">EXCEL SPREADSHEET</h4>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Export complete transaction cases list with beneficiary information, claims metrics, custom notes, risk score attributes, and model names.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDownloadExcel}
              disabled={downloading !== null}
              className="flex items-center justify-center gap-2 bg-red-950/20 border border-red-900/60 hover:bg-red-900/40 text-red-400 text-xs font-bold py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              {downloading === "excel" ? "GENERATING EXCEL..." : "EXPORT EXCEL SPREADSHEET"}
            </button>
          </div>
        </div>

        <div className="border-t border-red-950/20 pt-4 flex items-center gap-2 text-[10px] text-zinc-500">
          <ShieldCheck size={14} className="text-green-500" />
          <span>Reports contain cryptographic validation parameters. Unauthorized sharing is restricted.</span>
        </div>
      </div>
    </div>
  );
}
