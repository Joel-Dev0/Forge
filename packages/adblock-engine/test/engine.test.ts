import test from "node:test";
import assert from "node:assert/strict";
import { AdBlockEngine } from "../src/index.ts";

test("AdBlockEngine - Standard EasyList and EasyPrivacy blocking", () => {
  const engine = new AdBlockEngine(true);

  // 1. DoubleClick ad script should be blocked
  const res1 = engine.match({
    url: "https://ad.doubleclick.net/adj/name;sz=300x250;tile=1;ord=123456789?",
    resourceType: "script",
    sourceUrl: "https://news.example.com/article",
  });
  assert.equal(res1.blocked, true);
  assert.equal(res1.listId, "easylist");

  // 2. Google Analytics tracking should be blocked
  const res2 = engine.match({
    url: "https://www.google-analytics.com/analytics.js",
    resourceType: "script",
    sourceUrl: "https://mysite.com",
  });
  assert.equal(res2.blocked, true);
  assert.equal(res2.listId, "easyprivacy");

  // 3. Normal website assets and APIs should be ALLOWED
  const res3 = engine.match({
    url: "https://api.example.com/v1/user/profile",
    resourceType: "xhr",
    sourceUrl: "https://example.com",
  });
  assert.equal(res3.blocked, false);

  const res4 = engine.match({
    url: "https://cdn.jsdelivr.net/npm/react@19/umd/react.production.min.js",
    resourceType: "script",
    sourceUrl: "https://example.com",
  });
  assert.equal(res4.blocked, false);
});

test("AdBlockEngine - Exception rules (@@) override block rules", () => {
  const engine = new AdBlockEngine(true);

  // Initially blocked
  const before = engine.match({
    url: "https://adservice.google.com/adsid/google/ui",
    resourceType: "script",
  });
  assert.equal(before.blocked, true);

  // Add user exception rule
  const exc = engine.addUserRule("@@||adservice.google.com^");
  assert.ok(exc);

  // Now should be allowed due to exception
  const after = engine.match({
    url: "https://adservice.google.com/adsid/google/ui",
    resourceType: "script",
  });
  assert.equal(after.blocked, false);
  assert.match(after.reason || "", /exception/i);
});

test("AdBlockEngine - Custom user rules and removal", () => {
  const engine = new AdBlockEngine(false); // No presets

  const rule = engine.addUserRule("||annoying-tracker.org^");
  assert.ok(rule);

  const match1 = engine.match({
    url: "https://sub.annoying-tracker.org/log?user=123",
  });
  assert.equal(match1.blocked, true);

  // Remove rule
  const removed = engine.removeUserRule(rule.id);
  assert.equal(removed, true);

  const match2 = engine.match({
    url: "https://sub.annoying-tracker.org/log?user=123",
  });
  assert.equal(match2.blocked, false);
});

test("AdBlockEngine - Resource type filtering ($script)", () => {
  const engine = new AdBlockEngine(false);
  engine.addUserRule("||sample-ads.com^$script");

  // Script is blocked
  const scriptRes = engine.match({
    url: "https://sample-ads.com/lib.js",
    resourceType: "script",
  });
  assert.equal(scriptRes.blocked, true);

  // Image is allowed
  const imageRes = engine.match({
    url: "https://sample-ads.com/logo.png",
    resourceType: "image",
  });
  assert.equal(imageRes.blocked, false);
});

test("AdBlockEngine - Third-party filtering ($third-party)", () => {
  const engine = new AdBlockEngine(false);
  engine.addUserRule("||widget-share.com^$third-party");

  // Third party request (source is different origin)
  const tpRes = engine.match({
    url: "https://widget-share.com/btn.js",
    sourceUrl: "https://myblog.org/post/1",
  });
  assert.equal(tpRes.blocked, true);

  // First party request (source is same origin)
  const fpRes = engine.match({
    url: "https://widget-share.com/btn.js",
    sourceUrl: "https://widget-share.com/dashboard",
  });
  assert.equal(fpRes.blocked, false);
});

test("AdBlockEngine - Global toggle & list toggle", () => {
  const engine = new AdBlockEngine(true);

  // Turn off globally
  engine.setEnabled(false);
  const disabledRes = engine.match({
    url: "https://ad.doubleclick.net/ad.js",
  });
  assert.equal(disabledRes.blocked, false);

  // Turn on globally
  engine.setEnabled(true);
  const enabledRes = engine.match({
    url: "https://ad.doubleclick.net/ad.js",
  });
  assert.equal(enabledRes.blocked, true);

  // Disable only easylist
  engine.toggleList("easylist", false);
  const listDisabledRes = engine.match({
    url: "https://ad.doubleclick.net/ad.js",
  });
  assert.equal(listDisabledRes.blocked, false);

  // But easyprivacy is still active
  const privacyRes = engine.match({
    url: "https://www.google-analytics.com/analytics.js",
  });
  assert.equal(privacyRes.blocked, true);
});

test("AdBlockEngine - YouTube Ad Blocking & Cosmetic/Scriptlet Generation", () => {
  const engine = new AdBlockEngine(true);

  // 1. YouTube ad tracking and stats requests should be blocked
  const res1 = engine.match({
    url: "https://www.youtube.com/api/stats/ads?ns=yt&el=detailpage",
    resourceType: "xhr",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.equal(res1.blocked, true);

  const res2 = engine.match({
    url: "https://www.youtube.com/pagead/parallel_ad_stream?format=json",
    resourceType: "xhr",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.equal(res2.blocked, true);

  const res3 = engine.match({
    url: "https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-test",
    resourceType: "script",
    sourceUrl: "https://www.youtube.com",
  });
  assert.equal(res3.blocked, true);

  // 2. Normal YouTube video playback and navigation should be ALLOWED
  const resNormal = engine.match({
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    resourceType: "document",
  });
  assert.equal(resNormal.blocked, false);

  // 3. Cosmetic CSS & Scriptlets
  const ytCss = engine.getCosmeticCSS("https://www.youtube.com/watch?v=123");
  assert.ok(ytCss.includes("ytd-promoted-video-renderer"));
  assert.ok(ytCss.includes("display: none !important"));
  assert.ok(ytCss.includes("ytd-rich-item-renderer:has(ytd-ad-slot-renderer)"));
  assert.ok(ytCss.includes("ytd-banner-promo-renderer:hover"));
  assert.ok(ytCss.includes("pointer-events: none !important"));
  assert.ok(!ytCss.includes("ytd-rich-section-renderer:has"));
  assert.ok(!ytCss.includes("ytd-rich-grid-row:has"));

  const ytScriptlet = engine.getScriptlet("https://www.youtube.com/watch?v=123");
  assert.ok(ytScriptlet.includes("adPlacements"));
  assert.ok(ytScriptlet.includes("ad-showing"));
  assert.ok(ytScriptlet.includes("ytp-ad-skip-button"));
  assert.ok(ytScriptlet.includes("cleanYouTubeAdBannersAndHovers"));
  assert.ok(ytScriptlet.includes("filterAdArrays"));
  assert.ok(!ytScriptlet.includes(".remove()"));
  assert.ok(!ytScriptlet.includes("richSectionRenderer"));
});

test("AdBlockEngine - uBlock Quick Fixes and dynamic list content updates", () => {
  const engine = new AdBlockEngine(true);

  // uBlock Quick Fixes should block anti-adblock detection script
  const res1 = engine.match({
    url: "https://detectadblock.com/anti-block.js",
  });
  assert.equal(res1.blocked, true);
  assert.equal(res1.listId, "quickfixes");

  // Dynamic list update
  const updated = engine.updateListContent("quickfixes", "||new-ad-tracker.youtube.com^\n||youtube.com/api/stats/ads");
  assert.equal(updated, true);

  const res2 = engine.match({
    url: "https://new-ad-tracker.youtube.com/collect",
  });
  assert.equal(res2.blocked, true);
  assert.equal(res2.listId, "quickfixes");
});

test("AdBlockEngine - Normalization and safety for user-added site/page rules", () => {
  const engine = new AdBlockEngine(false);

  // 1. Plain domain input "badsite.com" should be normalized to domain rule
  const domainRule = engine.addUserRule("badsite.com");
  assert.ok(domainRule);
  assert.equal(domainRule.domain, "badsite.com");

  // Should block badsite.com
  assert.equal(engine.match({ url: "https://badsite.com/home" }).blocked, true);
  assert.equal(engine.match({ url: "https://sub.badsite.com/api" }).blocked, true);
  // Should NOT block other sites like goodsite.com
  assert.equal(engine.match({ url: "https://goodsite.com/home" }).blocked, false);

  // 2. Overly broad / dangerous rules should be REJECTED (return null)
  assert.equal(engine.addUserRule("*"), null);
  assert.equal(engine.addUserRule("/*"), null);
  assert.equal(engine.addUserRule("/"), null);
  assert.equal(engine.addUserRule("^"), null);
  assert.equal(engine.addUserRule("||"), null);
  assert.equal(engine.addUserRule("||*"), null);
  assert.equal(engine.addUserRule("||^"), null);
  assert.equal(engine.addUserRule("|"), null);
  assert.equal(engine.addUserRule("https://"), null);
  assert.equal(engine.addUserRule("www."), null);

  // 3. Specific URL blocking: should block ONLY that page, NOT other pages on the site
  const specificRule = engine.addUserRule("|https://mysite.com/blocked-page|");
  assert.ok(specificRule);

  // Blocked page
  assert.equal(engine.match({ url: "https://mysite.com/blocked-page" }).blocked, true);
  // Allowed page on the same domain
  assert.equal(engine.match({ url: "https://mysite.com/allowed-page" }).blocked, false);
  assert.equal(engine.match({ url: "https://mysite.com/" }).blocked, false);
});

test("AdBlockEngine - General ad rules do not block mainFrame page loads", () => {
  const engine = new AdBlockEngine(true);

  // A page URL containing "ads" in its path (e.g. news article about advertising)
  // Should NOT be blocked when navigated as mainFrame
  const mainDocRes = engine.match({
    url: "https://news.example.com/tech/2026/ads-trends-report.html",
    resourceType: "mainFrame",
  });
  assert.equal(mainDocRes.blocked, false);

  // But an embedded ad banner or script on that page IS blocked
  const subresourceRes = engine.match({
    url: "https://ad.doubleclick.net/ad.js",
    resourceType: "script",
    sourceUrl: "https://news.example.com/tech/2026/ads-trends-report.html",
  });
  assert.equal(subresourceRes.blocked, true);
});

test("AdBlockEngine - Popup and new tab ad blocking ($popup)", () => {
  const engine = new AdBlockEngine(true);

  // Popunder / popup ad network rule
  const popupMatch = engine.match({
    url: "https://adsterra.com/click.php?zoneid=123",
    resourceType: "popup",
    sourceUrl: "https://free-movies.stream/watch",
  });
  assert.equal(popupMatch.blocked, true);

  // Even if it navigates as mainFrame in a new tab, $popup rules and malvertising rules catch it
  const navMatch = engine.match({
    url: "https://monetag.com/out.php?id=999",
    resourceType: "mainFrame",
    sourceUrl: "https://free-movies.stream/watch",
  });
  assert.equal(navMatch.blocked, true);

  // Normal non-ad link opened in a new tab is allowed
  const normalMatch = engine.match({
    url: "https://en.wikipedia.org/wiki/Open-source_software",
    resourceType: "popup",
    sourceUrl: "https://tech-blog.com/post/1",
  });
  assert.equal(normalMatch.blocked, false);
});


