import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpsValidator,
  CertificateValidator,
  RedirectAnalyzer,
  OriginValidator,
  LocalDevPolicy,
} from "../src/index.ts";

test("HttpsValidator enforces HTTPS on public domains", () => {
  const secure = HttpsValidator.validate("https://example.com/app");
  assert.equal(secure.isSecure, true);
  assert.equal(secure.issues.length, 0);

  const insecure = HttpsValidator.validate("http://example.com/app");
  assert.equal(insecure.isSecure, false);
  assert.ok(insecure.issues.some((i) => i.includes("Public unencrypted HTTP")));

  const fileProto = HttpsValidator.validate("file:///C:/test.html");
  assert.equal(fileProto.isSecure, false);
});

test("HttpsValidator permits localhost HTTP under local policy", () => {
  const local = HttpsValidator.validate("http://localhost:3000/app");
  assert.equal(local.isSecure, true);
  assert.equal(local.isLocal, true);

  const localIp = HttpsValidator.validate("http://127.0.0.1:8080");
  assert.equal(localIp.isSecure, true);
  assert.equal(localIp.isLocal, true);
});

test("CertificateValidator detects invalid/expired certificates", () => {
  const valid = CertificateValidator.validate(
    {
      issuer: "Let's Encrypt",
      subject: "example.com",
      validFrom: Date.now() - 100000,
      validTo: Date.now() + 100000,
    },
    "https://example.com"
  );
  assert.equal(valid.isValid, true);

  const expired = CertificateValidator.validate(
    {
      issuer: "Let's Encrypt",
      validFrom: Date.now() - 200000,
      validTo: Date.now() - 1000,
    },
    "https://example.com"
  );
  assert.equal(expired.isValid, false);
  assert.ok(expired.reasons.some((r) => r.includes("expired")));

  const errorCert = CertificateValidator.validate(
    {
      error: "net::ERR_CERT_COMMON_NAME_INVALID",
    },
    "https://example.com"
  );
  assert.equal(errorCert.isValid, false);
});

test("RedirectAnalyzer detects HTTPS to HTTP downgrade", () => {
  const safeChain = RedirectAnalyzer.analyze(
    [
      { url: "https://example.com", protocol: "https:", origin: "https://example.com" },
      { url: "https://example.com/app", protocol: "https:", origin: "https://example.com" },
    ],
    "https://example.com/app"
  );
  assert.equal(safeChain.isSafe, true);
  assert.equal(safeChain.downgradedToHttp, false);

  const downgradeChain = RedirectAnalyzer.analyze(
    [
      { url: "https://example.com", protocol: "https:", origin: "https://example.com" },
      { url: "http://insecure.example.com", protocol: "http:", origin: "http://insecure.example.com" },
    ],
    "http://insecure.example.com"
  );
  assert.equal(downgradeChain.isSafe, false);
  assert.equal(downgradeChain.downgradedToHttp, true);
});

test("OriginValidator checks scope matching", () => {
  assert.equal(
    OriginValidator.isWithinScope("https://example.com/app/dashboard", "https://example.com/app/"),
    true
  );
  assert.equal(
    OriginValidator.isWithinScope("https://example.com/other", "https://example.com/app/"),
    false
  );
  assert.equal(
    OriginValidator.isWithinScope("https://evil.com/app/dashboard", "https://example.com/app/"),
    false
  );
});
