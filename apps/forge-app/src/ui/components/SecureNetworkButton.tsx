import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Shield,
  ShieldCheck,
  Server,
  Lock,
  RotateCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Trash2,
  Sparkles,
  Radio,
  ArrowDown,
  ArrowUp,
  FileText,
  Upload,
  Copy,
  Check,
  Eye,
  Wifi,
  Building2,
  Zap,
  Plus,
} from "lucide-react";
import {
  useSecureNetworkStore,
  type ProxyProtocol,
} from "../../core/network/useSecureNetworkStore.ts";
import { useVpnStore } from "../../core/vpn/useVpnStore.ts";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(startTime?: number): string {
  if (!startTime) return "00:00";
  const elapsed = Math.max(0, Date.now() - startTime);
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}:${remMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function SecureNetworkButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  // VPN-specific local UI states
  const [showVpnLocations, setShowVpnLocations] = useState(false);
  const [showVpnConfigImport, setShowVpnConfigImport] = useState(false);
  const [showPrivacyInspector, setShowPrivacyInspector] = useState(true);
  const [showVpnAdvancedRules, setShowVpnAdvancedRules] = useState(false);
  const [newSplitRule, setNewSplitRule] = useState("");
  const [customDnsInput, setCustomDnsInput] = useState("");
  const [importConfText, setImportConfText] = useState("");
  const [importProfileName, setImportProfileName] = useState("");
  const [copiedConf, setCopiedConf] = useState(false);
  const [, setTimerTick] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    mode,
    state,
    proxyConfig,
    location,
    isConnecting,
    isRefreshingIp,
    isTestingConnection,
    testResult,
    lastError,
    profiles,
    activeProfileId,
    setMode,
    updateProxyConfig,
    connect,
    disconnect,
    refreshIp,
    testConnection,
    saveProfile,
    applyProfile,
    deleteProfile,
    init,
  } = useSecureNetworkStore();

  const vpnStore = useVpnStore();
  const initVpn = useVpnStore((s) => s.init);

  useEffect(() => {
    init();
    initVpn();
  }, [init, initVpn]);

  // Live timer tick for active duration
  useEffect(() => {
    if (vpnStore.state === "connected" || (mode === "proxy" && state === "connected")) {
      const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [vpnStore.state, mode, state]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  const isConnected =
    mode === "wireguard" ? vpnStore.state === "connected" : state === "connected";
  const isDirect = mode === "direct";
  const isProxy = mode === "proxy";
  const isWireguard = mode === "wireguard";

  const getStatusColor = () => {
    if (isWireguard) {
      if (vpnStore.status.killSwitchEngaged)
        return "text-red-400 bg-red-400/10 border-red-500/20";
      if (vpnStore.state === "error") return "text-red-400 bg-red-400/10 border-red-500/20";
      if (vpnStore.isConnecting || vpnStore.state === "connecting")
        return "text-purple-400 bg-purple-400/10 border-purple-500/20";
      if (vpnStore.state === "connected")
        return "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
      return "text-[var(--forge-text-muted)] bg-[var(--forge-surface)] border-[var(--forge-border)]";
    }

    if (state === "error") return "text-red-400 bg-red-400/10 border-red-500/20";
    if (isConnecting) return "text-amber-400 bg-amber-400/10 border-amber-500/20";
    if (isProxy) return "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
    return "text-cyan-400 bg-cyan-400/10 border-cyan-500/20";
  };

  const getButtonBadge = () => {
    if (isWireguard) {
      if (vpnStore.status.killSwitchEngaged) return "bg-red-500";
      if (vpnStore.isConnecting || vpnStore.state === "connecting")
        return "bg-purple-400 animate-pulse";
      if (vpnStore.state === "connected") return "bg-emerald-400";
      return "bg-purple-500/60";
    }

    if (state === "error") return "bg-red-500";
    if (isConnecting) return "bg-amber-400 animate-pulse";
    if (isProxy) return "bg-emerald-400";
    return "bg-cyan-400";
  };

  const handleConnectToggle = async () => {
    if (isWireguard) {
      if (vpnStore.state === "connected") {
        await vpnStore.disconnect();
      } else {
        await vpnStore.connect();
      }
      return;
    }

    if (isConnected && !isDirect) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const handleSaveProfile = () => {
    if (newProfileName.trim()) {
      saveProfile(newProfileName.trim());
      setNewProfileName("");
    }
  };

  const handleImportVpnConfig = async () => {
    if (importConfText.trim()) {
      const ok = await vpnStore.importConfig(importConfText.trim(), importProfileName.trim());
      if (ok) {
        setImportConfText("");
        setImportProfileName("");
        setShowVpnConfigImport(false);
      }
    }
  };

  const handleExportConf = async () => {
    const conf = await vpnStore.exportConfig();
    if (conf) {
      await navigator.clipboard.writeText(conf).catch(() => {});
      setCopiedConf(true);
      setTimeout(() => setCopiedConf(false), 2000);
    }
  };

  const activeVpnLocation =
    vpnStore.locations.find((l) => l.id === vpnStore.selectedLocationId) ||
    vpnStore.locations[0];

  return (
    <div className="relative z-50">
      {/* Trigger Button in Nav / Title bar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Forge Secure Network: ${mode.toUpperCase()} (${
          isWireguard ? vpnStore.state : state
        })`}
        className={`h-6 px-2 flex items-center gap-1.5 rounded text-xs font-medium transition-all select-none cursor-pointer border ${
          isOpen
            ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30 shadow-sm"
            : isWireguard && vpnStore.state === "connected"
            ? "bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25"
            : isProxy
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            : "bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] border-[var(--forge-border)] hover:text-[var(--forge-text)] hover:border-[#FF6B00]/30"
        }`}
      >
        <div className="relative flex items-center justify-center">
          {isWireguard ? (
            <Lock size={13} className={vpnStore.state === "connected" ? "text-purple-400" : "text-purple-300"} />
          ) : isProxy ? (
            <ShieldCheck size={13} className="text-emerald-400" />
          ) : (
            <Globe size={13} />
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-[var(--forge-surface)] ${getButtonBadge()}`}
          />
        </div>
        <span className="hidden sm:inline font-sans text-[11px] tracking-tight">
          {isWireguard
            ? vpnStore.state === "connected"
              ? "VPN Connected"
              : "Secure VPN"
            : isProxy
            ? `${proxyConfig.protocol.toUpperCase()}`
            : "Network"}
        </span>
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 w-[360px] rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-2xl z-[9999] text-[var(--forge-text)] overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[var(--forge-border)] flex items-center justify-between bg-gradient-to-r from-[var(--forge-surface)] to-[var(--forge-hover)]/30">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                  isWireguard
                    ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                    : "bg-[#FF6B00]/10 border-[#FF6B00]/20 text-[#FF6B00]"
                }`}
              >
                {isWireguard ? <Lock size={15} /> : <Shield size={16} />}
              </div>
              <div>
                <h3 className="font-semibold text-xs tracking-wide flex items-center gap-1.5">
                  Forge Secure Network
                </h3>
                <p className="text-[10px] text-[var(--forge-text-muted)]">
                  {isWireguard ? "WireGuard Client & Tunnel Core" : "Modular Privacy & Proxy Core"}
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div
              className={`px-2 py-0.5 rounded-full border text-[10px] font-mono capitalize flex items-center gap-1 ${getStatusColor()}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getButtonBadge()}`} />
              {isWireguard
                ? vpnStore.isConnecting
                  ? "Connecting..."
                  : vpnStore.status.killSwitchEngaged
                  ? "Kill Switch Active"
                  : vpnStore.state
                : isConnecting
                ? "Connecting..."
                : state}
            </div>
          </div>

          <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {/* Connection Mode Radio Group */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--forge-text-secondary)] uppercase tracking-wider block mb-1.5">
                Connection
              </label>

              <div className="space-y-1">
                {/* Direct */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("direct");
                    if (mode !== "direct") disconnect();
                    if (vpnStore.state === "connected") vpnStore.disconnect();
                  }}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all border cursor-pointer ${
                    isDirect
                      ? "bg-cyan-500/10 border-cyan-500/30 text-[var(--forge-text)]"
                      : "bg-[var(--forge-input)] border-transparent hover:border-[var(--forge-border)] text-[var(--forge-text-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isDirect ? "border-cyan-400" : "border-[var(--forge-text-muted)]"
                      }`}
                    >
                      {isDirect && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium">Direct</div>
                      <div className="text-[10px] text-[var(--forge-text-muted)]">
                        Standard unproxied connection
                      </div>
                    </div>
                  </div>
                  <Globe size={14} className={isDirect ? "text-cyan-400" : "text-[var(--forge-text-muted)]"} />
                </button>

                {/* Proxy */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("proxy");
                    if (vpnStore.state === "connected") vpnStore.disconnect();
                  }}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all border cursor-pointer ${
                    isProxy
                      ? "bg-emerald-500/10 border-emerald-500/30 text-[var(--forge-text)]"
                      : "bg-[var(--forge-input)] border-transparent hover:border-[var(--forge-border)] text-[var(--forge-text-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isProxy ? "border-emerald-400" : "border-[var(--forge-text-muted)]"
                      }`}
                    >
                      {isProxy && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        Proxy
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          Phase 1 ✅
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--forge-text-muted)]">
                        HTTP, HTTPS, SOCKS5
                      </div>
                    </div>
                  </div>
                  <Server size={14} className={isProxy ? "text-emerald-400" : "text-[var(--forge-text-muted)]"} />
                </button>

                {/* Secure VPN (WireGuard) */}
                <button
                  type="button"
                  onClick={() => setMode("wireguard")}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all border cursor-pointer ${
                    isWireguard
                      ? "bg-purple-500/10 border-purple-500/30 text-[var(--forge-text)]"
                      : "bg-[var(--forge-input)] border-transparent hover:border-[var(--forge-border)] text-[var(--forge-text-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isWireguard ? "border-purple-400" : "border-[var(--forge-text-muted)]"
                      }`}
                    >
                      {isWireguard && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        Secure VPN
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">
                          WireGuard 🚀
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--forge-text-muted)]">
                        Encrypted Tunnel, Profiles & Kill Switch
                      </div>
                    </div>
                  </div>
                  <Sparkles size={14} className={isWireguard ? "text-purple-400" : "text-[var(--forge-text-muted)]"} />
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* WIREGUARD VPN CLIENT SECTION */}
            {/* ============================================================== */}
            {isWireguard && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* Kill Switch Engagement Alert */}
                {vpnStore.status.killSwitchEngaged && (
                  <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <div>
                      <div className="font-semibold text-[11px]">Kill Switch Engaged</div>
                      <div className="text-[10px] text-red-200/80">
                        Internet traffic blocked to prevent leaks until VPN connects.
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Selection Card */}
                <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)]">
                      Server Location
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVpnLocations(!showVpnLocations)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      {showVpnLocations ? "Close" : "Change"}
                      {showVpnLocations ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {/* Active Selected Location Display */}
                  <div
                    onClick={() => setShowVpnLocations(!showVpnLocations)}
                    className="flex items-center justify-between p-2 rounded-md bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-purple-500/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">
                        {activeVpnLocation?.flag || "🌐"}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-[var(--forge-text)]">
                          {activeVpnLocation?.country || "Default Gateway"}
                        </div>
                        <div className="text-[10px] text-[var(--forge-text-muted)]">
                          {activeVpnLocation?.city || "Automated Selection"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-emerald-400">
                        {activeVpnLocation?.pingMs || 25}ms
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>

                  {/* Location Selector Drawer */}
                  {showVpnLocations && (
                    <div className="mt-2 pt-2 border-t border-[var(--forge-border)] space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {vpnStore.locations.map((loc) => {
                        const isSelected = loc.id === vpnStore.selectedLocationId;
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={async () => {
                              await vpnStore.selectLocation(loc.id);
                              setShowVpnLocations(false);
                            }}
                            className={`w-full p-1.5 rounded flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                                : "hover:bg-[var(--forge-surface)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)]"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span>{loc.flag}</span>
                              <span className="truncate">{loc.country} ({loc.city})</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-[var(--forge-text-muted)]">
                                {loc.pingMs || 30}ms
                              </span>
                              {isSelected && <Check size={12} className="text-purple-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Kill Switch Toggle Card */}
                <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center ${
                        vpnStore.status.killSwitchEnabled
                          ? "bg-red-500/15 text-red-400"
                          : "bg-[var(--forge-surface)] text-[var(--forge-text-muted)]"
                      }`}
                    >
                      <Shield size={13} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1">
                        Kill Switch
                        {vpnStore.status.killSwitchEnabled && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-mono">
                            Armed
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--forge-text-muted)]">
                        Prevent IP/DNS leaks on disconnect
                      </div>
                    </div>
                  </div>

                  {/* Switch button */}
                  <button
                    type="button"
                    onClick={() => vpnStore.setKillSwitch(!vpnStore.status.killSwitchEnabled)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border ${
                      vpnStore.status.killSwitchEnabled
                        ? "bg-red-500/80 border-red-400"
                        : "bg-[var(--forge-surface)] border-[var(--forge-border)]"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        vpnStore.status.killSwitchEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Profiles & WireGuard .conf Drawer */}
                <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)]">
                      WireGuard Profiles (.conf)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVpnConfigImport(!showVpnConfigImport)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload size={10} />
                      {showVpnConfigImport ? "Hide" : "Import / Export"}
                    </button>
                  </div>

                  {showVpnConfigImport && (
                    <div className="mt-2 pt-2 border-t border-[var(--forge-border)] space-y-2">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={importProfileName}
                          onChange={(e) => setImportProfileName(e.target.value)}
                          placeholder="Profile Name (e.g. Proton / Mullvad)"
                          className="w-full h-6 px-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono outline-none"
                        />
                        <textarea
                          rows={3}
                          value={importConfText}
                          onChange={(e) => setImportConfText(e.target.value)}
                          placeholder={`[Interface]\nPrivateKey = ...\n[Peer]\nPublicKey = ...\nEndpoint = host:51820`}
                          className="w-full p-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[10px] font-mono outline-none resize-none"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleImportVpnConfig}
                            disabled={!importConfText.trim() || vpnStore.isImporting}
                            className="flex-1 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {vpnStore.isImporting ? "Importing..." : "Import Profile"}
                          </button>
                          <button
                            type="button"
                            onClick={handleExportConf}
                            className="px-2 py-1 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:bg-[var(--forge-hover)] text-[10px] text-[var(--forge-text)] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedConf ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            {copiedConf ? "Copied" : "Export Active"}
                          </button>
                        </div>
                      </div>

                      {/* Custom Profiles List */}
                      {vpnStore.profiles.filter((p) => !p.locationId).length > 0 && (
                        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                          {vpnStore.profiles
                            .filter((p) => !p.locationId)
                            .map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-1 rounded bg-[var(--forge-surface)] text-[10px]"
                              >
                                <button
                                  type="button"
                                  onClick={() => vpnStore.connect(p.id)}
                                  className="flex items-center gap-1.5 truncate text-left hover:text-purple-400 cursor-pointer flex-1"
                                >
                                  <FileText size={10} className={vpnStore.activeProfileId === p.id ? "text-purple-400" : "text-muted"} />
                                  <span className="truncate">{p.name}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => vpnStore.deleteProfile(p.id)}
                                  className="text-[var(--forge-text-muted)] hover:text-red-400 p-0.5 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ============================================================== */}
                {/* PRIVACY & TUNNEL INSPECTOR ("What Others See") */}
                {/* ============================================================== */}
                <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-[var(--forge-text-muted)]">
                      <Eye size={12} className="text-purple-400" />
                      <span>Privacy & Tunnel Inspector</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyInspector(!showPrivacyInspector)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      {showPrivacyInspector ? "Hide" : "What Others See"}
                      {showPrivacyInspector ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {showPrivacyInspector && (
                    <div className="space-y-2 pt-1.5 border-t border-[var(--forge-border)] text-xs">
                      {/* 1. The 4-Step Process Strip */}
                      <div className="grid grid-cols-4 gap-1 p-1 rounded bg-[var(--forge-surface)] text-center text-[9px]">
                        <div className={`p-1 rounded ${vpnStore.state === "connected" ? "bg-purple-500/10 text-purple-300 font-medium" : "text-[var(--forge-text-muted)]"}`}>
                          <div className="font-bold">1. Cipher</div>
                          <div className="text-[8px] opacity-75">ChaCha20</div>
                        </div>
                        <div className={`p-1 rounded ${vpnStore.state === "connected" ? "bg-purple-500/10 text-purple-300 font-medium" : "text-[var(--forge-text-muted)]"}`}>
                          <div className="font-bold">2. Tunnel</div>
                          <div className="text-[8px] opacity-75">WireGuard</div>
                        </div>
                        <div className={`p-1 rounded ${vpnStore.state === "connected" ? "bg-purple-500/10 text-purple-300 font-medium" : "text-[var(--forge-text-muted)]"}`}>
                          <div className="font-bold">3. Mask IP</div>
                          <div className="text-[8px] opacity-75">Shared Pool</div>
                        </div>
                        <div className={`p-1 rounded ${vpnStore.state === "connected" ? "bg-emerald-500/10 text-emerald-300 font-medium" : "text-[var(--forge-text-muted)]"}`}>
                          <div className="font-bold">4. Guard</div>
                          <div className="text-[8px] opacity-75">Zero Leak</div>
                        </div>
                      </div>

                      {/* 2. What Others See Comparison Matrix */}
                      <div className="space-y-1.5">
                        {/* Websites */}
                        <div className="p-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-start gap-2">
                          <div className="p-1 rounded bg-purple-500/10 text-purple-400 mt-0.5 shrink-0">
                            <Globe size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[var(--forge-text)]">Websites You Visit</span>
                              <span className={`text-[9px] font-mono px-1 rounded ${vpnStore.state === "connected" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                                {vpnStore.state === "connected" ? "Real IP Hidden" : "Real IP Exposed"}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--forge-text-muted)] mt-0.5 leading-snug">
                              {vpnStore.state === "connected" ? (
                                <span>See only <strong className="text-purple-300">{activeVpnLocation?.country}</strong> ({activeVpnLocation?.endpoint.split(":")[0]}). Real home IP is protected.</span>
                              ) : (
                                <span>Can see your ISP & real home IP: <strong className="text-amber-300">{location.ip}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Your ISP */}
                        <div className="p-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-start gap-2">
                          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
                            <Building2 size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[var(--forge-text)]">Your Internet Provider</span>
                              <span className={`text-[9px] font-mono px-1 rounded ${vpnStore.state === "connected" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                                {vpnStore.state === "connected" ? "Traffic Encrypted" : "Traffic Logged"}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--forge-text-muted)] mt-0.5 leading-snug">
                              {vpnStore.state === "connected" ? (
                                <span>Only sees encrypted UDP tunnel to WireGuard node. Visited domains & URLs are completely invisible.</span>
                              ) : (
                                <span>Can inspect and log every domain, web address, and DNS request you make.</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Public Wi-Fi / Network Admins */}
                        <div className="p-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-start gap-2">
                          <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 mt-0.5 shrink-0">
                            <Wifi size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[var(--forge-text)]">Public Wi-Fi & Admins</span>
                              <span className={`text-[9px] font-mono px-1 rounded ${vpnStore.state === "connected" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                                {vpnStore.state === "connected" ? "Snooping Blocked" : "Vulnerable"}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--forge-text-muted)] mt-0.5 leading-snug">
                              {vpnStore.state === "connected" ? (
                                <span>ChaCha20 scrambles all packets on your device. Zero plaintext snooping on cafes or airports.</span>
                              ) : (
                                <span>Hotspot administrators can sniff unencrypted traffic and monitor DNS packets.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ============================================================== */}
                {/* ADVANCED PROTECTION & SPLIT TUNNELING (Section 7.2) */}
                {/* ============================================================== */}
                <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-[var(--forge-text-muted)]">
                      <Zap size={12} className="text-purple-400" />
                      <span>Advanced Protection & Rules</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVpnAdvancedRules(!showVpnAdvancedRules)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      {showVpnAdvancedRules ? "Hide" : "Rules & DNS"}
                      {showVpnAdvancedRules ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {showVpnAdvancedRules && (
                    <div className="space-y-3 pt-2 border-t border-[var(--forge-border)] text-xs">
                      {/* 1. Auto-Connect & Auto-Reconnect Toggles */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider">
                          Automation Rules
                        </div>

                        {/* Startup */}
                        <label className="flex items-center justify-between p-1.5 rounded bg-[var(--forge-surface)] text-[11px] cursor-pointer">
                          <div>
                            <div className="font-medium text-white">Auto-Connect on Startup</div>
                            <div className="text-[9px] text-[var(--forge-text-muted)]">Establish VPN tunnel when Forge launches</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={vpnStore.autoConnectOnStartup}
                            onChange={(e) => vpnStore.setAutoConnectOnStartup(e.target.checked)}
                            className="accent-purple-500 cursor-pointer"
                          />
                        </label>

                        {/* Public Wi-Fi */}
                        <label className="flex items-center justify-between p-1.5 rounded bg-[var(--forge-surface)] text-[11px] cursor-pointer">
                          <div>
                            <div className="font-medium text-white">Auto-Connect on Untrusted Wi-Fi</div>
                            <div className="text-[9px] text-[var(--forge-text-muted)]">Arm encryption on public and hotel hotspots</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={vpnStore.autoConnectOnPublicWifi}
                            onChange={(e) => vpnStore.setAutoConnectOnPublicWifi(e.target.checked)}
                            className="accent-purple-500 cursor-pointer"
                          />
                        </label>

                        {/* Auto-Reconnect */}
                        <label className="flex items-center justify-between p-1.5 rounded bg-[var(--forge-surface)] text-[11px] cursor-pointer">
                          <div>
                            <div className="font-medium text-white">Auto-Reconnect with Backoff</div>
                            <div className="text-[9px] text-[var(--forge-text-muted)]">Automatically restore dropped VPN tunnels</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={vpnStore.autoReconnect}
                            onChange={(e) => vpnStore.setAutoReconnect(e.target.checked)}
                            className="accent-purple-500 cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* 2. DNS Leak Protection & Routing */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider">
                            DNS Leak Protection
                          </span>
                          <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-300">
                            Leak Guard Active
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 p-1 rounded bg-[var(--forge-surface)]">
                          <button
                            type="button"
                            onClick={() => vpnStore.setDnsRoutingMode("vpn_dns")}
                            className={`py-1 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                              vpnStore.dnsRoutingMode === "vpn_dns"
                                ? "bg-purple-600 text-white font-bold"
                                : "text-[var(--forge-text-muted)] hover:text-white"
                            }`}
                          >
                            VPN DNS (Default)
                          </button>
                          <button
                            type="button"
                            onClick={() => vpnStore.setDnsRoutingMode("custom_dns")}
                            className={`py-1 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                              vpnStore.dnsRoutingMode === "custom_dns"
                                ? "bg-purple-600 text-white font-bold"
                                : "text-[var(--forge-text-muted)] hover:text-white"
                            }`}
                          >
                            Custom Encrypted DNS
                          </button>
                        </div>

                        {vpnStore.dnsRoutingMode === "custom_dns" && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              value={customDnsInput || vpnStore.customDnsServer}
                              onChange={(e) => setCustomDnsInput(e.target.value)}
                              onBlur={() => vpnStore.setDnsRoutingMode("custom_dns", customDnsInput || vpnStore.customDnsServer)}
                              placeholder="e.g. 1.1.1.1 or 8.8.8.8"
                              className="flex-1 h-6 px-2 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[10px] font-mono outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => vpnStore.setDnsRoutingMode("custom_dns", customDnsInput || vpnStore.customDnsServer)}
                              className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 3. Split Tunneling (Local IP & Domain Bypasses) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider">
                            Split Tunneling (Bypass List)
                          </span>
                          <span className="text-[9px] text-[var(--forge-text-muted)]">
                            {vpnStore.splitTunnelRules.length} rules
                          </span>
                        </div>
                        <p className="text-[9px] text-[var(--forge-text-muted)] leading-tight">
                          Traffic to these destinations routes directly via host adapter, bypassing the VPN tunnel.
                        </p>

                        {/* Add new rule */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newSplitRule}
                            onChange={(e) => setNewSplitRule(e.target.value)}
                            placeholder="e.g. localhost, 192.168.1.*, *.internal"
                            className="flex-1 h-6 px-2 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[10px] font-mono outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newSplitRule.trim()) {
                                vpnStore.addSplitTunnelRule(newSplitRule.trim());
                                setNewSplitRule("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newSplitRule.trim()) {
                                vpnStore.addSplitTunnelRule(newSplitRule.trim());
                                setNewSplitRule("");
                              }
                            }}
                            className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} />
                            Add
                          </button>
                        </div>

                        {/* Rules chips list */}
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-[var(--forge-surface)] rounded border border-[var(--forge-border)]">
                          {vpnStore.splitTunnelRules.map((rule) => (
                            <div
                              key={rule}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--forge-input)] text-[9px] font-mono text-zinc-300 border border-[var(--forge-border)]"
                            >
                              <span>{rule}</span>
                              <button
                                type="button"
                                onClick={() => vpnStore.removeSplitTunnelRule(rule)}
                                className="text-[var(--forge-text-muted)] hover:text-red-400 cursor-pointer"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Connection Metrics HUD (When Connected) */}
                {vpnStore.state === "connected" && (
                  <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/30 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
                        <Activity size={12} className="text-purple-400" />
                        Encrypted Tunnel Active
                      </div>
                      <div className="font-mono text-purple-200 text-xs font-bold">
                        {formatDuration(vpnStore.status.connectedSince)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-500/20">
                      <div className="flex items-center gap-1.5 bg-[var(--forge-surface)]/60 p-1.5 rounded">
                        <ArrowDown size={12} className="text-emerald-400" />
                        <div>
                          <div className="text-[9px] uppercase text-[var(--forge-text-muted)]">Download</div>
                          <div className="text-[11px] font-mono font-medium text-[var(--forge-text)]">
                            {formatBytes(vpnStore.status.bytesReceived)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[var(--forge-surface)]/60 p-1.5 rounded">
                        <ArrowUp size={12} className="text-cyan-400" />
                        <div>
                          <div className="text-[9px] uppercase text-[var(--forge-text-muted)]">Upload</div>
                          <div className="text-[11px] font-mono font-medium text-[var(--forge-text)]">
                            {formatBytes(vpnStore.status.bytesSent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* PROXY CONFIGURATION SECTION (When in Proxy mode) */}
            {/* ============================================================== */}
            {isProxy && (
              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] space-y-2.5 animate-in fade-in duration-100">
                {/* Protocol Tabs */}
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)] block mb-1">
                    Protocol
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-[var(--forge-surface)] border border-[var(--forge-border)]">
                    {(["http", "https", "socks5"] as ProxyProtocol[]).map((proto) => (
                      <button
                        key={proto}
                        type="button"
                        onClick={() => updateProxyConfig({ protocol: proto })}
                        className={`py-1 text-[11px] font-mono font-medium rounded transition-all cursor-pointer ${
                          proxyConfig.protocol === proto
                            ? "bg-[#FF6B00] text-white shadow-xs"
                            : "text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)]"
                        }`}
                      >
                        {proto.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)] block mb-0.5">
                      Server / Host
                    </label>
                    <input
                      type="text"
                      value={proxyConfig.host}
                      onChange={(e) => updateProxyConfig({ host: e.target.value })}
                      placeholder="127.0.0.1"
                      className="w-full h-7 px-2 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono focus:border-[#FF6B00] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)] block mb-0.5">
                      Port
                    </label>
                    <input
                      type="number"
                      value={proxyConfig.port}
                      onChange={(e) =>
                        updateProxyConfig({ port: parseInt(e.target.value, 10) || 0 })
                      }
                      placeholder="8080"
                      className="w-full h-7 px-2 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono focus:border-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                {/* Advanced: Authentication & Profiles */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[10px] font-medium text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    {showAdvanced ? "Hide Credentials & Profiles" : "Authentication & Profiles"}
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-2 pt-2 border-t border-[var(--forge-border)]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase text-[var(--forge-text-muted)] block mb-0.5">
                            Username
                          </label>
                          <input
                            type="text"
                            value={proxyConfig.username || ""}
                            onChange={(e) => updateProxyConfig({ username: e.target.value })}
                            placeholder="Optional"
                            className="w-full h-6 px-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[11px] font-mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-[var(--forge-text-muted)] block mb-0.5">
                            Password
                          </label>
                          <input
                            type="password"
                            value={proxyConfig.password || ""}
                            onChange={(e) => updateProxyConfig({ password: e.target.value })}
                            placeholder="Optional"
                            className="w-full h-6 px-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[11px] font-mono outline-none"
                          />
                        </div>
                      </div>

                      {/* Saved Profiles */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">
                            Saved Profiles (Phase 2)
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowProfiles(!showProfiles)}
                            className="text-[9px] text-[#FF6B00] hover:underline cursor-pointer"
                          >
                            {showProfiles ? "Done" : "Manage"}
                          </button>
                        </div>

                        {showProfiles ? (
                          <div className="space-y-1.5">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="Profile name..."
                                className="flex-1 h-6 px-1.5 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[11px] outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSaveProfile}
                                className="px-2 h-6 bg-[#FF6B00] text-white text-[10px] font-medium rounded cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {profiles.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-1 rounded bg-[var(--forge-surface)] text-[10px]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => applyProfile(p.id)}
                                    className="flex items-center gap-1.5 text-left truncate flex-1 hover:text-[#FF6B00] cursor-pointer"
                                  >
                                    <Bookmark size={10} className={activeProfileId === p.id ? "text-[#FF6B00]" : "text-muted"} />
                                    <span className="truncate">{p.name}</span>
                                    <span className="text-[9px] text-[var(--forge-text-muted)]">
                                      ({p.config.protocol}:{p.config.port})
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteProfile(p.id)}
                                    className="text-[var(--forge-text-muted)] hover:text-red-400 p-0.5 cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {profiles.slice(0, 3).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => applyProfile(p.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] truncate max-w-[90px] border cursor-pointer transition-colors ${
                                  activeProfileId === p.id
                                    ? "bg-[#FF6B00]/20 border-[#FF6B00]/40 text-[#FF6B00]"
                                    : "bg-[var(--forge-surface)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)]"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Connection Test Preview Button */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => testConnection()}
                    disabled={isTestingConnection}
                    className="text-[10px] text-[#FF6B00] hover:text-[#FF8533] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Activity size={11} className={isTestingConnection ? "animate-spin" : ""} />
                    {isTestingConnection ? "Testing Ping..." : "Test Connection"}
                  </button>

                  {testResult && (
                    <div
                      className={`text-[10px] flex items-center gap-1 font-mono ${
                        testResult.success ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {testResult.success ? (
                        <>
                          <CheckCircle2 size={10} /> {testResult.latencyMs}ms
                        </>
                      ) : (
                        <>
                          <AlertCircle size={10} /> Failed
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error banner */}
            {(lastError || vpnStore.lastError) && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0 text-red-400" />
                <span className="truncate text-[11px]">{lastError || vpnStore.lastError}</span>
              </div>
            )}

            {/* Verified Location & IP Section */}
            <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--forge-text-muted)] text-[11px]">Location:</span>
                <div className="flex items-center gap-1 font-medium text-xs">
                  <span className="text-[var(--forge-text)]">
                    {isWireguard && vpnStore.state === "connected"
                      ? `${activeVpnLocation?.country} (${activeVpnLocation?.city})`
                      : location.country || "Detecting..."}
                    {!isWireguard && location.city ? `, ${location.city}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[var(--forge-text-muted)] text-[11px]">IP:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-[var(--forge-text)] selection:bg-[#FF6B00]/20">
                    {isWireguard && vpnStore.state === "connected"
                      ? activeVpnLocation?.endpoint.split(":")[0]
                      : location.ip || "Detecting..."}
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshIp()}
                    disabled={isRefreshingIp}
                    title="Refresh IP & Location"
                    className="text-[var(--forge-text-muted)] hover:text-[#FF6B00] cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RotateCw size={11} className={isRefreshingIp ? "animate-spin text-[#FF6B00]" : ""} />
                  </button>
                </div>
              </div>
            </div>

            {/* Connect / Disconnect Action Button */}
            <div className="pt-1">
              {isDirect ? (
                <div className="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                  <Radio size={12} className="text-cyan-400 animate-pulse" /> Direct Connection Active
                </div>
              ) : isWireguard ? (
                <button
                  type="button"
                  onClick={handleConnectToggle}
                  disabled={vpnStore.isConnecting}
                  className={`w-full py-2.5 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                    vpnStore.state === "connected"
                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
                  }`}
                >
                  {vpnStore.isConnecting ? (
                    <>
                      <RotateCw size={13} className="animate-spin" /> Connecting to VPN...
                    </>
                  ) : vpnStore.state === "connected" ? (
                    "[ Disconnect WireGuard VPN ]"
                  ) : (
                    "[ Connect to Secure VPN ]"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectToggle}
                  disabled={isConnecting}
                  className={`w-full py-2 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                    isConnected && isProxy
                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                      : "bg-[#FF6B00] hover:bg-[#FF8533] text-white"
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <RotateCw size={13} className="animate-spin" /> Connecting...
                    </>
                  ) : isConnected && isProxy ? (
                    "[ Disconnect ]"
                  ) : (
                    "[ Connect ]"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
