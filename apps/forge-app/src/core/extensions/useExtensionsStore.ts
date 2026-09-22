import { create } from "zustand";
import type { ForgeExtension, ExtensionType, SecurityTier, ExtensionVerificationReport } from "./extensionTypes";

interface ExtensionsState {
  extensions: ForgeExtension[];
  isManagerOpen: boolean;
  activeFilter: "all" | ExtensionType;
  selectedExtensionId: string | null;
  pendingInstall: { ext: ForgeExtension; overrideAccepted?: boolean } | null;

  setManagerOpen: (open: boolean) => void;
  setActiveFilter: (filter: "all" | ExtensionType) => void;
  setSelectedExtension: (id: string | null) => void;
  toggleExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  installExtension: (ext: ForgeExtension, override?: boolean) => boolean;
  verifyPackage: (name: string, type: ExtensionType, permissions: string[]) => ExtensionVerificationReport;
}

const STORAGE_KEY = "forge_extensions_v1";

const DEFAULT_EXTENSIONS: ForgeExtension[] = [
  // Browser Extensions (Chromium-compatible)
  {
    id: "ext-bitwarden",
    name: "Bitwarden Vault Access",
    version: "2026.3.0",
    description: "Enterprise open-source password manager and passkey provider",
    type: "browser",
    author: "Bitwarden Inc (Verified)",
    enabled: true,
    installedAt: Date.now() - 86400000 * 10,
    manifestPermissions: ["storage", "activeTab", "clipboardWrite"],
    verification: {
      authorVerified: true,
      authorName: "Bitwarden Inc",
      signatureValid: true,
      sha256Hash: "8a4f91e3b2c0192a5b6c8d7e4f3a2b1c9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b",
      manifestRiskScore: 12,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["storage", "activeTab", "clipboardWrite"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },
  {
    id: "ext-react-devtools",
    name: "React Developer Tools",
    version: "5.3.1",
    description: "Inspect React component hierarchies, props, state, and profiler timings",
    type: "browser",
    author: "Meta Platforms (Verified)",
    enabled: true,
    installedAt: Date.now() - 86400000 * 5,
    manifestPermissions: ["webNavigation", "tabs"],
    verification: {
      authorVerified: true,
      authorName: "Meta Open Source",
      signatureValid: true,
      sha256Hash: "3f9c8e2b1a0d7f6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d",
      manifestRiskScore: 18,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["webNavigation", "tabs"],
      securityTier: "low_risk",
      recommendedAction: "allow",
    },
  },
  // Developer Extensions (IDE tools)
  {
    id: "ext-gitlens",
    name: "GitLens Graph & Blame",
    version: "15.0.2",
    description: "Interactive git commit tree, line annotations, and stash manager directly in Forge workspace",
    type: "developer",
    author: "GitKraken (Verified)",
    enabled: true,
    installedAt: Date.now() - 86400000 * 3,
    manifestPermissions: ["workspace", "terminal", "git"],
    verification: {
      authorVerified: true,
      authorName: "GitKraken Labs",
      signatureValid: true,
      sha256Hash: "e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4",
      manifestRiskScore: 24,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["workspace", "terminal", "git"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },
  {
    id: "ext-docker-viewer",
    name: "Docker Container Inspector",
    version: "2.4.0",
    description: "Monitor local Docker containers, ports, logs, and compose clusters from the DevTools bar",
    type: "developer",
    author: "Community Dev (Unverified)",
    enabled: false,
    installedAt: Date.now() - 86400000,
    manifestPermissions: ["nativeMessaging", "systemInfo", "network"],
    verification: {
      authorVerified: false,
      authorName: "Independent Maintainer",
      signatureValid: true,
      sha256Hash: "7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a",
      manifestRiskScore: 58,
      suspiciousPatternsDetected: ["Accesses local socket /var/run/docker.sock"],
      permissionsRequested: ["nativeMessaging", "systemInfo", "network"],
      securityTier: "medium_risk",
      recommendedAction: "prompt",
    },
  },
];

function loadSavedExtensions(): ForgeExtension[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_EXTENSIONS;
}

export const useExtensionsStore = create<ExtensionsState>((set) => ({
  extensions: loadSavedExtensions(),
  isManagerOpen: false,
  activeFilter: "all",
  selectedExtensionId: DEFAULT_EXTENSIONS[0].id,
  pendingInstall: null,

  setManagerOpen: (open) => set({ isManagerOpen: open }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSelectedExtension: (id) => set({ selectedExtensionId: id }),

  toggleExtension: (id) => {
    set((s) => {
      const updated = s.extensions.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated };
    });
  },

  uninstallExtension: (id) => {
    set((s) => {
      const updated = s.extensions.filter((e) => e.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return {
        extensions: updated,
        selectedExtensionId: s.selectedExtensionId === id ? updated[0]?.id || null : s.selectedExtensionId,
      };
    });
  },

  verifyPackage: (name, type, permissions) => {
    const isCritical = permissions.includes("debugger") || permissions.includes("<all_urls>");
    const isHigh = permissions.includes("webRequestBlocking") || permissions.includes("nativeMessaging");
    const isMedium = permissions.includes("cookies") || permissions.includes("webRequest");

    let securityTier: SecurityTier = "trusted";
    let score = 10;
    const suspicious: string[] = [];

    if (type === "developer" && permissions.includes("nativeMessaging")) {
      suspicious.push("Developer extension requests host OS process bridge");
    }

    if (isCritical) {
      securityTier = "critical";
      score = 92;
      suspicious.push("Arbitrary code injection or full network interception requested");
    } else if (isHigh) {
      securityTier = "high_risk";
      score = 75;
      suspicious.push("Native OS messaging or unconstrained web request modification");
    } else if (isMedium) {
      securityTier = "medium_risk";
      score = 45;
    } else if (permissions.length > 3) {
      securityTier = "low_risk";
      score = 25;
    }

    const recAction =
      securityTier === "critical"
        ? "block"
        : securityTier === "high_risk"
        ? "override_required"
        : securityTier === "medium_risk"
        ? "prompt"
        : "allow";

    return {
      authorVerified: securityTier !== "critical",
      authorName: `${name} Publishing Team`,
      signatureValid: securityTier !== "critical",
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      manifestRiskScore: score,
      suspiciousPatternsDetected: suspicious,
      permissionsRequested: permissions,
      securityTier,
      recommendedAction: recAction,
    };
  },

  installExtension: (ext, override = false) => {
    if (ext.verification.securityTier === "critical") {
      return false; // Hard blocked
    }
    if (ext.verification.securityTier === "high_risk" && !override) {
      return false;
    }

    set((s) => {
      const updated = [...s.extensions.filter((e) => e.id !== ext.id), { ...ext, enabled: true, installedAt: Date.now() }];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated, selectedExtensionId: ext.id };
    });
    return true;
  },
}));
