"use client";

import { useState } from "react";
import {
  Heart,
  Coffee,
  Zap,
  Shield,
  Crown,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  DollarSign,
  ArrowRight,
  Sparkles,
  Server,
  Code2,
  Lock,
} from "lucide-react";

// Inline brand SVGs for platforms
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

interface CryptoAddress {
  coin: string;
  symbol: string;
  network: string;
  address: string;
  color: string;
}

const CRYPTO_WALLETS: CryptoAddress[] = [
  {
    coin: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin Native SegWit",
    address: "bc1qforge0browser9supp0rt994k3xdev7",
    color: "#F7931A",
  },
  {
    coin: "Ethereum",
    symbol: "ETH / USDT / USDC",
    network: "Ethereum (ERC-20) / Arbitrum / Base",
    address: "0x71C67E77B13f1c504A7a14E156D1Ff8E323136DE",
    color: "#627EEA",
  },
  {
    coin: "Solana",
    symbol: "SOL",
    network: "Solana Network",
    address: "ForgeDevCommunity89yD8H12kLxJ4kXwP3QW9a7NmP",
    color: "#14F195",
  },
  {
    coin: "Monero",
    symbol: "XMR",
    network: "Monero Mainnet (Private)",
    address: "888tNkZrPN6JsE5xY9zE47mQ2wForgePrivatePrivacySupport1010",
    color: "#FF6600",
  },
];

export function DonationSection({ id = "donate" }: { id?: string }) {
  const [frequency, setFrequency] = useState<"monthly" | "once">("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(15);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"platforms" | "crypto">("platforms");
  const [copiedCoin, setCopiedCoin] = useState<string | null>(null);
  const [activeQrCoin, setActiveQrCoin] = useState<string | null>(null);

  const tiers = [
    {
      amount: 5,
      name: "Coffee & Morale",
      icon: <Coffee className="w-5 h-5 text-amber-500" />,
      desc: "Fuels late-night bug hunts, scriptlet updates, and quick patches.",
    },
    {
      amount: 15,
      name: "WireGuard Relay",
      icon: <Zap className="w-5 h-5 text-primary" />,
      desc: "Keeps 1 high-speed VPN exit node powered and accessible for a month.",
    },
    {
      amount: 30,
      name: "Privacy Vanguard",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      desc: "Funds automated adblock test suites, rule pipelines, and DNS resolvers.",
    },
    {
      amount: 100,
      name: "Core Champion",
      icon: <Crown className="w-5 h-5 text-accent" />,
      desc: "Direct sponsorship with honorary mention on release notes & GitHub sponsors.",
    },
  ];

  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleCopy = (coin: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedCoin(coin);
    setTimeout(() => setCopiedCoin(null), 2500);
  };

  return (
    <section id={id} className="w-full py-24 px-4 sm:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/8 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-accent/6 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 tracking-wide">
            <Heart className="w-4 h-4 fill-primary animate-pulse" />
            100% COMMUNITY-FUNDED & OPEN-SOURCE
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Support Independent Browsing
          </h2>
          <p className="text-foreground/70 text-base sm:text-lg leading-relaxed">
            Forge is completely free. We will never sell your browsing history, bundle telemetry,
            or rely on venture capital investors. Your donations directly power global VPN relay
            servers, adblock filter maintenance, and open-source development.
          </p>
        </div>

        {/* Live Milestone / Transparency Bar */}
        <div className="p-6 rounded-2xl bg-surface-1 border border-surface-2 mb-12 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Monthly Server & Infrastructure Goal
              </span>
            </div>
            <div className="text-xs font-mono text-foreground/70">
              <span className="font-bold text-primary">$3,650</span> / $5,000 per month (73% funded)
            </div>
          </div>

          <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-primary via-[#FF8533] to-accent rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(255,107,0,0.5)]"
              style={{ width: "73%" }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-surface-2/60 text-xs text-foreground/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>50% High-Speed VPN Nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>30% Filter CDNs & Security Audits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>20% Open Development & CI</span>
            </div>
          </div>
        </div>

        {/* Donation Interaction Card */}
        <div className="rounded-3xl bg-surface-1 border border-surface-2 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Top Controls: Frequency & Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 mb-8 border-b border-surface-2">
            {/* Frequency Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-background border border-surface-2">
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  frequency === "monthly"
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Monthly Patron ✨
              </button>
              <button
                type="button"
                onClick={() => setFrequency("once")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  frequency === "once"
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                One-Time Gift
              </button>
            </div>

            {/* Platform / Crypto Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-background border border-surface-2">
              <button
                type="button"
                onClick={() => setActiveTab("platforms")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "platforms"
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Cards, GitHub & PayPal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("crypto")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "crypto"
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Crypto (BTC/ETH/SOL)
              </button>
            </div>
          </div>

          {activeTab === "platforms" ? (
            <>
              {/* Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {tiers.map((tier) => {
                  const isSelected = !customAmount && selectedAmount === tier.amount;
                  return (
                    <div
                      key={tier.amount}
                      onClick={() => {
                        setSelectedAmount(tier.amount);
                        setCustomAmount("");
                      }}
                      className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-lg"
                          : "bg-background/60 border-surface-2 hover:border-primary/40 hover:bg-background"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-surface-2/60">{tier.icon}</div>
                          <span className="font-extrabold text-2xl font-mono text-foreground">
                            ${tier.amount}
                            <span className="text-xs font-normal text-foreground/50">
                              {frequency === "monthly" ? "/mo" : ""}
                            </span>
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mb-1">{tier.name}</h4>
                        <p className="text-xs text-foreground/60 leading-relaxed">{tier.desc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-surface-2/60 flex items-center justify-between text-xs font-medium">
                        <span className={isSelected ? "text-primary font-bold" : "text-foreground/50"}>
                          {isSelected ? "Selected" : "Select tier"}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-surface-2"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Amount Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-background border border-surface-2 mb-8">
                <span className="text-xs sm:text-sm font-semibold text-foreground/80">
                  Or set a custom contribution:
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex items-center">
                    <DollarSign className="w-4 h-4 text-foreground/40 absolute left-3 pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Custom"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full sm:w-36 pl-8 pr-3 py-2 rounded-lg bg-surface-1 border border-surface-2 text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  {customAmount && (
                    <button
                      type="button"
                      onClick={() => setCustomAmount("")}
                      className="text-xs text-foreground/50 hover:text-foreground cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Rail Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* GitHub Sponsors */}
                <a
                  href="https://github.com/sponsors/Joel-Dev0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl bg-[#24292e] text-white hover:bg-[#1a1f24] transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <GithubIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <div className="font-bold text-sm">GitHub Sponsors</div>
                      <div className="text-[11px] text-white/70">Zero fees • Direct repo support</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </a>

                {/* Buy Me a Coffee */}
                <a
                  href="https://buymeacoffee.com/joeldev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl bg-[#FFDD00] text-black hover:bg-[#FACC15] transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg bg-black/10 group-hover:scale-110 transition-transform">
                      <Coffee className="w-5 h-5 text-black" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Buy Me a Coffee</div>
                      <div className="text-[11px] text-black/70">Card, Apple Pay, Google Pay</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" />
                </a>

                {/* PayPal Direct */}
                <a
                  href="https://paypal.me/joeldev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl bg-[#0070BA] text-white hover:bg-[#005ea6] transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <PaypalIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <div className="font-bold text-sm">PayPal Checkout</div>
                      <div className="text-[11px] text-white/70">Quick 1-click international</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </a>
              </div>
            </>
          ) : (
            /* Crypto Wallets Section */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-foreground/80 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-primary">Anonymous & Decentralized Contributions.</span>{" "}
                  Support Forge using native blockchain transfers. Click any address below to copy
                  it to your clipboard, or scan the QR code.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CRYPTO_WALLETS.map((wallet) => (
                  <div
                    key={wallet.coin}
                    className="p-5 rounded-2xl bg-background border border-surface-2 hover:border-primary/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: wallet.color }}
                          />
                          <span className="font-bold text-base text-foreground">
                            {wallet.coin}
                          </span>
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface-2 text-foreground/70">
                            {wallet.symbol}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveQrCoin(activeQrCoin === wallet.coin ? null : wallet.coin)
                          }
                          className="p-1.5 rounded-lg bg-surface-2/60 text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Show QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-[11px] font-mono text-foreground/50 mb-3">
                        {wallet.network}
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-1 border border-surface-2 font-mono text-xs text-foreground/80 break-all select-all flex items-center justify-between gap-2">
                        <span>{wallet.address}</span>
                      </div>
                    </div>

                    {/* QR Code expansion */}
                    {activeQrCoin === wallet.coin && (
                      <div className="mt-4 p-4 rounded-xl bg-surface-1 border border-surface-2 flex flex-col items-center text-center animate-in fade-in duration-200">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${wallet.address}&color=171717&bgcolor=ffffff`}
                          alt={`${wallet.coin} QR Code`}
                          className="w-36 h-36 rounded-lg p-2 bg-white shadow-sm mb-2"
                        />
                        <span className="text-[11px] text-foreground/60">
                          Scan with your {wallet.coin} mobile wallet
                        </span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-surface-2/60 flex items-center justify-between">
                      <span className="text-[11px] text-foreground/50">
                        Instant, non-custodial
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(wallet.coin, wallet.address)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 text-foreground text-xs font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
                      >
                        {copiedCoin === wallet.coin ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Address
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guarantee / Transparency Badges */}
          <div className="mt-8 pt-8 border-t border-surface-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Code2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">100% Open Source</div>
                <div className="text-foreground/50">GPL-3.0 Licensed repo on GitHub</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">Zero Analytics & Ads</div>
                <div className="text-foreground/50">We don&apos;t monetize your browsing</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">Community Backed</div>
                <div className="text-foreground/50">Roadmap decided by contributors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
