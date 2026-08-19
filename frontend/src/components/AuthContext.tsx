import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  clearance_level: string;
  region: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let isGlobalAuthListenerInitialized = false;
const authListeners = new Set<(_event: any, session: any) => void>();

const setupGlobalAuthListener = () => {
  if (isGlobalAuthListenerInitialized) return;
  isGlobalAuthListenerInitialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    authListeners.forEach(cb => cb(event, session));
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching user profile:", error);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  useEffect(() => {
    let active = true;

    setupGlobalAuthListener();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes via global coordinator
    const handleAuthChange = async (_event: any, session: any) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    authListeners.add(handleAuthChange);

    return () => {
      active = false;
      authListeners.delete(handleAuthChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("Supabase signInWithPassword response:", { data, error });
      return { data, error };
    } catch (err: any) {
      console.error("Supabase signInWithPassword exception:", err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });
      console.log("Supabase signUp response:", { data, error });
      return { data, error };
    } catch (err: any) {
      console.error("Supabase signUp exception:", err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.removeItem("fraudguard_name");
      localStorage.removeItem("fraudguard_email");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        login,
        signup,
        logout,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
