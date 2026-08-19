import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const secondaryTextColor = "hsl(var(--muted-foreground))";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, signup, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError("Configuration Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (isSignup && !name) {
      setError("Agent name is required for registration.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isSignup) {
        const { data, error } = await signup(email, password, name);
        console.log("Signup raw response in LoginPage:", { data, error });
        if (error) throw error;
        
        alert("Verification email sent! Check your inbox to confirm your signup before logging in.");
        setIsSignup(false);
      } else {
        const { data, error } = await login(email, password);
        console.log("Login raw response in LoginPage:", { data, error });
        if (error) throw error;
      }
    } catch (e: any) {
      console.error("Authentication error inside LoginPage handler:", e);
      let errMsg = e.message || "Authentication failed. Please check credentials.";
      
      const msg = errMsg.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        errMsg = "Invalid email or password. Please verify your credentials.";
      } else if (msg.includes("email not confirmed") || msg.includes("confirm your email")) {
        errMsg = "Email has not been confirmed yet. Please check your inbox for the confirmation email.";
      } else if (msg.includes("user not found")) {
        errMsg = "User account not found. Please register first.";
      } else if (msg.includes("invalid api key") || msg.includes("anon key") || msg.includes("invalid public key")) {
        errMsg = "Configuration Error: Invalid Supabase API Key.";
      } else if (msg.includes("api key") || msg.includes("url") || msg.includes("failed to fetch")) {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          errMsg = "Configuration Error: Missing environment variables.";
        } else {
          errMsg = "Connection Error: Failed to reach Supabase server. Please verify your configuration.";
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error } = await loginWithGoogle();
      if (error) throw error;
    } catch (e: any) {
      console.error("Google Auth error inside LoginPage handler:", e);
      setError(e.message || "Google Authentication failed.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030303", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <style>{`
        @keyframes gridMove{0%{transform:translateY(0)}100%{transform:translateY(40px)}}
        @keyframes scan{0%{top:-2%}100%{top:102%}}
        @keyframes redPulse{0%,100%{border-color:rgba(204,0,0,0.4)}50%{border-color:rgba(204,0,0,0.9)}}
        .lg-inp{width:100%;background:#080808;border:1px solid rgba(204,0,0,0.2);border-radius:4px;padding:10px 13px;color:#e0e0e0;font-size:12px;font-family:monospace;outline:none;transition:border-color .2s,box-shadow .2s;margin-top:5px;box-sizing:border-box}
        .lg-inp:focus{border-color:rgba(204,0,0,0.7)!important;box-shadow:0 0 0 3px rgba(204,0,0,0.1)!important}
      `}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(180,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(180,0,0,0.04) 1px,transparent 1px)",backgroundSize:"40px 40px",animation:"gridMove 10s linear infinite"}}/>
      <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(204,0,0,0.3),transparent)",animation:"scan 5s linear infinite",zIndex:2}}/>

      <div style={{ position: "relative", zIndex: 10, width: 420, background: "rgba(6,6,6,0.97)", border: "1px solid rgba(204,0,0,0.5)", borderRadius: 6, padding: "32px 32px 24px", boxShadow: "0 0 80px rgba(204,0,0,0.18), inset 0 0 60px rgba(0,0,0,0.4)", animation: "redPulse 3s ease-in-out infinite" }}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#cc0000,transparent)",borderRadius:"6px 6px 0 0"}}/>
        
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: 6, fontFamily: "monospace" }}>FRAUDGUARD</div>
          <div style={{ color: "#cc0000", fontSize: 8, letterSpacing: 4, marginTop: 4, fontFamily: "monospace" }}>SECURE ACCESS PORTAL</div>
        </div>

        {error && (
          <div style={{ background: "#150000", border: "1px solid #cc0000", borderRadius: 3, padding: "8px 12px", color: "#cc0000", fontSize: 11, marginBottom: 16, fontFamily: "monospace" }}>
            ⛔ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>AGENT NAME *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Shree Kumar"
                className="lg-inp"
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>AGENT EMAIL *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agent@cbi.gov.in"
              className="lg-inp"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#aaa", fontSize: 8, fontFamily: "monospace", letterSpacing: 2, display: "block" }}>PASSWORD *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="lg-inp"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#120000" : "#cc0000", color: loading ? "#550000" : "#fff", border: "none", borderRadius: 4, padding: "12px", cursor: loading ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 3, fontFamily: "monospace", transition: "background .15s" }}
          >
            {loading ? "AUTHENTICATING..." : isSignup ? "CREATE ACCOUNT →" : "SIGN IN →"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "16px 0", color: "#444", fontSize: 10, fontFamily: "monospace" }}>
          <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          <span style={{ padding: "0 8px" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          style={{ width: "100%", background: "#0a0a0a", color: "#e0e0e0", border: "1px solid #222", borderRadius: 4, padding: "10px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#141414"}
          onMouseLeave={e => e.currentTarget.style.background = "#0a0a0a"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#444" }}>
          {isSignup ? (
            <span>Already have an account? <span onClick={() => { setIsSignup(false); setError(""); }} style={{ color: "#cc0000", cursor: "pointer", textDecoration: "underline" }}>Sign in</span></span>
          ) : (
            <span>New agent? <span onClick={() => { setIsSignup(true); setError(""); }} style={{ color: "#cc0000", cursor: "pointer", textDecoration: "underline" }}>Register here</span></span>
          )}
        </div>
      </div>
    </div>
  );
}