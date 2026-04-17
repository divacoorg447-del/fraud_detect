import { useState, useCallback, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import AppSidebar from "@/components/AppSidebar";
import DashboardHeader, { THEMES, ThemeName, applyTheme } from "@/components/DashboardHeader";
import MetricCards from "@/components/MetricCards";
import ChartCards from "@/components/ChartCards";
import CaseTable, { FraudCase } from "@/components/CaseTable";

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
interface Row {
  beneficiary_id:    string;
  name:              string;
  phone:             string;
  state:             string;
  scheme:            string;
  claims_per_month:  number;
  amount:            number;
  location_cluster:  number;
  account_age_days:  number;
}

// ─────────────────────────────────────────────
//  WEB3FORMS EMAIL
//  Key is stored here — already set from your dashboard
// ─────────────────────────────────────────────
const WEB3_KEY = "9db5d5ee-f34a-49d7-86c9-b3ddf7f750d2";

const sendFraudAlert = async (
  userEmail: string,
  scheme: string,
  amount: string,
  state: string,
  caseId: string
) => {
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3_KEY,
        subject:    "🚨 FraudGuard CRITICAL Alert",
        from_name:  "FraudGuard Intelligence System",
        email:      userEmail,
        message:
          `A new fraud case has been detected.\n\n` +
          `Case ID:  ${caseId}\n` +
          `Scheme:   ${scheme}\n` +
          `State:    ${state}\n` +
          `Amount:   ${amount}\n` +
          `Severity: CRITICAL\n\n` +
          `Login to FraudGuard to investigate immediately.\n\n` +
          `— FraudGuard Intelligence System`,
      }),
    });
    const json = await res.json();
    if (!json.success) console.error("Web3Forms error:", json);
  } catch (e) {
    console.error("Alert send failed:", e);
  }
};

// ─────────────────────────────────────────────
//  EMAIL VALIDATION
// ─────────────────────────────────────────────
const BAD_PATTERNS = [/\.{2,}/, /@.*@/, /^[.+\-_]/, /[.+\-_]@/, /@[.\-]/, /[.\-]$/];
const STRICT_RE = /^[a-zA-Z0-9]([a-zA-Z0-9._+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function strictEmailOk(e: string) {
  e = e.trim();
  if (!e || e.length < 6 || e.length > 254) return false;
  for (const p of BAD_PATTERNS) if (p.test(e)) return false;
  if (!STRICT_RE.test(e)) return false;
  const [local, domain] = e.split("@");
  if (!local || local.length > 64 || !domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop();
  return !!(tld && tld.length >= 2);
}

function getEmailPhrase(e: string): ["ok" | "err" | "", string] {
  e = e.trim();
  if (!e) return ["", "waiting..."];
  if (!e.includes("@")) return ["err", "missing @ symbol"];
  const parts = e.split("@");
  if (parts.length > 2) return ["err", "multiple @ symbols"];
  const [local, domain] = parts;
  if (!local) return ["err", "username before @ is empty"];
  if (/^[.+\-_]/.test(local)) return ["err", "username cannot start with special char"];
  if (/[.+\-_]$/.test(local)) return ["err", "username cannot end with special char"];
  if (/\.{2,}/.test(local)) return ["err", "consecutive dots in username"];
  if (!domain) return ["err", "missing domain"];
  if (!domain.includes(".")) return ["err", "domain needs a dot"];
  if (!STRICT_RE.test(e)) return ["err", "invalid format"];
  return ["ok", "valid ✓"];
}

// ─────────────────────────────────────────────
//  FRAUD METHODS
// ─────────────────────────────────────────────
const FRAUD_METHODS = [
  { title: "Synthetic Identity Fraud", desc: "Data Cross-Matching: Match name, DOB, and address fragments against credit bureau thin file alerts.", icon: "🧬" },
  { title: "Ghost Beneficiaries",      desc: "Aadhaar e-KYC Validation: Reject any bank account linkage where the account holder name hash does not match NPCI.", icon: "👻" },
  { title: "Claiming for Deceased",    desc: "Registrar of Deaths API Integration: Daily automated check against the state death registry database.", icon: "💀" },
  { title: "Duplicate Claims",         desc: "Fuzzy Logic De-duplication: Levenshtein distance algorithms on names combined with mobile number matching.", icon: "📋" },
  { title: "Bid Rigging",              desc: "Statistical Variance Analysis: Flag contracts where winning bid is within 2% of estimate but losers are 20%+ higher.", icon: "📊" },
  { title: "Product Substitution",     desc: "Geotagged Photo Verification: Timestamped, geolocation-stamped photos cross-referenced with vendor coordinates.", icon: "📸" },
  { title: "Ghost Employees",          desc: "Facial Recognition Attendance: Cross-reference biometric clock-in data with payroll disbursement lists.", icon: "🏢" },
  { title: "Crop Insurance Collusion", desc: "Remote Sensing & NDVI Analysis: Compare reported crop loss with satellite imagery for that specific plot.", icon: "🌾" },
  { title: "Fake Invoice Submission",  desc: "GSTIN Portal API Verification: Real-time validation of invoice numbers against the GST Network.", icon: "🧾" },
];

// ─────────────────────────────────────────────
//  LOGIN PAGE
// ─────────────────────────────────────────────
type AuthMode = "signin" | "register" | "guest";

const LoginPage = ({ onLogin }: { onLogin: (name: string, email: string) => void }) => {
  const [mode, setMode]             = useState<AuthMode>("signin");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [pwd, setPwd]               = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const [nameHint,  setNameHint]  = useState<{ cls: "ok" | "err" | ""; text: string }>({ cls: "", text: "" });
  const [emailHint, setEmailHint] = useState<{ cls: "ok" | "err" | ""; text: string }>({ cls: "", text: "" });
  const [fmtPhrase, setFmtPhrase] = useState("waiting...");
  const [fmtColor,  setFmtColor]  = useState("#555");

  const handleNameChange = (v: string) => {
    setName(v);
    const t = v.trim();
    if (t.length > 0 && t.length < 2) setNameHint({ cls: "err", text: "⚠ Too short" });
    else if (t.length >= 2)            setNameHint({ cls: "ok",  text: "✓ Accepted" });
    else                               setNameHint({ cls: "",    text: "" });
  };

  const handleEmailChange = (v: string) => {
    setEmail(v);
    const [st, phrase] = getEmailPhrase(v);
    setFmtPhrase(phrase);
    setFmtColor(st === "ok" ? "#22a855" : st === "err" ? "#cc3333" : "#555");
    if (!v) { setEmailHint({ cls: "", text: "" }); return; }
    setEmailHint(st === "ok"
      ? { cls: "ok",  text: "✓ Email accepted" }
      : { cls: "err", text: "⚠ " + phrase });
  };

  const handleSubmit = () => {
    setError("");
    const n = name.trim(), e = email.trim();
    if (mode === "guest") { doLogin("Guest Agent", "guest@fraudguard.in"); return; }
    if (!n)           { setError("Agent name is required"); return; }
    if (n.length < 2) { setError("Name must be at least 2 characters"); return; }
    if (!e)           { setError("Email is required"); return; }
    if (!strictEmailOk(e)) { const [, ph] = getEmailPhrase(e); setError(ph); return; }
    if (mode === "register") {
      if (!pwd)           { setError("Password is required"); return; }
      if (pwd.length < 6) { setError("Password must be at least 6 characters"); return; }
      if (pwd !== confirmPwd) { setError("Passwords do not match"); return; }
    }
    doLogin(n, e);
  };

  const doLogin = (n: string, e: string) => {
    setLoading(true);
    localStorage.setItem("fraudguard_name", n);
    localStorage.setItem("fraudguard_email", e);
    setTimeout(() => { setLoading(false); onLogin(n, e); }, 1500);
  };

  const hintSty = (cls: "ok" | "err" | ""): React.CSSProperties => ({
    fontSize: 10, fontFamily: "monospace", marginTop: 3, paddingLeft: 2, minHeight: 14,
    color: cls === "ok" ? "#22a855" : cls === "err" ? "#cc3333" : "transparent",
  });

  const modeTab = (m: AuthMode, label: string) => (
    <button
      onClick={() => { setMode(m); setError(""); }}
      style={{ flex: 1, padding: "9px 0", background: mode === m ? "#cc0000" : "transparent", border: "none", color: mode === m ? "#fff" : "#666", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, cursor: "pointer", borderRadius: mode === m ? 3 : 0, transition: "all .2s" }}
    >{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030303", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <style>{`
        @keyframes gridMove  {0%{transform:translateY(0)}100%{transform:translateY(40px)}}
        @keyframes scan      {0%{top:-2%}100%{top:102%}}
        @keyframes blink     {0%,100%{opacity:1}50%{opacity:0}}
        @keyframes shake     {0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes ticker    {0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
        @keyframes pulseNode {0%,100%{opacity:0.18;transform:scale(1)}50%{opacity:0.45;transform:scale(1.15)}}
        @keyframes floatCard {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes redPulse  {0%,100%{border-color:rgba(204,0,0,0.4)}50%{border-color:rgba(204,0,0,0.9)}}
        .lg-inp{width:100%;background:#080808;border:1px solid rgba(204,0,0,0.2);border-radius:4px;padding:10px 13px;color:#e0e0e0;font-size:12px;font-family:monospace;outline:none;transition:border-color .2s,box-shadow .2s;margin-top:5px;box-sizing:border-box}
        .lg-inp:focus{border-color:rgba(204,0,0,0.7)!important;box-shadow:0 0 0 3px rgba(204,0,0,0.1)!important}
        .lg-inp::placeholder{color:#2a2a2a}
        .lg-inp.valid{border-color:rgba(0,180,80,0.6)!important}
        .lg-inp.invalid{border-color:rgba(204,0,0,0.8)!important}
        .bg-node{position:absolute;border-radius:50%;pointer-events:none;animation:pulseNode 3s ease-in-out infinite}
        .fc{position:absolute;background:rgba(10,0,0,0.75);border:1px solid rgba(204,0,0,0.18);border-radius:4px;font-family:monospace;pointer-events:none;padding:8px 12px}
      `}</style>

      {/* Animated bg */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(180,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(180,0,0,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px", animation: "gridMove 10s linear infinite" }} />
      <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(204,0,0,0.3),transparent)", animation: "scan 5s linear infinite", zIndex: 2 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)", pointerEvents: "none", zIndex: 2 }} />

      {/* Network nodes */}
      {[{w:6,top:"8%",left:"12%",d:"0s"},{w:4,top:"15%",left:"28%",d:"0.5s"},{w:8,top:"22%",left:"8%",d:"1s"},{w:5,top:"35%",left:"20%",d:"1.5s"},{w:4,top:"12%",right:"14%",d:"0.3s"},{w:7,top:"28%",right:"9%",d:"0.8s"},{w:5,top:"42%",right:"22%",d:"1.2s"},{w:4,top:"55%",left:"10%",d:"0.6s"},{w:6,top:"68%",right:"12%",d:"1.8s",bg:"#ff4400"},{w:4,top:"75%",left:"25%",d:"0.9s"}].map((n,i)=>(
        <div key={i} className="bg-node" style={{width:n.w,height:n.w,background:(n as any).bg||"#cc0000",top:n.top,left:(n as any).left,right:(n as any).right,animationDelay:n.d}}/>
      ))}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.1}} viewBox="0 0 800 700">
        <line x1="96" y1="56" x2="224" y2="105" stroke="#cc0000" strokeWidth="1"/>
        <line x1="64" y1="154" x2="96" y2="56" stroke="#cc0000" strokeWidth="1"/>
        <line x1="688" y1="84" x2="728" y2="196" stroke="#cc0000" strokeWidth="1"/>
        <line x1="200" y1="574" x2="736" y2="476" stroke="#ff4400" strokeWidth="1.5"/>
      </svg>

      {/* Floating cards LEFT */}
      {[{top:"8%",d:"0s",color:"#cc0000",label:"ALERT — GOV-9921",line:"312 ghost workers",tag:"MGNREGS",st:"Jharkhand"},{top:"30%",d:"1s",color:"#ff4400",label:"DUPLICATE IDs",line:"Same phone · 47 accs",tag:"PM-KISAN",st:"UP"},{top:"54%",d:"0.5s",color:"#cc0000",label:"SYNTHETIC ID",line:"Aadhaar mismatch",tag:"Ayushman",st:"Bihar"},{top:"76%",d:"2s",color:"#886600",label:"DECEASED CLAIM",line:"Death registry match",tag:"PMAY",st:"Rajasthan"}].map((c,i)=>(
        <div key={i} className="fc" style={{top:c.top,left:"1%",width:185,animation:`floatCard ${3.5+i*0.5}s ease-in-out ${c.d} infinite`}}>
          <div style={{color:c.color,fontSize:8,letterSpacing:1,marginBottom:3}}>{c.label}</div>
          <div style={{color:"#555",fontSize:9,lineHeight:1.5}}>{c.line}<br/><span style={{color:"#ff9900"}}>{c.tag}</span> · {c.st}</div>
        </div>
      ))}
      {/* Floating cards RIGHT */}
      {[{top:"8%",d:"0.8s",color:"#cc0000",label:"FAKE INVOICE",line:"GSTIN invalid · ₹4.2L",tag:"PMEGP",st:"Maharashtra"},{top:"30%",d:"1.5s",color:"#cc0000",label:"GHOST EMPLOYEES",line:"Zero attendance · 28 IDs",tag:"Payroll",st:"MP"},{top:"54%",d:"0.3s",color:"#cc5500",label:"BID RIGGING",line:"Variance <2% · Contract",tag:"PWD tender",st:"Gujarat"},{top:"76%",d:"1.8s",color:"#cc0000",label:"CROP FRAUD",line:"NDVI mismatch · 120 plots",tag:"PM-FASAL",st:"Haryana"}].map((c,i)=>(
        <div key={i} className="fc" style={{top:c.top,right:"1%",width:185,animation:`floatCard ${3.8+i*0.4}s ease-in-out ${c.d} infinite`}}>
          <div style={{color:c.color,fontSize:8,letterSpacing:1,marginBottom:3}}>{c.label}</div>
          <div style={{color:"#555",fontSize:9,lineHeight:1.5}}>{c.line}<br/><span style={{color:"#ff9900"}}>{c.tag}</span> · {c.st}</div>
        </div>
      ))}

      {/* Login Card */}
      <div style={{ position: "relative", zIndex: 10, width: 420, background: "rgba(6,6,6,0.97)", border: "1px solid rgba(204,0,0,0.5)", borderRadius: 6, padding: "32px 32px 24px", boxShadow: "0 0 80px rgba(204,0,0,0.18), inset 0 0 60px rgba(0,0,0,0.4)", animation: "redPulse 3s ease-in-out infinite" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#cc0000,transparent)", borderRadius: "6px 6px 0 0" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🛡️</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: 6, fontFamily: "monospace" }}>FRAUDGUARD</div>
          <div style={{ color: "#cc0000", fontSize: 8, letterSpacing: 4, marginTop: 4, fontFamily: "monospace" }}>GOVERNMENT INTELLIGENCE SYSTEM</div>
          <div style={{ color: "#1a1a1a", fontSize: 8, marginTop: 4, fontFamily: "monospace" }}>SESSION_ID: FD-2026-04-14-001 | NODE: IN-SEC-01</div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 6 }}>
            {["SECURE","ENCRYPTED","MONITORED"].map(tag=>(
              <span key={tag} style={{background:"#0a0000",border:"1px solid rgba(204,0,0,0.15)",color:"rgba(204,0,0,0.5)",fontSize:8,padding:"2px 8px",borderRadius:2,fontFamily:"monospace",letterSpacing:1}}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", background: "#0a0a0a", border: "1px solid rgba(204,0,0,0.15)", borderRadius: 4, marginBottom: 18, overflow: "hidden" }}>
          {modeTab("signin",   "SIGN IN")}
          {modeTab("register", "REGISTER")}
          {modeTab("guest",    "GUEST")}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#150000", border: "1px solid #cc0000", borderRadius: 3, padding: "8px 12px", color: "#cc0000", fontSize: 11, marginBottom: 12, fontFamily: "monospace", animation: "shake 0.3s ease" }}>
            ⛔ {error}
          </div>
        )}

        {mode !== "guest" && (
          <>
            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>
                AGENT NAME <span style={{ color: "#cc0000" }}>*</span>
              </label>
              <input type="text" value={name} onChange={e=>handleNameChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="e.g. Shree Kumar" className={"lg-inp"+(nameHint.cls==="ok"?" valid":nameHint.cls==="err"?" invalid":"")} />
              <div style={hintSty(nameHint.cls)}>{nameHint.text || " "}</div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>
                AGENT EMAIL <span style={{ color: "#cc0000" }}>*</span>
                <span style={{ color: fmtColor, marginLeft: 8 }}>{fmtPhrase}</span>
              </label>
              <input type="email" value={email} onChange={e=>handleEmailChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="agent@cbi.gov.in" className={"lg-inp"+(emailHint.cls==="ok"?" valid":emailHint.cls==="err"?" invalid":"")} />
              <div style={hintSty(emailHint.cls)}>{emailHint.text || " "}</div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: mode === "register" ? 12 : 18 }}>
              <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>
                PASSWORD <span style={{ color: "#cc0000" }}>*</span>
              </label>
              <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="••••••••" className="lg-inp" />
            </div>

            {/* Confirm password */}
            {mode === "register" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>CONFIRM PASSWORD <span style={{ color: "#cc0000" }}>*</span></label>
                <input type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="••••••••" className="lg-inp" />
                {confirmPwd && pwd !== confirmPwd && <div style={hintSty("err")}>⚠ Passwords do not match</div>}
                {confirmPwd && pwd === confirmPwd && pwd.length >= 6 && <div style={hintSty("ok")}>✓ Passwords match</div>}
              </div>
            )}
          </>
        )}

        {mode === "guest" && (
          <div style={{ background: "#0a0000", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 4, padding: "14px 16px", marginBottom: 18, textAlign: "center" }}>
            <div style={{ color: "#cc0000", fontSize: 13, marginBottom: 6 }}>👀 Guest Access</div>
            <div style={{ color: "#555", fontSize: 11, lineHeight: 1.6 }}>You will have read-only access. No alerts will be sent. Full features require registration.</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", background: loading ? "#120000" : "#cc0000", color: loading ? "#550000" : "#fff", border: loading ? "1px solid #2a0000" : "none", borderRadius: 4, padding: "12px", cursor: loading ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 3, fontFamily: "monospace", transition: "background .15s" }}
        >
          {loading
            ? <span>AUTHENTICATING<span style={{ animation: "blink 1s infinite", display: "inline-block" }}>_</span></span>
            : mode === "signin" ? "SIGN IN →"
            : mode === "register" ? "CREATE ACCOUNT →"
            : "ENTER AS GUEST →"}
        </button>

        {/* Switch mode link */}
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#444" }}>
          {mode === "signin"
            ? <span>No account? <span onClick={()=>setMode("register")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Register here</span></span>
            : mode === "register"
            ? <span>Have an account? <span onClick={()=>setMode("signin")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Sign in</span></span>
            : <span>Want full access? <span onClick={()=>setMode("register")} style={{color:"#cc0000",cursor:"pointer",textDecoration:"underline"}}>Register free</span></span>}
        </div>

        {/* Status grid */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[["CLEARANCE","LEVEL 4","#aa0000"],["STATUS","ACTIVE","#1a7a3a"],["REGION","IN-SOUTH","#aa0000"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#050505",border:"1px solid #0f0f0f",borderRadius:3,padding:8,textAlign:"center"}}>
              <div style={{color:"#1e1e1e",fontSize:8,fontFamily:"monospace"}}>{l}</div>
              <div style={{color:c,fontSize:10,fontFamily:"monospace",marginTop:3,fontWeight:700}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:10,color:"#111",fontSize:8,fontFamily:"monospace"}}>UNAUTHORIZED ACCESS WILL BE PROSECUTED · IT ACT 2000</div>
      </div>

      {/* Ticker */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,overflow:"hidden",whiteSpace:"nowrap",background:"#050000",borderTop:"1px solid rgba(204,0,0,0.12)",padding:"5px 0",zIndex:20}}>
        <div style={{display:"inline-block",animation:"ticker 30s linear infinite"}}>
          <span style={{color:"#cc0000",fontFamily:"monospace",fontSize:9,letterSpacing:1}}>
            &nbsp;&nbsp;[LIVE]&nbsp;
            <span style={{color:"#ff9900"}}>GOV-9921</span><span style={{color:"#555"}}> Ghost workers Jharkhand ·&nbsp;</span><span style={{color:"#cc0000"}}>CRITICAL</span>
            <span style={{color:"#333"}}>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
            <span style={{color:"#ff9900"}}>GOV-7703</span><span style={{color:"#555"}}> Fake Ayushman claims Bihar ·&nbsp;</span><span style={{color:"#cc0000"}}>CRITICAL</span>
            <span style={{color:"#333"}}>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
            <span style={{color:"#ff9900"}}>GOV-8847</span><span style={{color:"#555"}}> Duplicate IDs PM-KISAN UP ·&nbsp;</span><span style={{color:"#dd6b00"}}>HIGH</span>
            <span style={{color:"#333"}}>&nbsp;&nbsp;|||&nbsp;&nbsp;</span>
            <span style={{color:"#555"}}>FRAUDGUARD MONITORING 2.4M RECORDS · DETECTION RATE 15.2% · ₹95.8L RECOVERED</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  INNER PAGES
// ─────────────────────────────────────────────
const AlertsPage = () => (
  <div style={{padding:24}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>🔴 Live Alerts</h2>
    {[{id:"GOV-9921",msg:"Critical fraud in MGNREGS Jharkhand — 312 ghost workers",time:"2 min ago",sev:"CRITICAL"},{id:"GOV-7703",msg:"Fake Ayushman Bharat claims detected in Bihar",time:"5 min ago",sev:"CRITICAL"},{id:"GOV-8847",msg:"Duplicate IDs found in PM-KISAN UP",time:"12 min ago",sev:"HIGH"},{id:"GOV-4401",msg:"Shell entities flagged in PMEGP Maharashtra",time:"18 min ago",sev:"HIGH"},{id:"GOV-6612",msg:"Address fraud detected in PMAY Rajasthan",time:"25 min ago",sev:"MEDIUM"}].map(a=>(
      <div key={a.id} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><span style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace",fontSize:12,marginRight:12}}>{a.id}</span><span style={{color:"var(--fg-text,#ccc)",fontSize:13}}>{a.msg}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:"#555",fontSize:11}}>{a.time}</span><span style={{background:a.sev==="CRITICAL"?"#cc0000":a.sev==="HIGH"?"#dd6b20":"#d69e2e",color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>{a.sev}</span></div>
      </div>
    ))}
  </div>
);

const AccountsPage = () => (
  <div style={{padding:24}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>👥 Monitored Accounts</h2>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr style={{borderBottom:"1px solid var(--fg-border,#1e1e1e)",color:"#666"}}>{["Beneficiary ID","Name","Phone","State","Schemes","Risk Score"].map(h=>(<th key={h} style={{textAlign:"left",padding:"10px 14px",fontFamily:"monospace",fontSize:10}}>{h}</th>))}</tr></thead>
      <tbody>{[["BEN0021","Rahul Kumar","9812345678","Bihar","MGNREGS","92%"],["BEN0047","Amit Sharma","9812345678","Jharkhand","PMAY","88%"],["BEN0093","Meena Kumari","9812345678","Maharashtra","Mid-Day Meal","95%"],["BEN0112","Kavita Verma","9867890123","UP","PM-KISAN","76%"],["BEN0134","Anita Roy","9889012345","Rajasthan","Ayushman Bharat","81%"]].map(([id,n,p,s,sc,r])=>(<tr key={id} style={{borderBottom:"1px solid var(--fg-border,#161616)"}}><td style={{padding:"10px 14px",color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>{id}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#fff)"}}>{n}</td><td style={{padding:"10px 14px",color:"#888"}}>{p}</td><td style={{padding:"10px 14px",color:"#888"}}>{s}</td><td style={{padding:"10px 14px",color:"var(--fg-text,#ccc)"}}>{sc}</td><td style={{padding:"10px 14px"}}><span style={{color:"var(--fg-accent,#cc0000)",fontWeight:700}}>{r}</span></td></tr>))}</tbody>
    </table>
  </div>
);

const AnalyticsPage = () => (
  <div style={{padding:24}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:16,fontSize:16}}>📊 Analytics Summary</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
      {[{label:"Total Records Scanned",value:"2.4M",color:"var(--fg-text,#fff)"},{label:"Fraud Detection Rate",value:"15.2%",color:"var(--fg-accent,#cc0000)"},{label:"Amount Recovered",value:"₹95.8L",color:"#22c55e"},{label:"Active Investigations",value:"75",color:"#d69e2e"},{label:"Resolved Cases",value:"1,102",color:"#22c55e"},{label:"States Covered",value:"6",color:"var(--fg-text,#fff)"}].map(({label,value,color})=>(
        <div key={label} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:20}}><div style={{color:"#666",fontSize:11,fontFamily:"monospace",marginBottom:8}}>{label}</div><div style={{color,fontSize:28,fontWeight:700}}>{value}</div></div>
      ))}
    </div>
    <h2 style={{color:"var(--fg-text,#fff)",marginTop:32,marginBottom:16,fontSize:16}}>🔍 Fraud Detection Methods</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
      {FRAUD_METHODS.map(m=>(<div key={m.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:16}}><div style={{fontSize:22,marginBottom:8}}>{m.icon}</div><div style={{color:"var(--fg-accent,#cc0000)",fontSize:12,fontWeight:600,marginBottom:6}}>{m.title}</div><div style={{color:"#666",fontSize:11,lineHeight:1.5}}>{m.desc}</div></div>))}
    </div>
  </div>
);

const HelpPage = () => (
  <div style={{padding:24,maxWidth:800}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>❓ Help & Fraud Prevention Guide</h2>
    <p style={{color:"#666",fontSize:12,marginBottom:24}}>How to protect yourself and your beneficiaries from fraud.</p>
    {[
      { icon:"🔒", title:"Never Share Your OTP", body:"Government schemes never ask for OTP over phone or SMS. If anyone calls asking for OTP, it is a fraud. Hang up immediately and report to 1930 (Cyber Crime Helpline)." },
      { icon:"🪪", title:"Protect Your Aadhaar", body:"Never share your Aadhaar number, biometric data, or OTP with unknown persons. Verify the official website before entering any details." },
      { icon:"📱", title:"Use Official Apps Only", body:"Only download government scheme apps from official Play Store / App Store listings. Verify the publisher name matches the ministry." },
      { icon:"🏦", title:"Check Your Bank Account", body:"Regularly check your bank account for unauthorized transactions. Enable SMS alerts for every transaction. Report fraud to your bank within 3 days for maximum recovery." },
      { icon:"🌐", title:"Verify Website URLs", body:"Always check that government portals use .gov.in domains. Look for the padlock (HTTPS). Fraudulent lookalike sites often use .com or .net." },
      { icon:"📞", title:"Cyber Crime Helpline", body:"National Cyber Crime Helpline: 1930. Report online at cybercrime.gov.in. PM Fraud Alert: 14447. State-level fraud cells are available in all 28 states." },
      { icon:"📋", title:"How FraudGuard Detects Fraud", body:"Our ML model cross-checks beneficiary data across 9 fraud vectors including ghost IDs, duplicate phones, deceased persons, and anomalous claim amounts. Data is refreshed every 24 hours." },
      { icon:"🚨", title:"What To Do If You Detect Fraud", body:"Click 'Escalate Case' on any flagged record. The case is automatically routed to the senior officer queue. You will receive a confirmation email via FraudGuard." },
    ].map(item=>(
      <div key={item.title} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:10,padding:"16px 20px",marginBottom:12,display:"flex",gap:16,alignItems:"flex-start"}}>
        <div style={{fontSize:28,flexShrink:0,marginTop:2}}>{item.icon}</div>
        <div>
          <div style={{color:"var(--fg-text,#fff)",fontSize:14,fontWeight:600,marginBottom:6}}>{item.title}</div>
          <div style={{color:"#777",fontSize:12,lineHeight:1.7}}>{item.body}</div>
        </div>
      </div>
    ))}
  </div>
);

const FAQPage = () => {
  const [open, setOpen] = useState<number|null>(null);
  const faqs = [
    { q:"What is FraudGuard?", a:"FraudGuard is an AI-powered government fraud detection intelligence system that scans beneficiary data across 9 fraud vectors and flags suspicious activity in real time." },
    { q:"How does the ML model work?", a:"The model uses rule-based anomaly detection combined with clustering. It flags records where claims_per_month > 6 or amount > ₹40,000, shared phone numbers, new accounts (<30 days old) with high claims, and location cluster anomalies." },
    { q:"How do I upload beneficiary data?", a:"Go to Overview → Upload Beneficiary Data section. Drag and drop a CSV file or click to browse. The required columns are: beneficiary_id, name, phone, state, scheme, claims_per_month, amount, location_cluster, account_age_days." },
    { q:"How do email alerts work?", a:"When fraud is detected after uploading a CSV, an automatic email alert is sent via Web3Forms to the email address you registered with. Make sure your email is correct in Settings." },
    { q:"Can I change my theme?", a:"Yes. Click the Moon/Sun icon near the refresh button in the header to open the theme picker. You can choose Dark Red, Dark Blue, Dark Green, Midnight, or Light." },
    { q:"What does Escalate Case do?", a:"Clicking Escalate Case on a fraud record marks it as ESCALATED and routes it to the senior officer queue." },
    { q:"How do I logout?", a:"Click your name/avatar in the top right corner of the header, then click LOGOUT. You can also logout from Settings page." },
    { q:"Is this data secure?", a:"All data is processed client-side. No beneficiary data is uploaded to any external server. The only external call is the Web3Forms fraud alert email notification." },
  ];
  return (
    <div style={{padding:24,maxWidth:740}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📌 Frequently Asked Questions</h2>
      <p style={{color:"#666",fontSize:12,marginBottom:24}}>Common questions about FraudGuard.</p>
      {faqs.map((f,i)=>(
        <div key={i} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,marginBottom:10,overflow:"hidden"}}>
          <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{color:"var(--fg-text,#fff)",fontSize:13,fontWeight:600}}>{f.q}</span>
            <span style={{color:"var(--fg-accent,#cc0000)",fontSize:18,lineHeight:1}}>{open===i?"−":"+"}</span>
          </button>
          {open===i&&(
            <div style={{padding:"0 18px 14px",color:"#777",fontSize:12,lineHeight:1.7,borderTop:"1px solid var(--fg-border,#1e1e1e)"}}>
              <div style={{paddingTop:12}}>{f.a}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TermsPage = () => (
  <div style={{padding:24,maxWidth:740}}>
    <h2 style={{color:"var(--fg-text,#fff)",marginBottom:6,fontSize:18}}>📄 Terms & Conditions</h2>
    <p style={{color:"#666",fontSize:12,marginBottom:24}}>Last updated: April 2026</p>
    {[
      { title:"1. Authorized Use Only", body:"FraudGuard is an internal government intelligence tool. Access is restricted to authorized personnel with valid credentials. Unauthorized access is a criminal offense under IT Act 2000, Section 66." },
      { title:"2. Data Confidentiality", body:"All beneficiary data processed through this system is classified RESTRICTED. Users must not share, export, or transmit data to unauthorized parties." },
      { title:"3. Accuracy Disclaimer", body:"The fraud detection model provides probabilistic outputs. Flagged records require manual review before action. The system does not guarantee 100% accuracy." },
      { title:"4. Email Alerts", body:"By registering, you consent to receive automated fraud alert emails at the address provided via Web3Forms. You can disable alerts in Settings at any time." },
      { title:"5. Session Security", body:"Each session is logged with a unique session ID. Users are responsible for logging out after each session." },
      { title:"6. Data Retention", body:"No beneficiary data is stored on external servers. CSV data is processed in-browser only. Email alerts contain case metadata only, not personal beneficiary data." },
      { title:"7. Reporting Obligations", body:"All confirmed fraud cases must be escalated through official channels within 24 hours of detection." },
    ].map(item=>(
      <div key={item.title} style={{marginBottom:20}}>
        <div style={{color:"var(--fg-accent,#cc0000)",fontSize:13,fontWeight:700,marginBottom:6,fontFamily:"monospace"}}>{item.title}</div>
        <div style={{color:"#777",fontSize:12,lineHeight:1.7,background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"12px 16px"}}>{item.body}</div>
      </div>
    ))}
  </div>
);

const SettingsPage = ({ userEmail, agentName, onLogout, theme, setTheme }: { userEmail:string; agentName:string; onLogout:()=>void; theme:ThemeName; setTheme:(t:ThemeName)=>void }) => {
  const [settings, setSettings] = useState({ agent_name:agentName, alert_threshold:"0.75", claims_limit:"6", amount_limit:"40,000", email_alerts:true });
  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    localStorage.setItem("fraudguard_settings", JSON.stringify(settings));
    localStorage.setItem("fraudguard_name", settings.agent_name);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div style={{padding:24,maxWidth:560}}>
      <h2 style={{color:"var(--fg-text,#fff)",marginBottom:24,fontSize:16}}>⚙️ Settings</h2>

      {/* Theme */}
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>Dashboard Theme</div>
        <div style={{color:"#555",fontSize:11,marginBottom:12}}>Choose your preferred colour scheme</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {(Object.entries(THEMES) as [ThemeName, typeof THEMES[ThemeName]][]).map(([key,val])=>(
            <button key={key} onClick={()=>{ setTheme(key); applyTheme(key); }}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:theme===key?"var(--fg-accent,#cc0000)22":"transparent",border:`1px solid ${theme===key?"var(--fg-accent,#cc0000)":"#333"}`,borderRadius:6,cursor:"pointer",color:theme===key?"var(--fg-accent,#cc0000)":"#888",fontSize:11,fontFamily:"monospace",transition:"all .2s"}}>
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email alerts */}
      <div style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"16px 18px",marginBottom:12}}>
        <div style={{color:"var(--fg-text,#fff)",fontSize:13,marginBottom:4}}>Email Alerts</div>
        <div style={{color:"#555",fontSize:11,marginBottom:12}}>Registered email: <span style={{color:"var(--fg-accent,#cc0000)"}}>{userEmail}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"#888",fontSize:12}}>Send fraud alerts to email</span>
          <button onClick={()=>setSettings(s=>({...s,email_alerts:!s.email_alerts}))}
            style={{background:settings.email_alerts?"#22c55e":"#333",border:"none",borderRadius:20,padding:"4px 16px",color:"#fff",cursor:"pointer",fontSize:12,transition:"background .2s"}}>
            {settings.email_alerts?"ON":"OFF"}
          </button>
        </div>
      </div>

      {/* Config fields */}
      {[{key:"agent_name",label:"Agent Name",desc:"Your display name"},{key:"alert_threshold",label:"Alert Threshold",desc:"Min fraud score (0–1)"},{key:"claims_limit",label:"Claims Limit",desc:"Max claims/month before flagging"},{key:"amount_limit",label:"Amount Limit (₹)",desc:"Max amount before flagging"}].map(({key,label,desc})=>(
        <div key={key} style={{background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{color:"var(--fg-text,#fff)",fontSize:13}}>{label}</div><div style={{color:"#555",fontSize:11,marginTop:2}}>{desc}</div></div>
          <input value={settings[key as keyof typeof settings] as string} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))}
            style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"var(--fg-accent,#cc0000)",fontFamily:"monospace",fontSize:13,width:120,textAlign:"right",outline:"none"}}/>
        </div>
      ))}

      <div style={{display:"flex",gap:12,marginTop:12}}>
        <button onClick={saveSettings} style={{background:saved?"#22c55e":"var(--fg-accent,#cc0000)",color:"#fff",border:"none",borderRadius:8,padding:"10px 28px",cursor:"pointer",fontSize:13,fontWeight:600,transition:"background 0.3s"}}>
          {saved?"✅ Saved!":"Save Settings"}
        </button>
        <button onClick={onLogout} style={{background:"transparent",color:"var(--fg-accent,#cc0000)",border:"1px solid var(--fg-accent,#cc0000)",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:13}}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

// ─── NETWORK GRAPH ─────────────────────────────────────────────────────────
const NetworkGraph = ({ data }: { data: Row[] }) => {
  const nodes: {id:string;x:number;y:number}[] = [], edges: {x1:number;y1:number;x2:number;y2:number}[] = [];
  const phoneMap: Record<string,string[]> = {};
  data.forEach(r=>{if(!phoneMap[r.phone])phoneMap[r.phone]=[];phoneMap[r.phone].push(r.beneficiary_id);});
  const placed: Record<string,{x:number;y:number}> = {}; let idx=0;
  Object.values(phoneMap).forEach(group=>{
    if(group.length>1){const cx=80+(idx%5)*160,cy=80+Math.floor(idx/5)*120;group.forEach((id,i)=>{const a=(i/group.length)*Math.PI*2;placed[id]={x:cx+Math.cos(a)*40,y:cy+Math.sin(a)*40};nodes.push({id,...placed[id]});});for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)edges.push({x1:placed[group[i]].x,y1:placed[group[i]].y,x2:placed[group[j]].x,y2:placed[group[j]].y});idx++;}
  });
  if(!nodes.length) return null;
  return (
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

// ─── UPLOAD SECTION ────────────────────────────────────────────────────────
const UploadSection = ({ onDataLoaded }: { onDataLoaded:(data:Row[],flagged:Row[])=>void }) => {
  const [dragging,   setDragging]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName,   setFileName]   = useState("");

  const processCSV = (text: string) => {
    setProcessing(true);
    const lines = text.trim().split("\n");
    const rows: Row[] = lines.slice(1).map(line=>{
      const v=line.split(",");
      return {beneficiary_id:v[0]?.trim(),name:v[1]?.trim(),phone:v[2]?.trim(),state:v[3]?.trim(),scheme:v[4]?.trim(),claims_per_month:Number(v[5]),amount:Number(v[6]),location_cluster:Number(v[7]),account_age_days:Number(v[8])};
    });
    const flagged = rows.filter(r =>
      r.claims_per_month > 6 ||
      r.amount > 40000 ||
      r.account_age_days < 30 ||
      r.location_cluster <= 2
    );
    setTimeout(()=>{setProcessing(false);onDataLoaded(rows,flagged);},1500);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader=new FileReader();
    reader.onload=e=>processCSV(e.target?.result as string);
    reader.readAsText(file);
  };

  const downloadSample = () => {
    const csv=["beneficiary_id,name,phone,state,scheme,claims_per_month,amount,location_cluster,account_age_days","BEN001,Rahul Kumar,9812345678,Bihar,MGNREGS,12,95000,2,15","BEN002,Priya Singh,9823456789,UP,PM-KISAN,2,8000,7,450","BEN003,Amit Sharma,9812345678,Jharkhand,PMAY,15,180000,1,8","BEN004,Sunita Devi,9834567890,Rajasthan,Ayushman Bharat,1,6000,9,600","BEN005,Raj Patel,9845678901,MP,PMEGP,3,12000,5,300","BEN006,Meena Kumari,9812345678,Maharashtra,Mid-Day Meal,18,200000,1,5"].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sample_beneficiaries.csv";a.click();
  };

  return (
    <div style={{padding:24,background:"var(--fg-card,#111)",border:"1px solid var(--fg-border,#1e1e1e)",borderRadius:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{color:"var(--fg-text,#fff)",fontWeight:600,fontSize:15}}>📂 Upload Beneficiary Data</div>
          <div style={{color:"#666",fontSize:11,marginTop:2}}>CSV · Fraud detected across 4 vectors: high claims, high amount, new account, suspicious location</div>
        </div>
        <button onClick={downloadSample} style={{background:"transparent",color:"#22c55e",border:"1px solid #22c55e",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>⬇ Sample CSV</button>
      </div>
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        onClick={()=>document.getElementById("csv-input")?.click()}
        style={{border:`2px dashed ${dragging?"var(--fg-accent,#cc0000)":"#333"}`,borderRadius:8,padding:32,textAlign:"center",cursor:"pointer",background:dragging?"rgba(204,0,0,0.05)":"transparent",transition:"all .2s"}}
      >
        <input id="csv-input" type="file" accept=".csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
        {processing
          ? <div style={{color:"var(--fg-accent,#cc0000)",fontFamily:"monospace"}}>⏳ Running fraud detection model...</div>
          : fileName
          ? <div style={{color:"#22c55e",fontWeight:600}}>✅ {fileName} — ready</div>
          : <div style={{color:"#555"}}>📁 Drag and drop CSV here or click to browse</div>}
      </div>
    </div>
  );
};

// ─── CASE DATA GENERATOR ───────────────────────────────────────────────────
const generateCasesFromRows = (rows: Row[]): FraudCase[] =>
  rows.map((r, i) => ({
    id:          `GOV-${9000 + i}`,
    scheme:      r.scheme,
    state:       r.state,
    amount:      r.amount,
    severity:    r.amount > 100000 ? "CRITICAL" : r.claims_per_month > 10 ? "HIGH" : "MEDIUM",
    status:      "OPEN",
    assignedTo:  "Unassigned",
    createdAt:   new Date().toISOString(),
    escalatedAt: null,
    resolvedAt:  null,
  }));

// ─────────────────────────────────────────────
//  ROOT COMPONENT
// ─────────────────────────────────────────────
const Index = () => {
  const savedTheme = (localStorage.getItem("fraudguard_theme") as ThemeName) || "dark-red";

  const [isLoggedIn,  setIsLoggedIn]  = useState(() => !!localStorage.getItem("fraudguard_name"));
  const [agentName,   setAgentName]   = useState(() => localStorage.getItem("fraudguard_name") || "");
  const [userEmail,   setUserEmail]   = useState(() => localStorage.getItem("fraudguard_email") || "");
  const [loaded,      setLoaded]      = useState(false);
  const [allData,     setAllData]     = useState<Row[]>([]);
  const [flaggedData, setFlaggedData] = useState<Row[]>([]);
  const [cases,       setCases]       = useState<FraudCase[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [exitingIds,    setExitingIds]    = useState<string[]>([]);
  const [fileUploaded,setFileUploaded]= useState(false);
  const [activePage,  setActivePage]  = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [theme,       setTheme]       = useState<ThemeName>(savedTheme);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { applyTheme(savedTheme); }, []);

  const handleComplete = useCallback(() => setLoaded(true), []);

  const handleLogin = (name: string, email: string) => {
    setAgentName(name); setUserEmail(email); setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("fraudguard_name");
    localStorage.removeItem("fraudguard_email");
    setIsLoggedIn(false); setLoaded(false); setAgentName(""); setUserEmail("");
  };

  const handleDataLoaded = (data: Row[], flagged: Row[]) => {
    setAllData(data);
    setFlaggedData(flagged);
    setFileUploaded(true);
    const newCases = generateCasesFromRows(flagged);
    setCases(newCases);
    if (userEmail && flagged.length > 0) {
      const caseId = "GOV-" + Math.floor(Math.random() * 9000 + 1000);
      sendFraudAlert(userEmail, flagged[0].scheme, `₹${(flagged[0].amount/100000).toFixed(1)}L`, flagged[0].state, caseId);
    }
  };

  const handleEscalate = (caseId: string) => {
    setProcessingIds(p => [...p, caseId]);
    setTimeout(() => {
      setCases(cs => cs.map(c => c.id === caseId ? { ...c, status: "ESCALATED", escalatedAt: new Date().toISOString() } : c));
      setProcessingIds(p => p.filter(id => id !== caseId));
    }, 800);
  };

  const handleResolve = (caseId: string) => {
    setProcessingIds(p => [...p, caseId]);
    setTimeout(() => {
      setExitingIds(p => [...p, caseId]);
      setTimeout(() => {
        setCases(cs => cs.map(c => c.id === caseId ? { ...c, status: "RESOLVED", resolvedAt: new Date().toISOString() } : c));
        setProcessingIds(p => p.filter(id => id !== caseId));
        setExitingIds(p => p.filter(id => id !== caseId));
      }, 300);
    }, 800);
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    setFileUploaded(false);
    setAllData([]);
    setFlaggedData([]);
    setCases([]);
  };

  const filteredFraudMethods = searchQuery
    ? FRAUD_METHODS.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;
  if (!loaded)     return <SplashScreen onComplete={handleComplete} />;

  const th = THEMES[theme];

  return (
    <div style={{ minHeight: "100vh", background: th.bg, color: th.text, position: "relative" }}
      onClick={() => { showNotifs && setShowNotifs(false); }}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`radial-gradient(circle, ${th.accent}12 1px, transparent 1px)`,backgroundSize:"28px 28px"}}/>
      <div style={{position:"relative",zIndex:1}}>
        <AppSidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isOpen={sidebarOpen}
          isMobile={false}
          onToggle={() => setSidebarOpen(o => !o)}
        />
        <div style={{ marginLeft: sidebarOpen ? 200 : 72, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "margin-left 0.3s" }}>
          <DashboardHeader
            onSearch={setSearchQuery}
            onRefresh={handleRefresh}
            showNotifications={showNotifs}
            setShowNotifications={setShowNotifs}
            agentName={agentName}
            userEmail={userEmail}
            onLogout={handleLogout}
            theme={theme}
            setTheme={(t) => { setTheme(t); applyTheme(t); }}
          />
          <main style={{flex:1,padding:24,display:"flex",flexDirection:"column",gap:16}}>

            {/* Search results */}
            {searchQuery && filteredFraudMethods.length > 0 && (
              <div style={{background:th.cardBg,border:`1px solid ${th.accent}44`,borderRadius:8,padding:16}}>
                <div style={{color:th.accent,fontSize:12,fontFamily:"monospace",marginBottom:12}}>🔍 FRAUD METHODS — "{searchQuery}"</div>
                {filteredFraudMethods.map(m=>(
                  <div key={m.title} style={{background:th.bg,border:`1px solid ${th.border}`,borderRadius:6,padding:"12px 16px",marginBottom:8}}>
                    <div style={{color:th.text,fontSize:13,fontWeight:600}}>{m.icon} {m.title}</div>
                    <div style={{color:"#666",fontSize:11,marginTop:4,lineHeight:1.5}}>{m.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {activePage === "overview" && (
              <>
                <UploadSection key={refreshKey} onDataLoaded={handleDataLoaded} />
                {fileUploaded && (
                  <div style={{background:"#0f1a0f",border:"1px solid #22c55e",borderRadius:8,padding:"10px 16px",color:"#22c55e",fontSize:13}}>
                    ✅ Analysis complete — {allData.length} records scanned, <strong>{flaggedData.length}</strong> fraud cases flagged. Alert sent to {userEmail}!
                  </div>
                )}
                <MetricCards
                  flaggedCount={fileUploaded ? flaggedData.length : 76}
                  totalSavings={fileUploaded ? `₹${(flaggedData.reduce((s,r)=>s+r.amount,0)/100000).toFixed(1)}L` : "₹95.8L"}
                  activeCases={fileUploaded ? flaggedData.length : 75}
                  escalatedCases={cases.filter(c => c.status === "ESCALATED").length}
                />
                <ChartCards key={"chart-"+refreshKey} data={fileUploaded ? flaggedData : []} fileUploaded={fileUploaded} />
                {fileUploaded && <NetworkGraph data={flaggedData} />}
                <CaseTable
                  cases={fileUploaded ? cases : []}
                  processingCaseIds={processingIds}
                  exitingCaseIds={exitingIds}
                  onEscalate={handleEscalate}
                  onResolve={handleResolve}
                  searchQuery={searchQuery}
                />
              </>
            )}

            {activePage === "alerts"    && <AlertsPage />}
            {activePage === "accounts"  && <AccountsPage />}
            {activePage === "analytics" && <AnalyticsPage />}
            {activePage === "help"      && <HelpPage />}
            {activePage === "faq"       && <FAQPage />}
            {activePage === "terms"     && <TermsPage />}
            {activePage === "settings"  && (
              <SettingsPage
                userEmail={userEmail}
                agentName={agentName}
                onLogout={handleLogout}
                theme={theme}
                setTheme={(t) => { setTheme(t); applyTheme(t); }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
