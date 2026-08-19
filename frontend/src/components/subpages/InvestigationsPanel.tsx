import CaseTable, { FraudCase } from "@/components/CaseTable";

interface Props {
  cases: FraudCase[];
  processingIds: string[];
  exitingIds: string[];
  onEscalate: (id: string) => void;
  onResolve: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  searchQuery: string;
}

export default function InvestigationsPanel({
  cases,
  processingIds,
  exitingIds,
  onEscalate,
  onResolve,
  onAddNote,
  searchQuery
}: Props) {
  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#060000] border border-red-950/40 p-4 rounded-md">
        <h3 className="text-xs text-red-500 font-bold tracking-wider mb-2">🕵️ ACTIVE INVESTIGATION QUEUE</h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Monitor flagged records, assign agents, write case notes, or escalate critical anomalies. 
          Use the tab controls below to filter by severity or case resolution state.
        </p>
      </div>

      <CaseTable
        cases={cases}
        processingCaseIds={processingIds}
        exitingCaseIds={exitingIds}
        onEscalate={onEscalate}
        onResolve={onResolve}
        onAddNote={onAddNote}
        searchQuery={searchQuery}
      />
    </div>
  );
}
