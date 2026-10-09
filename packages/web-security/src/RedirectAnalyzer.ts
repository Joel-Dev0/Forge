import { defaultLocalDevPolicy, LocalDevPolicy } from "./LocalDevPolicy.ts";
import type { RedirectChainAnalysis, RedirectHop } from "./types.ts";

export class RedirectAnalyzer {
  public static analyze(
    hops: RedirectHop[],
    finalUrl: string,
    localPolicy: LocalDevPolicy = defaultLocalDevPolicy
  ): RedirectChainAnalysis {
    const issues: string[] = [];
    let downgradedToHttp = false;
    let crossOriginRedirect = false;

    if (!hops || hops.length === 0) {
      return {
        isSafe: true,
        initialUrl: finalUrl,
        finalUrl,
        hops: [],
        downgradedToHttp: false,
        crossOriginRedirect: false,
        issues: [],
      };
    }

    const initialHop = hops[0];
    const initialUrl = initialHop.url;

    if (hops.length > 5) {
      issues.push(`Suspiciously long redirect chain (${hops.length} hops)`);
    }

    let hadHttps = initialHop.protocol === "https:";

    for (let i = 0; i < hops.length; i++) {
      const hop = hops[i];
      if (hop.protocol === "https:") {
        hadHttps = true;
      } else if (hop.protocol === "http:" && hadHttps) {
        const isLocal = localPolicy.isLocalUrl(hop.url);
        if (!isLocal) {
          downgradedToHttp = true;
          issues.push(`Security downgrade detected: redirected from HTTPS to insecure HTTP at "${hop.url}"`);
        }
      }

      if (i > 0 && hops[i - 1].origin !== hop.origin) {
        crossOriginRedirect = true;
      }
    }

    // Verify final destination matches protocol security
    try {
      const finalParsed = new URL(finalUrl);
      if (hadHttps && finalParsed.protocol === "http:" && !localPolicy.isLocalUrl(finalUrl)) {
        downgradedToHttp = true;
        issues.push(`Final navigation destination ended on insecure HTTP: "${finalUrl}"`);
      }
    } catch {
      issues.push("Invalid final destination URL");
    }

    const isSafe = issues.length === 0 && !downgradedToHttp;

    return {
      isSafe,
      initialUrl,
      finalUrl,
      hops,
      downgradedToHttp,
      crossOriginRedirect,
      issues,
    };
  }
}
