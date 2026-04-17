import { useState } from "react";
import { supabase } from "@/lib/supabase";

const PABBLY_WEBHOOK_URL = "https://connect.pabbly.com/webhook-listener/webhook/IjU3NjIwNTY1MDYzNzA0M2Q1MjY1NTUzYyI_3D_pc/IjU3NjcwNTZmMDYzZjA0M2M1MjZlNTUzMTUxMzYi_pc";

interface Props {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const secondaryTextColor = "hsl(var(--muted-foreground))";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitToWebhook = async (payload: Record<string, unknown>) => {
    try {
      await fetch(PABBLY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch (submitError) {
      console.error("Webhook submission failed:", submitError);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      void submitToWebhook({
        event: isSignup ? "signup_submit" : "login_submit",
        source: "components_login",
        email,
      });
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email to confirm signup!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(email);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#111", border: "1px solid #cc0000", borderRadius: 12, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>FRAUDGUARD</div>
          <div style={{ color: "#cc0000", fontSize: 10, letterSpacing: 3, marginTop: 4 }}>SECURE ACCESS PORTAL</div>
        </div>

        {error && (
          <div style={{ background: "#2d0000", border: "1px solid #cc0000", borderRadius: 6, padding: "8px 12px", color: "#cc0000", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: secondaryTextColor, fontSize: 11, fontFamily: "monospace" }}>EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="agent@gov.in"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 13, marginTop: 6, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ color: secondaryTextColor, fontSize: 11, fontFamily: "monospace" }}>PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 13, marginTop: 6, boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", background: "#cc0000", color: "#fff", border: "none", borderRadius: 6, padding: "12px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          {loading ? "Processing..." : isSignup ? "Create Account" : "Login"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => setIsSignup(!isSignup)}
            style={{ background: "none", border: "none", color: secondaryTextColor, fontSize: 12, cursor: "pointer" }}
          >
            {isSignup ? "Already have account? Login" : "New agent? Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}