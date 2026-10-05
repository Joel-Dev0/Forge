/**
 * Extension Capability Map
 *
 * Defines the known universe of chrome.* APIs that Chrome extensions use,
 * mapped to Electron 44 (Chromium 152) support status.
 *
 * This is the reference table used by ExtensionDiagnostics to generate
 * real compatibility scores — not invented percentages.
 *
 * Source: Electron documentation for session.loadExtension() and
 * supported extension APIs as of Electron 44.
 */

export type SupportLevel =
  | "native"          // Electron handles this fully
  | "partial"         // Electron handles some operations; Forge may need to fill gaps
  | "adapter"         // Electron doesn't wire this to Forge's model; needs a bridge
  | "fallback"        // Electron doesn't support this; Forge must polyfill via IPC/executeJS
  | "unsupported";    // Not feasible in Electron's architecture

export interface ApiCapability {
  /** The chrome.* API namespace (e.g. "chrome.runtime", "chrome.tabs") */
  api: string;

  /** How well Electron 44 supports this API */
  electronSupport: SupportLevel;

  /** Human-readable description of what works / doesn't */
  notes: string;

  /** If partial, which specific methods are known to work */
  supportedMethods?: string[];

  /** If partial, which specific methods are known to NOT work */
  unsupportedMethods?: string[];

  /** Weight for compatibility score (higher = more important to most extensions) */
  weight: number;
}

/**
 * The full capability map for Electron 44 (Chromium 152).
 *
 * Weights reflect how commonly extensions depend on each API:
 *   10 = Almost every extension uses this
 *    8 = Most extensions use this
 *    5 = Many extensions use this
 *    3 = Some extensions use this
 *    1 = Rare / specialized
 */
export const CAPABILITY_MAP: ApiCapability[] = [
  // ── Core Runtime ──
  {
    api: "chrome.runtime",
    electronSupport: "native",
    notes: "Core messaging, lifecycle, and extension identity. Fully supported by Electron.",
    supportedMethods: [
      "getURL", "getManifest", "id", "sendMessage", "onMessage",
      "onInstalled", "onStartup", "connect", "onConnect",
    ],
    weight: 10,
  },
  {
    api: "chrome.storage",
    electronSupport: "native",
    notes: "chrome.storage.local is fully supported. chrome.storage.sync falls back to local.",
    supportedMethods: ["local.get", "local.set", "local.remove", "local.clear", "onChanged"],
    unsupportedMethods: ["sync (falls back to local)", "managed"],
    weight: 9,
  },

  // ── Content & Scripting ──
  {
    api: "content_scripts",
    electronSupport: "native",
    notes: "Manifest-declared content scripts are injected natively by Electron with correct run_at timing.",
    weight: 10,
  },
  {
    api: "chrome.scripting",
    electronSupport: "native",
    notes: "Programmatic script injection. Supported in Electron 44.",
    supportedMethods: ["executeScript", "insertCSS", "removeCSS"],
    weight: 8,
  },

  // ── Tabs ──
  {
    api: "chrome.tabs",
    electronSupport: "partial",
    notes: "Partially supported. Key question: does Electron map our <webview> WebContents as 'tabs'? Needs diagnostic verification.",
    supportedMethods: ["query", "sendMessage", "reload", "executeScript", "update"],
    unsupportedMethods: ["create", "remove", "move", "group", "captureVisibleTab"],
    weight: 9,
  },

  // ── Network ──
  {
    api: "chrome.webRequest",
    electronSupport: "native",
    notes: "Request interception and modification. Supported in Electron 44.",
    supportedMethods: [
      "onBeforeRequest", "onBeforeSendHeaders", "onHeadersReceived",
      "onCompleted", "onErrorOccurred",
    ],
    weight: 7,
  },
  {
    api: "chrome.declarativeNetRequest",
    electronSupport: "unsupported",
    notes: "MV3 declarative network rules. Not supported by Electron. Extensions relying solely on this for ad/tracker blocking will not function.",
    weight: 6,
  },

  // ── UI & Action ──
  {
    api: "chrome.action",
    electronSupport: "adapter",
    notes: "Extension toolbar button and popup. Electron does not render browser chrome, so Forge must provide the toolbar UI and open popups.",
    weight: 5,
  },
  {
    api: "chrome.browserAction",
    electronSupport: "adapter",
    notes: "MV2 equivalent of chrome.action. Same adapter strategy applies.",
    weight: 5,
  },

  // ── Windows & Navigation ──
  {
    api: "chrome.windows",
    electronSupport: "adapter",
    notes: "Window management. Electron has BrowserWindow but the mapping is not automatic. Forge adapter needed.",
    unsupportedMethods: ["create", "update", "remove", "getAll"],
    weight: 3,
  },

  // ── Permissions ──
  {
    api: "chrome.permissions",
    electronSupport: "partial",
    notes: "Optional permissions. Basic support exists but runtime permission prompts need Forge UI.",
    weight: 4,
  },
  {
    api: "host_permissions",
    electronSupport: "native",
    notes: "MV3 host permissions. Supported in Electron 44.",
    weight: 7,
  },

  // ── Background / Service Workers ──
  {
    api: "background.service_worker",
    electronSupport: "partial",
    notes: "Service Worker background scripts. Preload support since Electron 35. Lifecycle management may differ from Chrome.",
    weight: 8,
  },
  {
    api: "background.scripts",
    electronSupport: "native",
    notes: "MV2 background pages/scripts. Supported by Electron.",
    weight: 7,
  },

  // ── Context Menus ──
  {
    api: "chrome.contextMenus",
    electronSupport: "adapter",
    notes: "Electron has its own context menu system (Menu). Extension context menus need a Forge adapter to merge into Forge's context menu.",
    weight: 4,
  },

  // ── Notifications ──
  {
    api: "chrome.notifications",
    electronSupport: "fallback",
    notes: "Chrome notification API. Electron has Notification but the chrome.notifications interface needs a bridge.",
    weight: 3,
  },

  // ── Alarms ──
  {
    api: "chrome.alarms",
    electronSupport: "fallback",
    notes: "Timer-based triggers. Not natively wired in Electron; Forge must polyfill with setInterval/setTimeout.",
    weight: 3,
  },

  // ── Identity ──
  {
    api: "chrome.identity",
    electronSupport: "unsupported",
    notes: "OAuth flow via Chrome identity service. Not available in Electron.",
    weight: 2,
  },

  // ── Downloads ──
  {
    api: "chrome.downloads",
    electronSupport: "adapter",
    notes: "Download management. Electron has DownloadItem but chrome.downloads interface needs bridging.",
    weight: 2,
  },

  // ── Bookmarks / History ──
  {
    api: "chrome.bookmarks",
    electronSupport: "unsupported",
    notes: "Chrome bookmarks API. Forge has its own favorites system; would need a full adapter.",
    weight: 1,
  },
  {
    api: "chrome.history",
    electronSupport: "unsupported",
    notes: "Chrome history API. Forge has its own history system; would need a full adapter.",
    weight: 1,
  },

  // ── DevTools ──
  {
    api: "chrome.devtools",
    electronSupport: "unsupported",
    notes: "DevTools extension panels. Not supported in Electron's extension system.",
    weight: 1,
  },

  // ── Side Panel ──
  {
    api: "chrome.sidePanel",
    electronSupport: "unsupported",
    notes: "Chrome side panel API. Would need complete Forge UI implementation.",
    weight: 1,
  },
];

/**
 * Given a list of APIs an extension uses (from manifest permissions + detected usage),
 * calculate a real compatibility score.
 *
 * Returns 0-100 where:
 *   100 = Every API the extension needs is natively supported
 *   0   = Nothing the extension needs is available
 */
export function calculateCompatibilityScore(
  usedApis: string[]
): { score: number; breakdown: { api: string; level: SupportLevel; weight: number }[] } {
  if (usedApis.length === 0) return { score: 100, breakdown: [] };

  const breakdown: { api: string; level: SupportLevel; weight: number }[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const usedApi of usedApis) {
    const cap = CAPABILITY_MAP.find((c) => c.api === usedApi);
    if (!cap) {
      // Unknown API — treat as unsupported
      breakdown.push({ api: usedApi, level: "unsupported", weight: 3 });
      totalWeight += 3;
      continue;
    }

    breakdown.push({ api: cap.api, level: cap.electronSupport, weight: cap.weight });
    totalWeight += cap.weight;

    switch (cap.electronSupport) {
      case "native":
        earnedWeight += cap.weight;
        break;
      case "partial":
        earnedWeight += cap.weight * 0.7;
        break;
      case "adapter":
        earnedWeight += cap.weight * 0.4; // We can build this
        break;
      case "fallback":
        earnedWeight += cap.weight * 0.2; // Possible but degraded
        break;
      case "unsupported":
        // 0 points
        break;
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;
  return { score, breakdown };
}

/**
 * Extract which APIs an extension actually uses from its manifest.
 * This is a static analysis — it reads permissions, content_scripts,
 * background config, and action/browser_action declarations.
 */
export function extractUsedApisFromManifest(manifest: any): string[] {
  const apis = new Set<string>();

  // Always present
  apis.add("chrome.runtime");

  // Manifest-declared content scripts
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    apis.add("content_scripts");
  }

  // Background
  if (manifest.background) {
    if (manifest.background.service_worker) {
      apis.add("background.service_worker");
    }
    if (manifest.background.scripts) {
      apis.add("background.scripts");
    }
  }

  // Action / browser_action
  if (manifest.action) {
    apis.add("chrome.action");
  }
  if (manifest.browser_action) {
    apis.add("chrome.browserAction");
  }

  // Host permissions (MV3)
  if (manifest.host_permissions && manifest.host_permissions.length > 0) {
    apis.add("host_permissions");
  }

  // Permissions array
  const permissions: string[] = [
    ...(manifest.permissions || []),
    ...(manifest.optional_permissions || []),
  ];

  for (const perm of permissions) {
    const lower = perm.toLowerCase();
    if (lower === "storage") apis.add("chrome.storage");
    if (lower === "tabs") apis.add("chrome.tabs");
    if (lower === "activetab") apis.add("chrome.tabs");
    if (lower === "webrequest" || lower === "webrequestblocking") apis.add("chrome.webRequest");
    if (lower === "declarativenetrequest" || lower === "declarativenetrequestwithhostaccess") {
      apis.add("chrome.declarativeNetRequest");
    }
    if (lower === "scripting") apis.add("chrome.scripting");
    if (lower === "contextmenus") apis.add("chrome.contextMenus");
    if (lower === "notifications") apis.add("chrome.notifications");
    if (lower === "alarms") apis.add("chrome.alarms");
    if (lower === "identity") apis.add("chrome.identity");
    if (lower === "downloads") apis.add("chrome.downloads");
    if (lower === "bookmarks") apis.add("chrome.bookmarks");
    if (lower === "history") apis.add("chrome.history");
    if (lower === "devtools") apis.add("chrome.devtools");
    if (lower === "sidepanel") apis.add("chrome.sidePanel");
    if (lower === "windows") apis.add("chrome.windows");
    if (lower === "permissions") apis.add("chrome.permissions");
  }

  return Array.from(apis);
}
