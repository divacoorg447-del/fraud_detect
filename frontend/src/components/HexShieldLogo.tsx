import { Hexagon } from "lucide-react";

const HexShieldLogo = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <Hexagon size={size} className="text-primary fill-primary/20" strokeWidth={1.5} />
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute text-primary"
      style={{ width: size * 0.45, height: size * 0.45 }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  </div>
);

export default HexShieldLogo;
