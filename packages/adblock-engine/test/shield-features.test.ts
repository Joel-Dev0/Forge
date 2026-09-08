import test from "node:test";
import assert from "node:assert/strict";
import { AdBlockEngine, stripTrackingParameters } from "../src/index.ts";

test("Shield Features - Malvertising Protection", () => {
  const engine = new AdBlockEngine(true);

  // CoinHive cryptominer should be blocked
  const res1 = engine.match({
    url: "https://coinhive.com/lib/coinhive.min.js",
    resourceType: "script",
    sourceUrl: "https://some-compromised-site.com",
  });
  assert.equal(res1.blocked, true);
  assert.equal(res1.category, "malvertising");
  assert.equal(res1.listId, "malvertising");

  // CryptoLoot script
  const res2 = engine.match({
    url: "https://crypto-loot.com/token.js",
    resourceType: "script",
  });
  assert.equal(res2.blocked, true);
  assert.equal(res2.category, "malvertising");

  // Popcash redirector
  const res3 = engine.match({
    url: "https://popcash.net/show.php",
    resourceType: "subdocument",
  });
  assert.equal(res3.blocked, true);
  assert.equal(res3.category, "malvertising");

  // If Malvertising protection is toggled OFF, cryptominer is allowed
  engine.setFeatureEnabled("malvertisingProtection", false);
  const resDisabled = engine.match({
    url: "https://coinhive.com/lib/coinhive.min.js",
    resourceType: "script",
  });
  assert.equal(resDisabled.blocked, false);

  // But ad block and tracker protection should still work
  const resAd = engine.match({
    url: "https://ad.doubleclick.net/adj/test",
    resourceType: "script",
  });
  assert.equal(resAd.blocked, true);
  assert.equal(resAd.category, "ad");
});

test("Shield Features - Tracker Protection & Parameter Stripping", () => {
  // Query parameter stripping test
  const dirtyUrl = "https://example.com/product?item=42&utm_source=newsletter&utm_medium=email&fbclid=IwAR123456&gclid=Cj0KCQj&custom_arg=keep_me";
  const result = stripTrackingParameters(dirtyUrl);
  assert.ok(result.strippedParams.length >= 4);
  assert.ok(!result.cleanUrl.includes("utm_source"));
  assert.ok(!result.cleanUrl.includes("utm_medium"));
  assert.ok(!result.cleanUrl.includes("fbclid"));
  assert.ok(!result.cleanUrl.includes("gclid"));
  assert.ok(result.cleanUrl.includes("item=42"));
  assert.ok(result.cleanUrl.includes("custom_arg=keep_me"));

  // Clean URL without tracking params returns empty strippedParams
  const alreadyClean = "https://example.com/page?query=search&sort=asc";
  const cleanResult = stripTrackingParameters(alreadyClean);
  assert.equal(cleanResult.strippedParams.length, 0);
  assert.equal(cleanResult.cleanUrl, alreadyClean);

  // Engine feature toggle test
  const engine = new AdBlockEngine(true);
  engine.setFeatureEnabled("trackerProtection", false);

  // EasyPrivacy rule allowed when trackerProtection is false
  const resTracker = engine.match({
    url: "https://www.google-analytics.com/analytics.js",
    resourceType: "script",
  });
  assert.equal(resTracker.blocked, false);

  // EasyList rule still blocked
  const resAd = engine.match({
    url: "https://ad.doubleclick.net/adj/test",
    resourceType: "script",
  });
  assert.equal(resAd.blocked, true);
});

test("Shield Features - Custom Rules Management & Import/Export", () => {
  const engine = new AdBlockEngine(false);

  // 1. Add user rule
  const rule = engine.addUserRule("||custom-annoyance.io^");
  assert.ok(rule);
  assert.equal(rule.category, "custom");

  const match1 = engine.match({ url: "https://custom-annoyance.io/popup.js" });
  assert.equal(match1.blocked, true);
  assert.equal(match1.category, "custom");

  // 2. Toggle custom rule disabled
  const toggledState = engine.toggleCustomRule(rule.id, false);
  assert.equal(toggledState, false);
  assert.equal(engine.getCustomRules().find(r => r.id === rule.id)?.enabled, false);

  const matchDisabled = engine.match({ url: "https://custom-annoyance.io/popup.js" });
  assert.equal(matchDisabled.blocked, false);

  // 3. Toggle custom rule back on
  const reEnabledState = engine.toggleCustomRule(rule.id, true);
  assert.equal(reEnabledState, true);
  const matchReEnabled = engine.match({ url: "https://custom-annoyance.io/popup.js" });
  assert.equal(matchReEnabled.blocked, true);

  // 4. Toggle entire customRules feature OFF
  engine.setFeatureEnabled("customRules", false);
  const matchFeatureOff = engine.match({ url: "https://custom-annoyance.io/popup.js" });
  assert.equal(matchFeatureOff.blocked, false);

  // 5. Export rules
  engine.addUserRule("||another-ad.org^");
  const exported = engine.exportRules();
  assert.ok(exported.includes("||custom-annoyance.io^"));
  assert.ok(exported.includes("||another-ad.org^"));

  // 6. Import rules into new engine
  const freshEngine = new AdBlockEngine(false);
  const importResult = freshEngine.importRules(exported);
  assert.equal(importResult.imported, 2);
  assert.equal(freshEngine.getCustomRules().length, 2);
});

test("Shield Features - Detailed Statistics Breakdown", () => {
  const engine = new AdBlockEngine(true);

  // Perform multiple blocks across categories
  engine.match({ url: "https://ad.doubleclick.net/banner.js", resourceType: "script" });
  engine.match({ url: "https://ad.doubleclick.net/ad2.js", resourceType: "script" });
  engine.match({ url: "https://www.google-analytics.com/analytics.js", resourceType: "script" });
  engine.match({ url: "https://coinhive.com/miner.js", resourceType: "script" });

  const stats = engine.getDetailedStats();
  assert.equal(stats.blockedCount, 4);
  assert.equal(stats.byCategory.ad, 2);
  assert.equal(stats.byCategory.tracker, 1);
  assert.equal(stats.byCategory.malvertising, 1);
  assert.equal(stats.byCategory.custom, 0);
  assert.ok(stats.estimatedBandwidthSavedBytes > 0);
  assert.ok(stats.estimatedTimeSavedMs > 0);

  // Top domains should rank doubleclick.net first
  assert.ok(stats.topDomains.length >= 2);
  assert.equal(stats.topDomains[0].domain, "ad.doubleclick.net");
  assert.equal(stats.topDomains[0].count, 2);
});
