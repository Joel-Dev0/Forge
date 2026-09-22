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

export interface ForgeExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  type: ExtensionType;
  author: string;
  icon?: string;
  enabled: boolean;
  installedAt: number;
  verification: ExtensionVerificationReport;
  settings?: Record<string, any>;
  manifestPermissions: string[];
}
