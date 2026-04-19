import { useState, useMemo } from "react";

export interface FraudCase {
  id:          string;
  scheme:      string;
  state:       string;
  amount:      number;
  severity:    "MEDIUM" | "HIGH" | "CRITICAL";
  status:      "OPEN" | "ESCALATED" | "RESOLVED";
  assignedTo:  string;
  createdAt:   string;
  escalatedAt: string | null;
  resolvedAt:  string | null;
  note?:       string;
  score?:      number;
}

interface Props {
  cases:             FraudCase[];
  processingCaseIds: string[];
  exitingCaseIds:    string[];
  onEscalate:        (caseId: string) => void;
  onResolve:         (caseId: string) => void;
  onAddNote?:        (caseId: string, note: string) => void;
  searchQuery?:      string;
}

const PAGE_SIZE = 10;

const CaseTable = ({ cases, processingCaseIds, exitingCaseIds, onEscalate, onResolve, onAddNote, searchQuery = "" }: Props) => {
  const [selectedCaseId,    setSelectedCaseId]    = useState<string | null>(null);
  const [confirmEscalateId, setConfirmEscalateId] = useState<string | null>(null);
  const [noteText,          setNoteText]          = useState("");
  const [editNoteId,        setEditNoteId]        = useState<string | null>(null);
  const [tab,               setTab]               = useState<"active" | "resolved">("active");
  const [filterSeverity,    setFilterSeverity]    = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM">("ALL");
  const [filterStatus,      setFilterStatus]      = useState<"ALL" | "OPEN" | "ESCALATED">("ALL");
  const [selectedIds,       setSelectedIds]       = useState<string[]>([]);
  const [page,              setPage]              = useState(1);
  const [sortBy,            setSortBy]            = useState<"severity" | "amount" | "createdAt">("severity");
  const [sortDir,           setSortDir]           = useState<"asc" | "desc">("desc");

  const selectedCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) ?? null : null;
  const fmt   = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
  const fmtDt = (s: string | null) => s ? new Date(s).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
  const scoreColor = (s = 0) => s >= 75 ? "#cc0000" : s >= 50 ? "#f59e0b" : "#22c55e";
  const scoreLabel = (s = 0) => s >= 75 ? "CRITICAL" : s >= 50 ? "HIGH" : "LOW";
  const sevW: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
  const sevBg:  Record<string,string> = { CRITICAL:"#cc000033", HIGH:"#f59e0b22", MEDIUM:"#d69e2e22" };
  const sevTxt: Record<string,string> = { CRITICAL:"#ff4444",   HIGH:"#f59e0b",   MEDIUM:"#d69e2e"   };
  const stBg:   Record<string,string> = { OPEN:"#f59e0b22", ESCALATED:"#cc000022", RESOLVED:"#22c55e22" };
  const stTxt:  Record<string,string> = { OPEN:"#f59e0b",   ESCALATED:"#cc0000",   RESOLVED:"#22c55e"  };
  const stIcon: Record<string,string> = { OPEN:"🔴", ESCALATED:"⚡", RESOLVED:"✅" };

  const filtered = useMemo(() => {
    let list = [...cases];
    if (tab === "active")   list = list.filter(c => c.status !== "RESOLVED");
    if (tab === "resolved") list = list.filter(c => c.status === "RESOLVED");
    if (searchQuery) list = list.filter(c =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.scheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterSeverity !== "ALL") list = list.filter(c => c.severity === filterSeverity);
    if (filterStatus   !== "ALL") list = list.filter(c => c.status   === filterStatus);
    list.sort((a, b) => {
      let va: number, vb: number;
      if (sortBy === "severity")    { va = sevW[a.severity] ?? 0; vb = sevW[b.severity] ?? 0; }
      else if (sortBy === "amount") { va = a.amount;   vb = b.amount; }
      else { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); }
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [cases, tab, searchQuery, filterSeverity, filterStatus, sortBy, sortDir]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const openCount     = cases.filter(c => c.status === "OPEN").length;
  const escalatedCount = cases.filter(c => c.status === "ESCALATED").length;
  const resolvedCount  = cases.filter(c => c.status === "RESOLVED").length;
  const resolveRate    = cases.length ? Math.round((resolvedCount / cases.length) * 100) : 0;

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll    = () => setSelectedIds(selectedIds.length === paginated.length ? [] : paginated.map(c => c.id));
  const bulkEscalate = () => { selectedIds.forEach(id => onEscalate(id)); setSelectedIds([]); };
  const bulkResolve  = () => { selectedIds.forEach(id => onResolve(id));  setSelectedIds([]); };

  const SortBtn = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button onClick={() => { if(sortBy===col) setSortDir(d=>d==="desc"?"asc":"desc"); else {setSortBy(col);setSortDir("desc");} setPage(1); }}
      style={{background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:10,fontFamily:"monospace",letterSpacing:1,display:"flex",alignItems:"center",gap:3,padding:0}}>
      {label}{sortBy===col?(sortDir==="desc"?" ↓":" ↑"):" ↕"}
    </button>
  );

  return (
    <>
      {/* CONFIRM ESCALATE */}
      {confirmEscalateId && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:210,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#111",border:"1px solid #cc0000",borderRadius:12,padding:28,width:380}}>
            <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:8}}>⚡ Escalate Case</div>
            <div style={{color:"#888",fontSize:12,marginBottom:6}}>Case: <span style={{color:"#cc0000",fontFamily:"monospace"}}>{confirmEscalateId}</span></div>
            <div style={{color:"#666",fontSize:12,marginBottom:20}}>This will route the case to the senior officer queue.</div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
              <button onClick={()=>setConfirmEscalateId(null)} style={{background:"#1a1a1a",color:"#ccc",border:"1px solid #333",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:12}}>Cancel</button>
              <button onClick={()=>{onEscalate(confirmEscalateId);setConfirmEscalateId(null);}} style={{background:"#cc0000",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:600}}>Confirm Escalation</button>
            </div>
          </div>
        </div>
      )}

      {/* CASE DETAIL MODAL */}
      {selectedCase && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#111",border:"1px solid #cc0000",borderRadius:14,padding:28,width:480,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{color:"#cc0000",fontFamily:"monospace",fontWeight:700,fontSize:16}}>{selectedCase.id}</div>
                <div style={{color:"#444",fontSize:10,fontFamily:"monospace",marginTop:2}}>Created {fmtDt(selectedCase.createdAt)}</div>
              </div>
              <button onClick={()=>setSelectedCaseId(null)} style={{color:"#888",background:"none",border:"none",cursor:"pointer",fontSize:22}}>✕</button>
            </div>

            {/* Risk Score bar */}
            <div style={{background:"#1a1a1a",borderRadius:8,padding:"14px 16px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{color:"#888",fontSize:10,fontFamily:"monospace",letterSpacing:1}}>RISK SCORE</span>
                <span style={{color:scoreColor(selectedCase.score),fontSize:15,fontWeight:800,fontFamily:"monospace"}}>{selectedCase.score ?? 0}% — {scoreLabel(selectedCase.score)}</span>
              </div>
              <div style={{height:10,background:"#0a0a0a",borderRadius:5,overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",width:`${selectedCase.score??0}%`,background:`linear-gradient(90deg, #22c55e, ${scoreColor(selectedCase.score)})`,borderRadius:5,transition:"width 0.6s ease",boxShadow:`0 0 10px ${scoreColor(selectedCase.score)}55`}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:9,fontFamily:"monospace",color:"#333"}}>
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>

            {/* Badges */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <span style={{background:stBg[selectedCase.status],color:stTxt[selectedCase.status],borderRadius:20,padding:"4px 14px",fontSize:11,fontFamily:"monospace",fontWeight:700}}>{stIcon[selectedCase.status]} {selectedCase.status}</span>
              <span style={{background:sevBg[selectedCase.severity],color:sevTxt[selectedCase.severity],borderRadius:20,padding:"4px 14px",fontSize:11,fontFamily:"monospace"}}>{selectedCase.severity}</span>
            </div>

            {/* Details */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[["Scheme",selectedCase.scheme],["State",selectedCase.state],["Amount",fmt(selectedCase.amount)],["Assigned To",selectedCase.assignedTo],["Escalated At",fmtDt(selectedCase.escalatedAt)],["Resolved At",fmtDt(selectedCase.resolvedAt)]].map(([l,v])=>(
                <div key={l} style={{background:"#1a1a1a",borderRadius:6,padding:"10px 12px"}}>
                  <div style={{color:"#444",fontSize:9,fontFamily:"monospace"}}>{l}</div>
                  <div style={{color:"#e0e0e0",fontSize:12,marginTop:4}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div style={{background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:8,padding:14,marginBottom:16}}>
              <div style={{color:"#555",fontSize:10,fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>📝 OFFICER NOTES</div>
              {selectedCase.note
                ? <div style={{color:"#ccc",fontSize:12,lineHeight:1.6,marginBottom:8,padding:"8px 10px",background:"#111",borderRadius:6,borderLeft:"3px solid #cc0000"}}>{selectedCase.note}</div>
                : <div style={{color:"#333",fontSize:11,marginBottom:8,fontStyle:"italic"}}>No notes added yet.</div>}
              {editNoteId === selectedCase.id
                ? <div>
                    <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add investigation notes, findings, or next steps..." rows={3}
                      style={{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"8px 10px",color:"#e0e0e0",fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button onClick={()=>{onAddNote?.(selectedCase.id,noteText);setEditNoteId(null);setNoteText("");}}
                        style={{background:"#cc0000",color:"#fff",border:"none",borderRadius:6,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:600}}>Save Note</button>
                      <button onClick={()=>setEditNoteId(null)}
                        style={{background:"#1a1a1a",color:"#888",border:"1px solid #333",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12}}>Cancel</button>
                    </div>
                  </div>
                : <button onClick={()=>{setEditNoteId(selectedCase.id);setNoteText(selectedCase.note||"");}}
                    style={{background:"transparent",color:"#cc0000",border:"1px solid #cc000033",borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:11}}>
                    {selectedCase.note?"✏️ Edit Note":"+ Add Note"}
                  </button>}
            </div>

            {/* Actions */}
            <div style={{display:"flex",gap:8}}>
              <button disabled={selectedCase.status!=="OPEN"||processingCaseIds.includes(selectedCase.id)}
                onClick={()=>{setConfirmEscalateId(selectedCase.id);setSelectedCaseId(null);}}
                style={{flex:1,background:selectedCase.status!=="OPEN"?"#111":"#cc0000",color:selectedCase.status!=="OPEN"?"#440000":"#fff",border:selectedCase.status!=="OPEN"?"1px solid #330000":"none",borderRadius:8,padding:"10px",cursor:selectedCase.status!=="OPEN"?"not-allowed":"pointer",fontSize:12,fontWeight:600,opacity:processingCaseIds.includes(selectedCase.id)?0.5:1}}>
                ⚡ Escalate Case
              </button>
              <button disabled={selectedCase.status==="RESOLVED"||processingCaseIds.includes(selectedCase.id)}
                onClick={()=>{onResolve(selectedCase.id);setSelectedCaseId(null);}}
                style={{flex:1,background:"transparent",color:selectedCase.status==="RESOLVED"?"#1a4a1a":"#22c55e",border:`1px solid ${selectedCase.status==="RESOLVED"?"#1a4a1a":"#22c55e"}`,borderRadius:8,padding:"10px",cursor:selectedCase.status==="RESOLVED"?"not-allowed":"pointer",fontSize:12,fontWeight:600,opacity:processingCaseIds.includes(selectedCase.id)?0.5:1}}>
                ✅ Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TABLE CARD */}
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,overflow:"hidden"}}>

        {/* Stats bar */}
        <div style={{background:"#0a0a0a",padding:"14px 20px",display:"flex",gap:28,alignItems:"center",borderBottom:"1px solid #1e1e1e",flexWrap:"wrap"}}>
          {[{label:"OPEN",val:openCount,color:"#f59e0b",icon:"🔴"},{label:"ESCALATED",val:escalatedCount,color:"#cc0000",icon:"⚡"},{label:"RESOLVED",val:resolvedCount,color:"#22c55e",icon:"✅"}].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>{s.icon}</span>
              <div><div style={{color:s.color,fontSize:18,fontWeight:800,fontFamily:"monospace",lineHeight:1}}>{s.val}</div><div style={{color:"#444",fontSize:9,fontFamily:"monospace",letterSpacing:1}}>{s.label}</div></div>
            </div>
          ))}
          <div style={{flex:1,minWidth:160}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:"monospace",color:"#555",marginBottom:4}}>
              <span>RESOLVE RATE</span><span style={{color:"#22c55e",fontWeight:700}}>{resolveRate}%</span>
            </div>
            <div style={{height:6,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${resolveRate}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:3,transition:"width 0.6s",boxShadow:"0 0 8px #22c55e44"}}/>
            </div>
          </div>
        </div>

        {/* Tabs + Filters */}
        <div style={{padding:"12px 20px",borderBottom:"1px solid #1e1e1e",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",background:"#0a0a0a",borderRadius:8,border:"1px solid #1e1e1e",overflow:"hidden"}}>
            {(["active","resolved"] as const).map(t=>(
              <button key={t} onClick={()=>{setTab(t);setPage(1);setSelectedIds([]);}}
                style={{padding:"7px 18px",background:tab===t?"var(--fg-accent,#cc0000)":"transparent",border:"none",color:tab===t?"#fff":"#555",fontSize:11,fontFamily:"monospace",cursor:"pointer",transition:"all .2s",fontWeight:tab===t?700:400}}>
                {t==="active"?"🔴 Active":"✅ Resolved"}
              </button>
            ))}
          </div>
          <select value={filterSeverity} onChange={e=>{setFilterSeverity(e.target.value as any);setPage(1);}}
            style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"#ccc",fontSize:11,fontFamily:"monospace",cursor:"pointer",outline:"none"}}>
            <option value="ALL">All Severity</option>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
          </select>
          {tab==="active"&&(
            <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value as any);setPage(1);}}
              style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"#ccc",fontSize:11,fontFamily:"monospace",cursor:"pointer",outline:"none"}}>
              <option value="ALL">All Status</option>
              <option value="OPEN">🔴 Open</option>
              <option value="ESCALATED">⚡ Escalated</option>
            </select>
          )}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{color:"#444",fontSize:10,fontFamily:"monospace"}}>{filtered.length} case{filtered.length!==1?"s":""}</span>
            {selectedIds.length>0&&(
              <>
                <span style={{color:"#cc0000",fontSize:10,fontFamily:"monospace",fontWeight:700}}>{selectedIds.length} selected</span>
                <button onClick={bulkEscalate} style={{background:"#cc000022",color:"#cc0000",border:"1px solid #cc000044",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>⚡ Escalate All</button>
                <button onClick={bulkResolve}  style={{background:"#22c55e22",color:"#22c55e", border:"1px solid #22c55e44",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>✅ Resolve All</button>
                <button onClick={()=>setSelectedIds([])} style={{background:"transparent",color:"#555",border:"1px solid #333",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1e1e1e",background:"#080808"}}>
                <th style={{padding:"10px 14px",textAlign:"left",width:36}}>
                  <input type="checkbox" checked={selectedIds.length===paginated.length&&paginated.length>0} onChange={toggleAll} style={{cursor:"pointer",accentColor:"#cc0000"}}/>
                </th>
                <th style={{padding:"10px 8px",textAlign:"left"}}><SortBtn col="severity" label="SEVERITY"/></th>
                <th style={{padding:"10px 8px",textAlign:"left",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400}}>CASE ID</th>
                <th style={{padding:"10px 8px",textAlign:"left",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400}}>SCHEME</th>
                <th style={{padding:"10px 8px",textAlign:"left",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400}}>STATE</th>
                <th style={{padding:"10px 8px",textAlign:"left"}}><SortBtn col="amount" label="AMOUNT"/></th>
                <th style={{padding:"10px 8px",textAlign:"left",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400,minWidth:120}}>RISK SCORE</th>
                <th style={{padding:"10px 8px",textAlign:"left",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400}}>STATUS</th>
                <th style={{padding:"10px 14px",textAlign:"right",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:1,fontWeight:400}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length===0&&(
                <tr><td colSpan={9} style={{padding:"48px",textAlign:"center",color:"#333",fontSize:12,fontFamily:"monospace"}}>
                  {cases.length===0?"📁 Upload a CSV to generate fraud cases":"🔍 No cases match the current filters"}
                </td></tr>
              )}
              {paginated.map(c=>{
                const score=c.score??0;
                const isSelected=selectedIds.includes(c.id);
                const isExiting=exitingCaseIds.includes(c.id);
                return(
                  <tr key={c.id}
                    style={{borderBottom:"1px solid #141414",background:isSelected?"rgba(204,0,0,0.08)":c.status==="ESCALATED"?"rgba(204,0,0,0.04)":"transparent",opacity:isExiting?0:1,transform:isExiting?"translateY(4px)":"translateY(0)",transition:"all 0.3s",cursor:"pointer"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLTableRowElement).style.background="rgba(255,255,255,0.03)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLTableRowElement).style.background=isSelected?"rgba(204,0,0,0.08)":c.status==="ESCALATED"?"rgba(204,0,0,0.04)":"transparent";}}>
                    <td style={{padding:"10px 14px"}} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(c.id)} style={{cursor:"pointer",accentColor:"#cc0000"}}/>
                    </td>
                    <td style={{padding:"10px 8px"}} onClick={()=>setSelectedCaseId(c.id)}>
                      <span style={{background:sevBg[c.severity],color:sevTxt[c.severity],borderRadius:4,padding:"3px 8px",fontSize:10,fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap"}}>
                        {c.severity==="CRITICAL"?"🔴":c.severity==="HIGH"?"🟠":"🟡"} {c.severity}
                      </span>
                    </td>
                    <td style={{padding:"10px 8px",color:"#cc0000",fontFamily:"monospace",fontSize:11,fontWeight:600}} onClick={()=>setSelectedCaseId(c.id)}>{c.id}</td>
                    <td style={{padding:"10px 8px",color:"#e0e0e0",fontSize:12,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setSelectedCaseId(c.id)}>{c.scheme}</td>
                    <td style={{padding:"10px 8px",color:"#888",fontSize:12}} onClick={()=>setSelectedCaseId(c.id)}>{c.state}</td>
                    <td style={{padding:"10px 8px",color:"#e0e0e0",fontWeight:600,fontSize:12,fontFamily:"monospace"}} onClick={()=>setSelectedCaseId(c.id)}>{fmt(c.amount)}</td>
                    {/* Risk Score with gradient bar */}
                    <td style={{padding:"10px 8px",minWidth:130}} onClick={()=>setSelectedCaseId(c.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:6,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${score}%`,background:`linear-gradient(90deg,#22c55e,${scoreColor(score)})`,borderRadius:3,transition:"width 0.4s",boxShadow:score>74?`0 0 6px ${scoreColor(score)}66`:"none"}}/>
                        </div>
                        <span style={{color:scoreColor(score),fontSize:10,fontFamily:"monospace",fontWeight:700,minWidth:32}}>{score}%</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 8px"}} onClick={()=>setSelectedCaseId(c.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"nowrap"}}>
                        <span style={{background:stBg[c.status],color:stTxt[c.status],borderRadius:4,padding:"3px 8px",fontSize:10,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}>
                          {stIcon[c.status]} {c.status}
                        </span>
                        {c.note&&<span style={{fontSize:14}} title={`Note: ${c.note}`}>📝</span>}
                      </div>
                    </td>
                    <td style={{padding:"10px 14px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>setSelectedCaseId(c.id)}
                          style={{background:"transparent",color:"#cc0000",border:"1px solid #cc000033",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>View</button>
                        {c.status==="OPEN"&&(
                          <button onClick={()=>setConfirmEscalateId(c.id)} disabled={processingCaseIds.includes(c.id)}
                            style={{background:"#cc000022",color:"#cc0000",border:"1px solid #cc000044",borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:12,opacity:processingCaseIds.includes(c.id)?0.4:1}} title="Escalate">⚡</button>
                        )}
                        {c.status!=="RESOLVED"&&(
                          <button onClick={()=>onResolve(c.id)} disabled={processingCaseIds.includes(c.id)}
                            style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:12,opacity:processingCaseIds.includes(c.id)?0.4:1}} title="Resolve">✅</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages>1&&(
          <div style={{padding:"12px 20px",borderTop:"1px solid #1e1e1e",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0a0a0a"}}>
            <span style={{color:"#444",fontSize:11,fontFamily:"monospace"}}>
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} cases
            </span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"5px 12px",cursor:page===1?"not-allowed":"pointer",color:page===1?"#333":"#ccc",fontSize:11}}>← Prev</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg=totalPages<=5?i+1:page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i;
                return(<button key={pg} onClick={()=>setPage(pg)}
                  style={{background:page===pg?"#cc0000":"#1a1a1a",border:`1px solid ${page===pg?"#cc0000":"#333"}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",color:page===pg?"#fff":"#888",fontSize:11,fontFamily:"monospace",minWidth:32,fontWeight:page===pg?700:400}}>
                  {pg}</button>);
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"5px 12px",cursor:page===totalPages?"not-allowed":"pointer",color:page===totalPages?"#333":"#ccc",fontSize:11}}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CaseTable;
