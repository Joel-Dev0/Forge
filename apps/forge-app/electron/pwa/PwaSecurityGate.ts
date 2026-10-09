import {
  HttpsValidator,
  CertificateValidator,
  RedirectAnalyzer,
  OriginValidator,
  defaultLocalDevPolicy,
  type CertificateInput,
  type RedirectHop,
} from "@forge/web-security";
import {
  TechnicalCriteria,
  InstallationPolicy,
  type PwaEligibilityResult,
  type PwaInstallStatus,
  type PwaManifest,
} from "@forge/pwa-core";

export interface SecurityGateEvaluationInput {
  tabId: string;
  navigationId: string;
  url: string;
  cert?: CertificateInput | null;
  redirectHops?: RedirectHop[];
  manifest?: PwaManifest | null;
  hasServiceWorker?: boolean;
}

export class PwaSecurityGate {
  public static evaluate(input: SecurityGateEvaluationInput): PwaEligibilityResult {
    const {
      tabId,
      navigationId,
      url,
      cert,
      redirectHops = [],
      manifest,
      hasServiceWorker,
    } = input;

    const reasons: string[] = [];

    // 1. HTTPS / Scheme check
    const httpsAnalysis = HttpsValidator.validate(url, defaultLocalDevPolicy);
    const secureConnection = httpsAnalysis.isSecure;
    if (!secureConnection) {
      reasons.push(...httpsAnalysis.issues);
    }

    // 2. TLS Certificate check
    const certAnalysis = CertificateValidator.validate(cert, url, defaultLocalDevPolicy);
    const validCertificate = certAnalysis.isValid;
    if (!validCertificate) {
      reasons.push(...certAnalysis.reasons);
    }

    // 3. Redirect chain check
    const redirectAnalysis = RedirectAnalyzer.analyze(redirectHops, url, defaultLocalDevPolicy);
    const safeRedirectChain = redirectAnalysis.isSafe;
    if (!safeRedirectChain) {
      reasons.push(...redirectAnalysis.issues);
    }

    // Connection security failure triggers a hard BLOCK
    const connectionPassed = secureConnection && validCertificate && safeRedirectChain;
    if (!connectionPassed) {
      return {
        tabId,
        navigationId,
        status: "blocked",
        eligible: false,
        url,
        checks: {
          secureConnection,
          validCertificate,
          safeRedirectChain,
          validManifest: false,
          installable: false,
          riskPolicyPassed: false,
        },
        reasons,
      };
    }

    // 4. Manifest existence
    if (!manifest) {
      return {
        tabId,
        navigationId,
        status: "hidden",
        eligible: false,
        url,
        checks: {
          secureConnection: true,
          validCertificate: true,
          safeRedirectChain: true,
          validManifest: false,
          installable: false,
          riskPolicyPassed: true,
        },
        reasons: ["No valid web app manifest linked on this page"],
      };
    }

    // 5. Technical Criteria (manifest structure, icons, display mode)
    const techCriteria = TechnicalCriteria.evaluate(manifest, { hasServiceWorker });
    const installable = techCriteria.installable;
    const validManifest = techCriteria.issues.length === 0;
    if (!installable) {
      reasons.push(...techCriteria.issues);
    }

    // 6. Security & Origin Policy check
    const policyResult = InstallationPolicy.validatePolicy(url, manifest);
    const riskPolicyPassed = policyResult.passed;
    if (!riskPolicyPassed) {
      reasons.push(...policyResult.issues);
    }

    // If policy check failed (e.g. cross-origin manifest spoofing), mark as BLOCKED
    if (!riskPolicyPassed) {
      return {
        tabId,
        navigationId,
        status: "blocked",
        eligible: false,
        url,
        manifest,
        bestIconUrl: techCriteria.bestIcon?.src,
        checks: {
          secureConnection: true,
          validCertificate: true,
          safeRedirectChain: true,
          validManifest,
          installable,
          riskPolicyPassed: false,
        },
        reasons,
      };
    }

    // If technical criteria failed (e.g. no icons or display: browser), mark as HIDDEN
    if (!installable) {
      return {
        tabId,
        navigationId,
        status: "hidden",
        eligible: false,
        url,
        manifest,
        bestIconUrl: techCriteria.bestIcon?.src,
        checks: {
          secureConnection: true,
          validCertificate: true,
          safeRedirectChain: true,
          validManifest,
          installable: false,
          riskPolicyPassed: true,
        },
        reasons,
      };
    }

    // 7. ALL MANDATORY CHECKS PASSED: Eligible for PWA Installation!
    return {
      tabId,
      navigationId,
      status: "eligible",
      eligible: true,
      url,
      manifest,
      bestIconUrl: techCriteria.bestIcon?.src,
      checks: {
        secureConnection: true,
        validCertificate: true,
        safeRedirectChain: true,
        validManifest: true,
        installable: true,
        riskPolicyPassed: true,
      },
      reasons: ["All mandatory PWA security and technical checks passed"],
    };
  }
}
