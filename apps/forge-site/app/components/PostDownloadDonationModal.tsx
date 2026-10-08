"use client";

import { useEffect, useState } from "react";
import {
  X,
  Heart,
  Coffee,
  Zap,
  Shield,
  Sparkles,
  ExternalLink,
  Check,
  Copy,
  Download,
  Coins,
} from "lucide-react";

interface PostDownloadDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  platformName: string;
  version: string;
}

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function PaypalIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.388 5.468 0 5.99 0h7.79c3.345 0 5.688.767 6.963 2.279 1.189 1.41 1.488 3.399.888 5.912-.132.553-.33 1.107-.594 1.662-.977 2.05-2.585 3.513-4.78 4.348-1.077.409-2.316.617-3.684.617H9.79l-1.42 7.518a.641.641 0 0 1-.633.535l-.661.466z" />
    </svg>
  );
}

export function PostDownloadDonationModal({
  isOpen,
  onClose,
  platformName,
  version,
}: PostDownloadDonationModalProps) {
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number>(15);
  const [showCrypto, setShowCrypto] = useState<boolean>(false);
  const [copiedCrypto, setCopiedCrypto] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (coin: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCrypto(coin);
    setTimeout(() => setCopiedCrypto(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-3xl bg-surface-1 border border-surface-2 p-6 sm:p-8 shadow-2xl z-10 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glowing background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration / Download Started Banner */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <Download className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Sparkles className="w-3 h-3" /> Download Initialized
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
              Thank you for downloading Forge!
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-foreground/70 mb-5 leading-relaxed">
          Your browser installer for <strong className="text-foreground">{platformName}</strong> ({version}) is starting.
          Forge is 100% free and open-source, built without VC influence or ad trackers.
        </p>

        {/* Donation Prompt Box */}
        <div className="p-5 rounded-2xl bg-background border border-surface-2 mb-6 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Help Us Stay 100% Independent
              </span>
            </div>
            <span className="text-[11px] text-foreground/50">Every tip powers a relay</span>
          </div>

          <p className="text-xs text-foreground/70 mb-4 leading-relaxed">
            Would you consider leaving a quick tip to help us maintain fast WireGuard servers,
            adblock filter CDN lists, and ongoing development?
          </p>

          {/* Quick Amount Selector */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { amount: 5, label: "$5 ☕" },
              { amount: 15, label: "$15 ⚡" },
              { amount: 30, label: "$30 🛡️" },
              { amount: 50, label: "$50 👑" },
            ].map((tier) => (
              <button
                key={tier.amount}
                type="button"
                onClick={() => setSelectedQuickAmount(tier.amount)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedQuickAmount === tier.amount
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
                    : "bg-surface-1 text-foreground/80 border-surface-2 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Action Rails */}
          <div className="space-y-2.5">
            {/* GitHub Sponsors */}
            <a
              href="https://github.com/sponsors/Joel-Dev0"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-xl bg-[#24292e] text-white hover:bg-[#1a1f24] transition-all flex items-center justify-between text-xs sm:text-sm font-semibold group shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <GithubIcon className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Sponsor ${selectedQuickAmount} on GitHub (0% Fees)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60 group-hover:text-white" />
            </a>

            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/joeldev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-xl bg-[#FFDD00] text-black hover:bg-[#FACC15] transition-all flex items-center justify-between text-xs sm:text-sm font-bold group shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Coffee className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                <span>Tip with Buy Me a Coffee (Card / Apple Pay)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-black/60 group-hover:text-black" />
            </a>

            {/* PayPal */}
            <a
              href="https://paypal.me/joeldev"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-xl bg-[#0070BA] text-white hover:bg-[#005ea6] transition-all flex items-center justify-between text-xs sm:text-sm font-semibold group shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <PaypalIcon className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Pay via PayPal</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60 group-hover:text-white" />
            </a>
          </div>

          {/* Crypto Collapsible Toggle */}
          <div className="mt-4 pt-3 border-t border-surface-2">
            <button
              type="button"
              onClick={() => setShowCrypto(!showCrypto)}
              className="flex items-center justify-between w-full text-xs font-semibold text-foreground/70 hover:text-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-accent" />
                <span>Or donate via Crypto (BTC, ETH, SOL)</span>
              </div>
              <span className="text-[11px] text-primary">{showCrypto ? "Hide" : "Show"}</span>
            </button>

            {showCrypto && (
              <div className="mt-3 space-y-2 text-xs">
                {/* BTC */}
                <div className="p-2.5 rounded-lg bg-surface-1 border border-surface-2 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-bold text-amber-500 mr-1.5">BTC:</span>
                    <span className="font-mono text-[11px] text-foreground/70">
                      bc1qforge0browser9supp0rt994k3xdev7
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("btc", "bc1qforge0browser9supp0rt994k3xdev7")}
                    className="p-1 rounded bg-surface-2 hover:bg-primary hover:text-white transition-colors shrink-0"
                    title="Copy BTC address"
                  >
                    {copiedCrypto === "btc" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* ETH */}
                <div className="p-2.5 rounded-lg bg-surface-1 border border-surface-2 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-bold text-indigo-400 mr-1.5">ETH:</span>
                    <span className="font-mono text-[11px] text-foreground/70">
                      0x71C67E77B13f1c504A7a14E156D1Ff8E323136DE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("eth", "0x71C67E77B13f1c504A7a14E156D1Ff8E323136DE")
                    }
                    className="p-1 rounded bg-surface-2 hover:bg-primary hover:text-white transition-colors shrink-0"
                    title="Copy ETH address"
                  >
                    {copiedCrypto === "eth" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground/50">
            Installation takes ~15 seconds once downloaded.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground/70 hover:text-foreground hover:bg-surface-2 transition-all cursor-pointer"
          >
            I&apos;ll donate later, take me to Forge
          </button>
        </div>
      </div>
    </div>
  );
}
