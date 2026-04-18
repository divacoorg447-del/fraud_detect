import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Bell, Sun, Moon, Globe } from "lucide-react";

// ── THEME DEFINITIONS ──────────────────────────────────────────────────────
export type ThemeName = "dark-red" | "dark-blue" | "dark-green" | "light" | "midnight";

export const THEMES: Record<ThemeName, { label: string; bg: string; accent: string; cardBg: string; text: string; border: string; icon: string }> = {
  "dark-red":   { label: "Dark Red",   bg: "#080808", accent: "#cc0000", cardBg: "#111",    text: "#fff",    border: "#1e1e1e", icon: "🔴" },
  "dark-blue":  { label: "Dark Blue",  bg: "#050a14", accent: "#1a6fd4", cardBg: "#0d1520", text: "#e0eaf8", border: "#1a2a3a", icon: "🔵" },
  "dark-green": { label: "Dark Green", bg: "#050e08", accent: "#16a34a", cardBg: "#0a160d", text: "#d0f0d8", border: "#1a3022", icon: "🟢" },
  "midnight":   { label: "Midnight",   bg: "#07070f", accent: "#7c3aed", cardBg: "#0e0e1a", text: "#e0d8ff", border: "#1e1a2e", icon: "🟣" },
  "light":      { label: "Light",      bg: "#f4f4f5", accent: "#cc0000", cardBg: "#ffffff", text: "#111",    border: "#e4e4e7", icon: "⚪" },
};

export const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी",      flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்",       flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",      flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ",       flag: "🇮🇳" },
  { code: "ml", label: "മലയാളം",     flag: "🇮🇳" },
  { code: "mr", label: "मराठी",       flag: "🇮🇳" },
  { code: "bn", label: "বাংলা",       flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી",     flag: "🇮🇳" },
  { code: "pa", label: "ਪੰਜਾਬੀ",      flag: "🇮🇳" },
  { code: "ur", label: "اردو",        flag: "🇵🇰" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
];

// Apply theme to CSS vars on <html>
export function applyTheme(t: ThemeName) {
  const th = THEMES[t];
  const r  = document.documentElement.style;
  r.setProperty("--fg-bg",     th.bg);
  r.setProperty("--fg-accent", th.accent);
  r.setProperty("--fg-card",   th.cardBg);
  r.setProperty("--fg-text",   th.text);
  r.setProperty("--fg-border", th.border);
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("fraudguard_theme", t);
}

// ── PROPS ──────────────────────────────────────────────────────────────────
interface Props {
  onSearch:             (q: string) => void;
  onRefresh:            () => void;
  showNotifications:    boolean;
  setShowNotifications: (v: boolean) => void;
  agentName:            string;
  userEmail:            string;
  onLogout:             () => void;
  onNavigate:           (page: string) => void;
  theme:                ThemeName;
  setTheme:             (t: ThemeName) => void;
  language:             string;
  setLanguage:          (code: string) => void;
}

const NOTIFS = [
  { id: "GOV-9921", msg: "Critical fraud detected in MGNREGS Jharkhand", time: "2m ago",  sev: "CRITICAL" },
  { id: "GOV-7703", msg: "Fake claims flagged in Ayushman Bharat Bihar",  time: "5m ago",  sev: "CRITICAL" },
  { id: "GOV-4401", msg: "Shell entities found in PMEGP Maharashtra",     time: "12m ago", sev: "HIGH"     },
];

// ── COMPONENT ──────────────────────────────────────────────────────────────
const DashboardHeader = ({
  onSearch, onRefresh, showNotifications, setShowNotifications,
  agentName, userEmail, onLogout, onNavigate, theme, setTheme, language, setLanguage,
}: Props) => {
  const [showProfile,  setShowProfile]  = useState(false);
  const [showThemes,   setShowThemes]   = useState(false);
  const [showLang,     setShowLang]     = useState(false);
  const [spinning,     setSpinning]     = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef   = useRef<HTMLDivElement>(null);
  const langRef    = useRef<HTMLDivElement>(null);

  const acc     = THEMES[theme].accent;
  const isLight = theme === "light";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (themeRef.current   && !themeRef.current.contains(e.target as Node))   setShowThemes(false);
      if (langRef.current    && !langRef.current.contains(e.target as Node))     setShowLang(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleRefresh = () => { setSpinning(true); onRefresh(); setTimeout(() => setSpinning(false), 700); };

  const initials = agentName
    ? agentName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const headerBg  = isLight ? "#ffffff" : "#0a0a0a";
  const headerTxt = isLight ? "#111"    : "#fff";
  const inputBg   = isLight ? "#f1f1f1" : "#1a1a1a";
  const mutedTxt  = isLight ? "#555"    : "#888";
  const borderClr = isLight ? "#e4e4e7" : "#222";

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:`1px solid ${borderClr}`, background:headerBg, position:"sticky", top:0, zIndex:50 }}>

      {/* LEFT */}
      <div>
        <h1 style={{ fontSize:17, fontWeight:700, color:headerTxt, letterSpacing:1, margin:0 }}>Fraud Detection War Room</h1>
        <div style={{ display:"flex", gap:16, marginTop:3 }}>
          <span style={{ fontSize:10, fontFamily:"monospace", color:mutedTxt }}>SESSION_ID: <span style={{ color:acc }}>FD-2026-04-14-001</span></span>
          <span style={{ fontSize:10, fontFamily:"monospace", color:acc }}>CLASSIFICATION: RESTRICTED</span>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>

        {/* SEARCH */}
        <div style={{ display:"flex", alignItems:"center", background:inputBg, borderRadius:8, padding:"6px 12px", gap:8, border:`1px solid ${borderClr}` }}>
          <Search size={14} color={mutedTxt} />
          <input type="text" placeholder="Search accounts, cases..." onChange={e => onSearch(e.target.value)}
            style={{ background:"transparent", border:"none", outline:"none", fontSize:12, color:headerTxt, width:180 }} />
        </div>

        {/* REFRESH */}
        <button onClick={handleRefresh} title="Refresh data"
          style={{ background:"transparent", border:`1px solid ${borderClr}`, borderRadius:8, padding:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <RefreshCw size={15} color={mutedTxt} style={{ transition:"transform 0.6s ease", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }} />
        </button>

        {/* THEME PICKER */}
        <div ref={themeRef} style={{ position:"relative" }}>
          <button onClick={() => { setShowThemes(p => !p); setShowProfile(false); setShowNotifications(false); setShowLang(false); }} title="Change theme"
            style={{ background:showThemes ? inputBg : "transparent", border:`1px solid ${showThemes ? acc+"66" : borderClr}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:headerTxt }}>
            {isLight ? <Sun size={14} color={acc} /> : <Moon size={14} color={acc} />}
            <span style={{ fontSize:10, fontFamily:"monospace", color:mutedTxt }}>THEME</span>
          </button>
          {showThemes && (
            <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background: isLight ? "#fff" : "#111", border:`1px solid ${borderClr}`, borderRadius:10, zIndex:300, boxShadow:"0 12px 40px rgba(0,0,0,0.5)", overflow:"hidden", minWidth:180 }}>
              <div style={{ padding:"8px 14px", borderBottom:`1px solid ${borderClr}`, fontSize:10, fontFamily:"monospace", color:mutedTxt, letterSpacing:1 }}>SELECT THEME</div>
              {(Object.entries(THEMES) as [ThemeName, typeof THEMES[ThemeName]][]).map(([key, val]) => (
                <button key={key} onClick={() => { setTheme(key); applyTheme(key); setShowThemes(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: theme === key ? acc + "22" : "transparent", border:"none", cursor:"pointer", textAlign:"left", borderLeft: theme === key ? `3px solid ${acc}` : "3px solid transparent" }}>
                  <span style={{ fontSize:14 }}>{val.icon}</span>
                  <div>
                    <div style={{ fontSize:12, color:headerTxt, fontWeight: theme === key ? 700 : 400 }}>{val.label}</div>
                    <div style={{ fontSize:9, fontFamily:"monospace", color:mutedTxt }}>{key}</div>
                  </div>
                  {theme === key && <span style={{ marginLeft:"auto", color:acc, fontSize:14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LANGUAGE PICKER */}
        <div ref={langRef} style={{ position:"relative" }}>
          <button onClick={() => { setShowLang(p => !p); setShowProfile(false); setShowNotifications(false); setShowThemes(false); }} title="Change language"
            style={{ background:showLang ? inputBg : "transparent", border:`1px solid ${showLang ? acc+"66" : borderClr}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:headerTxt }}>
            <Globe size={14} color={acc} />
            <span style={{ fontSize:11 }}>{currentLang.flag}</span>
            <span style={{ fontSize:10, fontFamily:"monospace", color:mutedTxt }}>LANG</span>
          </button>
          {showLang && (
            <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background: isLight ? "#fff" : "#111", border:`1px solid ${borderClr}`, borderRadius:10, zIndex:300, boxShadow:"0 12px 40px rgba(0,0,0,0.5)", overflow:"hidden", minWidth:180, maxHeight:320, overflowY:"auto" }}>
              <div style={{ padding:"8px 14px", borderBottom:`1px solid ${borderClr}`, fontSize:10, fontFamily:"monospace", color:mutedTxt, letterSpacing:1 }}>SELECT LANGUAGE</div>
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => { setLanguage(lang.code); localStorage.setItem("fraudguard_lang", lang.code); setShowLang(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background: language === lang.code ? acc + "22" : "transparent", border:"none", cursor:"pointer", textAlign:"left", borderLeft: language === lang.code ? `3px solid ${acc}` : "3px solid transparent" }}>
                  <span style={{ fontSize:16 }}>{lang.flag}</span>
                  <span style={{ fontSize:12, color:headerTxt, fontWeight: language === lang.code ? 700 : 400 }}>{lang.label}</span>
                  {language === lang.code && <span style={{ marginLeft:"auto", color:acc, fontSize:14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div style={{ position:"relative" }}>
          <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowThemes(false); setShowLang(false); }}
            style={{ background:"transparent", border:`1px solid ${borderClr}`, borderRadius:8, padding:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <Bell size={15} color={mutedTxt} />
            <span style={{ position:"absolute", top:5, right:5, width:7, height:7, background:acc, borderRadius:"50%" }} />
          </button>
          {showNotifications && (
            <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", width:300, background: isLight ? "#fff" : "#111", border:`1px solid ${borderClr}`, borderRadius:10, zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${borderClr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:headerTxt, fontSize:12, fontWeight:600 }}>Live Alerts</span>
                <span style={{ background:acc, color:"#fff", fontSize:9, padding:"2px 7px", borderRadius:10, fontFamily:"monospace" }}>{NOTIFS.length} NEW</span>
              </div>
              {NOTIFS.map(a => (
                <div key={a.id} style={{ padding:"10px 14px", borderBottom:`1px solid ${borderClr}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ color:acc, fontSize:11, fontFamily:"monospace" }}>{a.id}</span>
                    <span style={{ background: a.sev === "CRITICAL" ? "#cc0000" : "#dd6b20", color:"#fff", fontSize:8, padding:"1px 6px", borderRadius:3, fontFamily:"monospace" }}>{a.sev}</span>
                  </div>
                  <div style={{ color:headerTxt, fontSize:11 }}>{a.msg}</div>
                  <div style={{ color:mutedTxt, fontSize:10, marginTop:2 }}>{a.time}</div>
                </div>
              ))}
              <div style={{ padding:"8px 14px", textAlign:"center" }}>
                <span onClick={() => { onNavigate("alerts"); setShowNotifications(false); }}
                  style={{ color:acc, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>VIEW ALL ALERTS →</span>
              </div>
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div ref={profileRef} style={{ position:"relative", paddingLeft:8, borderLeft:`1px solid ${borderClr}` }}>
          <button onClick={() => { setShowProfile(p => !p); setShowNotifications(false); setShowThemes(false); setShowLang(false); }}
            style={{ display:"flex", alignItems:"center", gap:8, background: showProfile ? inputBg : "transparent", border:`1px solid ${showProfile ? acc+"66" : "transparent"}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${acc}, ${acc}88)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", fontFamily:"monospace" }}>
              {initials}
            </div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:12, color:headerTxt, fontWeight:600, lineHeight:1.2 }}>{agentName || "Agent"}</div>
              <div style={{ fontSize:9, color:mutedTxt, fontFamily:"monospace", lineHeight:1.2 }}>Clearance L4</div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ color:mutedTxt, transform: showProfile ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {showProfile && (
            <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", width:240, background: isLight ? "#fff" : "#111", border:`1px solid ${borderClr}`, borderRadius:12, zIndex:200, boxShadow:"0 12px 40px rgba(0,0,0,0.6)", overflow:"hidden" }}>
              {/* Avatar header */}
              <div style={{ padding:"16px", borderBottom:`1px solid ${borderClr}`, background: isLight ? "#f8f8f8" : "#0d0d0d" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg, ${acc}, ${acc}88)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", fontFamily:"monospace" }}>
                    {initials}
                  </div>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ color:headerTxt, fontSize:13, fontWeight:700 }}>{agentName}</div>
                    <div style={{ color:mutedTxt, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:140 }}>{userEmail}</div>
                  </div>
                </div>
              </div>

              {/* Status rows */}
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${borderClr}` }}>
                {[
                  { label:"Clearance", value:"Level 4",  color:acc       },
                  { label:"Region",    value:"IN-SOUTH",  color:acc       },
                  { label:"Status",    value:"● ACTIVE",  color:"#22c55e" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                    <span style={{ color:mutedTxt, fontSize:11, fontFamily:"monospace" }}>{r.label}</span>
                    <span style={{ color:r.color, fontSize:11, fontFamily:"monospace", fontWeight:600 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick actions — these NOW actually navigate */}
              <div style={{ padding:"8px 10px", borderBottom:`1px solid ${borderClr}` }}>
                {[
                  { icon:"⚙️", label:"Settings",  page:"settings" },
                  { icon:"❓", label:"Help & FAQ", page:"help"     },
                  { icon:"📋", label:"Terms",      page:"terms"    },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { onNavigate(item.page); setShowProfile(false); }}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 8px", background:"transparent", border:"none", cursor:"pointer", borderRadius:6, textAlign:"left", color:headerTxt, fontSize:12 }}
                    onMouseEnter={e => (e.currentTarget.style.background = acc + "22")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div style={{ padding:"10px 10px" }}>
                <button
                  onClick={() => { setShowProfile(false); onLogout(); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#cc000022"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  style={{ width:"100%", background:"transparent", border:"1px solid #cc000055", color:"#cc0000", borderRadius:8, padding:"8px 12px", cursor:"pointer", fontSize:12, fontFamily:"monospace", letterSpacing:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"background 0.2s" }}
                >
                  🚪 LOGOUT
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default DashboardHeader;
