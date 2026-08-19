import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./components/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#030303", color: "#cc0000", fontFamily: "monospace", fontSize: 13, letterSpacing: 2 }}>
        🛡️ INITIALIZING SECURE SESSION SEC_SEC...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const LoginRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#030303", color: "#cc0000", fontFamily: "monospace", fontSize: 13, letterSpacing: 2 }}>
        🛡️ INITIALIZING SECURE SESSION SEC_SEC...
      </div>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// NOTE: QueryClientProvider and BrowserRouter are in main.tsx — do NOT add them here again
const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/login" element={<LoginRoute><LoginPage /></LoginRoute>} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
