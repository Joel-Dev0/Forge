import test from "node:test";
import assert from "node:assert/strict";
import { PrivacyManager, PRIVATE_PRIVACY_POLICY, TOR_PRIVACY_POLICY } from "../src/index.ts";

test("PrivacyPolicy configuration", () => {
  assert.equal(PRIVATE_PRIVACY_POLICY.mode, "private");
  assert.equal(PRIVATE_PRIVACY_POLICY.allowPersistentStorage, false);
  assert.equal(PRIVATE_PRIVACY_POLICY.allowPersistentCookies, false);
  assert.equal(PRIVATE_PRIVACY_POLICY.allowHistoryRecording, false);
  assert.equal(PRIVATE_PRIVACY_POLICY.allowDownloadHistory, false);
  assert.equal(PRIVATE_PRIVACY_POLICY.allowExtensions, false);

  assert.equal(TOR_PRIVACY_POLICY.mode, "tor");
  assert.equal(TOR_PRIVACY_POLICY.allowPersistentStorage, false);
  assert.equal(TOR_PRIVACY_POLICY.webRtcIPHandlingPolicy, "disable_non_proxied_udp");
  assert.equal(TOR_PRIVACY_POLICY.allowExtensions, false);
});

test("PrivateSession creation and RAM partition naming", () => {
  const manager = PrivacyManager.getInstance();

  const privSess = manager.createPrivateSession("private", "Test Private");
  assert.equal(privSess.mode, "private");
  assert.equal(privSess.temporary, true);
  assert.ok(privSess.partition.startsWith("private_session_"));
  assert.ok(!privSess.partition.startsWith("persist:"));

  const torSess = manager.createPrivateSession("tor", "Test Tor");
  assert.equal(torSess.mode, "tor");
  assert.equal(torSess.temporary, true);
  assert.ok(torSess.partition.startsWith("tor_session_"));
  assert.ok(!torSess.partition.startsWith("persist:"));
});

test("PrivateSession lifecycle destruction on last tab close", async () => {
  const manager = PrivacyManager.getInstance();
  let cleanedPartition = "";

  manager.setCleanupHandler(async (partition) => {
    cleanedPartition = partition;
  });

  const sess = manager.createPrivateSession("private", "Ephemeral Tab Test");
  manager.registerTab(sess.id);
  manager.registerTab(sess.id);

  assert.equal(sess.activeTabCount, 2);

  // Close first tab -> session stays alive
  const destroyed1 = await manager.unregisterTab(sess.id);
  assert.equal(destroyed1, false);
  assert.equal(sess.activeTabCount, 1);
  assert.equal(cleanedPartition, "");

  // Close second (last) tab -> session destroyed and cleanup handler triggered
  const destroyed2 = await manager.unregisterTab(sess.id);
  assert.equal(destroyed2, true);
  assert.equal(sess.activeTabCount, 0);
  assert.equal(cleanedPartition, sess.partition);
  assert.equal(manager.getSession(sess.id), undefined);
});
