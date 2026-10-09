import { defaultLocalDevPolicy, LocalDevPolicy } from "./LocalDevPolicy.ts";
import type { CertificateAnalysis } from "./types.ts";

export interface CertificateInput {
  issuer?: string;
  subject?: string;
  validFrom?: number;
  validTo?: number;
  error?: string;
  isSelfSigned?: boolean;
}

export class CertificateValidator {
  public static validate(
    cert: CertificateInput | null | undefined,
    urlString: string,
    localPolicy: LocalDevPolicy = defaultLocalDevPolicy
  ): CertificateAnalysis {
    const reasons: string[] = [];
    const isLocal = localPolicy.isLocalUrl(urlString);

    if (!cert) {
      // If the URL is plain local HTTP and allowed, TLS cert is not required
      if (isLocal && localPolicy.isHttpAllowedForUrl(urlString) && urlString.startsWith("http://")) {
        return {
          isValid: true,
          reasons: ["Local HTTP development allowed without certificate"],
        };
      }
      return {
        isValid: false,
        reasons: ["No TLS certificate data available for secure origin"],
      };
    }

    if (cert.error) {
      if (isLocal && localPolicy.isSelfSignedCertAllowed(urlString) && cert.isSelfSigned) {
        // Tolerated on localhost if configured
      } else {
        reasons.push(`TLS certificate verification error: ${cert.error}`);
      }
    }

    const now = Date.now();
    if (cert.validFrom && now < cert.validFrom) {
      reasons.push("TLS certificate is not yet valid (premature start date)");
    }
    if (cert.validTo && now > cert.validTo) {
      reasons.push("TLS certificate has expired");
    }

    if (cert.isSelfSigned && !isLocal) {
      reasons.push("Self-signed certificates are prohibited for public PWA origins");
    }

    const isValid = reasons.length === 0;

    return {
      isValid,
      issuer: cert.issuer,
      subject: cert.subject,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      error: cert.error,
      isSelfSigned: cert.isSelfSigned,
      reasons,
    };
  }
}
