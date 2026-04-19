import { useState, useCallback, useEffect, useRef } from "react";
import SplashScreen from "@/components/SplashScreen";
import AppSidebar from "@/components/AppSidebar";
import DashboardHeader, { THEMES, ThemeName, applyTheme, LANGUAGES } from "@/components/DashboardHeader";
import MetricCards from "@/components/MetricCards";
import CaseTable, { FraudCase } from "@/components/CaseTable";
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
//  USER REGISTRY (existing)
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
const BAD_PATTERNS=[/\.{2,}/,/@.*@/,/^[.+\-_]/,/[.+\-_]@/,/@[.\-]/,/[.\-]$/];
const STRICT_RE=/^[a-zA-Z0-9]([a-zA-Z0-9._+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
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

const generateCasesFromRows=(rows:Row[]):FraudCase[]=>rows.map((r,i)=>({
  id:`GOV-${9000+i}`,scheme:r.scheme,state:r.state,amount:r.amount,
  severity:(r.amount>100000?"CRITICAL":r.claims_per_month>10?"HIGH":"MEDIUM") as "CRITICAL"|"HIGH"|"MEDIUM",
  status:"OPEN" as const,assignedTo:"Unassigned",createdAt:new Date().toISOString(),
  escalatedAt:null,resolvedAt:null,
}));

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
        {/* Legend + Top States */}
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
//  MULTI-TYPE CHART (existing, kept)
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
      {metrics.map((m,i)=>(
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
  const shortcuts=[["?","Show this panel"],["Esc","Close panel"],["R","Refresh page"],["1","Go to Overview"],["2","Go to Alerts"],["3","Go to Accounts"],["4","Go to Analytics"],];
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
//  LOGIN PAGE with login attempts limiter (Feature 19) + last login (Feature 18)
// ─────────────────────────────────────────────
type AuthMode="signin"|"register"|"guest";
const LoginPage=({onLogin}:{onLogin:(name:string,email:string)=>void})=>{
  const[mode,setMode]=useState<AuthMode>("signin");
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[pwd,setPwd]=useState("");
  const[confirmPwd,setConfirmPwd]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPwd,setShowPwd]=useState(false);
  const[showCPwd,setShowCPwd]=useState(false);
  // Feature 19: attempt limiter
  const[attempts,setAttempts]=useState(0);
  const[lockUntil,setLockUntil]=useState<number|null>(null);
  const[lockSec,setLockSec]=useState(0);

  useEffect(()=>{
    if(!lockUntil)return;
    const iv=setInterval(()=>{
      const rem=Math.ceil((lockUntil-Date.now())/1000);
      if(rem<=0){setLockUntil(null);setAttempts(0);setLockSec(0);clearInterval(iv);}
      else setLockSec(rem);
    },1000);
    return()=>clearInterval(iv);
  },[lockUntil]);

  const[nameHint,setNameHint]=useState<{cls:"ok"|"err"|"";text:string}>({cls:"",text:""});
  const[emailHint,setEmailHint]=useState<{cls:"ok"|"err"|"";text:string}>({cls:"",text:""});
  const[fmtPhrase,setFmtPhrase]=useState("waiting...");
  const[fmtColor,setFmtColor]=useState("#555");

  const handleNameChange=(v:string)=>{setName(v);const t=v.trim();if(t.length>0&&t.length<2)setNameHint({cls:"err",text:"⚠ Too short"});else if(t.length>=2)setNameHint({cls:"ok",text:"✓ Accepted"});else setNameHint({cls:"",text:""}); };
  const handleEmailChange=(v:string)=>{setEmail(v);const[st,phrase]=getEmailPhrase(v);setFmtPhrase(phrase);setFmtColor(st==="ok"?"#22a855":st==="err"?"#cc3333":"#555");if(!v){setEmailHint({cls:"",text:""});return;}setEmailHint(st==="ok"?{cls:"ok",text:"✓ Email accepted"}:{cls:"err",text:"⚠ "+phrase});};

  const handleSubmit=()=>{
    if(lockUntil&&Date.now()<lockUntil)return;
    setError("");
    const n=name.trim(),e=email.trim();
    if(mode==="guest"){doLogin("Guest Agent","guest@fraudguard.in");return;}
    if(!n){setError("Agent name is required");return;}
    if(n.length<2){setError("Name must be at least 2 characters");return;}
    if(!e){setError("Email is required");return;}
    if(!strictEmailOk(e)){const[,ph]=getEmailPhrase(e);setError(ph);return;}
    if(mode==="register"){
      if(emailExists(e)){setError("⚠ This email is already registered. Please Sign In instead.");return;}
      if(!pwd){setError("Password is required");return;}
      if(pwd.length<6){setError("Password must be at least 6 characters");return;}
      if(pwd!==confirmPwd){setError("Passwords do not match");return;}
      addToRegistry(n,e);
    } else {
      // simulate wrong password check — if not registered, increment attempts
      if(mode==="signin"&&!emailExists(e)){
        const newAttempts=attempts+1;
        setAttempts(newAttempts);
        if(newAttempts>=3){setLockUntil(Date.now()+30000);setError("Too many failed attempts. Locked for 30 seconds.");}
        else setError(`Email not found. ${3-newAttempts} attempt(s) remaining.`);
        return;
      }
    }
    doLogin(n,e);
  };

  const doLogin=(n:string,e:string)=>{
    setLoading(true);
    localStorage.setItem("fraudguard_name",n);
    localStorage.setItem("fraudguard_email",e);
    addToRegistry(n,e);
    setTimeout(()=>{setLoading(false);onLogin(n,e);},1500);
  };

  const hintSty=(cls:"ok"|"err"|""):React.CSSProperties=>({fontSize:10,fontFamily:"monospace",marginTop:3,paddingLeft:2,minHeight:14,color:cls==="ok"?"#22a855":cls==="err"?"#cc3333":"transparent"});
  const modeTab=(m:AuthMode,label:string)=>(<button onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px 0",background:mode===m?"#cc0000":"transparent",border:"none",color:mode===m?"#fff":"#666",fontSize:11,fontFamily:"monospace",letterSpacing:1,cursor:"pointer",borderRadius:mode===m?3:0,transition:"all .2s"}}>{label}</button>);
  const EyeBtn=({show,toggle}:{show:boolean;toggle:()=>void})=>(<button type="button" onClick={toggle} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:14,padding:0,lineHeight:1}}>{show?"🙈":"👁"}</button>);

  return(
    <div style={{position:"fixed",inset:0,background:"#030303",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <style>{`
        @keyframes gridMove{0%{transform:translateY(0)}100%{transform:translateY(40px)}}
        @keyframes scan{0%{top:-2%}100%{top:102%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
        @keyframes pulseNode{0%,100%{opacity:0.18;transform:scale(1)}50%{opacity:0.45;transform:scale(1.15)}}
        @keyframes floatCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes redPulse{0%,100%{border-color:rgba(204,0,0,0.4)}50%{border-color:rgba(204,0,0,0.9)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .lg-inp{width:100%;background:#080808;border:1px solid rgba(204,0,0,0.2);border-radius:4px;padding:10px 38px 10px 13px;color:#e0e0e0;font-size:12px;font-family:monospace;outline:none;transition:border-color .2s,box-shadow .2s;margin-top:5px;box-sizing:border-box}
        .lg-inp:focus{border-color:rgba(204,0,0,0.7)!important;box-shadow:0 0 0 3px rgba(204,0,0,0.1)!important}
        .lg-inp::placeholder{color:#2a2a2a}.lg-inp.valid{border-color:rgba(0,180,80,0.6)!important}.lg-inp.invalid{border-color:rgba(204,0,0,0.8)!important}
        .bg-node{position:absolute;border-radius:50%;pointer-events:none;animation:pulseNode 3s ease-in-out infinite}
        .fc{position:absolute;background:rgba(10,0,0,0.75);border:1px solid rgba(204,0,0,0.18);border-radius:4px;font-family:monospace;pointer-events:none;padding:8px 12px}
        .dashboard-fade{animation:fadePageIn 0.3s ease}
        @keyframes fadePageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(180,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(180,0,0,0.04) 1px,transparent 1px)",backgroundSize:"40px 40px",animation:"gridMove 10s linear infinite"}}/>
      <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(204,0,0,0.3),transparent)",animation:"scan 5s linear infinite",zIndex:2}}/>
      {[{w:6,top:"8%",left:"12%",d:"0s"},{w:4,top:"15%",left:"28%",d:"0.5s"},{w:8,top:"22%",left:"8%",d:"1s"},{w:5,top:"35%",left:"20%",d:"1.5s"},{w:4,top:"12%",right:"14%",d:"0.3s"},{w:7,top:"28%",right:"9%",d:"0.8s"},{w:5,top:"42%",right:"22%",d:"1.2s"},{w:4,top:"55%",left:"10%",d:"0.6s"},{w:6,top:"68%",right:"12%",d:"1.8s",bg:"#ff4400"},{w:4,top:"75%",left:"25%",d:"0.9s"}].map((n,i)=>(<div key={i} className="bg-node" style={{width:n.w,height:n.w,background:(n as any).bg||"#cc0000",top:n.top,left:(n as any).left,right:(n as any).right,animationDelay:n.d}}/>))}
      {[{top:"8%",d:"0s",color:"#cc0000",label:"ALERT — GOV-9921",line:"312 ghost workers",tag:"MGNREGS",st:"Jharkhand"},{top:"30%",d:"1s",color:"#ff4400",label:"DUPLICATE IDs",line:"Same phone · 47 accs",tag:"PM-KISAN",st:"UP"},{top:"54%",d:"0.5s",color:"#cc0000",label:"SYNTHETIC ID",line:"Aadhaar mismatch",tag:"Ayushman",st:"Bihar"},{top:"76%",d:"2s",color:"#886600",label:"DECEASED CLAIM",line:"Death registry match",tag:"PMAY",st:"Rajasthan"}].map((c,i)=>(<div key={i} className="fc" style={{top:c.top,left:"1%",width:185,animation:`floatCard ${3.5+i*0.5}s ease-in-out ${c.d} infinite`}}><div style={{color:c.color,fontSize:8,letterSpacing:1,marginBottom:3}}>{c.label}</div><div style={{color:"#555",fontSize:9,lineHeight:1.5}}>{c.line}<br/><span style={{color:"#ff9900"}}>{c.tag}</span> · {c.st}</div></div>))}
      {[{top:"8%",d:"0.8s",color:"#cc0000",label:"FAKE INVOICE",line:"GSTIN invalid · ₹4.2L",tag:"PMEGP",st:"Maharashtra"},{top:"30%",d:"1.5s",color:"#cc0000",label:"GHOST EMPLOYEES",line:"Zero attendance · 28 IDs",tag:"Payroll",st:"MP"},{top:"54%",d:"0.3s",color:"#cc5500",label:"BID RIGGING",line:"Variance <2% · Contract",tag:"PWD tender",st:"Gujarat"},{top:"76%",d:"1.8s",color:"#cc0000",label:"CROP FRAUD",line:"NDVI mismatch · 120 plots",tag:"PM-FASAL",st:"Haryana"}].map((c,i)=>(<div key={i} className="fc" style={{top:c.top,right:"1%",width:185,animation:`floatCard ${3.8+i*0.4}s ease-in-out ${c.d} infinite`}}><div style={{color:c.color,fontSize:8,letterSpacing:1,marginBottom:3}}>{c.label}</div><div style={{color:"#555",fontSize:9,lineHeight:1.5}}>{c.line}<br/><span style={{color:"#ff9900"}}>{c.tag}</span> · {c.st}</div></div>))}

      <div style={{position:"relative",zIndex:10,width:420,background:"rgba(6,6,6,0.97)",border:"1px solid rgba(204,0,0,0.5)",borderRadius:6,padding:"32px 32px 24px",boxShadow:"0 0 80px rgba(204,0,0,0.18), inset 0 0 60px rgba(0,0,0,0.4)",animation:"redPulse 3s ease-in-out infinite"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#cc0000,transparent)",borderRadius:"6px 6px 0 0"}}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:6}}>🛡️</div>
          <div style={{color:"#fff",fontSize:20,fontWeight:800,letterSpacing:6,fontFamily:"monospace"}}>FRAUDGUARD</div>
          <div style={{color:"#cc0000",fontSize:8,letterSpacing:4,marginTop:4,fontFamily:"monospace"}}>GOVERNMENT INTELLIGENCE SYSTEM</div>
          <div style={{marginTop:8,display:"flex",justifyContent:"center",gap:6}}>
            {["SECURE","ENCRYPTED","MONITORED"].map(tag=>(<span key={tag} style={{background:"#0a0000",border:"1px solid rgba(204,0,0,0.15)",color:"rgba(204,0,0,0.5)",fontSize:8,padding:"2px 8px",borderRadius:2,fontFamily:"monospace",letterSpacing:1}}>{tag}</span>))}
          </div>
        </div>
        <div style={{display:"flex",background:"#0a0a0a",border:"1px solid rgba(204,0,0,0.15)",borderRadius:4,marginBottom:18,overflow:"hidden"}}>
          {modeTab("signin","SIGN IN")}{modeTab("register","REGISTER")}{modeTab("guest","GUEST")}
        </div>
        {/* Lock warning */}
        {lockUntil&&Date.now()<lockUntil&&(
          <div style={{background:"#150000",border:"1px solid #cc0000",borderRadius:3,padding:"8px 12px",color:"#cc0000",fontSize:11,marginBottom:12,fontFamily:"monospace",textAlign:"center"}}>
            🔒 Too many attempts. Wait <strong>{lockSec}s</strong> before trying again.
          </div>
        )}
        {error&&!lockUntil&&<div style={{background:"#150000",border:"1px solid #cc0000",borderRadius:3,padding:"8px 12px",color:"#cc0000",fontSize:11,marginBottom:12,fontFamily:"monospace",animation:"shake 0.3s ease"}}>⛔ {error}</div>}
        {mode!=="guest"&&(
          <>
            <div style={{marginBottom:12}}>
              <label style={{color:"#aaa",fontSize:8,fontFamily:"monospace",letterSpacing:2,display:"block"}}>AGENT NAME <span style={{color:"#cc0000"}}>*</span></label>
              <div style={{position:"relative"}}><input type="text" value={name} onChange={e=>handleNameChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="e.g. Shree Kumar" className={"lg-inp"+(nameHint.cls==="ok"?" valid":nameHint.cls==="err"?" invalid":"")}/></div>
              <div style={hintSty(nameHint.cls)}>{nameHint.text||" "}</div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{color:"#aaa",fontSize:8,fontFamily:"monospace",letterSpacing:2,display:"block"}}>AGENT EMAIL <span style={{color:"#cc0000"}}>*</span><span style={{color:fmtColor,marginLeft:8}}>{fmtPhrase}</span></label>
              <div style={{position:"relative"}}><input type="email" value={email} onChange={e=>handleEmailChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="agent@cbi.gov.in" className={"lg-inp"+(emailHint.cls==="ok"?" valid":emailHint.cls==="err"?" invalid":"")}/></div>
              <div style={hintSty(emailHint.cls)}>{emailHint.text||" "}</div>
            </div>
            <div style={{marginBottom:mode==="register"?12:18}}>
              <label style={{color:"#aaa",fontSize:8,fontFamily:"monospace",letterSpacing:2,display:"block"}}>PASSWORD <span style={{color:"#cc0000"}}>*</span></label>
              <div style={{position:"relative"}}><input type={showPwd?"text":"password"} value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="••••••••" className="lg-inp"/><EyeBtn show={showPwd} toggle={()=>setShowPwd(p=>!p)}/></div>
            </div>
            {mode==="register"&&(<div style={{marginBottom:18}}>
              <label style={{color:"#aaa",fontSize:8,fontFamily:"monospace",letterSpacing:2,display:"block"}}>CONFIRM PASSWORD <span style={{color:"#cc0000"}}>*</span></label>
              <div style={{position:"relative"}}><input type={showCPwd?"text":"password"} value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="••••••••" className="lg-inp"/><EyeBtn show={showCPwd} toggle={()=>setShowCPwd(p=>!p)}/></div>
              {confirmPwd&&pwd!==confirmPwd&&<div style={hintSty("err")}>⚠ Passwords do not match</div>}
              {confirmPwd&&pwd===confirmPwd&&pwd.length>=6&&<div style={hintSty("ok")}>✓ Passwords match</div>}
            </div>)}
          </>
        )}
        {mode==="guest"&&(<div style={{background:"#0a0000",border:"1px solid rgba(204,0,0,0.2)",borderRadius:4,padding:"14px 16px",marginBottom:18,textAlign:"center"}}><div style={{color:"#cc0000",fontSize:13,marginBottom:6}}>👀 Guest Access</div><div style={{color:"#555",fontSize:11,lineHeight:1.6}}>Read-only access. No alerts sent. Full features require registration.</div></div>)}
        <button onClick={handleSubmit} disabled={loading||!!(lockUntil&&Date.now()<lockUntil)}
          style={{width:"100%",background:loading?"#120000":"#cc0000",color:loading?"#550000":"#fff",border:loading?"1px solid #2a0000":"none",borderRadius:4,padding:"12px",cursor:loading?"not-allowed":"pointer",fontSize:11,fontWeight:700,letterSpacing:3,fontFamily:"monospace",transition:"background .15s"}}>
          {loading?<span>AUTHENTICATING<span style={{animation:"blink 1s infinite",display:"inline-block"}}>_</span></span>:mode==="signin"?"SIGN IN →":mode==="register"?"CREATE ACCOUNT →":"ENTER AS GUEST →"}
        </button>
        <div style={{textAlign:"center",marginTop:12,fontSize:10,color:"#444"}}>
          {mode==="signin"?<span>No account? <span onClick={()=>setMode("register")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Register here</span></span>:mode==="register"?<span>Have account? <span onClick={()=>setMode("signin")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Sign in</span></span>:<span>Want full access? <span onClick={()=>setMode("register")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Register free</span></span>}
        </div>
        <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["CLEARANCE","LEVEL 4","#aa0000"],["STATUS","ACTIVE","#1a7a3a"],["REGION","IN-SOUTH","#aa0000"]].map(([l,v,c])=>(<div key={l} style={{background:"#050505",border:"1px solid #0f0f0f",borderRadius:3,padding:8,textAlign:"center"}}><div style={{color:"#1e1e1e",fontSize:8,fontFamily:"monospace"}}>{l}</div><div style={{color:c,fontSize:10,fontFamily:"monospace",marginTop:3,fontWeight:700}}>{v}</div></div>))}
        </div>
        <div style={{textAlign:"center",marginTop:10,color:"#111",fontSize:8,fontFamily:"monospace"}}>UNAUTHORIZED ACCESS WILL BE PROSECUTED · IT ACT 2000</div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,overflow:"hidden",whiteSpace:"nowrap",background:"#050000",borderTop:"1px solid rgba(204,0,0,0.12)",padding:"5px 0",zIndex:20}}>
        <div style={{display:"inline-block",animation:"ticker 30s linear infinite"}}>
          <span style={{color:"#cc0000",fontFamily:"monospace",fontSize:9,letterSpacing:1}}>
            &nbsp;&nbsp;[LIVE]&nbsp;<span style={{color:"#ff9900"}}>GOV-9921</span><span style={{color:"#555"}}> Ghost workers Jharkhand ·&nbsp;</span><span style={{color:"#cc0000"}}>CRITICAL</span>
            <span style={{color:"#333"}}>&nbsp;&nbsp;|&nbsp;&nbsp;</span><span style={{color:"#ff9900"}}>GOV-7703</span><span style={{color:"#555"}}> Fake Ayushman claims Bihar ·&nbsp;</span><span style={{color:"#cc0000"}}>CRITICAL</span>
            <span style={{color:"#333"}}>&nbsp;&nbsp;|||&nbsp;&nbsp;</span><span style={{color:"#555"}}>FRAUDGUARD MONITORING 2.4M RECORDS · ₹95.8L RECOVERED</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  INNER PAGES
// ─────────────────────────────────────────────
const AlertsPage=()=>(<div style={{padding:24}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>🔴 Live Alerts</h2>{[{id:"GOV-9921",msg:"Critical fraud in MGNREGS Jharkhand — 312 ghost workers",time:"2 min ago",sev:"CRITICAL"},{id:"GOV-7703",msg:"Fake Ayushman Bharat claims detected in Bihar",time:"5 min ago",sev:"CRITICAL"},{id:"GOV-8847",msg:"Duplicate IDs found in PM-KISAN UP",time:"12 min ago",sev:"HIGH"},{id:"GOV-4401",msg:"Shell entities flagged in PMEGP Maharashtra",time:"18 min ago",sev:"HIGH"},{id:"GOV-6612",msg:"Address fraud detected in PMAY Rajasthan",time:"25 min ago",sev:"MEDIUM"}].map(a=>(<div key={a.id} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace",fontSize:12,marginRight:12}}>{a.id}</span><span style={{color:"var(--fg-text,#ccc)",fontSize:13}}>{a.msg}</span></div><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:"#555",fontSize:11}}>{a.time}</span><span style={{background:a.sev==="CRITICAL"?"#cc0000":a.sev==="HIGH"?"#dd6b20":"#d69e2e",color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>{a.sev}</span></div></div>))}</div>);
const AccountsPage=()=>(<div style={{padding:24}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>👥 Monitored Accounts</h2><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid var(--fg-border,#1e1e1e)",color:"#666"}}>{["Beneficiary ID","Name","Phone","State","Schemes","Risk Score"].map(h=>(<th key={h} style={{textAlign:"left",padding:"10px 14px",fontFamily:"monospace",fontSize:10}}>{h}</th>))}</tr></thead><tbody>{[["BEN0021","Rahul Kumar","9812345678","Bihar","MGNREGS","92%"],["BEN0047","Amit Sharma","9812345678","Jharkhand","PMAY","88%"],["BEN0093","Meena Kumari","9812345678","Maharashtra","Mid-Day Meal","95%"],["BEN0112","Kavita Verma","9867890123","UP","PM-KISAN","76%"],["BEN0134","Anita Roy","9889012345","Rajasthan","Ayushman Bharat","81%"]].map(([id,n,p,s,sc,r])=>(<tr key={id} style={{borderBottom:"1px solid var(--fg-border,#161616)"}}><td style={{padding:"10px 14px",color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>{id}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#fff)"}}>{n}</td><td style={{padding:"10px 14px",color:"#888"}}>{p}</td><td style={{padding:"10px 14px",color:"#888"}}>{s}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#ccc)"}}>{sc}</td><td style={{padding:"10px 14px"}}><span style={{color:"var(--fg-accent,#cc0000)",fontWeight:700}}>{r}</span></td></tr>))}</tbody></table></div>);
const AnalyticsPage=()=>(<div style={{padding:24}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>📊 Analytics Summary</h2><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{[{label:"Total Records Scanned",value:"2.4M",color:"var(--fg-text,#fff)"},{label:"Fraud Detection Rate",value:"15.2%",color:"var(--fg-accent,#cc0000)"},{label:"Amount Recovered",value:"₹95.8L",color:"#22c55e"},{label:"Active Investigations",value:"75",color:"#d69e2e"},{label:"Resolved Cases",value:"1,102",color:"#22c55e"},{label:"States Covered",value:"6",color:"var(--fg-text,#fff)"}].map(({label,value,color})=>(<div key={label} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:20}}><div style={{color:"#666",fontSize:11,fontFamily:"monospace",marginBottom:8}}>{label}</div><div style={{color,fontSize:28,fontWeight:700}}>{value}</div></div>))}</div><h2 style={{color:"var(--fg-text,#fff)",marginTop:32,marginBottom:16,fontSize:16}}>🔍 Fraud Detection Methods</h2><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{FRAUD_METHODS.map(m=>(<div key={m.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:16}}><div style={{fontSize:22,marginBottom:8}}>{m.icon}</div><div style={{color:"var(--fg-accent,#cc0000)",fontSize:12,fontWeight:600,marginBottom:6}}>{m.title}</div><div style={{color:"#666",fontSize:11,lineHeight:1.5}}>{m.desc}</div></div>))}</div></div>);

const HelpPage=()=>(<div style={{padding:24,maxWidth:800}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>❓ Help & Fraud Prevention Guide</h2><p style={{color:"#666",fontSize:12,marginBottom:24}}>How to protect yourself and beneficiaries from fraud.</p>{[{icon:"🔒",title:"Never Share Your OTP",body:"Government schemes never ask for OTP over phone. Hang up and report to 1930."},{icon:"🪪",title:"Protect Your Aadhaar",body:"Never share your Aadhaar number or biometric data with unknown persons."},{icon:"📱",title:"Use Official Apps Only",body:"Download government scheme apps only from official Play Store / App Store."},{icon:"🏦",title:"Check Your Bank Account",body:"Enable SMS alerts for every transaction. Report fraud within 3 days."},{icon:"🌐",title:"Verify Website URLs",body:"Government portals use .gov.in domains. Fraudulent sites use .com or .net."},{icon:"📞",title:"Cyber Crime Helpline",body:"National Cyber Crime Helpline: 1930. Report at cybercrime.gov.in."},{icon:"📊",title:"12 Graph Types",body:"After uploading CSV, click the chart type button (top right of chart) to switch between Bar, Line, Area, Pie, Donut, Radar, Scatter, Stacked Bar, Horizontal, Stepped, Bubble, and Funnel charts."},{icon:"📥",title:"Download Fraud Report",body:"After scanning, click '⬇ Download Fraud Report' for a full CSV with case IDs, risk scores and flag reasons."},{icon:"📧",title:"Email Alert Button",body:"Click '📧 Send Email Alert' after scanning to manually send an alert. You are in full control — no auto-emails."},{icon:"⌨️",title:"Keyboard Shortcuts",body:"Press ? to see all keyboard shortcuts. Press R to refresh, 1-4 to navigate pages instantly."},{icon:"🗺️",title:"India Heatmap",body:"The state-wise heatmap shows which states have the most fraud cases. Bubble size and color intensity indicate fraud volume."},{icon:"🏆",title:"Scheme Leaderboard",body:"Shows top 5 government schemes with most fraud cases ranked by case count."},].map(item=>(<div key={item.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:10,padding:"16px 20px",marginBottom:12,display:"flex",gap:16,alignItems:"flex-start"}}><div style={{fontSize:28,flexShrink:0,marginTop:2}}>{item.icon}</div><div><div style={{color:"var(--fg-text,#fff)",fontSize:14,fontWeight:600,marginBottom:6}}>{item.title}</div><div style={{color:"#777",fontSize:12,lineHeight:1.7}}>{item.body}</div></div></div>))}</div>);

const FAQPage=()=>{
  const[open,setOpen]=useState<number|null>(null);
  const faqs=[{q:"What is FraudGuard?",a:"FraudGuard is an AI-powered government fraud detection system scanning beneficiary data across 9 fraud vectors in real time."},{q:"How does the ML model work?",a:"It flags: claims_per_month > 6, amount > ₹40,000, account age < 30 days, or location cluster ≤ 2."},{q:"How do I upload data?",a:"Overview → Upload Beneficiary Data. Required columns: beneficiary_id, name, phone, state, scheme, claims_per_month, amount, location_cluster, account_age_days."},{q:"How do email alerts work?",a:"Emails are NOT auto-sent. After scanning, click '📧 Send Email Alert' to control when to send."},{q:"How do I download the fraud report?",a:"After scanning, click '⬇ Download Fraud Report'. CSV includes Case ID, risk score (0-100%) and exact flag reasons."},{q:"How does login protection work?",a:"After 3 failed sign-in attempts, the login is locked for 30 seconds. This prevents brute force attacks."},{q:"What is the session timeout?",a:"After 15 minutes of inactivity, a 60-second countdown appears. You can click 'Stay Logged In' or it auto-logs you out."},{q:"What do keyboard shortcuts do?",a:"Press ? to see all shortcuts. R refreshes, 1-4 navigate pages, Esc closes popups."},{q:"Can I see last login info?",a:"Yes! Your last login time appears in the profile dropdown in the header."},{q:"What are the 12 graph types?",a:"Bar, Line, Area, Pie, Donut, Radar, Scatter, Stacked Bar, Horizontal Bar, Stepped Line, Bubble, and Funnel."}];
  return(<div style={{padding:24,maxWidth:740}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📌 FAQ</h2><p style={{color:"#666",fontSize:12,marginBottom:24}}>Common questions about FraudGuard.</p>{faqs.map((f,i)=>(<div key={i} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,marginBottom:10,overflow:"hidden"}}><button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}><span style={{color:"var(--fg-text,#fff)",fontSize:13,fontWeight:600}}>{f.q}</span><span style={{color:"var(--fg-accent,#cc0000)",fontSize:18,lineHeight:1}}>{open===i?"−":"+"}</span></button>{open===i&&<div style={{padding:"0 18px 14px",color:"#777",fontSize:12,lineHeight:1.7,borderTop:"1px solid var(--fg-border,#1e1e1e)"}}><div style={{paddingTop:12}}>{f.a}</div></div>}</div>))}</div>);
};

const TermsPage=()=>(<div style={{padding:24,maxWidth:740}}><h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📄 Terms & Conditions</h2><p style={{color:"#666",fontSize:12,marginBottom:24}}>Last updated: April 2026</p>{[{title:"1. Authorized Use Only",body:"FraudGuard is an internal government tool. Unauthorized access violates IT Act 2000, Section 66."},{title:"2. Data Confidentiality",body:"All beneficiary data is classified RESTRICTED. Do not share or transmit to unauthorized parties."},{title:"3. Accuracy Disclaimer",body:"The fraud detection model provides probabilistic outputs. Flagged records require manual review."},{title:"4. Email Alerts",body:"By registering, you consent to receive alerts. You can disable in Settings or trigger manually."},{title:"5. Session Security",body:"Each session is logged. Logout after each session on shared systems. Idle timeout is 15 minutes."},{title:"6. Data Retention",body:"No beneficiary data stored on external servers. CSV data is processed in-browser only."},{title:"7. Reporting Obligations",body:"Confirmed fraud cases must be escalated within 24 hours of detection."},].map(item=>(<div key={item.title} style={{marginBottom:20}}><div style={{color:"var(--fg-accent,#cc0000)",fontSize:13,fontWeight:700,marginBottom:6,fontFamily:"monospace"}}>{item.title}</div><div style={{color:"#777",fontSize:12,lineHeight:1.7,background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"12px 16px"}}>{item.body}</div></div>))}</div>);

const SettingsPage=({userEmail,agentName,onLogout,theme,setTheme,language,setLanguage}:{userEmail:string;agentName:string;onLogout:()=>void;theme:ThemeName;setTheme:(t:ThemeName)=>void;language:string;setLanguage:(c:string)=>void})=>{
  const[settings,setSettings]=useState({agent_name:agentName,alert_threshold:"0.75",claims_limit:"6",amount_limit:"40,000",email_alerts:true});
  const[saved,setSaved]=useState(false);
  const acc=THEMES[theme].accent;
  const saveSettings=()=>{localStorage.setItem("fraudguard_settings",JSON.stringify(settings));localStorage.setItem("fraudguard_name",settings.agent_name);setSaved(true);toast("Settings saved!","success");setTimeout(()=>setSaved(false),2000);};
  return(
    <div style={{padding:24,maxWidth:580}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:24,fontSize:16}}>⚙️ Settings</h2>
      {/* Font Size Feature 21 */}
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

// ─── NETWORK GRAPH ─────────────────────────────────────────────────────────
const NetworkGraph=({data}:{data:Row[]})=>{
  const nodes:{id:string;x:number;y:number}[]=[],edges:{x1:number;y1:number;x2:number;y2:number}[]=[];
  const phoneMap:Record<string,string[]>={};
  data.forEach(r=>{if(!phoneMap[r.phone])phoneMap[r.phone]=[];phoneMap[r.phone].push(r.beneficiary_id);});
  const placed:Record<string,{x:number;y:number}>={};let idx=0;
  Object.values(phoneMap).forEach(group=>{if(group.length>1){const cx=80+(idx%5)*160,cy=80+Math.floor(idx/5)*120;group.forEach((id,i)=>{const a=(i/group.length)*Math.PI*2;placed[id]={x:cx+Math.cos(a)*40,y:cy+Math.sin(a)*40};nodes.push({id,...placed[id]});});for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)edges.push({x1:placed[group[i]].x,y1:placed[group[i]].y,x2:placed[group[j]].x,y2:placed[group[j]].y});idx++;}});
  if(!nodes.length)return null;
  return(<div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12,padding:20}}><div style={{color:"var(--fg-text,#fff)",fontWeight:600,marginBottom:4,fontSize:14}}>🔗 Network Graph — Shared Phone Clusters</div><div style={{color:"#888",fontSize:11,marginBottom:12}}>Red nodes = suspicious accounts sharing the same phone number</div><svg width="100%" height="280" style={{background:"#0a0a0a",borderRadius:8}}>{edges.map((e,i)=><line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#cc000044" strokeWidth={1.5}/>)}{nodes.map(n=><g key={n.id}><circle cx={n.x} cy={n.y} r={8} fill="var(--fg-accent,#cc0000)" opacity={0.85}/><text x={n.x} y={n.y+20} textAnchor="middle" fill="#888" fontSize={8}>{n.id.slice(0,6)}</text></g>)}</svg><div style={{marginTop:10,fontSize:11,color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>{nodes.length} suspicious nodes · {Object.values(phoneMap).filter(g=>g.length>1).length} clusters</div></div>);
};

// ─── UPLOAD SECTION ────────────────────────────────────────────────────────
const UploadSection=({onDataLoaded,flaggedData,agentName,userEmail,fileUploaded}:{onDataLoaded:(d:Row[],f:Row[])=>void;flaggedData:Row[];agentName:string;userEmail:string;fileUploaded:boolean})=>{
  const[dragging,setDragging]=useState(false);
  const[processing,setProcessing]=useState(false);
  const[fileName,setFileName]=useState("");
  const[alertSent,setAlertSent]=useState(false);
  const[sending,setSending]=useState(false);
  const processCSV=(text:string)=>{
    setProcessing(true);
    const lines=text.trim().split("\n");
    const rows:Row[]=lines.slice(1).map(line=>{const v=line.split(",");return{beneficiary_id:v[0]?.trim(),name:v[1]?.trim(),phone:v[2]?.trim(),state:v[3]?.trim(),scheme:v[4]?.trim(),claims_per_month:Number(v[5]),amount:Number(v[6]),location_cluster:Number(v[7]),account_age_days:Number(v[8])};});
    const flagged=rows.filter(r=>r.claims_per_month>6||r.amount>40000||r.account_age_days<30||r.location_cluster<=2);
    setTimeout(()=>{setProcessing(false);onDataLoaded(rows,flagged);toast(`✅ ${flagged.length} fraud cases detected from ${rows.length} records`,"success");},1500);
  };
  const handleFile=(file:File)=>{setFileName(file.name);const reader=new FileReader();reader.onload=e=>processCSV(e.target?.result as string);reader.readAsText(file);};
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
        {processing?<div style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>⏳ Running fraud detection model...</div>:fileName?<div style={{color:"#22c55e",fontWeight:600}}>✅ {fileName} — ready</div>:<div style={{color:"#555"}}>📁 Drag and drop CSV here or click to browse</div>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  ROOT COMPONENT
// ─────────────────────────────────────────────
const Index=()=>{
  const savedTheme=(localStorage.getItem("fraudguard_theme") as ThemeName)||"dark-red";
  const savedLang=localStorage.getItem("fraudguard_lang")||"en";

  const[isLoggedIn,setIsLoggedIn]=useState(()=>!!localStorage.getItem("fraudguard_name"));
  const[agentName,setAgentName]=useState(()=>localStorage.getItem("fraudguard_name")||"");
  const[userEmail,setUserEmail]=useState(()=>localStorage.getItem("fraudguard_email")||"");
  const[loaded,setLoaded]=useState(false);
  const[allData,setAllData]=useState<Row[]>([]);
  const[flaggedData,setFlaggedData]=useState<Row[]>([]);
  const[cases,setCases]=useState<FraudCase[]>([]);
  const[processingIds,setProcessingIds]=useState<string[]>([]);
  const[exitingIds,setExitingIds]=useState<string[]>([]);
  const[fileUploaded,setFileUploaded]=useState(false);
  const[activePage,setActivePage]=useState("overview");
  const[prevPage,setPrevPage]=useState("overview");
  const[searchQuery,setSearchQuery]=useState("");
  const[showNotifs,setShowNotifs]=useState(false);
  const[refreshKey,setRefreshKey]=useState(0);
  const[theme,setTheme]=useState<ThemeName>(savedTheme);
  const[language,setLanguage]=useState(savedLang);
  const[sidebarOpen,setSidebarOpen]=useState(true);
  const[showShortcuts,setShowShortcuts]=useState(false);
  const[pageLoading,setPageLoading]=useState(false);
  const lastLogin=getLastLogin(userEmail);

  useEffect(()=>{applyTheme(savedTheme);},[]);
  const handleComplete=useCallback(()=>setLoaded(true),[]);
  const handleLogin=(name:string,email:string)=>{setAgentName(name);setUserEmail(email);setIsLoggedIn(true);toast(`Welcome back, ${name}! 👋`,"success");};
  const handleLogout=()=>{localStorage.removeItem("fraudguard_name");localStorage.removeItem("fraudguard_email");setIsLoggedIn(false);setLoaded(false);setAgentName("");setUserEmail("");};

  // Feature 4: smooth page transitions
  const navigateTo=(page:string)=>{
    if(page===activePage)return;
    setPageLoading(true);
    setTimeout(()=>{setActivePage(page);setPageLoading(false);},150);
  };

  const handleDataLoaded=(data:Row[],flagged:Row[])=>{setAllData(data);setFlaggedData(flagged);setFileUploaded(true);setCases(generateCasesFromRows(flagged));};
  const handleEscalate=(id:string)=>{
    setProcessingIds(p=>[...p,id]);
    setTimeout(()=>{setCases(cs=>cs.map(c=>c.id===id?{...c,status:"ESCALATED" as const,escalatedAt:new Date().toISOString()}:c));setProcessingIds(p=>p.filter(x=>x!==id));toast(`Case ${id} escalated to senior officer queue`,"warning");},800);
  };
  const handleResolve=(id:string)=>{
    setProcessingIds(p=>[...p,id]);
    setTimeout(()=>{setExitingIds(p=>[...p,id]);setTimeout(()=>{setCases(cs=>cs.map(c=>c.id===id?{...c,status:"RESOLVED" as const,resolvedAt:new Date().toISOString()}:c));setProcessingIds(p=>p.filter(x=>x!==id));setExitingIds(p=>p.filter(x=>x!==id));toast(`Case ${id} marked as resolved ✅`,"success");},300);},800);
  };
  const handleRefresh=()=>{setRefreshKey(k=>k+1);setFileUploaded(false);setAllData([]);setFlaggedData([]);setCases([]);setTimeout(()=>{window.location.reload();},200);};
  const filteredFraudMethods=searchQuery?FRAUD_METHODS.filter(m=>m.title.toLowerCase().includes(searchQuery.toLowerCase())):[];

  // Feature 23: natural language search results
  const nlpCases=searchQuery&&cases.length?parseNaturalSearch(searchQuery,cases,flaggedData):cases;

  if(!isLoggedIn)return<LoginPage onLogin={handleLogin}/>;
  if(!loaded)return<SplashScreen onComplete={handleComplete}/>;
  const th=THEMES[theme];

  return(
    <div style={{minHeight:"100vh",background:th.bg,color:th.text,position:"relative"}} onClick={()=>{showNotifs&&setShowNotifs(false);}}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} .dashboard-fade{animation:fadePageIn 0.25s ease} @keyframes fadePageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
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
        <AppSidebar activePage={activePage} setActivePage={navigateTo} isOpen={sidebarOpen} isMobile={false} onToggle={()=>setSidebarOpen(o=>!o)} language={language}/>
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
                {searchQuery&&filteredFraudMethods.length>0&&(<div style={{background:th.cardBg,border:`1px solid ${th.accent}44`,borderRadius:8,padding:16}}><div style={{color:th.accent,fontSize:12,fontFamily:"monospace",marginBottom:12}}>🔍 FRAUD METHODS — "{searchQuery}"</div>{filteredFraudMethods.map(m=>(<div key={m.title} style={{background:th.bg,border:`1px solid ${th.border}`,borderRadius:6,padding:"12px 16px",marginBottom:8}}><div style={{color:th.text,fontSize:13,fontWeight:600}}>{m.icon} {m.title}</div><div style={{color:"#666",fontSize:11,marginTop:4,lineHeight:1.5}}>{m.desc}</div></div>))}</div>)}

                {activePage==="overview"&&(
                  <>
                    <UploadSection key={refreshKey} onDataLoaded={handleDataLoaded} flaggedData={flaggedData} agentName={agentName} userEmail={userEmail} fileUploaded={fileUploaded}/>
                    {fileUploaded&&(<div style={{background:"#0f1a0f",border:"1px solid #22c55e",borderRadius:8,padding:"10px 16px",color:"#22c55e",fontSize:13}}>✅ Analysis complete — {allData.length} records scanned, <strong>{flaggedData.length}</strong> fraud cases flagged. Use the buttons above to download the report or send an email alert.</div>)}

                    {/* Feature 1: Animated metric cards */}
                    <AnimatedMetricCards
                      flaggedCount={fileUploaded?flaggedData.length:76}
                      totalSavings={fileUploaded?`₹${(flaggedData.reduce((s,r)=>s+r.amount,0)/100000).toFixed(1)}L`:"₹95.8L"}
                      activeCases={fileUploaded?flaggedData.length:75}
                      escalatedCases={cases.filter(c=>c.status==="ESCALATED").length}
                    />

                    {/* Feature 7: Trend chart */}
                    <FraudTrendChart accent={th.accent}/>

                    {/* Charts */}
                    <ChartSection data={fileUploaded?flaggedData:[]} fileUploaded={fileUploaded} accent={th.accent}/>

                    {/* Feature 6: India Heatmap */}
                    <IndiaHeatmap data={fileUploaded?flaggedData:[]} accent={th.accent}/>

                    {/* Feature 8: Scheme Leaderboard */}
                    <SchemeLeaderboard data={fileUploaded?flaggedData:[]} accent={th.accent}/>

                    {fileUploaded&&<NetworkGraph data={flaggedData}/>}

                    {/* Feature 13/14/16: CaseTable with filter, bulk actions, pagination */}
                    <CaseTable
                      cases={fileUploaded?nlpCases:[]}
                      processingCaseIds={processingIds}
                      exitingCaseIds={exitingIds}
                      onEscalate={handleEscalate}
                      onResolve={handleResolve}
                      searchQuery={searchQuery}
                    />
                  </>
                )}
                {activePage==="alerts"   &&<AlertsPage/>}
                {activePage==="accounts" &&<AccountsPage/>}
                {activePage==="analytics"&&<AnalyticsPage/>}
                {activePage==="help"     &&<HelpPage/>}
                {activePage==="faq"      &&<FAQPage/>}
                {activePage==="terms"    &&<TermsPage/>}
                {activePage==="settings" &&<SettingsPage userEmail={userEmail} agentName={agentName} onLogout={handleLogout} theme={theme} setTheme={(t)=>{setTheme(t);applyTheme(t);}} language={language} setLanguage={setLanguage}/>}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
