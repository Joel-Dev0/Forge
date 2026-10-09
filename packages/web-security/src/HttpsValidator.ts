import { defaultLocalDevPolicy, LocalDevPolicy } from "./LocalDevPolicy.ts";
import type { UrlSecurityAnalysis } from "./types.ts";

export class HttpsValidator {
  public static validate(
    urlString: string,
    localPolicy: LocalDevPolicy = defaultLocalDevPolicy
  ): UrlSecurityAnalysis {
    const issues: string[] = [];

    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      return {
        isSecure: false,
        isLocal: false,
        protocol: "",
        origin: "",
        hostname: "",
        port: "",
        issues: ["Invalid or unparseable URL string"],
      };
    }

    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = localPolicy.isLocalHost(hostname);

    if (protocol === "https:") {
      // Secure
    } else if (protocol === "http:") {
      if (isLocal) {
        if (!localPolicy.isHttpAllowedForUrl(urlString)) {
          issues.push("HTTP protocol is restricted for local development under current policy");
        }
      } else {
        issues.push("Public unencrypted HTTP is not permitted for PWA installation");
      }
    } else {
      issues.push(`Insecure or unsupported protocol: "${protocol}". PWAs require HTTPS`);
    }

    const isSecure = issues.length === 0;

    return {
      isSecure,
      isLocal,
      protocol,
      origin: parsed.origin,
      hostname,
      port: parsed.port,
      issues,
    };
  }
}
