"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Download,
  Shield,
  Lock,
  Globe,
  Wifi,
  Building2,
  Zap,
  CheckCircle2,
  Eye,
  Sparkles,
  Keyboard,
  Layers,
  Compass,
  SlidersHorizontal,
} from "lucide-react";

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(-4, -7279)">
        <path d="M13.1458647,7289.43426 C13.1508772,7291.43316 13.1568922,7294.82929 13.1619048,7297.46884 C16.7759398,7297.95757 20.3899749,7298.4613 23.997995,7299 C23.997995,7295.84873 24.002005,7292.71146 23.997995,7289.71311 C20.3809524,7289.71311 16.7649123,7289.43426 13.1458647,7289.43426 M4,7289.43526 L4,7296.22153 C6.72581454,7296.58933 9.45162907,7296.94113 12.1724311,7297.34291 C12.1774436,7294.71736 12.1704261,7292.0908 12.1704261,7289.46524 C9.44661654,7289.47024 6.72380952,7289.42627 4,7289.43526 M4,7281.84344 L4,7288.61071 C6.72581454,7288.61771 9.45162907,7288.57673 12.1774436,7288.57973 C12.1754386,7285.96017 12.1754386,7283.34361 12.1724311,7280.72405 C9.44461153,7281.06486 6.71679198,7281.42567 4,7281.84344 M24,7288.47179 C20.3879699,7288.48578 16.7759398,7288.54075 13.1619048,7288.55175 C13.1598997,7285.88921 13.1598997,7283.22967 13.1619048,7280.56914 C16.7689223,7280.01844 20.3839599,7279.50072 23.997995,7279 C24,7282.15826 23.997995,7285.31353 24,7288.47179" />
      </g>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-52.01 0 560.035 560.035"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655" />
    </svg>
  );
}

export default function Downloads() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVpnSimulatedOn, setIsVpnSimulatedOn] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dl-header",
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" }
      );

      gsap.fromTo(
        ".dl-card",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, delay: 0.4, ease: "power3.out" }
      );

      gsap.fromTo(
        ".vpn-feature-card",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, delay: 0.7, ease: "power2.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const platforms = [
    {
      name: "Windows",
      icon: <WindowsIcon className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" />,
      arch: "x64 / arm64",
      version: "v2.4.0",
    },
    {
      name: "macOS",
      icon: <AppleIcon className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" />,
      arch: "Intel / Apple Silicon",
      version: "v2.4.0",
    },
    {
      name: "Linux",
      icon: (
        <img
          src="/linux-svgrepo-com.svg"
          alt="Linux"
          className="w-12 h-12 object-contain transition-all duration-300 group-hover:scale-105"
        />
      ),
      arch: "deb / rpm / AppImage",
      version: "v2.4.0",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "On-Device Encryption",
      tech: "ChaCha20-Poly1305",
      icon: <Lock className="w-6 h-6 text-primary" />,
      desc: "When you switch on Forge VPN, data is scrambled locally on your device before a single packet touches the network, preventing local sniffing.",
    },
    {
      num: "02",
      title: "The Secure Tunnel",
      tech: "WireGuard UDP :51820",
      icon: <Zap className="w-6 h-6 text-[#FF8533]" />,
      desc: "Your scrambled traffic traverses an isolated, high-speed tunnel directly to the global server node chosen by you (US, DE, NL, SG, CO, JP).",
    },
    {
      num: "03",
      title: "IP Replacement",
      tech: "Virtual Exit Gateway",
      icon: <Globe className="w-6 h-6 text-accent" />,
      desc: "The VPN server opens and relays the request. The destination website only sees the VPN server's location and IP address, never your home identity.",
    },
    {
      num: "04",
      title: "Shared Addresses & Guard",
      tech: "Crowd Anonymity + Kill Switch",
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      desc: "You share an IP address with other concurrent users for untraceable crowd privacy, reinforced by a Kill Switch that halts traffic if the tunnel drops.",
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen py-20 px-4 sm:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[140px] -z-10" />

      <div className="max-w-6xl mx-auto">
        {/* ============================================================== */}
        {/* HEADER */}
        {/* ============================================================== */}
        <div className="text-center mb-16">
          <div className="dl-header flex justify-center mb-6">
            <div className="p-2.5 rounded-2xl bg-surface-1 border border-surface-2 shadow-xl inline-block">
              <img
                src="/logo.png"
                alt="Forge Browser"
                className="w-20 h-20 rounded-xl object-contain"
              />
            </div>
          </div>
          <h1 className="dl-header text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            Download Forge Browser
          </h1>
          <p className="dl-header text-xl text-foreground/70 max-w-2xl mx-auto">
            Get the developer-first browser featuring built-in WireGuard VPN, native network inspection, AdBlock, and pip multimedia control.
          </p>
        </div>

        {/* ============================================================== */}
        {/* DOWNLOAD PLATFORM CARDS */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {platforms.map((os, i) => (
            <div
              key={i}
              className="dl-card p-8 rounded-2xl bg-surface-1 border border-surface-2 hover:border-primary/50 transition-all flex flex-col items-center text-center group shadow-sm hover:shadow-xl"
            >
              <div className="mb-6 p-4 bg-background text-foreground rounded-full group-hover:bg-primary group-hover:text-white transition-colors duration-300 flex items-center justify-center">
                {os.icon}
              </div>
              <h2 className="text-2xl font-bold mb-2">{os.name}</h2>
              <p className="text-sm text-foreground/50 mb-6">{os.arch}</p>

              <button className="w-full py-3 bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Download className="w-4 h-4" /> Download {os.version}
              </button>
            </div>
          ))}
        </div>

        {/* ============================================================== */}
        {/* VPN STEP-BY-STEP & "WHAT OTHERS SEE" FEATURE SECTION */}
        {/* ============================================================== */}
        <div className="mt-12 pt-16 border-t border-surface-2">
          {/* Section Title */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Built-In WireGuard Client & Privacy Core
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              How Forge VPN Protects You
            </h2>
            <p className="text-foreground/70 text-base sm:text-lg">
              Forge operates as a complete, lightweight VPN client compatible with WireGuard servers.
              Here is the exact step-by-step cryptographic process and what others see when you browse.
            </p>
          </div>

          {/* 4-Step Process Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="vpn-feature-card p-6 rounded-2xl bg-surface-1 border border-surface-2 relative overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-background border border-surface-2 group-hover:scale-110 transition-transform">
                      {step.icon}
                    </div>
                    <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary/40 transition-colors">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-foreground">{step.title}</h3>
                  <div className="text-[11px] font-mono text-primary font-medium mb-3">
                    {step.tech}
                  </div>
                  <p className="text-sm text-foreground/60 leading-relaxed">{step.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-surface-2/60 flex items-center gap-1.5 text-xs text-foreground/40 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Fully Verified
                </div>
              </div>
            ))}
          </div>

          {/* ============================================================== */}
          {/* INTERACTIVE "WHAT OTHERS SEE" COMPARISON MATRIX */}
          {/* ============================================================== */}
          <div className="rounded-3xl bg-surface-1 border border-surface-2 p-6 sm:p-10 shadow-2xl overflow-hidden relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-surface-2">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2.5">
                  <Eye className="w-6 h-6 text-primary" /> What Others See When You Browse
                </h3>
                <p className="text-sm text-foreground/60 mt-1">
                  Compare your network visibility with Forge WireGuard active versus an unprotected direct connection.
                </p>
              </div>

              {/* Interactive Simulation Switch */}
              <div className="flex items-center gap-3 self-end sm:self-center bg-background p-1.5 rounded-xl border border-surface-2">
                <span className="text-xs font-semibold text-foreground/70 px-2">
                  VPN Shield:
                </span>
                <button
                  type="button"
                  onClick={() => setIsVpnSimulatedOn(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isVpnSimulatedOn
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  Disconnected
                </button>
                <button
                  type="button"
                  onClick={() => setIsVpnSimulatedOn(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isVpnSimulatedOn
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> Connected
                </button>
              </div>
            </div>

            {/* 3 Visibility Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Websites */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isVpnSimulatedOn
                    ? "bg-purple-950/10 border-purple-500/30"
                    : "bg-red-950/10 border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-background border border-surface-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="font-bold text-base">Websites You Visit</h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isVpnSimulatedOn
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {isVpnSimulatedOn ? "Real IP Hidden" : "Real IP Exposed"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">Visible Location</span>
                    <span className="font-semibold text-foreground">
                      {isVpnSimulatedOn ? "🇩🇪 Frankfurt, Germany (VPN Server)" : "🏠 Your Actual City & Region"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">Visible IP Address</span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {isVpnSimulatedOn ? "185.156.46.12 (Shared Anonymized Pool)" : "Your ISP Public IP"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-surface-2/60 text-xs text-foreground/70 leading-relaxed">
                    {isVpnSimulatedOn
                      ? "Websites only see the VPN gateway. Ad trackers cannot correlate your browsing habits across different platforms."
                      : "Websites log your physical geolocation, provider name, and track your activity across sessions."}
                  </div>
                </div>
              </div>

              {/* Column 2: ISP */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isVpnSimulatedOn
                    ? "bg-indigo-950/10 border-indigo-500/30"
                    : "bg-amber-950/10 border-amber-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-background border border-surface-2">
                      <Building2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h4 className="font-bold text-base">Your Internet Provider</h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isVpnSimulatedOn
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {isVpnSimulatedOn ? "Encrypted Stream" : "History Logged"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">What They See</span>
                    <span className="font-semibold text-foreground">
                      {isVpnSimulatedOn ? "Encrypted WireGuard UDP :51820" : "Every Domain & URL You Visit"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">DNS Queries</span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {isVpnSimulatedOn ? "Resolved in Tunnel (1.1.1.1 DNSSEC)" : "ISP Default Logging Resolver"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-surface-2/60 text-xs text-foreground/70 leading-relaxed">
                    {isVpnSimulatedOn
                      ? "Your ISP only sees that you are connected to a secure server. They cannot see pages visited, media streamed, or queries searched."
                      : "ISPs can record, monetize, or throttle your traffic based on domains you visit."}
                  </div>
                </div>
              </div>

              {/* Column 3: Public Wi-Fi Admins */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isVpnSimulatedOn
                    ? "bg-cyan-950/10 border-cyan-500/30"
                    : "bg-red-950/10 border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-background border border-surface-2">
                      <Wifi className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h4 className="font-bold text-base">Public Wi-Fi & Admins</h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isVpnSimulatedOn
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {isVpnSimulatedOn ? "Snooping Blocked" : "Packet Sniffing Risk"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">Packet Payload</span>
                    <span className="font-semibold text-foreground">
                      {isVpnSimulatedOn ? "Unreadable ChaCha20 Ciphertext" : "Cleartext HTTP / SNI / DNS"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono text-foreground/50 block">Man-In-The-Middle</span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {isVpnSimulatedOn ? "Cryptographically Prevented" : "Vulnerable to Rogue Access Points"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-surface-2/60 text-xs text-foreground/70 leading-relaxed">
                    {isVpnSimulatedOn
                      ? "On untrusted public networks (airports, hotels, cafes), administrators and eavesdroppers see zero usable information."
                      : "Rogue hotspots can intercept insecure traffic, spoof DNS, or capture browsing activity."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BUILT-IN HOTKEYS & KEYBOARD SHORTCUTS */}
        {/* ============================================================== */}
        <div className="mt-28 mb-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              <Keyboard className="w-4 h-4" /> Native Productivity
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Built-In Keyboard Shortcuts
            </h2>
            <p className="text-foreground/70 max-w-xl mx-auto text-sm md:text-base">
              Control your tabs, navigation, and web pages without ever touching your mouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Managing Tabs */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-surface-2 flex flex-col">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-surface-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Managing Tabs</h3>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Open a new tab</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">T</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Close the current tab</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">W</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Reopen the last closed tab</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Shift</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">T</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Switch to the next tab</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Tab</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Switch to previous tab</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Shift</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Tab</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation and Windows */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-surface-2 flex flex-col">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-surface-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Navigation & Windows</h3>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Jump to address bar</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">L</kbd>
                    </div>
                    <span className="text-[10px] text-foreground/40">or</span>
                    <div className="flex gap-0.5">
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Alt</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">D</kbd>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Open private / incognito window</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Shift</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">N</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Go back to previous page</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Alt</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">←</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Go forward to next page</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Alt</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">→</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Refresh current page</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">F5</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Toggle full-screen mode</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">F11</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Controls */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-surface-2 flex flex-col">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-surface-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Page Controls</h3>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Find text on page</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">F</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Zoom in or zoom out</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">+</kbd>
                    </div>
                    <span className="text-[10px] text-foreground/40">/</span>
                    <div className="flex gap-0.5">
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">-</kbd>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Reset zoom to default</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">0</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Bookmark current page</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">D</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Open browsing history</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">H</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">View downloads manager</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">J</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/40">
                  <span className="text-xs text-foreground/80">Toggle Picture-in-Picture (PiP)</span>
                  <div className="flex gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">Alt</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-background border border-surface-2 rounded shadow-xs">P</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
