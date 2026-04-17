import { useState, useEffect } from "react";
import HexShieldLogo from "./HexShieldLogo";

const quotes = [
  { text: "Fraud is the daughter of greed", author: "Jonathan Gash" },
  { text: "Data is the new oil. Fraud is its pollution", author: "FraudGuard AI" },
  { text: "Every anomaly tells a story. We decode them", author: "System Core" },
  { text: "In God we trust. All others we monitor", author: "NSA Adage" },
];

const steps = [
  "Initializing secure connection...",
  "Loading ML models...",
  "Connecting to data pipeline...",
  "Syncing case database...",
];

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  useEffect(() => {
    setTimeout(() => setShowLogo(true), 200);
    setTimeout(() => setShowQuote(true), 1400);
    setTimeout(() => setShowProgress(true), 2000);

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 2, 100);
        const si = Math.min(Math.floor(next / 25), 3);
        setStepIndex(si);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 600);
          }, 400);
        }
        return next;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo */}
      <div className={`mb-8 ${showLogo ? "animate-hex-spin" : "opacity-0"}`}>
        <HexShieldLogo size={80} />
      </div>

      {/* Title */}
      <div className={`mb-10 text-center ${showLogo ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.8s" }}>
        <h1 className="text-3xl font-bold tracking-wider text-foreground">FRAUDGUARD</h1>
        <p className="mt-1 text-xs font-mono tracking-[0.3em] text-primary">WAR ROOM</p>
      </div>

      {/* Quote */}
      {showQuote && (
        <div className="animate-fade-up mb-12 max-w-md text-center px-4">
          <p className="text-sm italic text-muted-foreground">"{quote.text}"</p>
          <p className="mt-2 text-xs text-primary font-mono">— {quote.author}</p>
        </div>
      )}

      {/* Progress */}
      {showProgress && (
        <div className="animate-fade-up w-80">
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground">{steps[stepIndex]}</p>
            <p className="text-xs font-mono text-primary">{progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
