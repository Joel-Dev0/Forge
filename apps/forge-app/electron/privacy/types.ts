export type CleanupInterval = "disabled" | "1h" | "6h" | "24h" | "7d" | "custom";

export type CleanupTargetKey =
  | "cache"
  | "history"
  | "downloads"
  | "cookies"
  | "localStorage"
  | "indexedDB"
  | "serviceWorkers"
  | "sessions"
  | "passwordsAutofill"
  | "permissions";

export type CookieRuleMode = "all" | "except_protected" | "only_trackers" | "only_selected";

export type RiskTier = "safe" | "moderate" | "critical";

export interface TargetMetadata {
  key: CleanupTargetKey;
  label: string;
  description: string;
  tier: RiskTier;
  defaultChecked: boolean;
}

export const CLEANUP_TARGET_DEFINITIONS: Record<CleanupTargetKey, TargetMetadata> = {
  cache: {
    key: "cache",
    label: "Cache & DNS",
    description: "Temporary web files, images, scripts and host resolver cache",
    tier: "safe",
    defaultChecked: true,
  },
  history: {
    key: "history",
    label: "Browsing History",
    description: "Record of websites and pages you have visited",
    tier: "safe",
    defaultChecked: true,
  },
  downloads: {
    key: "downloads",
    label: "Download History",
    description: "List of downloaded files (does not delete downloaded files on disk)",
    tier: "safe",
    defaultChecked: false,
  },
  cookies: {
    key: "cookies",
    label: "Cookies",
    description: "Site data used to remember you and maintain sessions (configurable exceptions)",
    tier: "moderate",
    defaultChecked: true,
  },
  localStorage: {
    key: "localStorage",
    label: "Local Storage",
    description: "Client-side key-value application data stored by websites",
    tier: "moderate",
    defaultChecked: true,
  },
  indexedDB: {
    key: "indexedDB",
    label: "IndexedDB",
    description: "Structured client-side databases stored by modern web apps",
    tier: "moderate",
    defaultChecked: true,
  },
  serviceWorkers: {
    key: "serviceWorkers",
    label: "Service Workers & Cache Storage",
    description: "Background worker scripts and offline cache storage",
    tier: "moderate",
    defaultChecked: true,
  },
  sessions: {
    key: "sessions",
    label: "Stored Sessions & Auth Cache",
    description: "HTTP basic/digest authentication tokens and active session states",
    tier: "critical",
    defaultChecked: false,
  },
  passwordsAutofill: {
    key: "passwordsAutofill",
    label: "Passwords & Autocomplete Forms",
    description: "Saved form autofill data and credentials (requires double confirmation)",
    tier: "critical",
    defaultChecked: false,
  },
  permissions: {
    key: "permissions",
    label: "Site Permissions",
    description: "Custom site access permissions (camera, microphone, notifications)",
    tier: "critical",
    defaultChecked: false,
  },
};

export type CleanupTargets = Record<CleanupTargetKey, boolean>;

export interface CookieRule {
  mode: CookieRuleMode;
  protectedDomains: string[];
  selectedDomains: string[];
}

export interface CleanupPolicy {
  enabled: boolean;
  interval: CleanupInterval;
  customIntervalMinutes?: number;
  lastRunTimestamp?: number;
  nextRunTimestamp?: number;
  targets: CleanupTargets;
  cookieRule: CookieRule;
}

export interface PrivacyStats {
  cacheSizeBytes: number;
  cookiesTotal: number;
  cookiesTrackers: number;
  cookiesStale: number;
  historyCount: number;
  downloadsCount: number;
  lastCleanedTimestamp?: number;
  lastCleanedSummary?: {
    targets: CleanupTargetKey[];
    bytesFreed: number;
    cookiesRemoved: number;
    timestamp: number;
  };
}

export interface CleanupResult {
  success: boolean;
  bytesFreed: number;
  cookiesRemoved: number;
  historyCleared: boolean;
  downloadsCleared: boolean;
  cleanedTargets: CleanupTargetKey[];
  timestamp: number;
  error?: string;
}

export const DEFAULT_PROTECTED_DOMAINS = [
  "github.com",
  "stackoverflow.com",
  "google.com",
  "gitlab.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "notion.so",
  "figma.com",
];

export const DEFAULT_CLEANUP_POLICY: CleanupPolicy = {
  enabled: false,
  interval: "disabled",
  customIntervalMinutes: 360,
  targets: {
    cache: true,
    history: true,
    downloads: false,
    cookies: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true,
    sessions: false,
    passwordsAutofill: false,
    permissions: false,
  },
  cookieRule: {
    mode: "except_protected",
    protectedDomains: [...DEFAULT_PROTECTED_DOMAINS],
    selectedDomains: [],
  },
};
