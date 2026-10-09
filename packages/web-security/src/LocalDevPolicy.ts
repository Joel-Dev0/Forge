import type { LocalDevPolicyConfig } from "./types.ts";

const DEFAULT_LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

export class LocalDevPolicy {
  private config: Required<LocalDevPolicyConfig>;

  constructor(config: LocalDevPolicyConfig = {}) {
    this.config = {
      allowHttpOnLocalhost: config.allowHttpOnLocalhost ?? true,
      allowSelfSignedCertsOnLocalhost: config.allowSelfSignedCertsOnLocalhost ?? true,
      customLocalHostnames: config.customLocalHostnames ?? [],
    };
  }

  public isLocalHost(hostname: string): boolean {
    const cleanHost = hostname.replace(/^\[|\]$/g, "").toLowerCase().trim();
    if (DEFAULT_LOCAL_HOSTNAMES.has(cleanHost)) return true;
    if (this.config.customLocalHostnames.includes(cleanHost)) return true;
    if (cleanHost.endsWith(".localhost") || cleanHost.endsWith(".test") || cleanHost.endsWith(".local")) {
      return true;
    }
    // 127.0.0.0/8 loopback range check
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) {
      return true;
    }
    return false;
  }

  public isLocalUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return this.isLocalHost(url.hostname);
    } catch {
      return false;
    }
  }

  public isHttpAllowedForUrl(urlString: string): boolean {
    if (!this.config.allowHttpOnLocalhost) return false;
    return this.isLocalUrl(urlString);
  }

  public isSelfSignedCertAllowed(urlString: string): boolean {
    if (!this.config.allowSelfSignedCertsOnLocalhost) return false;
    return this.isLocalUrl(urlString);
  }
}

export const defaultLocalDevPolicy = new LocalDevPolicy();
