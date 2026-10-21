import type { BlockRule, RequestDetails } from "../rules/rule.ts";

/**
 * Extracts hostname from URL string safely.
 */
export function extractHostname(urlStr?: string): string {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Checks if request is third-party relative to source document URL.
 */
export function isThirdPartyRequest(requestUrl: string, sourceUrl?: string): boolean {
  if (!sourceUrl) return false;
  const reqHost = extractHostname(requestUrl);
  const srcHost = extractHostname(sourceUrl);
  if (!reqHost || !srcHost) return false;

  if (reqHost === srcHost) return false;

  // Check shared apex domain: e.g. "sub.domain.com" vs "api.domain.com"
  const reqParts = reqHost.split(".");
  const srcParts = srcHost.split(".");

  if (reqParts.length >= 2 && srcParts.length >= 2) {
    const reqApex = reqParts.slice(-2).join(".");
    const srcApex = srcParts.slice(-2).join(".");
    if (reqApex === srcApex) return false;
  }

  return true;
}

export const COMMON_TRACKING_QUERY_PARAMS = [
  "fbclid",
  "gclid",
  "msclkid",
  "twclid",
  "mc_eid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "igshid",
  "ysclid",
  "wbraid",
  "gbraid",
];

/**
 * Strips known tracking query parameters (e.g. fbclid, gclid, utm_*) from a URL.
 */
export function stripTrackingParameters(urlStr: string): { cleanUrl: string; strippedParams: string[] } {
  const strippedParams: string[] = [];
  try {
    const url = new URL(urlStr);
    const searchParams = url.searchParams;

    for (const param of COMMON_TRACKING_QUERY_PARAMS) {
      if (searchParams.has(param)) {
        strippedParams.push(param);
        searchParams.delete(param);
      }
    }

    // Also match any parameter starting with utm_
    const allKeys = Array.from(searchParams.keys());
    for (const key of allKeys) {
      if (key.toLowerCase().startsWith("utm_") && !strippedParams.includes(key)) {
        strippedParams.push(key);
        searchParams.delete(key);
      }
    }

    if (strippedParams.length === 0) {
      return { cleanUrl: urlStr, strippedParams: [] };
    }

    url.search = searchParams.toString();
    return { cleanUrl: url.toString(), strippedParams };
  } catch {
    return { cleanUrl: urlStr, strippedParams: [] };
  }
}

/**
 * Matches a single rule against a request.
 */
export function matchRule(rule: BlockRule, request: RequestDetails): boolean {
  // 1. URL pattern / regex check
  if (rule.regex && !rule.regex.test(request.url)) {
    return false;
  }

  // 2. Options checks
  const opts = rule.options;
  if (!opts) return true;

  // Resource type filtering
  if (request.resourceType) {
    const reqType = request.resourceType.toLowerCase();

    if (opts.resourceTypes && opts.resourceTypes.length > 0) {
      const matchesType = opts.resourceTypes.some((t) => {
        if (t === "xhr" && (reqType === "fetch" || reqType === "xmlhttprequest")) return true;
        if ((t === "document" || t === "doc") && (reqType === "mainframe" || reqType === "document")) return true;
        if (t === "popup" && (reqType === "popup" || reqType === "subdocument" || reqType === "mainframe")) return true;
        return t === reqType;
      });
      if (!matchesType) return false;
    }

    if (opts.invertedResourceTypes && opts.invertedResourceTypes.length > 0) {
      const matchesInverted = opts.invertedResourceTypes.some((t) => {
        if (t === "xhr" && (reqType === "fetch" || reqType === "xmlhttprequest")) return true;
        if ((t === "document" || t === "doc") && (reqType === "mainframe" || reqType === "document")) return true;
        if (t === "popup" && (reqType === "popup" || reqType === "subdocument" || reqType === "mainframe")) return true;
        return t === reqType;
      });
      if (matchesInverted) return false;
    }
  }

  // Third-party filtering
  if (opts.thirdParty !== undefined) {
    const is3p = request.isThirdParty ?? isThirdPartyRequest(request.url, request.sourceUrl);
    if (opts.thirdParty !== is3p) {
      return false;
    }
  }

  // Source domain restrictions ($domain=...)
  if (request.sourceUrl) {
    const srcHost = extractHostname(request.sourceUrl);

    if (opts.invertedDomains && opts.invertedDomains.length > 0) {
      const matchesInvertedDomain = opts.invertedDomains.some((d) =>
        srcHost === d || srcHost.endsWith("." + d)
      );
      if (matchesInvertedDomain) return false;
    }

    if (opts.domains && opts.domains.length > 0) {
      const matchesDomain = opts.domains.some((d) =>
        srcHost === d || srcHost.endsWith("." + d)
      );
      if (!matchesDomain) return false;
    }
  }

  return true;
}

export const SUSPICIOUS_AFFILIATE_KEYS = [
  "click_id", "clickid", "aff_id", "affid", "subid", "sub_id",
  "zoneid", "zone_id", "banner_id", "campaign_id", "pub_id",
  "ref_id", "track_id", "popunder", "psid", "smartlink",
  "partner_key", "session_partner_key", "sub6", "visitor-id"
];

export const SUSPICIOUS_AD_PATHS = [
  "/click.php", "/out.php", "/track.php", "/redirect.php", "/goto.php",
  "/jump.php", "/redir.php", "/traffic/", "/rotator/", "/adclick",
  "/ad_click", "/ad-click", "/pop/click", "/clk/", "/zone/", "/dispatcher.php",
  "/serving/ad", "/delivery/", "/go.php", "/ad.php", "/adv.php"
];

export const KNOWN_POP_NETWORKS = [
  "monetag", "adsterra", "clickadu", "propellerads", "profitablecpm",
  "highcpm", "effectivecpm", "realsrv", "magsrv", "xlviirdr",
  "pukegoocha", "whomeeno", "voomau", "oortous", "whounsoo",
  "dooloust", "shoumou", "deloplen", "grootso", "alwingulla",
  "eastsour", "cloutho", "agacelebir", "britishfireplace", "w-one023",
  "quicktoolera"
];

export const SAFE_TOP_DOMAINS = [
  "google.com", "gstatic.com", "googleapis.com", "youtube.com", "ytimg.com",
  "github.com", "microsoft.com", "apple.com", "cloudflare.com", "cdnjs.cloudflare.com",
  "amazon.com", "aws.amazon.com", "wikipedia.org", "w3.org", "mozilla.org",
  "bbci.co.uk", "bbc.com", "instagram.com", "x.com", "twitter.com", "facebook.com"
];

/**
 * Heuristically inspects a request for suspicious third-party ad networks,
 * smartlinks, or popunder redirect parameters that should be auto-blocked and learned.
 */
export function detectSuspiciousAdRequest(request: RequestDetails): {
  suspicious: boolean;
  ruleCandidate?: string;
  reason?: string;
} {
  const hostname = extractHostname(request.url);
  if (!hostname || hostname.length < 3 || !hostname.includes(".")) {
    return { suspicious: false };
  }

  // Never flag whitelisted system/major platforms
  if (SAFE_TOP_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d))) {
    return { suspicious: false };
  }

  const is3rd = request.sourceUrl ? isThirdPartyRequest(request.url, request.sourceUrl) : true;
  const lowerUrl = request.url.toLowerCase();

  // 1. Direct hit on known popunder/ad network domain keyword
  for (const net of KNOWN_POP_NETWORKS) {
    if (hostname.includes(net)) {
      return {
        suspicious: true,
        ruleCandidate: hostname,
        reason: `Matches known high-risk ad/popunder network (${net})`
      };
    }
  }

  // 2. Suspicious redirect paths or affiliate parameters on third-party requests
  if (is3rd) {
    let matchedKey = "";
    try {
      const parsed = new URL(request.url);
      for (const k of SUSPICIOUS_AFFILIATE_KEYS) {
        if (parsed.searchParams.has(k)) {
          matchedKey = k;
          break;
        }
      }
    } catch {}

    if (matchedKey) {
      return {
        suspicious: true,
        ruleCandidate: hostname,
        reason: `Third-party affiliate smartlink tracking parameter detected (${matchedKey})`
      };
    }

    const hasSuspiciousPath = SUSPICIOUS_AD_PATHS.some((p) => lowerUrl.includes(p));
    if (hasSuspiciousPath) {
      return {
        suspicious: true,
        ruleCandidate: hostname,
        reason: "Third-party ad dispatcher path pattern"
      };
    }
  }

  return { suspicious: false };
}
