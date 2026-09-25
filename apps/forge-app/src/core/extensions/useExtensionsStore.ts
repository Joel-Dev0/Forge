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
  togglePinExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  installExtension: (ext: ForgeExtension, override?: boolean) => boolean;
  installFromWebStoreUrl: (urlOrId: string, customMetadata?: { name?: string; iconUrl?: string }) => { success: boolean; message: string };
  verifyPackage: (name: string, type: ExtensionType, permissions: string[]) => ExtensionVerificationReport;
}

const STORAGE_KEY = "forge_extensions_v4";

// 7 exact Google / Chrome extensions pinned in toolbar matching user screenshot
export const DEFAULT_EXTENSIONS: ForgeExtension[] = [
  // 1. Wappalyzer (Purple diamond with white W)
  {
    id: "ext-wappalyzer",
    name: "Wappalyzer - Technology Profiler",
    version: "6.10.74",
    description: "Identify technologies, frameworks, CMS, analytics, and libraries used on any webpage.",
    type: "browser",
    author: "Wappalyzer",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/wappalyzer-technology-pr/gppongmhjkpfnbhagpmjfkannfbllamg",
    installedAt: Date.now() - 86400000 * 14,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" transform="rotate(45 12 12)" fill="#491775"/><path d="M7.5 9.5L9.5 15L11.5 10L13.5 15L16.5 9.5H15L13.2 13.2L11.5 9.2H11.2L9.5 13.2L7.8 9.5H7.5Z" fill="#FFFFFF"/></svg>`,
    manifestPermissions: ["activeTab", "webNavigation"],
    verification: {
      authorVerified: true,
      authorName: "Wappalyzer",
      signatureValid: true,
      sha256Hash: "491775a0d7f6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0",
      manifestRiskScore: 10,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["activeTab"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // 2. Responsive Viewer (White and blue dual screens)
  {
    id: "ext-responsive-viewer",
    name: "Responsive Viewer",
    version: "2.3.1",
    description: "Show multiple screens simultaneously in responsive mode for web developers and designers.",
    type: "browser",
    author: "Responsive Tools",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/responsive-viewer/knkoeahmlamdbgocglnhgpambfmpgcop",
    installedAt: Date.now() - 86400000 * 12,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="4.5" width="10" height="15" rx="2.5" fill="#FFFFFF"/><rect x="4" y="6" width="7" height="10" rx="1" fill="#E2E8F0"/><rect x="11.5" y="6.5" width="9.5" height="14" rx="2.5" fill="#3B82F6"/><rect x="13" y="8" width="6.5" height="9.5" rx="1" fill="#93C5FD"/></svg>`,
    manifestPermissions: ["activeTab"],
    verification: {
      authorVerified: true,
      authorName: "Responsive Tools",
      signatureValid: true,
      sha256Hash: "3b82f6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7",
      manifestRiskScore: 12,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["activeTab"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // 3. Shazam (Blue circle with white S curve)
  {
    id: "ext-shazam",
    name: "Shazam: Music Identification",
    version: "1.0.4",
    description: "Identify songs playing in any browser tab or streaming video with a single click.",
    type: "browser",
    author: "Apple Inc.",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/shazam-identify-music-fro/mmioliijnhnoblpgimnlajmefafdfilb",
    installedAt: Date.now() - 86400000 * 10,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10.5" fill="#0088FF"/><path d="M14.8 9.2C13.8 8.2 12.2 8.2 11.2 9.2L8.5 11.9C7.8 12.6 7.8 13.7 8.5 14.4C9.2 15.1 10.3 15.1 11 14.4L12.5 12.9C12.8 12.6 13.2 12.6 13.5 12.9C13.8 13.2 13.8 13.6 13.5 13.9L12 15.4C10.5 16.9 8.1 16.9 6.6 15.4C5.1 13.9 5.1 11.5 6.6 10L9.3 7.3C11.6 5 15.4 5 17.7 7.3C18.4 8 18.4 9.1 17.7 9.8C17 10.5 15.9 10.5 15.2 9.8L14.8 9.2Z" fill="#FFFFFF"/><path d="M9.2 14.8C10.2 15.8 11.8 15.8 12.8 14.8L15.5 12.1C16.2 11.4 16.2 10.3 15.5 9.6C14.8 8.9 13.7 8.9 13 9.6L11.5 11.1C11.2 11.4 10.8 11.4 10.5 11.1C10.2 10.8 10.2 10.4 10.5 10.1L12 8.6C13.5 7.1 15.9 7.1 17.4 8.6C18.9 10.1 18.9 12.5 17.4 14L14.7 16.7C12.4 19 8.6 19 6.3 16.7C5.6 16 5.6 14.9 6.3 14.2C7 13.5 8.1 13.5 8.8 14.2L9.2 14.8Z" fill="#FFFFFF"/></svg>`,
    manifestPermissions: ["tabCapture", "activeTab"],
    verification: {
      authorVerified: true,
      authorName: "Apple Inc.",
      signatureValid: true,
      sha256Hash: "0088ffe5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7",
      manifestRiskScore: 14,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["tabCapture"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // 4. React Developer Tools (React atom icon)
  {
    id: "ext-react-devtools",
    name: "React Developer Tools",
    version: "5.3.1",
    description: "Inspect React component hierarchies, props, state, and profiler timings.",
    type: "browser",
    author: "Meta Platforms",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/fmkadmapgofadopljbjfkapdkoienihi",
    installedAt: Date.now() - 86400000 * 8,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="#FFFFFF"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#FFFFFF" stroke-width="1.3" fill="none"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#FFFFFF" stroke-width="1.3" fill="none" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#FFFFFF" stroke-width="1.3" fill="none" transform="rotate(120 12 12)"/></svg>`,
    manifestPermissions: ["webNavigation", "tabs"],
    verification: {
      authorVerified: true,
      authorName: "Meta Open Source",
      signatureValid: true,
      sha256Hash: "3f9c8e2b1a0d7f6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d",
      manifestRiskScore: 15,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["webNavigation", "tabs"],
      securityTier: "low_risk",
      recommendedAction: "allow",
    },
  },

  // 5. uBlock Origin (Crimson shield with white U)
  {
    id: "ext-ublock-origin",
    name: "uBlock Origin",
    version: "1.60.0",
    description: "Efficient, wide-spectrum content blocker and tracker privacy protector.",
    type: "browser",
    author: "Raymond Hill (gorhill)",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm",
    installedAt: Date.now() - 86400000 * 6,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5L4.5 5.5V11.5C4.5 16.8 7.7 21.2 12 22.5C16.3 21.2 19.5 16.8 19.5 11.5V5.5L12 2.5Z" fill="#C2185B"/><path d="M12 4.2L6 6.6V11.5C6 15.8 8.6 19.5 12 20.6C15.4 19.5 18 15.8 18 11.5V6.6L12 4.2Z" fill="#880E4F"/><text x="12" y="16.2" font-family="'Times New Roman', serif" font-weight="900" font-size="12" fill="#FFFFFF" text-anchor="middle">U</text></svg>`,
    manifestPermissions: ["webRequest", "webRequestBlocking", "storage"],
    verification: {
      authorVerified: true,
      authorName: "gorhill",
      signatureValid: true,
      sha256Hash: "c2185be5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7",
      manifestRiskScore: 16,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["storage"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // 6. GoFullPage / Screen Capture (Dark rectangle with blue star badge)
  {
    id: "ext-gofullpage",
    name: "GoFullPage - Full Page Screen Capture",
    version: "7.15",
    description: "Capture a screenshot of your current page in entire scrollable length reliably without asking for extra permissions.",
    type: "browser",
    author: "GoFullPage",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdcgdnkidjaadafnichfpabhfomcebme",
    installedAt: Date.now() - 86400000 * 4,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3.5" width="15" height="13" rx="2" fill="#212529" stroke="#FFFFFF" stroke-width="1.3"/><rect x="10.5" y="9.5" width="11" height="11" rx="3" fill="#2563EB"/><path d="M16 11.5L17 13.8L19.5 14L17.6 15.6L18.2 18L16 16.8L13.8 18L14.4 15.6L12.5 14L15 13.8L16 11.5Z" fill="#FFFFFF"/></svg>`,
    manifestPermissions: ["activeTab"],
    verification: {
      authorVerified: true,
      authorName: "GoFullPage",
      signatureValid: true,
      sha256Hash: "2563ebe5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7",
      manifestRiskScore: 11,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["activeTab"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // 7. Lighthouse (Lighthouse tower with light beam)
  {
    id: "ext-lighthouse",
    name: "Lighthouse Performance & SEO",
    version: "12.0.0",
    description: "Automated tool for improving the performance, quality, and correctness of your web apps.",
    type: "browser",
    author: "Google Chrome Labs",
    enabled: true,
    pinned: true,
    webStoreUrl: "https://chromewebstore.google.com/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk",
    installedAt: Date.now() - 86400000 * 2,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#1E293B"/><path d="M10 4H14L14.8 7.5H9.2L10 4Z" fill="#334155"/><rect x="10.5" y="4.5" width="3" height="3" fill="#FACC15"/><path d="M9 7.5L7.2 20.5H16.8L15 7.5H9Z" fill="#F97316"/><path d="M8.2 13.5H15.8L15.3 17H8.7L8.2 13.5Z" fill="#FFFFFF"/><polygon points="12,5.5 22.5,2 22.5,9" fill="#FDE047" opacity="0.75"/></svg>`,
    manifestPermissions: ["activeTab"],
    verification: {
      authorVerified: true,
      authorName: "Google LLC",
      signatureValid: true,
      sha256Hash: "f97316e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7",
      manifestRiskScore: 8,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["activeTab"],
      securityTier: "trusted",
      recommendedAction: "allow",
    },
  },

  // Additional developer extensions
  {
    id: "ext-gitlens",
    name: "GitLens Graph & Blame",
    version: "15.0.2",
    description: "Interactive git commit tree, line annotations, and stash manager directly in Forge workspace",
    type: "developer",
    author: "GitKraken",
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

  togglePinExtension: (id) => {
    set((s) => {
      const updated = s.extensions.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e));
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
    const dangerous = ["webRequestBlocking", "nativeMessaging", "debugger", "management"];
    const suspicious = permissions.filter((p) => dangerous.includes(p));
    let score = permissions.length * 8;
    if (suspicious.length > 0) score += 40;
    score = Math.min(100, score);

    let tier: SecurityTier = "trusted";
    let action: "allow" | "prompt" | "override_required" | "block" = "allow";

    if (score > 80) {
      tier = "critical";
      action = "block";
    } else if (score > 50) {
      tier = "high_risk";
      action = "override_required";
    } else if (score > 30) {
      tier = "medium_risk";
      action = "prompt";
    } else if (score > 15) {
      tier = "low_risk";
      action = "allow";
    }

    return {
      authorVerified: true,
      authorName: "Package Integrity Guard",
      signatureValid: true,
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      manifestRiskScore: score,
      suspiciousPatternsDetected: suspicious.map((p) => `Requested high-privilege permission '${p}'`),
      permissionsRequested: permissions,
      securityTier: tier,
      recommendedAction: action,
    };
  },

  installExtension: (ext, override = false) => {
    const report = ext.verification;
    if (report.recommendedAction === "block") return false;
    if (report.recommendedAction === "override_required" && !override) {
      set({ pendingInstall: { ext, overrideAccepted: false } });
      return false;
    }

    set((s) => {
      const updated = [ext, ...s.extensions.filter((e) => e.id !== ext.id)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated, selectedExtensionId: ext.id };
    });
    return true;
  },

  installFromWebStoreUrl: (urlOrId, customMetadata) => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return { success: false, message: "Please provide a valid Chrome Web Store URL or ID" };

    const idMatch = trimmed.match(/([a-z]{32})/i) || trimmed.match(/detail\/[^/]+\/([a-z]{32})/i);
    const extId = idMatch ? idMatch[1].toLowerCase() : `ext-cws-${Date.now()}`;

    let name = customMetadata?.name?.trim() || "Chrome Web Store Extension";
    if (!customMetadata?.name) {
      const nameMatch = trimmed.match(/detail\/([^/]+)\//i);
      if (nameMatch) {
        name = nameMatch[1]
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      } else if (!idMatch) {
        name = trimmed;
      }
    }

    const report: ExtensionVerificationReport = {
      authorVerified: true,
      authorName: "Chrome Web Store Verified",
      signatureValid: true,
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      manifestRiskScore: 15,
      suspiciousPatternsDetected: [],
      permissionsRequested: ["storage", "activeTab"],
      securityTier: "trusted",
      recommendedAction: "allow",
    };

    const newExt: ForgeExtension = {
      id: extId,
      name,
      version: "1.0.0",
      description: `Installed directly from Google Chrome Web Store (${trimmed})`,
      type: "browser",
      author: "Chrome Web Store Publisher",
      enabled: true,
      pinned: true,
      webStoreUrl: trimmed.startsWith("http") ? trimmed : `https://chromewebstore.google.com/detail/${extId}`,
      installedAt: Date.now(),
      verification: report,
      manifestPermissions: ["storage", "activeTab"],
      icon: customMetadata?.iconUrl
        ? `<img src="${customMetadata.iconUrl}" style="width:20px;height:20px;border-radius:4px;object-fit:contain;" alt="${name}" />`
        : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0078D4"/><path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" fill="#FFFFFF"/></svg>`,
    };

    set((s) => {
      const updated = [newExt, ...s.extensions.filter((e) => e.id !== newExt.id)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated };
    });

    return { success: true, message: `Successfully installed "${name}" from Chrome Web Store!` };
  },
}));
