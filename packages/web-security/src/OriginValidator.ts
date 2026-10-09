import { defaultLocalDevPolicy, LocalDevPolicy } from "./LocalDevPolicy.ts";
import type { OriginAnalysis } from "./types.ts";

export class OriginValidator {
  public static validate(
    urlString: string,
    localPolicy: LocalDevPolicy = defaultLocalDevPolicy
  ): OriginAnalysis {
    const issues: string[] = [];

    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      return {
        isValid: false,
        origin: "",
        isOpaque: true,
        isLocal: false,
        matchesScope: () => false,
        issues: ["Invalid URL string"],
      };
    }

    const origin = parsed.origin;
    const isOpaque = origin === "null" || !origin;
    if (isOpaque) {
      issues.push("Opaque or null origin is prohibited");
    }

    const isLocal = localPolicy.isLocalUrl(urlString);

    return {
      isValid: issues.length === 0,
      origin,
      isOpaque,
      isLocal,
      matchesScope: (targetUrl: string, scopeUrl: string) =>
        OriginValidator.isWithinScope(targetUrl, scopeUrl),
      issues,
    };
  }

  public static isSameOrigin(urlA: string, urlB: string): boolean {
    try {
      const a = new URL(urlA);
      const b = new URL(urlB);
      return a.origin === b.origin;
    } catch {
      return false;
    }
  }

  public static isWithinScope(targetUrl: string, scopeUrl: string): boolean {
    try {
      const target = new URL(targetUrl);
      const scope = new URL(scopeUrl);

      // Origin must be identical
      if (target.origin !== scope.origin) {
        return false;
      }

      // Target pathname must start with scope pathname
      const scopePath = scope.pathname.endsWith("/") ? scope.pathname : `${scope.pathname}/`;
      const targetPath = target.pathname.endsWith("/") ? target.pathname : `${target.pathname}/`;

      // Root scope matches everything on origin
      if (scope.pathname === "/" || scope.pathname === "") {
        return true;
      }

      return targetPath.startsWith(scopePath);
    } catch {
      return false;
    }
  }
}
