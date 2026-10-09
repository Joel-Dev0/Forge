export interface SecurityCheckResult {
  passed: boolean;
  rule: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface UrlSecurityAnalysis {
  isSecure: boolean;
  isLocal: boolean;
  protocol: string;
  origin: string;
  hostname: string;
  port: string;
  issues: string[];
}

export interface CertificateAnalysis {
  isValid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: number;
  validTo?: number;
  error?: string;
  isSelfSigned?: boolean;
  reasons: string[];
}

export interface RedirectHop {
  url: string;
  protocol: string;
  origin: string;
  statusCode?: number;
}

export interface RedirectChainAnalysis {
  isSafe: boolean;
  initialUrl: string;
  finalUrl: string;
  hops: RedirectHop[];
  downgradedToHttp: boolean;
  crossOriginRedirect: boolean;
  issues: string[];
}

export interface OriginAnalysis {
  isValid: boolean;
  origin: string;
  isOpaque: boolean;
  isLocal: boolean;
  matchesScope: (targetUrl: string, scopeUrl: string) => boolean;
  issues: string[];
}

export interface LocalDevPolicyConfig {
  allowHttpOnLocalhost?: boolean;
  allowSelfSignedCertsOnLocalhost?: boolean;
  customLocalHostnames?: string[];
}

export interface WebSecurityEvaluation {
  passed: boolean;
  checks: {
    secureConnection: boolean;
    validCertificate: boolean;
    safeRedirectChain: boolean;
    validOrigin: boolean;
  };
  reasons: string[];
}
