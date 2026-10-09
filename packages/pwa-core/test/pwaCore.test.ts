import test from "node:test";
import assert from "node:assert/strict";
import {
  ManifestParser,
  ManifestValidator,
  TechnicalCriteria,
  InstallationPolicy,
} from "../src/index.ts";

test("ManifestParser correctly resolves start_url, scope and icons", () => {
  const raw = {
    name: "Forge Studio",
    short_name: "Studio",
    start_url: "/app/index.html",
    scope: "/app/",
    display: "standalone",
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  const parsed = ManifestParser.parse(raw, "https://example.com/app/index.html", "https://example.com/app/manifest.json");
  assert.equal(parsed.name, "Forge Studio");
  assert.equal(parsed.shortName, "Studio");
  assert.equal(parsed.startUrl, "https://example.com/app/index.html");
  assert.equal(parsed.scope, "https://example.com/app/");
  assert.equal(parsed.display, "standalone");
  assert.equal(parsed.icons.length, 2);
  assert.equal(parsed.icons[0].src, "https://example.com/app/icon-192.png");
  assert.equal(parsed.icons[0].width, 192);
  assert.equal(parsed.icons[1].width, 512);
});

test("ManifestValidator enforces required fields", () => {
  const invalid = {
    name: "",
    startUrl: "https://example.com/",
    scope: "https://example.com/",
    display: "standalone" as const,
    icons: [],
  };
  const val = ManifestValidator.validate(invalid);
  assert.equal(val.isValid, false);
  assert.ok(val.issues.some((i) => i.includes("name")));
  assert.ok(val.issues.some((i) => i.includes("icon")));
});

test("TechnicalCriteria selects the best high-resolution icon", () => {
  const manifest = ManifestParser.parse(
    {
      name: "App",
      start_url: "/",
      icons: [
        { src: "/icon-48.png", sizes: "48x48" },
        { src: "/icon-512.png", sizes: "512x512" },
        { src: "/icon-192.png", sizes: "192x192" },
      ],
    },
    "https://example.com"
  );

  const best = TechnicalCriteria.selectBestIcon(manifest.icons);
  assert.ok(best);
  assert.equal(best?.width, 512);

  const evalResult = TechnicalCriteria.evaluate(manifest);
  assert.equal(evalResult.installable, true);
});

test("InstallationPolicy prevents cross-origin start_url or scope mismatch", () => {
  const validManifest = ManifestParser.parse(
    {
      name: "Valid App",
      start_url: "/app/",
      scope: "/app/",
      icons: [{ src: "/icon.png", sizes: "192x192" }],
    },
    "https://example.com/app/"
  );
  const pass = InstallationPolicy.validatePolicy("https://example.com/app/dashboard", validManifest);
  assert.equal(pass.passed, true);

  const spoofedManifest = ManifestParser.parse(
    {
      name: "Phishing App",
      start_url: "https://attacker.com/login",
      scope: "https://attacker.com/",
      icons: [{ src: "/icon.png", sizes: "192x192" }],
    },
    "https://example.com"
  );
  const fail = InstallationPolicy.validatePolicy("https://example.com", spoofedManifest);
  assert.equal(fail.passed, false);
  assert.ok(fail.issues.some((i) => i.includes("origin")));
});
