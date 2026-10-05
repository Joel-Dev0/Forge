export type ExtensionType = "browser" | "developer";

export type SecurityTier = "trusted" | "low_risk" | "medium_risk" | "high_risk" | "critical";

export interface ExtensionVerificationReport {
  authorVerified: boolean;
  authorName: string;
  signatureValid: boolean;
  sha256Hash: string;
  manifestRiskScore: number; // 0-100
  suspiciousPatternsDetected: string[];
  permissionsRequested: string[];
  securityTier: SecurityTier;
  recommendedAction: "allow" | "prompt" | "override_required" | "block";
}

export interface ExtensionDiagnosticSummary {
  extensionId: string;
  name: string;
  version: string;
  manifestVersion: number;
  electronLoaded: boolean;
  contentScriptsNative: boolean;
  score: number;
  tier: "full-native" | "partial-native" | "adapter-required" | "unsupported";
  usedApis: { api: string; status: "native" | "adapter" | "fallback" | "unsupported" }[];
}

export interface ForgeExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  type: ExtensionType;
  author: string;
  icon?: string;
  enabled: boolean;
  pinned?: boolean;
  webStoreUrl?: string;
  installedAt: number;
  verification: ExtensionVerificationReport;
  settings?: Record<string, any>;
  manifestPermissions: string[];
  diagnostic?: ExtensionDiagnosticSummary;
}
