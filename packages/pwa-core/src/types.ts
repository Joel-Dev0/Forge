export type PwaDisplayMode = "fullscreen" | "standalone" | "minimal-ui" | "browser";

export interface PwaIcon {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: string;
  width?: number;
  height?: number;
}

export interface PwaManifest {
  name: string;
  shortName?: string;
  description?: string;
  startUrl: string;
  scope: string;
  display: PwaDisplayMode;
  themeColor?: string;
  backgroundColor?: string;
  icons: PwaIcon[];
  rawManifestUrl?: string;
}

export type PwaInstallStatus =
  | "hidden"
  | "analyzing"
  | "eligible"
  | "blocked"
  | "installing"
  | "installed"
  | "error";

export interface PwaEligibilityResult {
  tabId: string;
  navigationId: string;
  status: PwaInstallStatus;
  eligible: boolean;
  url: string;
  manifest?: PwaManifest;
  bestIconUrl?: string;
  checks: {
    secureConnection: boolean;
    validCertificate: boolean;
    safeRedirectChain: boolean;
    validManifest: boolean;
    installable: boolean;
    riskPolicyPassed: boolean;
  };
  reasons: string[];
}

export interface InstalledPwaRecord {
  id: string;
  name: string;
  shortName: string;
  startUrl: string;
  scope: string;
  display: PwaDisplayMode;
  iconPath: string;
  iconUrl: string;
  installedAt: number;
  lastLaunchedAt?: number;
}
