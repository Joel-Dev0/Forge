/**
 * Extension Capability Map (Renderer)
 *
 * Defines the known universe of chrome.* APIs that Chrome extensions use,
 * mapped to Electron 44 (Chromium 152) support status.
 *
 * Strategy:
 *   Level 1: Native Electron Extension Support (Chromium 152 engine)
 *   Level 2: Forge Adapters (Action toolbar, popups, window management, context menus)
 *   Level 3: Polyfills & Fallbacks (In-page DOM scripts, alarms, notifications)
 */

export type SupportLevel =
  | "native"          // Electron handles this fully
  | "partial"         // Electron handles some operations; Forge may need to fill gaps
  | "adapter"         // Electron doesn't wire this to Forge's model; needs a bridge
  | "fallback"        // Electron doesn't support this; Forge must polyfill via IPC/executeJS
  | "unsupported";    // Not feasible in Electron's architecture

export interface ApiCapability {
  api: string;
  electronSupport: SupportLevel;
  notes: string;
  supportedMethods?: string[];
  unsupportedMethods?: string[];
  weight: number;
}

export const CAPABILITY_MAP: ApiCapability[] = [
  // ── Core Runtime ──
  {
    api: "chrome.runtime",
    electronSupport: "native",
    notes: "Core messaging, lifecycle, and extension identity. Fully supported by Electron 44.",
    supportedMethods: [
      "getURL", "getManifest", "id", "sendMessage", "onMessage",
      "onInstalled", "onStartup", "connect", "onConnect",
    ],
    weight: 10,
  },
  {
    api: "chrome.storage",
    electronSupport: "native",
    notes: "chrome.storage.local is fully supported natively. chrome.storage.sync falls back to local.",
    supportedMethods: ["local.get", "local.set", "local.remove", "local.clear", "onChanged"],
    unsupportedMethods: ["sync (falls back to local)", "managed"],
    weight: 9,
  },

  // ── Content & Scripting ──
  {
    api: "content_scripts",
    electronSupport: "native",
    notes: "Manifest-declared content scripts are injected natively by Electron with run_at timing (document_start, document_end, document_idle).",
    weight: 10,
  },
  {
    api: "chrome.scripting",
    electronSupport: "native",
    notes: "Programmatic script injection into pages. Supported natively in Electron 44.",
    supportedMethods: ["executeScript", "insertCSS", "removeCSS"],
    weight: 8,
  },

  // ── Tabs ──
  {
    api: "chrome.tabs",
    electronSupport: "partial",
    notes: "Partially supported natively. Forge maps active <webview> WebContents to tab queries.",
    supportedMethods: ["query", "sendMessage", "reload", "executeScript", "update"],
    unsupportedMethods: ["create", "remove", "move", "group", "captureVisibleTab"],
    weight: 9,
  },

  // ── Network ──
  {
    api: "chrome.webRequest",
    electronSupport: "native",
    notes: "Request interception, header modification, and blocking. Supported natively in Electron 44.",
    supportedMethods: [
      "onBeforeRequest", "onBeforeSendHeaders", "onHeadersReceived",
      "onCompleted", "onErrorOccurred",
    ],
    weight: 7,
  },
  {
    api: "chrome.declarativeNetRequest",
    electronSupport: "unsupported",
    notes: "MV3 declarative network rules. Not supported in Electron's architecture. Extensions relying solely on DNR for ad/tracker blocking will have reduced capabilities.",
    weight: 6,
  },

  // ── UI & Action ──
  {
    api: "chrome.action",
    electronSupport: "adapter",
    notes: "Extension toolbar button and action popup (MV3). Forge provides the custom toolbar UI and popup BrowserWindow.",
    weight: 5,
  },
  {
    api: "chrome.browserAction",
    electronSupport: "adapter",
    notes: "MV2 equivalent of chrome.action. Handled by Forge's action adapter.",
    weight: 5,
  },

  // ── Windows & Navigation ──
  {
    api: "chrome.windows",
    electronSupport: "adapter",
    notes: "Window management. Forge bridges to Electron's BrowserWindow model.",
    unsupportedMethods: ["create", "update", "remove", "getAll"],
    weight: 3,
  },

  // ── Permissions ──
  {
    api: "chrome.permissions",
    electronSupport: "partial",
    notes: "Optional runtime permissions. Basic support exists; permission prompts routed through Forge UI.",
    weight: 4,
  },
  {
    api: "host_permissions",
    electronSupport: "native",
    notes: "MV3 host permissions for cross-origin fetch/XHR. Supported in Electron 44.",
    weight: 7,
  },

  // ── Background / Service Workers ──
  {
    api: "background.service_worker",
    electronSupport: "partial",
    notes: "Service Worker background scripts (MV3). Electron 35+ added preload support. Runs within Chromium's service worker lifecycle.",
    weight: 8,
  },
  {
    api: "background.scripts",
    electronSupport: "native",
    notes: "MV2 background pages and scripts. Supported by Electron.",
    weight: 7,
  },

  // ── Context Menus ──
  {
    api: "chrome.contextMenus",
    electronSupport: "adapter",
    notes: "Extension context menu entries. Forge bridges these into its native context menu.",
    weight: 4,
  },

  // ── Notifications ──
  {
    api: "chrome.notifications",
    electronSupport: "fallback",
    notes: "Chrome notification API. Forge bridges to Electron Notification system.",
    weight: 3,
  },

  // ── Alarms ──
  {
    api: "chrome.alarms",
    electronSupport: "fallback",
    notes: "Timer-based triggers. Polyfilled by Forge via timers.",
    weight: 3,
  },

  // ── Identity ──
  {
    api: "chrome.identity",
    electronSupport: "unsupported",
    notes: "OAuth flow via Google Chrome identity service. Not available in Electron.",
    weight: 2,
  },

  // ── Downloads ──
  {
    api: "chrome.downloads",
    electronSupport: "adapter",
    notes: "Download management. Forge bridges to Electron's session downloadItem handler.",
    weight: 2,
  },

  // ── Bookmarks / History ──
  {
    api: "chrome.bookmarks",
    electronSupport: "unsupported",
    notes: "Chrome bookmarks API. Forge uses its own favorites architecture.",
    weight: 1,
  },
  {
    api: "chrome.history",
    electronSupport: "unsupported",
    notes: "Chrome history API. Forge uses its own SQLite/in-memory history storage.",
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
    notes: "Chrome side panel API. Not natively implemented in Electron.",
    weight: 1,
  },
];
