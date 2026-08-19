import { useState, useCallback, useEffect, useRef } from "react";
import SplashScreen from "@/components/SplashScreen";
import AppSidebar from "@/components/AppSidebar";
import DashboardHeader, { THEMES, ThemeName, applyTheme, LANGUAGES } from "@/components/DashboardHeader";
import MetricCards from "@/components/MetricCards";
import CaseTable, { FraudCase } from "@/components/CaseTable";
import { useAuth } from "@/components/AuthContext";
import LoginPage from "@/components/LoginPage";
import { api } from "@/lib/api";

// Sub-pages
import GPUMonitor from "@/components/subpages/GPUMonitor";
import TrainingCenter from "@/components/subpages/TrainingCenter";
import ReportsPanel from "@/components/subpages/ReportsPanel";
import AdminPanel from "@/components/subpages/AdminPanel";
import ProfilePanel from "@/components/subpages/ProfilePanel";
import InvestigationsPanel from "@/components/subpages/InvestigationsPanel";
import AICopilot from "@/components/subpages/AICopilot";
import AIBenchmark from "@/components/subpages/AIBenchmark";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
interface Row {
  beneficiary_id: string; name: string; phone: string; state: string;
  scheme: string; claims_per_month: number; amount: number;
  location_cluster: number; account_age_days: number;
}

// ─────────────────────────────────────────────
//  TOAST SYSTEM (Feature 2)
// ─────────────────────────────────────────────
type ToastType = "success"|"error"|"warning"|"info";
interface ToastItem { id:string; message:string; type:ToastType; }
let _addToast: ((m:string,t:ToastType)=>void)|null = null;
export const toast = (message:string, type:ToastType="success") => _addToast?.(message,type);

const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  _addToast = useCallback((message:string, type:ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3500);
  },[]);
  const icons:Record<ToastType,string> = {success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"};
  const colors:Record<ToastType,string> = {success:"#22c55e",error:"#cc0000",warning:"#f59e0b",info:"#3b82f6"};
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:"#111",border:`1px solid ${colors[t.type]}44`,borderLeft:`3px solid ${colors[t.type]}`,borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",animation:"toastIn 0.3s ease",pointerEvents:"auto",minWidth:260,maxWidth:360}}>
          <span style={{fontSize:16}}>{icons[t.type]}</span>
          <span style={{color:"#e0e0e0",fontSize:12,fontFamily:"monospace",flex:1,lineHeight:1.4}}>{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
};

// ─────────────────────────────────────────────
//  ANIMATED COUNTER HOOK (Feature 1)
// ─────────────────────────────────────────────
function useAnimatedCounter(target:number, duration=1200) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(()=>{
    const start=prevRef.current, diff=target-start;
    if(!diff) return;
    const t0=performance.now();
    const tick=(now:number)=>{
      const p=Math.min((now-t0)/duration,1);
      const e=1-Math.pow(1-p,3);
      setValue(Math.round(start+diff*e));
      if(p<1) requestAnimationFrame(tick); else prevRef.current=target;
    };
    requestAnimationFrame(tick);
  },[target,duration]);
  return value;
}

// ─────────────────────────────────────────────
//  USER REGISTRY
// ─────────────────────────────────────────────
interface UserRecord { name:string; email:string; registeredAt:string; lastLogin?:string; }
const getRegistry = ():UserRecord[] => { try{return JSON.parse(localStorage.getItem("fraudguard_registry")||"[]");}catch{return[];} };
const addToRegistry = (name:string,email:string) => {
  const reg=getRegistry();
  if(!reg.find(u=>u.email.toLowerCase()===email.toLowerCase())) {
    reg.push({name,email,registeredAt:new Date().toISOString(),lastLogin:new Date().toISOString()});
    localStorage.setItem("fraudguard_registry",JSON.stringify(reg));
  } else {
    const updated=reg.map(u=>u.email.toLowerCase()===email.toLowerCase()?{...u,lastLogin:new Date().toISOString()}:u);
    localStorage.setItem("fraudguard_registry",JSON.stringify(updated));
  }
};
const getLastLogin = (email:string) => getRegistry().find(u=>u.email.toLowerCase()===email.toLowerCase())?.lastLogin;
const emailExists = (email:string) => getRegistry().some(u=>u.email.toLowerCase()===email.toLowerCase());

// ─────────────────────────────────────────────
//  WEB3FORMS
// ─────────────────────────────────────────────
const WEB3_KEY = "9db5d5ee-f34a-49d7-86c9-b3ddf7f750d2";
const sendFraudAlert = async(userEmail:string,scheme:string,amount:string,state:string,caseId:string)=>{
  try{ await fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({access_key:WEB3_KEY,subject:"🚨 FraudGuard CRITICAL Alert",from_name:"FraudGuard Intelligence System",email:userEmail,message:`Case ID: ${caseId}\nScheme: ${scheme}\nState: ${state}\nAmount: ${amount}\nSeverity: CRITICAL\n— FraudGuard`})}); }catch(e){console.error(e);}
};

// ─────────────────────────────────────────────
//  EMAIL VALIDATION
// ─────────────────────────────────────────────
const BAD_PATTERNS=[/\.{2,}/,/@.*@/,/^[.+_-]/,/[.+_-]@/,/@[.-]/,/[.-]$/];
const STRICT_RE=/^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
function strictEmailOk(e:string){e=e.trim();if(!e||e.length<6||e.length>254)return false;for(const p of BAD_PATTERNS)if(p.test(e))return false;if(!STRICT_RE.test(e))return false;const[local,domain]=e.split("@");if(!local||local.length>64||!domain||!domain.includes("."))return false;const tld=domain.split(".").pop();return !!(tld&&tld.length>=2);}
function getEmailPhrase(e:string):["ok"|"err"|"",string]{e=e.trim();if(!e)return["","waiting..."];if(!e.includes("@"))return["err","missing @ symbol"];const parts=e.split("@");if(parts.length>2)return["err","multiple @ symbols"];const[local,domain]=parts;if(!local)return["err","username before @ is empty"];if(/^[.+\-_]/.test(local))return["err","username cannot start with special char"];if(/[.+\-_]$/.test(local))return["err","username cannot end with special char"];if(/\.{2,}/.test(local))return["err","consecutive dots in username"];if(!domain)return["err","missing domain"];if(!domain.includes("."))return["err","domain needs a dot"];if(!STRICT_RE.test(e))return["err","invalid format"];return["ok","valid ✓"];}

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const FRAUD_METHODS = [
  {title:"Synthetic Identity Fraud",desc:"Data Cross-Matching against credit bureau thin file alerts.",icon:"🧬"},
  {title:"Ghost Beneficiaries",desc:"Aadhaar e-KYC Validation: name hash must match NPCI.",icon:"👻"},
  {title:"Claiming for Deceased",desc:"Registrar of Deaths API: daily check against state death registry.",icon:"💀"},
  {title:"Duplicate Claims",desc:"Fuzzy De-duplication: Levenshtein distance + mobile number matching.",icon:"📋"},
  {title:"Bid Rigging",desc:"Statistical Variance Analysis: flag contracts with suspicious bid patterns.",icon:"📊"},
  {title:"Product Substitution",desc:"Geotagged Photo Verification cross-referenced with vendor coordinates.",icon:"📸"},
  {title:"Ghost Employees",desc:"Facial Recognition Attendance cross-referenced with payroll.",icon:"🏢"},
  {title:"Crop Insurance Collusion",desc:"NDVI Analysis: compare reported loss with satellite imagery.",icon:"🌾"},
  {title:"Fake Invoice Submission",desc:"GSTIN Portal API: real-time validation of invoice numbers.",icon:"🧾"},
];

const GRAPH_TYPES=[
  {id:"bar",label:"Bar Chart",icon:"📊"},{id:"line",label:"Line Chart",icon:"📈"},
  {id:"area",label:"Area Chart",icon:"🏔"},{id:"pie",label:"Pie Chart",icon:"🥧"},
  {id:"donut",label:"Donut Chart",icon:"🍩"},{id:"radar",label:"Radar Chart",icon:"🕸"},
  {id:"scatter",label:"Scatter Plot",icon:"✦"},{id:"stacked",label:"Stacked Bar",icon:"📦"},
  {id:"horizontal",label:"Horizontal Bar",icon:"📉"},{id:"stepped",label:"Stepped Line",icon:"🪜"},
  {id:"bubble",label:"Bubble Chart",icon:"🫧"},{id:"funnel",label:"Funnel Chart",icon:"🔻"},
];

// India state fraud data for heatmap (Feature 6)
const STATE_DATA: Record<string,{x:number;y:number;label:string}> = {
  "Jammu & Kashmir":{x:220,y:55,label:"J&K"},"Himachal Pradesh":{x:240,y:90,label:"HP"},
  "Punjab":{x:205,y:105,label:"PB"},"Uttarakhand":{x:265,y:110,label:"UK"},
  "Haryana":{x:220,y:130,label:"HR"},"Delhi":{x:235,y:145,label:"DL"},
  "Rajasthan":{x:185,y:180,label:"RJ"},"Uttar Pradesh":{x:280,y:160,label:"UP"},
  "Bihar":{x:320,y:175,label:"BR"},"Jharkhand":{x:315,y:210,label:"JH"},
  "West Bengal":{x:360,y:195,label:"WB"},"Odisha":{x:335,y:250,label:"OD"},
  "Madhya Pradesh":{x:245,y:220,label:"MP"},"Chhattisgarh":{x:285,y:245,label:"CG"},
  "Gujarat":{x:165,y:235,label:"GJ"},"Maharashtra":{x:215,y:275,label:"MH"},
  "Telangana":{x:265,y:300,label:"TG"},"Andhra Pradesh":{x:275,y:330,label:"AP"},
  "Karnataka":{x:240,y:340,label:"KA"},"Tamil Nadu":{x:260,y:380,label:"TN"},
  "Kerala":{x:235,y:390,label:"KL"},"Goa":{x:200,y:310,label:"GA"},
  "Assam":{x:390,y:155,label:"AS"},"Meghalaya":{x:395,y:170,label:"ML"},
};

// ─────────────────────────────────────────────
//  CASE GENERATOR
// ─────────────────────────────────────────────
const generateCasesFromRows = (rows: Row[]): FraudCase[] =>
  rows.map((r, i) => {
    const vectors = [
      r.claims_per_month > 6,
      r.amount > 40000,
      r.account_age_days < 30,
      r.location_cluster <= 2,
    ];
    const score = vectors.filter(Boolean).length * 25;
    return {
      id:          `GOV-${9000 + i}`,
      scheme:      r.scheme,
      state:       r.state,
      amount:      r.amount,
      severity:    (r.amount > 100000 ? "CRITICAL" : r.claims_per_month > 10 ? "HIGH" : "MEDIUM") as "CRITICAL"|"HIGH"|"MEDIUM",
      status:      "OPEN" as const,
      assignedTo:  "Unassigned",
      createdAt:   new Date().toISOString(),
      escalatedAt: null,
      resolvedAt:  null,
      score,
    };
  });

const downloadFraudReport=(data:Row[],agentName:string)=>{
  const headers="Case ID,Beneficiary ID,Name,Phone,State,Scheme,Claims/Month,Amount (₹),Account Age (days),Location Cluster,Risk Score,Flag Reasons";
  const rows=data.map((r,i)=>{
    const reasons=[r.claims_per_month>6?"High Claims":"",r.amount>40000?"High Amount":"",r.account_age_days<30?"New Account":"",r.location_cluster<=2?"Suspicious Location":""].filter(Boolean).join(" | ");
    const score=Math.min(100,Math.round((r.claims_per_month>6?25:0)+(r.amount>40000?25:0)+(r.account_age_days<30?25:0)+(r.location_cluster<=2?25:0)));
    return `GOV-${9000+i},${r.beneficiary_id},"${r.name}",${r.phone},${r.state},"${r.scheme}",${r.claims_per_month},${r.amount},${r.account_age_days},${r.location_cluster},${score}%,"${reasons}"`;
  });
  const csv=[headers,...rows].join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`FraudGuard_Report_${agentName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

// ─────────────────────────────────────────────
//  SKELETON LOADER (Feature 3)
// ─────────────────────────────────────────────
const Skeleton=({w="100%",h=16,r=4}:{w?:string|number;h?:number;r?:number})=>(
  <div style={{width:w,height:h,borderRadius:r,background:"linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
);
const SkeletonCard=()=>(
  <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:20}}>
    <Skeleton w={120} h={10} /><div style={{height:8}}/>
    <Skeleton w={80} h={28} r={4}/><div style={{height:8}}/>
    <Skeleton w={160} h={10}/>
  </div>
);

// ─────────────────────────────────────────────
//  INDIA HEATMAP (Feature 6)
// ─────────────────────────────────────────────
const IndiaHeatmap=({data,accent}:{data:Row[];accent:string})=>{
  const stateCounts:Record<string,number>={};
  data.forEach(r=>{stateCounts[r.state]=(stateCounts[r.state]||0)+1;});
  const max=Math.max(1,...Object.values(stateCounts));
  return(
    <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}>
      <div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:14,marginBottom:4}}>🗺️ State-wise Fraud Heatmap</div>
      <div style={{color:"#666",fontSize:11,marginBottom:16}}>Darker = more fraud cases detected in that state</div>
      <div style={{display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
        <svg viewBox="0 0 500 450" style={{width:"100%",maxWidth:420,background:"#0a0a0a",borderRadius:8,border:"1px solid #1e1e1e"}}>
          {Object.entries(STATE_DATA).map(([state,{x,y,label}])=>{
            const count=stateCounts[state]||0;
            const intensity=count/max;
            const r2=Math.max(14,14+intensity*18);
            const opacity=0.2+intensity*0.8;
            return(
              <g key={state}>
                <circle cx={x} cy={y} r={r2} fill={accent} opacity={opacity} style={{transition:"all 0.5s"}}/>
                <circle cx={x} cy={y} r={r2} fill="none" stroke={accent} strokeWidth={0.5} opacity={0.4}/>
                <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={7} fontFamily="monospace" opacity={0.9}>{label}</text>
                {count>0&&<text x={x} y={y+10} textAnchor="middle" fill={accent} fontSize={6} fontFamily="monospace" fontWeight="bold">{count}</text>}
              </g>
            );
          })}
          <text x={250} y={435} textAnchor="middle" fill="#333" fontSize={8} fontFamily="monospace">INDIA — FRAUD DISTRIBUTION MAP</text>
        </svg>
        <div style={{flex:1,minWidth:160}}>
          <div style={{color:"#888",fontSize:10,fontFamily:"monospace",marginBottom:10}}>TOP FRAUD STATES</div>
          {Object.entries(stateCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([state,count])=>(
            <div key={state} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--fg-text,#fff)",marginBottom:3}}>
                <span>{state}</span><span style={{color:accent,fontWeight:700}}>{count}</span>
              </div>
              <div style={{height:4,background:"#1a1a1a",borderRadius:2}}>
                <div style={{height:"100%",width:`${(count/max)*100}%`,background:accent,borderRadius:2,transition:"width 0.5s"}}/>
              </div>
            </div>
          ))}
          {!Object.keys(stateCounts).length&&<div style={{color:"#555",fontSize:11}}>Upload CSV to see state distribution</div>}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  FRAUD TREND CHART (Feature 7)
// ─────────────────────────────────────────────
const FraudTrendChart=({accent}:{accent:string})=>{
  const weeklyData=[
    {week:"Week 1",cases:42,amount:18},{week:"Week 2",cases:58,amount:24},
    {week:"Week 3",cases:51,amount:21},{week:"Week 4",cases:73,amount:31},
    {week:"Week 5",cases:68,amount:28},{week:"Week 6",cases:89,amount:38},
    {week:"Week 7",cases:94,amount:42},{week:"Week 8",cases:76,amount:33},
  ];
  return(
    <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}>
      <div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:14,marginBottom:4}}>📈 Fraud Detection Trend</div>
      <div style={{color:"#666",fontSize:11,marginBottom:16}}>Weekly fraud cases vs amount recovered (last 8 weeks)</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={weeklyData}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accent} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={accent} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e"/>
          <XAxis dataKey="week" tick={{fill:"#555",fontSize:9}}/>
          <YAxis tick={{fill:"#555",fontSize:9}}/>
          <Tooltip contentStyle={{background:"#111",border:`1px solid ${accent}`,borderRadius:6,fontSize:11}}/>
          <Area type="monotone" dataKey="cases" stroke={accent} fill="url(#trendGrad)" strokeWidth={2} name="Cases"/>
          <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} dot={false} name="Amount (L)"/>
          <Legend wrapperStyle={{fontSize:10}}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─────────────────────────────────────────────
//  TOP SCHEMES LEADERBOARD (Feature 8)
// ─────────────────────────────────────────────
const SchemeLeaderboard=({data,accent}:{data:Row[];accent:string})=>{
  const schemeCounts:Record<string,{count:number;amount:number}>={};
  data.forEach(r=>{
    if(!schemeCounts[r.scheme])schemeCounts[r.scheme]={count:0,amount:0};
    schemeCounts[r.scheme].count++;
    schemeCounts[r.scheme].amount+=r.amount;
  });
  const sorted=Object.entries(schemeCounts).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣"];
  return(
    <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}>
      <div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:14,marginBottom:4}}>🏆 Top Fraud Schemes</div>
      <div style={{color:"#666",fontSize:11,marginBottom:16}}>Ranked by number of flagged cases</div>
      {sorted.length===0&&<div style={{color:"#555",fontSize:12,padding:"20px 0",textAlign:"center"}}>Upload CSV to see scheme rankings</div>}
      {sorted.map(([scheme,{count,amount}],i)=>(
        <div key={scheme} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1a1a1a"}}>
          <span style={{fontSize:18,minWidth:28}}>{medals[i]}</span>
          <div style={{flex:1}}>
            <div style={{color:"var(--fg-text,#fff)",fontSize:12,fontWeight:600}}>{scheme}</div>
            <div style={{color:"#555",fontSize:10,marginTop:2}}>₹{(amount/100000).toFixed(1)}L total flagged</div>
          </div>
          <span style={{background:accent+"22",color:accent,borderRadius:20,padding:"2px 10px",fontSize:11,fontFamily:"monospace",fontWeight:700}}>{count} cases</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  RISK SCORE BAR (Feature 9 & 24)
// ─────────────────────────────────────────────
const RiskScoreBar=({row}:{row:Row})=>{
  const vectors=[row.claims_per_month>6,row.amount>40000,row.account_age_days<30,row.location_cluster<=2];
  const score=vectors.filter(Boolean).length;
  const pct=score*25;
  const color=score>=3?"#cc0000":score===2?"#f59e0b":"#22c55e";
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,background:"#1a1a1a",borderRadius:3}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3,transition:"width 0.4s"}}/>
      </div>
      <span style={{color,fontSize:10,fontFamily:"monospace",fontWeight:700,minWidth:36}}>{pct}%</span>
      <span style={{color:"#555",fontSize:10}}>{score}/4</span>
    </div>
  );
};

// ─────────────────────────────────────────────
//  MULTI-TYPE CHART
// ─────────────────────────────────────────────
const MultiChart=({data,graphType,accent}:{data:Row[];graphType:string;accent:string})=>{
  const chartData=data.slice(0,20).map(r=>({name:r.scheme.slice(0,8),amount:Math.round(r.amount/1000),claims:r.claims_per_month,age:r.account_age_days,cluster:r.location_cluster}));
  if(!chartData.length)return<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontSize:12}}>Upload CSV to see chart data</div>;
  const COLORS=[accent,"#22c55e","#f59e0b","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#84cc16"];
  const tt={contentStyle:{background:"#111",border:`1px solid ${accent}`,borderRadius:6,fontSize:11}};
  if(graphType==="bar")return(<ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><YAxis tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt}/><Bar dataKey="amount" fill={accent} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>);
  if(graphType==="line")return(<ResponsiveContainer width="100%" height={220}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><YAxis tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt}/><Line type="monotone" dataKey="amount" stroke={accent} strokeWidth={2} dot={{fill:accent,r:3}}/><Line type="monotone" dataKey="claims" stroke="#22c55e" strokeWidth={2} dot={{fill:"#22c55e",r:3}}/></LineChart></ResponsiveContainer>);
  if(graphType==="area")return(<ResponsiveContainer width="100%" height={220}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><YAxis tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt}/><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={accent} stopOpacity={0.4}/><stop offset="95%" stopColor={accent} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="amount" stroke={accent} fill="url(#ga)" strokeWidth={2}/></AreaChart></ResponsiveContainer>);
  if(graphType==="pie"||graphType==="donut"){const pd=Object.entries(data.reduce((a,r)=>{a[r.scheme]=(a[r.scheme]||0)+r.amount;return a;},{} as Record<string,number>)).map(([n,v])=>({name:n.slice(0,10),value:v}));return(<ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={graphType==="donut"?50:0} outerRadius={80} dataKey="value" label={({name})=>name}>{pd.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip {...tt}/><Legend wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer>);}
  if(graphType==="radar")return(<ResponsiveContainer width="100%" height={220}><RadarChart data={chartData.slice(0,8)}><PolarGrid stroke="#333"/><PolarAngleAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><Radar name="Amount" dataKey="amount" stroke={accent} fill={accent} fillOpacity={0.3}/><Radar name="Claims" dataKey="claims" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2}/><Legend wrapperStyle={{fontSize:10}}/></RadarChart></ResponsiveContainer>);
  if(graphType==="scatter"||graphType==="bubble")return(<ResponsiveContainer width="100%" height={220}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="claims" name="Claims" tick={{fill:"#666",fontSize:9}}/><YAxis dataKey="amount" name="Amount" tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt} cursor={{strokeDasharray:"3 3"}}/><Scatter data={chartData} fill={accent} opacity={0.8}/></ScatterChart></ResponsiveContainer>);
  if(graphType==="stacked")return(<ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><YAxis tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt}/><Bar dataKey="amount" stackId="a" fill={accent}/><Bar dataKey="claims" stackId="a" fill="#22c55e" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>);
  if(graphType==="horizontal")return(<ResponsiveContainer width="100%" height={220}><BarChart layout="vertical" data={chartData.slice(0,10)}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis type="number" tick={{fill:"#666",fontSize:9}}/><YAxis dataKey="name" type="category" tick={{fill:"#666",fontSize:9}} width={60}/><Tooltip {...tt}/><Bar dataKey="amount" fill={accent} radius={[0,3,3,0]}/></BarChart></ResponsiveContainer>);
  if(graphType==="stepped")return(<ResponsiveContainer width="100%" height={220}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#222"/><XAxis dataKey="name" tick={{fill:"#666",fontSize:9}}/><YAxis tick={{fill:"#666",fontSize:9}}/><Tooltip {...tt}/><Line type="stepAfter" dataKey="amount" stroke={accent} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>);
  if(graphType==="funnel"){const fd=[{name:"Total Records",value:data.length,fill:"#555"},{name:"High Claims",value:data.filter(r=>r.claims_per_month>6).length,fill:"#d69e2e"},{name:"High Amount",value:data.filter(r=>r.amount>40000).length,fill:"#dd6b20"},{name:"New Accounts",value:data.filter(r=>r.account_age_days<30).length,fill:"#cc0000"},{name:"Multi-vector",value:data.filter(r=>r.claims_per_month>6&&r.amount>40000).length,fill:"#7c3aed"}];return(<div style={{padding:"0 16px"}}>{fd.map(d=>(<div key={d.name} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}><span>{d.name}</span><span style={{color:d.fill,fontWeight:700}}>{d.value}</span></div><div style={{height:20,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(4,(d.value/Math.max(data.length,1))*100)}%`,background:d.fill,borderRadius:3,transition:"width 0.5s"}}/></div></div>))}</div>);}
  return null;
};

const ChartSection=({data,fileUploaded,accent}:{data:Row[];fileUploaded:boolean;accent:string})=>{
  const[graphType,setGraphType]=useState("bar");
  const[showPicker,setShowPicker]=useState(false);
  const sel=GRAPH_TYPES.find(g=>g.id===graphType)||GRAPH_TYPES[0];
  return(
    <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:14}}>📊 Fraud Analytics</div><div style={{color:"#666",fontSize:11,marginTop:2}}>{fileUploaded?`${data.length} flagged cases`:"Upload CSV to see live data"}</div></div>
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowPicker(p=>!p)} style={{background:"transparent",border:"1px solid var(--fg-accent,#cc0000)",color:"var(--fg-accent,#cc0000)",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:6}}>{sel.icon} {sel.label} ▾</button>
          {showPicker&&(<div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:10,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",padding:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,minWidth:260}}>
            {GRAPH_TYPES.map(g=>(<button key={g.id} onClick={()=>{setGraphType(g.id);setShowPicker(false);}} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:graphType===g.id?"var(--fg-accent,#cc0000)22":"transparent",border:`1px solid ${graphType===g.id?"var(--fg-accent,#cc0000)":"transparent"}`,borderRadius:6,cursor:"pointer",color:"var(--fg-text,#fff)",fontSize:11}}><span>{g.icon}</span>{g.label}</button>))}
          </div>)}
        </div>
      </div>
      <MultiChart data={data} graphType={graphType} accent={accent}/>
    </div>
  );
};

// ─────────────────────────────────────────────
//  ANIMATED METRIC CARDS (Feature 1 integrated)
// ─────────────────────────────────────────────
const AnimatedMetricCards=({flaggedCount,totalSavings,activeCases,escalatedCases}:{flaggedCount:number;totalSavings:string;activeCases:number;escalatedCases:number})=>{
  const animFlagged=useAnimatedCounter(flaggedCount);
  const animActive=useAnimatedCounter(activeCases);
  const animEscalated=useAnimatedCounter(escalatedCases);
  const metrics=[
    {icon:"🛡️",label:"FLAGGED ANOMALIES",value:animFlagged.toString(),valueColor:"var(--fg-accent,#cc0000)",sub:"Last 24 hours",badge:"+12.3%",badgeColor:"var(--fg-accent,#cc0000)"},
    {icon:"💰",label:"TOTAL SAVINGS",value:totalSavings,valueColor:"#22c55e",sub:"YTD Recovery",badge:"+0.2%",badgeColor:"#22c55e"},
    {icon:"📁",label:"ACTIVE CASES",value:animActive.toString(),valueColor:"var(--fg-text,#fff)",sub:"Under Investigation"},
    {icon:"⚡",label:"ESCALATED CASES",value:animEscalated.toString(),valueColor:"var(--fg-accent,#cc0000)",sub:"Higher Authority Queue"},
  ];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
      {metrics.map((m)=>(
        <div key={m.label} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20,transition:"transform 0.2s,box-shadow 0.2s",cursor:"default"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(0,0,0,0.4)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(0)";(e.currentTarget as HTMLDivElement).style.boxShadow="none";}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:22}}>{m.icon}</span>
            {m.badge&&<span style={{fontSize:10,fontFamily:"monospace",color:m.badgeColor}}>↑ {m.badge}</span>}
          </div>
          <div style={{fontSize:10,fontFamily:"monospace",letterSpacing:1,color:"#666",marginBottom:6}}>{m.label}</div>
          <div style={{fontSize:28,fontWeight:800,color:m.valueColor,fontFamily:"monospace",letterSpacing:-1}}>{m.value}</div>
          <div style={{fontSize:10,color:"#555",marginTop:4}}>{m.sub}</div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  SESSION TIMEOUT WARNING (Feature 17)
// ─────────────────────────────────────────────
const SessionTimeout=({onLogout,accent}:{onLogout:()=>void;accent:string})=>{
  const[countdown,setCountdown]=useState<number|null>(null);
  const[show,setShow]=useState(false);
  const timerRef=useRef<any>(null);
  const countRef=useRef<any>(null);
  const IDLE_MS=15*60*1000, WARN_S=60;

  const reset=useCallback(()=>{
    clearTimeout(timerRef.current);clearInterval(countRef.current);
    setShow(false);setCountdown(null);
    timerRef.current=setTimeout(()=>{
      setShow(true);setCountdown(WARN_S);
      countRef.current=setInterval(()=>{
        setCountdown(p=>{
          if(p===null||p<=1){clearInterval(countRef.current);onLogout();return null;}
          return p-1;
        });
      },1000);
    },IDLE_MS);
  },[onLogout]);

  useEffect(()=>{
    const events=["mousemove","keydown","click","scroll"];
    events.forEach(e=>document.addEventListener(e,reset));
    reset();
    return()=>{events.forEach(e=>document.removeEventListener(e,reset));clearTimeout(timerRef.current);clearInterval(countRef.current);};
  },[reset]);

  if(!show)return null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#111",border:`1px solid ${accent}`,borderRadius:12,padding:32,width:360,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>⏱️</div>
        <div style={{color:"#fff",fontSize:16,fontWeight:700,marginBottom:8}}>Session Expiring Soon</div>
        <div style={{color:"#888",fontSize:13,marginBottom:20}}>You'll be logged out in <span style={{color:accent,fontWeight:700,fontSize:18}}>{countdown}s</span> due to inactivity.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={reset} style={{background:accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:13,fontWeight:600}}>Stay Logged In</button>
          <button onClick={onLogout} style={{background:"transparent",color:"#888",border:"1px solid #333",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:13}}>Logout Now</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  KEYBOARD SHORTCUTS (Feature 12)
// ─────────────────────────────────────────────
const KeyboardShortcuts=({onNavigate,onRefresh,show,setShow}:{onNavigate:(p:string)=>void;onRefresh:()=>void;show:boolean;setShow:(v:boolean)=>void})=>{
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
      if(e.key==="?"){setShow(true);}
      if(e.key==="Escape"){setShow(false);}
      if(e.key==="r"||e.key==="R"){onRefresh();}
      if(e.key==="1")onNavigate("overview");
      if(e.key==="2")onNavigate("alerts");
      if(e.key==="3")onNavigate("accounts");
      if(e.key==="4")onNavigate("analytics");
    };
    document.addEventListener("keydown",h);
    return()=>document.removeEventListener("keydown",h);
  },[onNavigate,onRefresh,setShow]);

  if(!show)return null;
  const shortcuts=[["?","Show this panel"],["Esc","Close panel"],["R","Refresh page"],["1","Go to Overview"],["2","Go to Alerts"],["3","Go to Accounts"],["4","Go to Analytics"]];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShow(false)}>
      <div style={{background:"#111",border:"1px solid #333",borderRadius:12,padding:28,width:360}} onClick={e=>e.stopPropagation()}>
        <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <span>⌨️ Keyboard Shortcuts</span>
          <span style={{color:"#555",cursor:"pointer"}} onClick={()=>setShow(false)}>✕</span>
        </div>
        {shortcuts.map(([key,desc])=>(
          <div key={key} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1a1a1a"}}>
            <span style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:4,padding:"2px 10px",fontFamily:"monospace",fontSize:12,color:"var(--fg-accent,#cc0000)"}}>{key}</span>
            <span style={{color:"#888",fontSize:12}}>{desc}</span>
          </div>
        ))}
        <div style={{color:"#555",fontSize:10,marginTop:12,textAlign:"center",fontFamily:"monospace"}}>Press Esc or click outside to close</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  FONT SIZE ACCESSIBILITY (Feature 21)
// ─────────────────────────────────────────────
const FontSizeToggle=({accent}:{accent:string})=>{
  const[size,setSize]=useState(()=>Number(localStorage.getItem("fraudguard_fontsize")||1));
  const sizes=[{label:"A",val:1},{label:"A+",val:1.1},{label:"A++",val:1.2}];
  useEffect(()=>{
    document.documentElement.style.fontSize=`${size*16}px`;
    localStorage.setItem("fraudguard_fontsize",String(size));
  },[size]);
  return(
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      {sizes.map(s=>(
        <button key={s.val} onClick={()=>setSize(s.val)}
          style={{background:size===s.val?accent+"22":"transparent",border:`1px solid ${size===s.val?accent:"#333"}`,borderRadius:4,padding:"3px 8px",cursor:"pointer",color:size===s.val?accent:"#555",fontSize:s.val===1?10:s.val===1.1?11:13,fontWeight:700,transition:"all .2s"}}>
          {s.label}
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  NATURAL LANGUAGE SEARCH (Feature 23)
// ─────────────────────────────────────────────
const parseNaturalSearch=(q:string,cases:FraudCase[],flaggedData:Row[])=>{
  const ql=q.toLowerCase();
  let filtered=[...cases];
  if(ql.includes("critical"))filtered=filtered.filter(c=>c.severity==="CRITICAL");
  else if(ql.includes("high"))filtered=filtered.filter(c=>c.severity==="HIGH");
  else if(ql.includes("medium"))filtered=filtered.filter(c=>c.severity==="MEDIUM");
  if(ql.includes("escalated"))filtered=filtered.filter(c=>c.status==="ESCALATED");
  if(ql.includes("open"))filtered=filtered.filter(c=>c.status==="OPEN");
  const states=["bihar","up","jharkhand","maharashtra","rajasthan","mp","karnataka","gujarat","haryana","west bengal"];
  states.forEach(s=>{if(ql.includes(s))filtered=filtered.filter(c=>c.state.toLowerCase().includes(s));});
  return filtered;
};

// ─────────────────────────────────────────────
//  ALERTS PAGE (Feature — real + static alerts)
// ─────────────────────────────────────────────
const AlertsPage=({cases,onNavigateToCase}:{cases:FraudCase[];onNavigateToCase:()=>void})=>{
  const escalated=cases.filter(c=>c.status==="ESCALATED");
  const staticAlerts=[
    {id:"GOV-9921",msg:"Critical fraud in MGNREGS Jharkhand — 312 ghost workers",time:"2 min ago",sev:"CRITICAL"},
    {id:"GOV-7703",msg:"Fake Ayushman Bharat claims detected in Bihar",time:"5 min ago",sev:"CRITICAL"},
    {id:"GOV-8847",msg:"Duplicate IDs found in PM-KISAN UP",time:"12 min ago",sev:"HIGH"},
    {id:"GOV-4401",msg:"Shell entities flagged in PMEGP Maharashtra",time:"18 min ago",sev:"HIGH"},
    {id:"GOV-6612",msg:"Address fraud detected in PMAY Rajasthan",time:"25 min ago",sev:"MEDIUM"},
  ];
  return(
    <div style={{padding:24}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:16}}>🔴 Live Alerts</h2>
      <p style={{color:"#555",fontSize:12,marginBottom:20}}>
        {escalated.length>0
          ?`${escalated.length} escalated case${escalated.length>1?"s":""} from uploaded data + system alerts`
          :"System alerts — upload CSV to see real escalated cases here"}
      </p>
      {escalated.length>0&&(
        <>
          <div style={{color:"#cc0000",fontSize:10,fontFamily:"monospace",letterSpacing:1,marginBottom:10}}>⚡ FROM YOUR UPLOADED DATA</div>
          {escalated.map(c=>(
            <div key={c.id} onClick={onNavigateToCase}
              style={{background:"rgba(204,0,0,0.06)",border:"1px solid #cc000033",borderLeft:"3px solid #cc0000",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",transition:"background 0.2s"}}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background="rgba(204,0,0,0.12)"}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background="rgba(204,0,0,0.06)"}>
              <div>
                <span style={{color:"#cc0000",fontFamily:"monospace",fontSize:12,marginRight:12,fontWeight:700}}>{c.id}</span>
                <span style={{color:"#e0e0e0",fontSize:13}}>{c.scheme} — {c.state}</span>
                <div style={{color:"#555",fontSize:10,marginTop:4,fontFamily:"monospace"}}>₹{(c.amount/100000).toFixed(1)}L · Escalated · Click to view in Overview →</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:"#888",fontSize:10}}>Just now</span>
                <span style={{background:"#cc0000",color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>ESCALATED</span>
              </div>
            </div>
          ))}
          <div style={{height:1,background:"#1e1e1e",margin:"16px 0"}}/>
        </>
      )}
      <div style={{color:"#555",fontSize:10,fontFamily:"monospace",letterSpacing:1,marginBottom:10}}>📡 SYSTEM INTELLIGENCE FEED</div>
      {staticAlerts.map(a=>(
        <div key={a.id} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <span style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace",fontSize:12,marginRight:12}}>{a.id}</span>
            <span style={{color:"var(--fg-text,#ccc)",fontSize:13}}>{a.msg}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:"#555",fontSize:11}}>{a.time}</span>
            <span style={{background:a.sev==="CRITICAL"?"#cc0000":a.sev==="HIGH"?"#dd6b20":"#d69e2e",color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>{a.sev}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  ACCOUNTS PAGE
// ─────────────────────────────────────────────
const AccountsPage=()=>(
  <div style={{padding:24}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>👥 Monitored Accounts</h2>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr style={{borderBottom:"1px solid var(--fg-border,#1e1e1e)",color:"#666"}}>{["Beneficiary ID","Name","Phone","State","Schemes","Risk Score"].map(h=>(<th key={h} style={{textAlign:"left",padding:"10px 14px",fontFamily:"monospace",fontSize:10}}>{h}</th>))}</tr></thead>
      <tbody>{[["BEN0021","Rahul Kumar","9812345678","Bihar","MGNREGS","92%"],["BEN0047","Amit Sharma","9812345678","Jharkhand","PMAY","88%"],["BEN0093","Meena Kumari","9812345678","Maharashtra","Mid-Day Meal","95%"],["BEN0112","Kavita Verma","9867890123","UP","PM-KISAN","76%"],["BEN0134","Anita Roy","9889012345","Rajasthan","Ayushman Bharat","81%"]].map(([id,n,p,s,sc,r])=>(<tr key={id} style={{borderBottom:"1px solid var(--fg-border,#161616)"}}><td style={{padding:"10px 14px",color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>{id}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#fff)"}}>{n}</td><td style={{padding:"10px 14px",color:"#888"}}>{p}</td><td style={{padding:"10px 14px",color:"#888"}}>{s}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#ccc)"}}>{sc}</td><td style={{padding:"10px 14px"}}><span style={{color:"var(--fg-accent,#cc0000)",fontWeight:700}}>{r}</span></td></tr>))}</tbody>
    </table>
  </div>
);

// ─────────────────────────────────────────────
//  ANALYTICS PAGE
// ─────────────────────────────────────────────
const AnalyticsPage=()=>(
  <div style={{padding:24}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>📊 Analytics Summary</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
      {[{label:"Total Records Scanned",value:"2.4M",color:"var(--fg-text,#fff)"},{label:"Fraud Detection Rate",value:"15.2%",color:"var(--fg-accent,#cc0000)"},{label:"Amount Recovered",value:"₹95.8L",color:"#22c55e"},{label:"Active Investigations",value:"75",color:"#d69e2e"},{label:"Resolved Cases",value:"1,102",color:"#22c55e"},{label:"States Covered",value:"6",color:"var(--fg-text,#fff)"}].map(({label,value,color})=>(<div key={label} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:20}}><div style={{color:"#666",fontSize:11,fontFamily:"monospace",marginBottom:8}}>{label}</div><div style={{color,fontSize:28,fontWeight:700}}>{value}</div></div>))}
    </div>
    <h2 style={{color:"var(--fg-text,#fff)",marginTop:32,marginBottom:16,fontSize:16}}>🔍 Fraud Detection Methods</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
      {FRAUD_METHODS.map(m=>(<div key={m.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:16}}><div style={{fontSize:22,marginBottom:8}}>{m.icon}</div><div style={{color:"var(--fg-accent,#cc0000)",fontSize:12,fontWeight:600,marginBottom:6}}>{m.title}</div><div style={{color:"#666",fontSize:11,lineHeight:1.5}}>{m.desc}</div></div>))}
    </div>
  </div>
);

// ─────────────────────────────────────────────
//  HELP PAGE
// ─────────────────────────────────────────────
const HelpPage=()=>(
  <div style={{padding:24,maxWidth:800}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>❓ Help & Fraud Prevention Guide</h2>
    <p style={{color:"#666",fontSize:12,marginBottom:24}}>How to protect yourself and beneficiaries from fraud.</p>
    {[{icon:"🔒",title:"Never Share Your OTP",body:"Government schemes never ask for OTP over phone. Hang up and report to 1930."},{icon:"🪪",title:"Protect Your Aadhaar",body:"Never share your Aadhaar number or biometric data with unknown persons."},{icon:"📱",title:"Use Official Apps Only",body:"Download government scheme apps only from official Play Store / App Store."},{icon:"🏦",title:"Check Your Bank Account",body:"Enable SMS alerts for every transaction. Report fraud within 3 days."},{icon:"🌐",title:"Verify Website URLs",body:"Government portals use .gov.in domains. Fraudulent sites use .com or .net."},{icon:"📞",title:"Cyber Crime Helpline",body:"National Cyber Crime Helpline: 1930. Report at cybercrime.gov.in."},{icon:"📊",title:"12 Graph Types",body:"After uploading CSV, click the chart type button (top right of chart) to switch between Bar, Line, Area, Pie, Donut, Radar, Scatter, Stacked Bar, Horizontal, Stepped, Bubble, and Funnel charts."},{icon:"📥",title:"Download Fraud Report",body:"After scanning, click '⬇ Download Fraud Report' for a full CSV with case IDs, risk scores and flag reasons."},{icon:"📧",title:"Email Alert Button",body:"Click '📧 Send Email Alert' after scanning to manually send an alert. You are in full control — no auto-emails."},{icon:"⌨️",title:"Keyboard Shortcuts",body:"Press ? to see all keyboard shortcuts. Press R to refresh, 1-4 to navigate pages instantly."},{icon:"🗺️",title:"India Heatmap",body:"The state-wise heatmap shows which states have the most fraud cases. Bubble size and color intensity indicate fraud volume."},{icon:"🏆",title:"Scheme Leaderboard",body:"Shows top 5 government schemes with most fraud cases ranked by case count."}].map(item=>(
      <div key={item.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:10,padding:"16px 20px",marginBottom:12,display:"flex",gap:16,alignItems:"flex-start"}}>
        <div style={{fontSize:28,flexShrink:0,marginTop:2}}>{item.icon}</div>
        <div><div style={{color:"var(--fg-text,#fff)",fontSize:14,fontWeight:600,marginBottom:6}}>{item.title}</div><div style={{color:"#777",fontSize:12,lineHeight:1.7}}>{item.body}</div></div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
//  FAQ PAGE
// ─────────────────────────────────────────────
const FAQPage=()=>{
  const[open,setOpen]=useState<number|null>(null);
  const faqs=[{q:"What is FraudGuard?",a:"FraudGuard is an AI-powered government fraud detection system scanning beneficiary data across 9 fraud vectors in real time."},{q:"How does the ML model work?",a:"It flags: claims_per_month > 6, amount > ₹40,000, account age < 30 days, or location cluster ≤ 2."},{q:"How do I upload data?",a:"Overview → Upload Beneficiary Data. Required columns: beneficiary_id, name, phone, state, scheme, claims_per_month, amount, location_cluster, account_age_days."},{q:"How do email alerts work?",a:"Emails are NOT auto-sent. After scanning, click '📧 Send Email Alert' to control when to send."},{q:"How do I download the fraud report?",a:"After scanning, click '⬇ Download Fraud Report'. CSV includes Case ID, risk score (0-100%) and exact flag reasons."},{q:"How does login protection work?",a:"After 3 failed sign-in attempts, the login is locked for 30 seconds. This prevents brute force attacks."},{q:"What is the session timeout?",a:"After 15 minutes of inactivity, a 60-second countdown appears. You can click 'Stay Logged In' or it auto-logs you out."},{q:"What do keyboard shortcuts do?",a:"Press ? to see all shortcuts. R refreshes, 1-4 navigate pages, Esc closes popups."},{q:"Can I see last login info?",a:"Yes! Your last login time appears in the profile dropdown in the header."},{q:"What are the 12 graph types?",a:"Bar, Line, Area, Pie, Donut, Radar, Scatter, Stacked Bar, Horizontal Bar, Stepped Line, Bubble, and Funnel."}];
  return(
    <div style={{padding:24,maxWidth:740}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📌 FAQ</h2>
      <p style={{color:"#666",fontSize:12,marginBottom:24}}>Common questions about FraudGuard.</p>
      {faqs.map((f,i)=>(
        <div key={i} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,marginBottom:10,overflow:"hidden"}}>
          <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{color:"var(--fg-text,#fff)",fontSize:13,fontWeight:600}}>{f.q}</span>
            <span style={{color:"var(--fg-accent,#cc0000)",fontSize:18,lineHeight:1}}>{open===i?"−":"+"}</span>
          </button>
          {open===i&&<div style={{padding:"0 18px 14px",color:"#777",fontSize:12,lineHeight:1.7,borderTop:"1px solid var(--fg-border,#1e1e1e)"}}><div style={{paddingTop:12}}>{f.a}</div></div>}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  TERMS PAGE
// ─────────────────────────────────────────────
const TermsPage=()=>(
  <div style={{padding:24,maxWidth:740}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📄 Terms & Conditions</h2>
    <p style={{color:"#666",fontSize:12,marginBottom:24}}>Last updated: April 2026</p>
    {[{title:"1. Authorized Use Only",body:"FraudGuard is an internal government tool. Unauthorized access violates IT Act 2000, Section 66."},{title:"2. Data Confidentiality",body:"All beneficiary data is classified RESTRICTED. Do not share or transmit to unauthorized parties."},{title:"3. Accuracy Disclaimer",body:"The fraud detection model provides probabilistic outputs. Flagged records require manual review."},{title:"4. Email Alerts",body:"By registering, you consent to receive alerts. You can disable in Settings or trigger manually."},{title:"5. Session Security",body:"Each session is logged. Logout after each session on shared systems. Idle timeout is 15 minutes."},{title:"6. Data Retention",body:"No beneficiary data stored on external servers. CSV data is processed in-browser only."},{title:"7. Reporting Obligations",body:"Confirmed fraud cases must be escalated within 24 hours of detection."}].map(item=>(
      <div key={item.title} style={{marginBottom:20}}>
        <div style={{color:"var(--fg-accent,#cc0000)",fontSize:13,fontWeight:700,marginBottom:6,fontFamily:"monospace"}}>{item.title}</div>
        <div style={{color:"#777",fontSize:12,lineHeight:1.7,background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"12px 16px"}}>{item.body}</div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
//  SETTINGS PAGE
// ─────────────────────────────────────────────
const SettingsPage=({userEmail,agentName,onLogout,theme,setTheme,language,setLanguage}:{userEmail:string;agentName:string;onLogout:()=>void;theme:ThemeName;setTheme:(t:ThemeName)=>void;language:string;setLanguage:(c:string)=>void})=>{
  const[settings,setSettings]=useState({agent_name:agentName,alert_threshold:"0.75",claims_limit:"6",amount_limit:"40,000",email_alerts:true});
  const[saved,setSaved]=useState(false);
  const acc=THEMES[theme].accent;
  const saveSettings=()=>{localStorage.setItem("fraudguard_settings",JSON.stringify(settings));localStorage.setItem("fraudguard_name",settings.agent_name);setSaved(true);toast("Settings saved!","success");setTimeout(()=>setSaved(false),2000);};
  return(
    <div style={{padding:24,maxWidth:580}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:24,fontSize:16}}>⚙️ Settings</h2>
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>🔤 Accessibility — Font Size</div>
        <div style={{color:"#555",fontSize:11,marginBottom:10}}>Adjust text size for better readability</div>
        <FontSizeToggle accent={acc}/>
      </div>
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>Dashboard Theme</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
          {(Object.entries(THEMES) as [ThemeName,typeof THEMES[ThemeName]][]).map(([key,val])=>(<button key={key} onClick={()=>{setTheme(key);applyTheme(key);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:theme===key?"var(--fg-accent,#cc0000)22":"transparent",border:`1px solid ${theme===key?"var(--fg-accent,#cc0000)":"#333"}`,borderRadius:6,cursor:"pointer",color:theme===key?"var(--fg-accent,#cc0000)":"#888",fontSize:11,fontFamily:"monospace",transition:"all .2s"}}>{val.icon} {val.label}</button>))}
        </div>
      </div>
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>🌐 Language</div>
        <div style={{color:"#555",fontSize:11,marginBottom:10}}>Dashboard display language (15 available)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {LANGUAGES.map(lang=>(<button key={lang.code} onClick={()=>{setLanguage(lang.code);localStorage.setItem("fraudguard_lang",lang.code);}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:language===lang.code?"var(--fg-accent,#cc0000)22":"transparent",border:`1px solid ${language===lang.code?"var(--fg-accent,#cc0000)":"#333"}`,borderRadius:6,cursor:"pointer",color:language===lang.code?"var(--fg-accent,#cc0000)":"#888",fontSize:11}}>{lang.flag} {lang.label}</button>))}
        </div>
      </div>
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>Email Alerts</div>
        <div style={{color:"#555",fontSize:11,marginBottom:12}}>Registered email: <span style={{color:"var(--fg-accent,#cc0000)"}}>{userEmail}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"#888",fontSize:12}}>Send fraud alerts to email</span><button onClick={()=>setSettings(s=>({...s,email_alerts:!s.email_alerts}))} style={{background:settings.email_alerts?"#22c55e":"#333",border:"none",borderRadius:20,padding:"4px 16px",color:"#fff",cursor:"pointer",fontSize:12,transition:"background .2s"}}>{settings.email_alerts?"ON":"OFF"}</button></div>
      </div>
      {[{key:"agent_name",label:"Agent Name",desc:"Your display name"},{key:"alert_threshold",label:"Alert Threshold",desc:"Min fraud score (0–1)"},{key:"claims_limit",label:"Claims Limit",desc:"Max claims/month before flagging"},{key:"amount_limit",label:"Amount Limit (₹)",desc:"Max amount before flagging"}].map(({key,label,desc})=>(<div key={key} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"var(--fg-text,#fff)",fontSize:13}}>{label}</div><div style={{color:"#555",fontSize:11,marginTop:2}}>{desc}</div></div><input value={settings[key as keyof typeof settings] as string} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"var(--fg-accent,#cc0000)",fontFamily:"monospace",fontSize:13,width:120,textAlign:"right",outline:"none"}}/></div>))}
      <div style={{display:"flex",gap:12,marginTop:12}}>
        <button onClick={saveSettings} style={{background:saved?"#22c55e":"var(--fg-accent,#cc0000)",color:"#fff",border:"none",borderRadius:8,padding:"10px 28px",cursor:"pointer",fontSize:13,fontWeight:600,transition:"background 0.3s"}}>{saved?"✅ Saved!":"Save Settings"}</button>
        <button onClick={onLogout} style={{background:"transparent",color:"var(--fg-accent,#cc0000)",border:"1px solid var(--fg-accent,#cc0000)",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:13}}>🚪 Logout</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  NETWORK GRAPH
// ─────────────────────────────────────────────
const NetworkGraph=({data}:{data:Row[]})=>{
  const nodes:{id:string;x:number;y:number}[]=[],edges:{x1:number;y1:number;x2:number;y2:number}[]=[];
  const phoneMap:Record<string,string[]>={};
  data.forEach(r=>{if(!phoneMap[r.phone])phoneMap[r.phone]=[];phoneMap[r.phone].push(r.beneficiary_id);});
  const placed:Record<string,{x:number;y:number}>={};let idx=0;
  Object.values(phoneMap).forEach(group=>{if(group.length>1){const cx=80+(idx%5)*160,cy=80+Math.floor(idx/5)*120;group.forEach((id,i)=>{const a=(i/group.length)*Math.PI*2;placed[id]={x:cx+Math.cos(a)*40,y:cy+Math.sin(a)*40};nodes.push({id,...placed[id]});});for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)edges.push({x1:placed[group[i]].x,y1:placed[group[i]].y,x2:placed[group[j]].x,y2:placed[group[j]].y});idx++;}});
  if(!nodes.length)return null;
  return(
    <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}>
      <div style={{color:"var(--fg-text,#fff)",fontWeight:600,marginBottom:4,fontSize:14}}>🔗 Network Graph — Shared Phone Clusters</div>
      <div style={{color:"#888",fontSize:11,marginBottom:12}}>Red nodes = suspicious accounts sharing the same phone number</div>
      <svg width="100%" height="280" style={{background:"#0a0a0a",borderRadius:8}}>
        {edges.map((e,i)=><line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#cc000044" strokeWidth={1.5}/>)}
        {nodes.map(n=><g key={n.id}><circle cx={n.x} cy={n.y} r={8} fill="var(--fg-accent,#cc0000)" opacity={0.85}/><text x={n.x} y={n.y+20} textAnchor="middle" fill="#888" fontSize={8}>{n.id.slice(0,6)}</text></g>)}
      </svg>
      <div style={{marginTop:10,fontSize:11,color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>{nodes.length} suspicious nodes · {Object.values(phoneMap).filter(g=>g.length>1).length} clusters</div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  UPLOAD SECTION
// ─────────────────────────────────────────────
const UploadSection=({onDataLoaded,flaggedData,agentName,userEmail,fileUploaded}:{onDataLoaded:(d:Row[],f:Row[],r?:any)=>void;flaggedData:any[];agentName:string;userEmail:string;fileUploaded:boolean})=>{
  const[dragging,setDragging]=useState(false);
  const[processing,setProcessing]=useState(false);
  const[fileName,setFileName]=useState("");
  const[alertSent,setAlertSent]=useState(false);
  const[sending,setSending]=useState(false);

  const handleFile=async (file:File)=>{
    setFileName(file.name);
    setProcessing(true);
    try {
      const res = await api.uploadCSV(file);
      onDataLoaded([], [], res);
    } catch (err: any) {
      toast(err.message || "File upload failed", "error");
      setFileName("");
    } finally {
      setProcessing(false);
    }
  };

  const downloadSample=()=>{const csv=["beneficiary_id,name,phone,state,scheme,claims_per_month,amount,location_cluster,account_age_days","BEN001,Rahul Kumar,9812345678,Bihar,MGNREGS,12,95000,2,15","BEN002,Priya Singh,9823456789,UP,PM-KISAN,2,8000,7,450","BEN003,Amit Sharma,9812345678,Jharkhand,PMAY,15,180000,1,8","BEN004,Sunita Devi,9834567890,Rajasthan,Ayushman Bharat,1,6000,9,600","BEN005,Raj Patel,9845678901,MP,PMEGP,3,12000,5,300","BEN006,Meena Kumari,9812345678,Maharashtra,Mid-Day Meal,18,200000,1,5"].join("\n");const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sample_beneficiaries.csv";a.click();toast("Sample CSV downloaded","info");};
  const handleSendAlert=async()=>{if(!flaggedData.length||!userEmail)return;setSending(true);const caseId="GOV-"+Math.floor(Math.random()*9000+1000);await sendFraudAlert(userEmail,flaggedData[0].scheme,`₹${(flaggedData[0].amount/100000).toFixed(1)}L`,flaggedData[0].state,caseId);setSending(false);setAlertSent(true);toast("📧 Alert email sent to "+userEmail,"success");setTimeout(()=>setAlertSent(false),4000);};
  return(
    <div style={{padding:24,background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:15}}>📂 Upload Beneficiary Data</div><div style={{color:"#666",fontSize:11,marginTop:2}}>CSV · Fraud detected across 4 vectors: high claims, high amount, new account, suspicious location</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button onClick={downloadSample} style={{background:"transparent",color:"#22c55e",border:"1px solid #22c55e",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>⬇ Sample CSV</button>
          {fileUploaded&&<>
            <button onClick={()=>{downloadFraudReport(flaggedData,agentName);toast("📊 Fraud report downloaded","success");}} style={{background:"transparent",color:"var(--fg-accent,#cc0000)",border:"1px solid var(--fg-accent,#cc0000)",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>⬇ Download Fraud Report</button>
            <button onClick={handleSendAlert} disabled={sending||alertSent} style={{background:alertSent?"#22c55e":"var(--fg-accent,#cc0000)",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:alertSent?"default":"pointer",fontSize:12,fontWeight:600,opacity:sending?0.7:1}}>{alertSent?"✅ Alert Sent!":sending?"⏳ Sending...":"📧 Send Email Alert"}</button>
          </>}
        </div>
      </div>
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onClick={()=>document.getElementById("csv-input")?.click()} style={{border:`2px dashed ${dragging?"var(--fg-accent,#cc0000)":"#333"}`,borderRadius:8,padding:32,textAlign:"center",cursor:"pointer",background:dragging?"rgba(204,0,0,0.05)":"transparent",transition:"all .2s"}}>
        <input id="csv-input" type="file" accept=".csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
        {processing?<div style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>⏳ Running GPU fraud detection model...</div>:fileName?<div style={{color:"#22c55e",fontWeight:600}}>✅ {fileName} — ready</div>:<div style={{color:"#555"}}>📁 Drag and drop CSV here or click to browse</div>}
      </div>
    </div>
  );
};

// LoginPage is imported from @/components/LoginPage instead of local inline definition


// ─────────────────────────────────────────────
//  ROOT COMPONENT
// ─────────────────────────────────────────────
const Index=()=>{
  const { user, profile, logout, loading: authLoading } = useAuth();
  
  const savedTheme=(localStorage.getItem("fraudguard_theme") as ThemeName)||"dark-red";
  const savedLang=localStorage.getItem("fraudguard_lang")||"en";

  const [loaded,setLoaded]=useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [cases,setCases]=useState<FraudCase[]>([]);
  const [processingIds,setProcessingIds]=useState<string[]>([]);
  const [exitingIds,setExitingIds]=useState<string[]>([]);
  const [fileUploaded,setFileUploaded]=useState(false);
  const [activePage,setActivePage]=useState("overview");
  const [searchQuery,setSearchQuery]=useState("");
  const [showNotifs,setShowNotifs]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  const [theme,setTheme]=useState<ThemeName>(savedTheme);
  const [language,setLanguage]=useState(savedLang);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [showShortcuts,setShowShortcuts]=useState(false);
  const [pageLoading,setPageLoading]=useState(false);

  const agentName = profile?.name || user?.email?.split("@")[0] || "Agent";
  const userEmail = user?.email || "";
  const lastLogin = profile?.created_at || new Date().toISOString();

  // Admin = clearance_level "admin" or "L5", or VITE_DEVELOPER_MODE=true
  const DEVELOPER_PAGES = ["training", "gpu", "copilot_benchmark", "reports", "admin"];
  const isAdmin = profile?.clearance_level === "admin" || profile?.clearance_level === "L5" || import.meta.env.VITE_DEVELOPER_MODE === "true";

  // Guard: if non-admin tries to navigate to a dev page, redirect to overview
  const navigateTo = (page: string) => {
    if (DEVELOPER_PAGES.includes(page) && !isAdmin) {
      return; // silently ignore
    }
    if (page === activePage) return;
    setPageLoading(true);
    setTimeout(() => { setActivePage(page); setPageLoading(false); }, 150);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const casesData = await api.getCases();
      setCases(casesData);
      
      const stats = await api.getAnalytics();
      setAnalytics(stats);
      
      if (casesData.length > 0) {
        setFileUploaded(true);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  useEffect(()=>{applyTheme(savedTheme);},[]);
  const handleComplete=useCallback(()=>setLoaded(true),[]);
  
  const handleLogout=async ()=>{
    await logout();
    setLoaded(false);
  };

  // Feature 4: smooth page transitions (overridden above with RBAC guard)
  // navigateTo is defined with isAdmin check earlier

  const handleDataLoaded=(data:Row[],flagged:Row[], response?: any)=>{
    if (response && response.cases) {
      setCases(response.cases);
      setFileUploaded(true);
      loadDashboardData();
    }
  };

  const handleEscalate=async (id:string)=>{
    setProcessingIds(p=>[...p,id]);
    try {
      await api.updateCaseStatus(id, "ESCALATED");
      setCases(cs=>cs.map(c=>c.id===id?{...c,status:"ESCALATED" as const,escalatedAt:new Date().toISOString()}:c));
      toast(`Case ${id} escalated to senior officer queue`,"warning");
      await loadDashboardData();
    } catch (err) {
      toast(`Failed to escalate case ${id}`,"error");
    } finally {
      setProcessingIds(p=>p.filter(x=>x!==id));
    }
  };

  const handleResolve=async (id:string)=>{
    setProcessingIds(p=>[...p,id]);
    try {
      await api.updateCaseStatus(id, "RESOLVED");
      setExitingIds(p=>[...p,id]);
      setTimeout(()=>{
        setCases(cs=>cs.map(c=>c.id===id?{...c,status:"RESOLVED" as const,resolvedAt:new Date().toISOString()}:c));
        setExitingIds(p=>p.filter(x=>x!==id));
        toast(`Case ${id} marked as resolved ✅`,"success");
      },300);
      await loadDashboardData();
    } catch (err) {
      toast(`Failed to resolve case ${id}`,"error");
    } finally {
      setProcessingIds(p=>p.filter(x=>x!==id));
    }
  };

  const handleAddNote=async (caseId:string,note:string)=>{
    try {
      await api.addCaseNote(caseId, note);
      setCases(cs=>cs.map(c=>c.id===caseId?{...c,note}:c));
      toast(`Note saved for ${caseId}`,"info");
    } catch (err) {
      toast(`Failed to save note for ${caseId}`,"error");
    }
  };

  const handleRefresh=()=>{setRefreshKey(k=>k+1);setFileUploaded(false);setCases([]);setTimeout(()=>{window.location.reload();},200);};


  const filteredFraudMethods=searchQuery?FRAUD_METHODS.filter(m=>m.title.toLowerCase().includes(searchQuery.toLowerCase())):[];

  // Feature 23: natural language search results
  const nlpCases=searchQuery&&cases.length?parseNaturalSearch(searchQuery,cases,cases):cases;

  if(!loaded)return<SplashScreen onComplete={handleComplete}/>;
  const th=THEMES[theme];

  return(
    <div style={{minHeight:"100vh",background:th.bg,color:th.text,position:"relative"}} onClick={()=>{if(showNotifs)setShowNotifs(false);}}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .dashboard-fade{animation:fadePageIn 0.25s ease}
        @keyframes fadePageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`radial-gradient(circle, ${th.accent}12 1px, transparent 1px)`,backgroundSize:"28px 28px"}}/>

      {/* Feature 17: Session Timeout */}
      <SessionTimeout onLogout={handleLogout} accent={th.accent}/>

      {/* Feature 12: Keyboard Shortcuts */}
      <KeyboardShortcuts onNavigate={navigateTo} onRefresh={handleRefresh} show={showShortcuts} setShow={setShowShortcuts}/>

      {/* Feature 2: Toast Container */}
      <ToastContainer/>

      {/* Shortcuts hint */}
      <div style={{position:"fixed",bottom:16,left:sidebarOpen?216:88,zIndex:100}} onClick={()=>setShowShortcuts(true)}>
        <button style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#555",fontSize:11,fontFamily:"monospace"}}>⌨️ ? shortcuts</button>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* Updated AppSidebar with alertCount + caseStats */}
        <AppSidebar
          activePage={activePage}
          setActivePage={navigateTo}
          isOpen={sidebarOpen}
          isMobile={false}
          onToggle={() => setSidebarOpen(o => !o)}
          language={language}
          alertCount={cases.filter(c => c.status === "ESCALATED").length}
          isAdmin={isAdmin}
          caseStats={{
            open:      cases.filter(c => c.status === "OPEN").length,
            escalated: cases.filter(c => c.status === "ESCALATED").length,
            resolved:  cases.filter(c => c.status === "RESOLVED").length,
          }}
        />
        <div style={{marginLeft:sidebarOpen?200:72,display:"flex",flexDirection:"column",minHeight:"100vh",transition:"margin-left 0.3s"}}>
          <DashboardHeader
            onSearch={setSearchQuery} onRefresh={handleRefresh}
            showNotifications={showNotifs} setShowNotifications={setShowNotifs}
            agentName={agentName} userEmail={userEmail}
            onLogout={handleLogout} onNavigate={navigateTo}
            theme={theme} setTheme={(t)=>{setTheme(t);applyTheme(t);toast("Theme changed to "+THEMES[t].label,"info");}}
            language={language} setLanguage={setLanguage}
            lastLogin={lastLogin}
          />
          <main style={{flex:1,padding:24,display:"flex",flexDirection:"column",gap:16}}>

            {/* Feature 3: Skeleton while page transitions */}
            {pageLoading&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                {[1,2,3,4].map(i=><SkeletonCard key={i}/>)}
              </div>
            )}

            {!pageLoading&&(
              <div className="dashboard-fade">
                {/* Search results */}
                {searchQuery&&filteredFraudMethods.length>0&&(
                  <div style={{background:th.cardBg,border:`1px solid ${th.accent}44`,borderRadius:8,padding:16}}>
                    <div style={{color:th.accent,fontSize:12,fontFamily:"monospace",marginBottom:12}}>🔍 FRAUD METHODS — "{searchQuery}"</div>
                    {filteredFraudMethods.map(m=>(<div key={m.title} style={{background:th.bg,border:`1px solid ${th.border}`,borderRadius:6,padding:"12px 16px",marginBottom:8}}><div style={{color:th.text,fontSize:13,fontWeight:600}}>{m.icon} {m.title}</div><div style={{color:"#666",fontSize:11,marginTop:4,lineHeight:1.5}}>{m.desc}</div></div>))}
                  </div>
                )}

                {activePage==="overview"&&(
                  <>
                    <UploadSection key={refreshKey} onDataLoaded={handleDataLoaded} flaggedData={cases} agentName={agentName} userEmail={userEmail} fileUploaded={fileUploaded}/>
                    {fileUploaded&&(<div style={{background:"#0f1a0f",border:"1px solid #22c55e",borderRadius:8,padding:"10px 16px",color:"#22c55e",fontSize:13}}>✅ Analysis complete — {analytics?.total_scanned ?? cases.length} records scanned, <strong>{cases.length}</strong> fraud cases flagged. Use the buttons above to download the report or send an email alert.</div>)}

                    {/* Feature 1: Animated metric cards */}
                    <AnimatedMetricCards
                      flaggedCount={fileUploaded? cases.length : 76}
                      totalSavings={fileUploaded? `₹${((analytics?.amount_recovered ?? 0)/100000).toFixed(1)}L` : "₹95.8L"}
                      activeCases={fileUploaded? (analytics?.active_cases ?? 0) : 75}
                      escalatedCases={cases.filter(c=>c.status==="ESCALATED").length}
                    />

                    {/* Feature 7: Trend chart */}
                    <FraudTrendChart accent={th.accent}/>

                    {/* Charts */}
                    <ChartSection data={fileUploaded?cases:[]} fileUploaded={fileUploaded} accent={th.accent}/>

                    {/* Feature 6: India Heatmap */}
                    <IndiaHeatmap data={fileUploaded?cases:[]} accent={th.accent}/>

                    {/* Feature 8: Scheme Leaderboard */}
                    <SchemeLeaderboard data={fileUploaded?cases:[]} accent={th.accent}/>

                    {fileUploaded&&<NetworkGraph data={cases}/>}

                    {/* Updated CaseTable with onAddNote */}
                    <CaseTable
                      cases={fileUploaded?nlpCases:[]}
                      processingCaseIds={processingIds}
                      exitingCaseIds={exitingIds}
                      onEscalate={handleEscalate}
                      onResolve={handleResolve}
                      onAddNote={handleAddNote}
                      searchQuery={searchQuery}
                    />
                  </>
                )}

                {/* Updated AlertsPage with real cases + nav */}
                {activePage==="alerts"&&(
                  <AlertsPage
                    cases={cases}
                    onNavigateToCase={()=>navigateTo("overview")}
                  />
                )}

                {activePage==="accounts" &&<AccountsPage/>}
                {activePage==="analytics"&&<AnalyticsPage/>}
                {activePage==="investigations" && (
                  <InvestigationsPanel
                    cases={cases}
                    processingIds={processingIds}
                    exitingIds={exitingIds}
                    onEscalate={handleEscalate}
                    onResolve={handleResolve}
                    onAddNote={handleAddNote}
                    searchQuery={searchQuery}
                  />
                )}
                {activePage==="training" && <TrainingCenter />}
                {activePage==="gpu" && <GPUMonitor />}
                {activePage==="reports" && <ReportsPanel />}
                {activePage==="admin" && <AdminPanel />}
                {activePage==="profile" && <ProfilePanel />}
                {activePage==="copilot" && <AICopilot />}
                {activePage==="copilot_benchmark" && <AIBenchmark />}
                {activePage==="help"     &&<HelpPage/>}
                {activePage==="faq"      &&<FAQPage/>}
                {activePage==="terms"    &&<TermsPage/>}
                {activePage==="settings" &&(
                  <SettingsPage
                    userEmail={userEmail}
                    agentName={agentName}
                    onLogout={handleLogout}
                    theme={theme}
                    setTheme={(t)=>{setTheme(t);applyTheme(t);}}
                    language={language}
                    setLanguage={setLanguage}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
