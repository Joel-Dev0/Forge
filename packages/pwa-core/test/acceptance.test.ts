import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpsValidator,
  CertificateValidator,
  RedirectAnalyzer,
  OriginValidator,
} from "@forge/web-security";
import {
  ManifestParser,
  TechnicalCriteria,
  InstallationPolicy,
  type PwaEligibilityResult,
} from "../src/index.ts";

function evaluatePwaSecurityGate(input: {
  url: string;
  cert?: any;
  redirectHops?: any[];
  manifest?: any;
}): PwaEligibilityResult {
  const { url, cert, redirectHops = [], manifest } = input;
  const reasons: string[] = [];

  const https = HttpsValidator.validate(url);
  if (!https.isSecure) reasons.push(...https.issues);

  const certRes = CertificateValidator.validate(cert, url);
  if (!certRes.isValid) reasons.push(...certRes.reasons);

  const redirects = RedirectAnalyzer.analyze(redirectHops, url);
  if (!redirects.isSafe) reasons.push(...redirects.issues);

  const connectionPassed = https.isSecure && certRes.isValid && redirects.isSafe;
  if (!connectionPassed) {
    return {
      tabId: "tab-1",
      navigationId: "1",
      status: "blocked",
      eligible: false,
      url,
      checks: {
        secureConnection: https.isSecure,
        validCertificate: certRes.isValid,
        safeRedirectChain: redirects.isSafe,
        validManifest: false,
        installable: false,
        riskPolicyPassed: false,
      },
      reasons,
    };
  }

  if (!manifest) {
    return {
      tabId: "tab-1",
      navigationId: "1",
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
      reasons: ["No manifest detected"],
    };
  }

  const tech = TechnicalCriteria.evaluate(manifest);
  const policy = InstallationPolicy.validatePolicy(url, manifest);

  if (!policy.passed) {
    return {
      tabId: "tab-1",
      navigationId: "1",
      status: "blocked",
      eligible: false,
      url,
      manifest,
      checks: {
        secureConnection: true,
        validCertificate: true,
        safeRedirectChain: true,
        validManifest: tech.issues.length === 0,
        installable: tech.installable,
        riskPolicyPassed: false,
      },
      reasons: policy.issues,
    };
  }

  if (!tech.installable) {
    return {
      tabId: "tab-1",
      navigationId: "1",
      status: "hidden",
      eligible: false,
      url,
      manifest,
      checks: {
        secureConnection: true,
        validCertificate: true,
        safeRedirectChain: true,
        validManifest: tech.issues.length === 0,
        installable: false,
        riskPolicyPassed: true,
      },
      reasons: tech.issues,
    };
  }

  return {
    tabId: "tab-1",
    navigationId: "1",
    status: "eligible",
    eligible: true,
    url,
    manifest,
    bestIconUrl: tech.bestIcon?.src,
    checks: {
      secureConnection: true,
      validCertificate: true,
      safeRedirectChain: true,
      validManifest: true,
      installable: true,
      riskPolicyPassed: true,
    },
    reasons: ["Passed all mandatory checks"],
  };
}

test("Acceptance Criterion 1: Public HTTP must strictly block installation", () => {
  const result = evaluatePwaSecurityGate({
    url: "http://public-site.com/app",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.includes("Public unencrypted HTTP")));
});

test("Acceptance Criterion 2: Bad TLS certificate must block installation", () => {
  const result = evaluatePwaSecurityGate({
    url: "https://badcert.com/app",
    cert: { error: "net::ERR_CERT_AUTHORITY_INVALID" },
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.includes("TLS certificate verification error")));
});

test("Acceptance Criterion 3: HTTPS downgrade during redirect chain must block", () => {
  const result = evaluatePwaSecurityGate({
    url: "http://downgraded.com/app",
    cert: { validFrom: Date.now() - 1000, validTo: Date.now() + 1000 },
    redirectHops: [
      { url: "https://secure.com/start", protocol: "https:", origin: "https://secure.com" },
      { url: "http://downgraded.com/app", protocol: "http:", origin: "http://downgraded.com" },
    ],
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.includes("downgrade")));
});

test("Acceptance Criterion 4: Cross-origin manifest spoofing must block", () => {
  const manifest = ManifestParser.parse(
    {
      name: "Phish Bank",
      start_url: "https://attacker.com/login",
      scope: "https://attacker.com/",
      icons: [{ src: "/icon.png", sizes: "192x192" }],
    },
    "https://legitimate-bank.com"
  );
  const result = evaluatePwaSecurityGate({
    url: "https://legitimate-bank.com/dashboard",
    cert: { validFrom: Date.now() - 1000, validTo: Date.now() + 1000 },
    manifest,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.includes("origin")));
});

test("Acceptance Criterion 5: Page without PWA manifest remains hidden (not eligible)", () => {
  const result = evaluatePwaSecurityGate({
    url: "https://news.com/article",
    cert: { validFrom: Date.now() - 1000, validTo: Date.now() + 1000 },
    manifest: null,
  });
  assert.equal(result.status, "hidden");
  assert.equal(result.eligible, false);
});

test("Acceptance Criterion 6: Fully compliant PWA is approved as eligible", () => {
  const manifest = ManifestParser.parse(
    {
      name: "Forge Dev Tools",
      short_name: "DevTools",
      start_url: "/app/",
      scope: "/app/",
      display: "standalone",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192" },
        { src: "/icons/icon-512.png", sizes: "512x512" },
      ],
    },
    "https://devtools.forge.dev/app/"
  );
  const result = evaluatePwaSecurityGate({
    url: "https://devtools.forge.dev/app/index.html",
    cert: { validFrom: Date.now() - 1000, validTo: Date.now() + 1000 },
    manifest,
  });
  assert.equal(result.status, "eligible");
  assert.equal(result.eligible, true);
  assert.equal(result.bestIconUrl, "https://devtools.forge.dev/icons/icon-512.png");
  assert.equal(result.checks.secureConnection, true);
  assert.equal(result.checks.validCertificate, true);
  assert.equal(result.checks.validManifest, true);
  assert.equal(result.checks.installable, true);
  assert.equal(result.checks.riskPolicyPassed, true);
});
