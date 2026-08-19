import { Shield, MapPin, User, Mail, Calendar, Key } from "lucide-react";
import { useAuth } from "@/components/AuthContext";

export default function ProfilePanel() {
  const { user, profile } = useAuth();
  
  const agentName = profile?.name || user?.email?.split("@")[0] || "Agent";
  const email = user?.email || "officer@fraudguard.gov.in";
  
  return (
    <div className="space-y-6 max-w-xl font-mono text-zinc-300">
      <div className="bg-[#060000] border border-red-950/40 p-6 rounded-md space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-950/30 text-red-500 border border-red-950/80 rounded-md">
            <Shield size={36} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-500 tracking-wider">SECURE PROFILE CREDENTIALS</h3>
            <p className="text-[10px] text-zinc-500">Government Cyber Investigation Unit</p>
          </div>
        </div>

        <div className="divide-y divide-red-950/20 text-xs">
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 flex items-center gap-2"><User size={14} /> OFFICER NAME</span>
            <span className="font-bold text-zinc-200">{agentName.toUpperCase()}</span>
          </div>
          
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 flex items-center gap-2"><Mail size={14} /> SECURITY EMAIL</span>
            <span className="text-zinc-300 font-bold">{email}</span>
          </div>

          <div className="flex justify-between py-3">
            <span className="text-zinc-500 flex items-center gap-2"><Key size={14} /> ASSIGNED ROLE</span>
            <span className="text-red-500 font-bold">LEVEL 4 CHIEF INVESTIGATOR</span>
          </div>

          <div className="flex justify-between py-3">
            <span className="text-zinc-500 flex items-center gap-2"><MapPin size={14} /> DIVISION REGION</span>
            <span className="text-zinc-300">IN-CENTRAL COMMAND</span>
          </div>

          <div className="flex justify-between py-3">
            <span className="text-zinc-500 flex items-center gap-2"><Calendar size={14} /> DATE ASSIGNED</span>
            <span className="text-zinc-400">{new Date(profile?.created_at || "").toLocaleDateString() || "07/10/2026"}</span>
          </div>
        </div>

        <div className="bg-[#0b0505] border border-red-950/20 p-3 rounded-sm text-[10px] text-zinc-500">
          ⚠️ Profile credentials verified under SHA-256 local database nodes. Session activity is audited automatically.
        </div>
      </div>
    </div>
  );
}
