import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Bell, Sun, Moon, Globe } from "lucide-react";

export type ThemeName = "dark-red" | "dark-blue" | "dark-green" | "light" | "midnight";

export const THEMES: Record<ThemeName, { label:string; bg:string; accent:string; cardBg:string; text:string; border:string; icon:string }> = {
  "dark-red":   { label:"Dark Red",   bg:"#080808", accent:"#cc0000", cardBg:"#111",    text:"#fff",    border:"#1e1e1e", icon:"🔴" },
  "dark-blue":  { label:"Dark Blue",  bg:"#050a14", accent:"#1a6fd4", cardBg:"#0d1520", text:"#e0eaf8", border:"#1a2a3a", icon:"🔵" },
  "dark-green": { label:"Dark Green", bg:"#050e08", accent:"#16a34a", cardBg:"#0a160d", text:"#d0f0d8", border:"#1a3022", icon:"🟢" },
  "midnight":   { label:"Midnight",   bg:"#07070f", accent:"#7c3aed", cardBg:"#0e0e1a", text:"#e0d8ff", border:"#1e1a2e", icon:"🟣" },
  "light":      { label:"Light",      bg:"#f4f4f5", accent:"#cc0000", cardBg:"#ffffff", text:"#111",    border:"#e4e4e7", icon:"⚪" },
};

export const LANGUAGES = [
  { code:"en", label:"English",  flag:"🇬🇧" }, { code:"hi", label:"हिन्दी",   flag:"🇮🇳" },
  { code:"ta", label:"தமிழ்",    flag:"🇮🇳" }, { code:"te", label:"తెలుగు",   flag:"🇮🇳" },
  { code:"kn", label:"ಕನ್ನಡ",    flag:"🇮🇳" }, { code:"ml", label:"മലയാളം",  flag:"🇮🇳" },
  { code:"mr", label:"मराठी",    flag:"🇮🇳" }, { code:"bn", label:"বাংলা",    flag:"🇮🇳" },
  { code:"gu", label:"ગુજરાતી",  flag:"🇮🇳" }, { code:"pa", label:"ਪੰਜਾਬੀ",   flag:"🇮🇳" },
  { code:"ur", label:"اردو",     flag:"🇵🇰" }, { code:"fr", label:"Français", flag:"🇫🇷" },
  { code:"de", label:"Deutsch",  flag:"🇩🇪" }, { code:"es", label:"Español",  flag:"🇪🇸" },
  { code:"zh", label:"中文",     flag:"🇨🇳" },
];

export type TKey = "warRoom"|"sessionId"|"classification"|"search"|"theme"|"lang"|"liveAlerts"|"clearance"|"region"|"status"|"active"|"settings"|"helpFaq"|"terms"|"logout"|"viewAllAlerts"|"new"|"selectTheme"|"selectLang"|"overview"|"alerts"|"accounts"|"analytics"|"refresh"|"lastLogin";

export const T: Record<string, Record<TKey,string>> = {
  en: { warRoom:"Fraud Detection War Room", sessionId:"SESSION_ID", classification:"CLASSIFICATION: RESTRICTED", search:"Search accounts, cases...", theme:"THEME", lang:"LANG", liveAlerts:"Live Alerts", clearance:"Clearance", region:"Region", status:"Status", active:"● ACTIVE", settings:"Settings", helpFaq:"Help & FAQ", terms:"Terms", logout:"LOGOUT", viewAllAlerts:"VIEW ALL ALERTS →", new:"NEW", selectTheme:"SELECT THEME", selectLang:"SELECT LANGUAGE", overview:"Overview", alerts:"Alerts", accounts:"Accounts", analytics:"Analytics", refresh:"Refresh", lastLogin:"Last Login" },
  hi: { warRoom:"धोखाधड़ी जांच केंद्र", sessionId:"सत्र ID", classification:"वर्गीकरण: प्रतिबंधित", search:"खाते, मामले खोजें...", theme:"थीम", lang:"भाषा", liveAlerts:"लाइव अलर्ट", clearance:"अनुमति", region:"क्षेत्र", status:"स्थिति", active:"● सक्रिय", settings:"सेटिंग्स", helpFaq:"सहायता और FAQ", terms:"नियम", logout:"लॉगआउट", viewAllAlerts:"सभी अलर्ट देखें →", new:"नया", selectTheme:"थीम चुनें", selectLang:"भाषा चुनें", overview:"अवलोकन", alerts:"अलर्ट", accounts:"खाते", analytics:"विश्लेषण", refresh:"ताज़ा करें", lastLogin:"अंतिम लॉगिन" },
  ta: { warRoom:"மோசடி கண்டறிதல் அறை", sessionId:"அமர்வு ID", classification:"வகைப்படுத்தல்: தடை", search:"தேடுங்கள்...", theme:"தீம்", lang:"மொழி", liveAlerts:"நேரடி எச்சரிக்கைகள்", clearance:"அனுமதி", region:"பகுதி", status:"நிலை", active:"● செயலில்", settings:"அமைப்புகள்", helpFaq:"உதவி & FAQ", terms:"விதிமுறைகள்", logout:"வெளியேறு", viewAllAlerts:"அனைத்தும் →", new:"புதியது", selectTheme:"தீம் தேர்வு", selectLang:"மொழி தேர்வு", overview:"கண்ணோட்டம்", alerts:"எச்சரிக்கைகள்", accounts:"கணக்குகள்", analytics:"பகுப்பாய்வு", refresh:"புதுப்பி", lastLogin:"கடைசி உள்நுழைவு" },
  te: { warRoom:"మోసం గుర్తింపు గది", sessionId:"సెషన్ ID", classification:"వర్గీకరణ: నిషేధం", search:"వెతకండి...", theme:"థీమ్", lang:"భాష", liveAlerts:"లైవ్ హెచ్చరికలు", clearance:"అనుమతి", region:"ప్రాంతం", status:"స్థితి", active:"● క్రియాశీలం", settings:"సెట్టింగ్‌లు", helpFaq:"సహాయం & FAQ", terms:"నిబంధనలు", logout:"లాగ్‌అవుట్", viewAllAlerts:"అన్నీ →", new:"కొత్తది", selectTheme:"థీమ్ ఎంచుకో", selectLang:"భాష ఎంచుకో", overview:"అవలోకనం", alerts:"హెచ్చరికలు", accounts:"ఖాతాలు", analytics:"విశ్లేషణ", refresh:"రిఫ్రెష్", lastLogin:"చివరి లాగిన్" },
  kn: { warRoom:"ವಂಚನೆ ಪತ್ತೆ ಕೊಠಡಿ", sessionId:"ಅಧಿವೇಶನ ID", classification:"ವರ್ಗೀಕರಣ: ನಿರ್ಬಂಧ", search:"ಹುಡುಕಿ...", theme:"ಥೀಮ್", lang:"ಭಾಷೆ", liveAlerts:"ಲೈವ್ ಎಚ್ಚರಿಕೆಗಳು", clearance:"ಅನುಮತಿ", region:"ಪ್ರದೇಶ", status:"ಸ್ಥಿತಿ", active:"● ಸಕ್ರಿಯ", settings:"ಸೆಟ್ಟಿಂಗ್‌ಗಳು", helpFaq:"ಸಹಾಯ & FAQ", terms:"ನಿಯಮಗಳು", logout:"ಲಾಗ್‌ಔಟ್", viewAllAlerts:"ಎಲ್ಲಾ →", new:"ಹೊಸದು", selectTheme:"ಥೀಮ್ ಆಯ್ಕೆ", selectLang:"ಭಾಷೆ ಆಯ್ಕೆ", overview:"ಅವಲೋಕನ", alerts:"ಎಚ್ಚರಿಕೆಗಳು", accounts:"ಖಾತೆಗಳು", analytics:"ವಿಶ್ಲೇಷಣೆ", refresh:"ರಿಫ್ರೆಶ್", lastLogin:"ಕೊನೆಯ ಲಾಗಿನ್" },
  ml: { warRoom:"തട്ടിപ്പ് കണ്ടുപിടിക്കൽ", sessionId:"സെഷൻ ID", classification:"വർഗ്ഗീകരണം", search:"തിരയുക...", theme:"തീം", lang:"ഭാഷ", liveAlerts:"അലർട്ടുകൾ", clearance:"അനുമതി", region:"മേഖല", status:"സ്ഥിതി", active:"● സജീവം", settings:"ക്രമീകരണം", helpFaq:"സഹായം", terms:"നിബന്ധനകൾ", logout:"ലോഗ്ഔട്ട്", viewAllAlerts:"എല്ലാം →", new:"പുതിയത്", selectTheme:"തീം", selectLang:"ഭാഷ", overview:"അവലോകനം", alerts:"അലർട്ടുകൾ", accounts:"അക്കൗണ്ടുകൾ", analytics:"വിശകലനം", refresh:"പുതുക്കുക", lastLogin:"അവസാന ലോഗിൻ" },
  mr: { warRoom:"फसवणूक शोध कक्ष", sessionId:"सत्र ID", classification:"वर्गीकरण: प्रतिबंधित", search:"शोधा...", theme:"थीम", lang:"भाषा", liveAlerts:"थेट इशारे", clearance:"परवानगी", region:"प्रदेश", status:"स्थिती", active:"● सक्रिय", settings:"सेटिंग्ज", helpFaq:"मदत & FAQ", terms:"अटी", logout:"लॉगआउट", viewAllAlerts:"सर्व →", new:"नवीन", selectTheme:"थीम निवडा", selectLang:"भाषा निवडा", overview:"आढावा", alerts:"इशारे", accounts:"खाती", analytics:"विश्लेषण", refresh:"रिफ्रेश", lastLogin:"अखेरचे लॉगिन" },
  bn: { warRoom:"প্রতারণা সনাক্তকরণ", sessionId:"সেশন ID", classification:"শ্রেণী: সীমাবদ্ধ", search:"খুঁজুন...", theme:"থিম", lang:"ভাষা", liveAlerts:"সতর্কতা", clearance:"অনুমতি", region:"অঞ্চল", status:"অবস্থা", active:"● সক্রিয়", settings:"সেটিংস", helpFaq:"সাহায্য", terms:"শর্তাবলী", logout:"লগআউট", viewAllAlerts:"সব →", new:"নতুন", selectTheme:"থিম", selectLang:"ভাষা", overview:"পর্যালোচনা", alerts:"সতর্কতা", accounts:"অ্যাকাউন্ট", analytics:"বিশ্লেষণ", refresh:"রিফ্রেশ", lastLogin:"শেষ লগইন" },
  gu: { warRoom:"છેતરપિંડી શોધ", sessionId:"સત્ર ID", classification:"વર્ગ: પ્રતિબંધિત", search:"શોધો...", theme:"થીમ", lang:"ભાષા", liveAlerts:"ચેતવણીઓ", clearance:"પરવાનગી", region:"ક્ષેત્ર", status:"સ્થિતિ", active:"● સક્રિય", settings:"સેટિંગ્સ", helpFaq:"મદદ", terms:"નિયમો", logout:"લૉગઆઉટ", viewAllAlerts:"બધું →", new:"નવું", selectTheme:"થીમ", selectLang:"ભાષા", overview:"ઝાંખી", alerts:"ચેતવણીઓ", accounts:"ખાતાઓ", analytics:"વિશ્લેષણ", refresh:"રિફ્રેશ", lastLogin:"છેલ્લો લૉગિન" },
  pa: { warRoom:"ਧੋਖਾਧੜੀ ਖੋਜ", sessionId:"ਸੈਸ਼ਨ ID", classification:"ਵਰਗ: ਪਾਬੰਦੀਸ਼ੁਦਾ", search:"ਖੋਜੋ...", theme:"ਥੀਮ", lang:"ਭਾਸ਼ਾ", liveAlerts:"ਚੇਤਾਵਨੀਆਂ", clearance:"ਇਜਾਜ਼ਤ", region:"ਖੇਤਰ", status:"ਸਥਿਤੀ", active:"● ਸਰਗਰਮ", settings:"ਸੈਟਿੰਗਾਂ", helpFaq:"ਮਦਦ", terms:"ਨਿਯਮ", logout:"ਲੌਗਆਉਟ", viewAllAlerts:"ਸਭ →", new:"ਨਵਾਂ", selectTheme:"ਥੀਮ", selectLang:"ਭਾਸ਼ਾ", overview:"ਸੰਖੇਪ", alerts:"ਚੇਤਾਵਨੀਆਂ", accounts:"ਖਾਤੇ", analytics:"ਵਿਸ਼ਲੇਸ਼ਣ", refresh:"ਰਿਫਰੈਸ਼", lastLogin:"ਆਖਰੀ ਲੌਗਿਨ" },
  ur: { warRoom:"دھوکہ دہی کا پتہ", sessionId:"سیشن ID", classification:"درجہ: محدود", search:"تلاش کریں...", theme:"تھیم", lang:"زبان", liveAlerts:"الرٹ", clearance:"اجازت", region:"علاقہ", status:"حالت", active:"● فعال", settings:"ترتیبات", helpFaq:"مدد", terms:"شرائط", logout:"لاگ آؤٹ", viewAllAlerts:"سب →", new:"نیا", selectTheme:"تھیم", selectLang:"زبان", overview:"جائزہ", alerts:"الرٹ", accounts:"اکاؤنٹس", analytics:"تجزیہ", refresh:"تازہ", lastLogin:"آخری لاگن" },
  fr: { warRoom:"Salle de Détection des Fraudes", sessionId:"SESSION_ID", classification:"CLASSIF.: RESTREINT", search:"Rechercher...", theme:"THÈME", lang:"LANGUE", liveAlerts:"Alertes en direct", clearance:"Accréditation", region:"Région", status:"Statut", active:"● ACTIF", settings:"Paramètres", helpFaq:"Aide & FAQ", terms:"Conditions", logout:"DÉCONNEXION", viewAllAlerts:"VOIR TOUTES →", new:"NOUVEAU", selectTheme:"CHOISIR THÈME", selectLang:"CHOISIR LANGUE", overview:"Vue d'ensemble", alerts:"Alertes", accounts:"Comptes", analytics:"Analytique", refresh:"Actualiser", lastLogin:"Dernière connexion" },
  de: { warRoom:"Betrugserkennungsraum", sessionId:"SITZUNGS-ID", classification:"KLASSIF.: EINGESCHRÄNKT", search:"Suchen...", theme:"DESIGN", lang:"SPRACHE", liveAlerts:"Live-Warnungen", clearance:"Freigabe", region:"Region", status:"Status", active:"● AKTIV", settings:"Einstellungen", helpFaq:"Hilfe & FAQ", terms:"Bedingungen", logout:"ABMELDEN", viewAllAlerts:"ALLE →", new:"NEU", selectTheme:"DESIGN WÄHLEN", selectLang:"SPRACHE WÄHLEN", overview:"Übersicht", alerts:"Warnungen", accounts:"Konten", analytics:"Analytik", refresh:"Aktualisieren", lastLogin:"Letzte Anmeldung" },
  es: { warRoom:"Sala de Detección de Fraudes", sessionId:"ID DE SESIÓN", classification:"CLASIF.: RESTRINGIDO", search:"Buscar...", theme:"TEMA", lang:"IDIOMA", liveAlerts:"Alertas en vivo", clearance:"Autorización", region:"Región", status:"Estado", active:"● ACTIVO", settings:"Configuración", helpFaq:"Ayuda & FAQ", terms:"Términos", logout:"CERRAR SESIÓN", viewAllAlerts:"VER TODAS →", new:"NUEVO", selectTheme:"ELEGIR TEMA", selectLang:"ELEGIR IDIOMA", overview:"Resumen", alerts:"Alertas", accounts:"Cuentas", analytics:"Analítica", refresh:"Actualizar", lastLogin:"Último acceso" },
  zh: { warRoom:"欺诈检测作战室", sessionId:"会话 ID", classification:"分类：限制级", search:"搜索...", theme:"主题", lang:"语言", liveAlerts:"实时警报", clearance:"许可级别", region:"地区", status:"状态", active:"● 活跃", settings:"设置", helpFaq:"帮助 & FAQ", terms:"条款", logout:"退出登录", viewAllAlerts:"查看所有 →", new:"新", selectTheme:"选择主题", selectLang:"选择语言", overview:"概览", alerts:"警报", accounts:"账户", analytics:"分析", refresh:"刷新", lastLogin:"上次登录" },
};

export function tx(lang:string, key:TKey):string { return (T[lang]||T["en"])[key]||T["en"][key]; }

export function applyTheme(t:ThemeName) {
  const th=THEMES[t]; const r=document.documentElement.style;
  r.setProperty("--fg-bg",th.bg); r.setProperty("--fg-accent",th.accent);
  r.setProperty("--fg-card",th.cardBg); r.setProperty("--fg-text",th.text);
  r.setProperty("--fg-border",th.border);
  document.documentElement.setAttribute("data-theme",t);
  localStorage.setItem("fraudguard_theme",t);
}

interface Props {
  onSearch:(q:string)=>void; onRefresh:()=>void;
  showNotifications:boolean; setShowNotifications:(v:boolean)=>void;
  agentName:string; userEmail:string; onLogout:()=>void; onNavigate:(page:string)=>void;
  theme:ThemeName; setTheme:(t:ThemeName)=>void;
  language:string; setLanguage:(code:string)=>void;
  lastLogin?: string;
}

const NOTIFS = [
  {id:"GOV-9921",msg:"Critical fraud detected in MGNREGS Jharkhand",time:"2m ago",sev:"CRITICAL"},
  {id:"GOV-7703",msg:"Fake claims flagged in Ayushman Bharat Bihar",time:"5m ago",sev:"CRITICAL"},
  {id:"GOV-4401",msg:"Shell entities found in PMEGP Maharashtra",time:"12m ago",sev:"HIGH"},
];

const DashboardHeader=({onSearch,onRefresh,showNotifications,setShowNotifications,agentName,userEmail,onLogout,onNavigate,theme,setTheme,language,setLanguage,lastLogin}:Props)=>{
  const[showProfile,setShowProfile]=useState(false);
  const[showThemes,setShowThemes]=useState(false);
  const[showLang,setShowLang]=useState(false);
  const[spinning,setSpinning]=useState(false);
  const profileRef=useRef<HTMLDivElement>(null);
  const themeRef=useRef<HTMLDivElement>(null);
  const langRef=useRef<HTMLDivElement>(null);
  const acc=THEMES[theme].accent, isLight=theme==="light";
  const t=(key:TKey)=>tx(language,key);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(profileRef.current&&!profileRef.current.contains(e.target as Node))setShowProfile(false);
      if(themeRef.current&&!themeRef.current.contains(e.target as Node))setShowThemes(false);
      if(langRef.current&&!langRef.current.contains(e.target as Node))setShowLang(false);
    };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const handleRefresh=()=>{ setSpinning(true); onRefresh(); setTimeout(()=>window.location.reload(),200); };
  const initials=agentName?agentName.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2):"?";
  const headerBg=isLight?"#ffffff":"#0a0a0a", headerTxt=isLight?"#111":"#fff";
  const inputBg=isLight?"#f1f1f1":"#1a1a1a", mutedTxt=isLight?"#555":"#888", borderClr=isLight?"#e4e4e7":"#222";
  const currentLang=LANGUAGES.find(l=>l.code===language)||LANGUAGES[0];

  const formatLastLogin=(dt:string|undefined)=>{
    if(!dt)return"First session";
    try{return new Date(dt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return dt;}
  };

  return(
    <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",borderBottom:`1px solid ${borderClr}`,background:headerBg,position:"sticky",top:0,zIndex:50}}>
      <div>
        <h1 style={{fontSize:17,fontWeight:700,color:headerTxt,letterSpacing:1,margin:0}}>{t("warRoom")}</h1>
        <div style={{display:"flex",gap:16,marginTop:3}}>
          <span style={{fontSize:10,fontFamily:"monospace",color:mutedTxt}}>{t("sessionId")}: <span style={{color:acc}}>FD-2026-04-14-001</span></span>
          <span style={{fontSize:10,fontFamily:"monospace",color:acc}}>{t("classification")}</span>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {/* Search */}
        <div style={{display:"flex",alignItems:"center",background:inputBg,borderRadius:8,padding:"6px 12px",gap:8,border:`1px solid ${borderClr}`}}>
          <Search size={14} color={mutedTxt}/>
          <input type="text" placeholder={t("search")} onChange={e=>onSearch(e.target.value)} style={{background:"transparent",border:"none",outline:"none",fontSize:12,color:headerTxt,width:180}}/>
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh} title={t("refresh")} style={{background:"transparent",border:`1px solid ${borderClr}`,borderRadius:8,padding:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <RefreshCw size={15} color={mutedTxt} style={{transition:"transform 0.6s ease",transform:spinning?"rotate(360deg)":"rotate(0deg)"}}/>
        </button>

        {/* Theme */}
        <div ref={themeRef} style={{position:"relative"}}>
          <button onClick={()=>{setShowThemes(p=>!p);setShowProfile(false);setShowNotifications(false);setShowLang(false);}} style={{background:showThemes?inputBg:"transparent",border:`1px solid ${showThemes?acc+"66":borderClr}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:headerTxt}}>
            {isLight?<Sun size={14} color={acc}/>:<Moon size={14} color={acc}/>}
            <span style={{fontSize:10,fontFamily:"monospace",color:mutedTxt}}>{t("theme")}</span>
          </button>
          {showThemes&&(<div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:isLight?"#fff":"#111",border:`1px solid ${borderClr}`,borderRadius:10,zIndex:300,boxShadow:"0 12px 40px rgba(0,0,0,0.5)",overflow:"hidden",minWidth:180}}>
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${borderClr}`,fontSize:10,fontFamily:"monospace",color:mutedTxt,letterSpacing:1}}>{t("selectTheme")}</div>
            {(Object.entries(THEMES) as [ThemeName,typeof THEMES[ThemeName]][]).map(([key,val])=>(<button key={key} onClick={()=>{setTheme(key);applyTheme(key);setShowThemes(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:theme===key?acc+"22":"transparent",border:"none",cursor:"pointer",textAlign:"left",borderLeft:theme===key?`3px solid ${acc}`:"3px solid transparent"}}><span style={{fontSize:14}}>{val.icon}</span><div><div style={{fontSize:12,color:headerTxt,fontWeight:theme===key?700:400}}>{val.label}</div><div style={{fontSize:9,fontFamily:"monospace",color:mutedTxt}}>{key}</div></div>{theme===key&&<span style={{marginLeft:"auto",color:acc,fontSize:14}}>✓</span>}</button>))}
          </div>)}
        </div>

        {/* Language */}
        <div ref={langRef} style={{position:"relative"}}>
          <button onClick={()=>{setShowLang(p=>!p);setShowProfile(false);setShowNotifications(false);setShowThemes(false);}} style={{background:showLang?inputBg:"transparent",border:`1px solid ${showLang?acc+"66":borderClr}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:headerTxt}}>
            <Globe size={14} color={acc}/><span style={{fontSize:13}}>{currentLang.flag}</span>
            <span style={{fontSize:10,fontFamily:"monospace",color:mutedTxt}}>{t("lang")}</span>
          </button>
          {showLang&&(<div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:isLight?"#fff":"#111",border:`1px solid ${borderClr}`,borderRadius:10,zIndex:300,boxShadow:"0 12px 40px rgba(0,0,0,0.5)",overflow:"hidden",minWidth:190,maxHeight:320,overflowY:"auto"}}>
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${borderClr}`,fontSize:10,fontFamily:"monospace",color:mutedTxt,letterSpacing:1}}>{t("selectLang")}</div>
            {LANGUAGES.map(lang=>(<button key={lang.code} onClick={()=>{setLanguage(lang.code);localStorage.setItem("fraudguard_lang",lang.code);setShowLang(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:language===lang.code?acc+"22":"transparent",border:"none",cursor:"pointer",textAlign:"left",borderLeft:language===lang.code?`3px solid ${acc}`:"3px solid transparent"}}><span style={{fontSize:16}}>{lang.flag}</span><span style={{fontSize:12,color:headerTxt,fontWeight:language===lang.code?700:400}}>{lang.label}</span>{language===lang.code&&<span style={{marginLeft:"auto",color:acc,fontSize:14}}>✓</span>}</button>))}
          </div>)}
        </div>

        {/* Notifications */}
        <div style={{position:"relative"}}>
          <button onClick={()=>{setShowNotifications(!showNotifications);setShowProfile(false);setShowThemes(false);setShowLang(false);}} style={{background:"transparent",border:`1px solid ${borderClr}`,borderRadius:8,padding:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <Bell size={15} color={mutedTxt}/>
            <span style={{position:"absolute",top:5,right:5,width:7,height:7,background:acc,borderRadius:"50%"}}/>
          </button>
          {showNotifications&&(<div style={{position:"absolute",right:0,top:"calc(100% + 8px)",width:300,background:isLight?"#fff":"#111",border:`1px solid ${borderClr}`,borderRadius:10,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${borderClr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:headerTxt,fontSize:12,fontWeight:600}}>{t("liveAlerts")}</span><span style={{background:acc,color:"#fff",fontSize:9,padding:"2px 7px",borderRadius:10,fontFamily:"monospace"}}>{NOTIFS.length} {t("new")}</span></div>
            {NOTIFS.map(a=>(<div key={a.id} style={{padding:"10px 14px",borderBottom:`1px solid ${borderClr}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:acc,fontSize:11,fontFamily:"monospace"}}>{a.id}</span><span style={{background:a.sev==="CRITICAL"?"#cc0000":"#dd6b20",color:"#fff",fontSize:8,padding:"1px 6px",borderRadius:3,fontFamily:"monospace"}}>{a.sev}</span></div><div style={{color:headerTxt,fontSize:11}}>{a.msg}</div><div style={{color:mutedTxt,fontSize:10,marginTop:2}}>{a.time}</div></div>))}
            <div style={{padding:"8px 14px",textAlign:"center"}}><span onClick={()=>{onNavigate("alerts");setShowNotifications(false);}} style={{color:acc,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>{t("viewAllAlerts")}</span></div>
          </div>)}
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{position:"relative",paddingLeft:8,borderLeft:`1px solid ${borderClr}`}}>
          <button onClick={()=>{setShowProfile(p=>!p);setShowNotifications(false);setShowThemes(false);setShowLang(false);}} style={{display:"flex",alignItems:"center",gap:8,background:showProfile?inputBg:"transparent",border:`1px solid ${showProfile?acc+"66":"transparent"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg, ${acc}, ${acc}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{initials}</div>
            <div style={{textAlign:"left"}}><div style={{fontSize:12,color:headerTxt,fontWeight:600,lineHeight:1.2}}>{agentName||"Agent"}</div><div style={{fontSize:9,color:mutedTxt,fontFamily:"monospace",lineHeight:1.2}}>{t("clearance")} L4</div></div>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{color:mutedTxt,transform:showProfile?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>

          {showProfile&&(<div style={{position:"absolute",right:0,top:"calc(100% + 8px)",width:260,background:isLight?"#fff":"#111",border:`1px solid ${borderClr}`,borderRadius:12,zIndex:200,boxShadow:"0 12px 40px rgba(0,0,0,0.6)",overflow:"hidden"}}>
            <div style={{padding:"16px",borderBottom:`1px solid ${borderClr}`,background:isLight?"#f8f8f8":"#0d0d0d"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg, ${acc}, ${acc}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{initials}</div>
                <div style={{overflow:"hidden"}}>
                  <div style={{color:headerTxt,fontSize:13,fontWeight:700}}>{agentName}</div>
                  <div style={{color:mutedTxt,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:150}}>{userEmail}</div>
                  {/* Feature 18: Last Login */}
                  <div style={{color:"#555",fontSize:9,fontFamily:"monospace",marginTop:3}}>{t("lastLogin")}: {formatLastLogin(lastLogin)}</div>
                </div>
              </div>
            </div>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${borderClr}`}}>
              {[{label:t("clearance"),value:"Level 4",color:acc},{label:t("region"),value:"IN-SOUTH",color:acc},{label:t("status"),value:t("active"),color:"#22c55e"}].map(r=>(<div key={r.label} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:mutedTxt,fontSize:11,fontFamily:"monospace"}}>{r.label}</span><span style={{color:r.color,fontSize:11,fontFamily:"monospace",fontWeight:600}}>{r.value}</span></div>))}
            </div>
            <div style={{padding:"8px 10px",borderBottom:`1px solid ${borderClr}`}}>
              {[{icon:"⚙️",label:t("settings"),page:"settings"},{icon:"❓",label:t("helpFaq"),page:"help"},{icon:"📋",label:t("terms"),page:"terms"}].map(item=>(<button key={item.page} onClick={()=>{onNavigate(item.page);setShowProfile(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 8px",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,textAlign:"left",color:headerTxt,fontSize:12}} onMouseEnter={e=>(e.currentTarget.style.background=acc+"22")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><span>{item.icon}</span>{item.label}</button>))}
            </div>
            <div style={{padding:"10px 10px"}}>
              <button onClick={()=>{setShowProfile(false);onLogout();}} onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="#cc000022";}} onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="transparent";}} style={{width:"100%",background:"transparent",border:"1px solid #cc000055",color:"#cc0000",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:12,fontFamily:"monospace",letterSpacing:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 0.2s"}}>
                🚪 {t("logout")}
              </button>
            </div>
          </div>)}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
