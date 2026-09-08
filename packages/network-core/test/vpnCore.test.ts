import test from "node:test";
import assert from "node:assert/strict";
import {
  WireGuardConfigParser,
  WireGuardProvider,
  VpnManager,
  DEFAULT_VPN_LOCATIONS,
} from "../src/index.ts";

const SAMPLE_WG_CONF = `
[Interface]
PrivateKey = aP94sD234kdjfn39vksjflsdjflskjdfkljsdf234=
Address = 10.2.0.2/32, fd00::2/128
DNS = 1.1.1.1, 8.8.8.8
MTU = 1420

[Peer]
PublicKey = kL89sD234kdjfn39vksjflsdjflskjdfkljsdf890=
PresharedKey = pK12sD234kdjfn39vksjflsdjflskjdfkljsdf123=
Endpoint = 198.51.100.50:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;

test("WireGuardConfigParser parses standard .conf format accurately", () => {
  const config = WireGuardConfigParser.parse(SAMPLE_WG_CONF);
  assert.equal(config.endpoint, "198.51.100.50:51820");
  assert.equal(config.privateKey, "aP94sD234kdjfn39vksjflsdjflskjdfkljsdf234=");
  assert.equal(config.publicKey, "kL89sD234kdjfn39vksjflsdjflskjdfkljsdf890=");
  assert.equal(config.presharedKey, "pK12sD234kdjfn39vksjflsdjflskjdfkljsdf123=");
  assert.equal(config.address, "10.2.0.2/32, fd00::2/128");
  assert.equal(config.mtu, 1420);
  assert.equal(config.persistentKeepalive, 25);
  assert.deepEqual(config.dns, ["1.1.1.1", "8.8.8.8"]);
});

test("WireGuardConfigParser serializes back to valid WireGuard .conf text", () => {
  const config = WireGuardConfigParser.parse(SAMPLE_WG_CONF);
  const serialized = WireGuardConfigParser.serialize(config);
  assert.ok(serialized.includes("[Interface]"));
  assert.ok(serialized.includes("[Peer]"));
  assert.ok(serialized.includes("Endpoint = 198.51.100.50:51820"));

  // Re-parse serialized output
  const reParsed = WireGuardConfigParser.parse(serialized);
  assert.equal(reParsed.endpoint, config.endpoint);
  assert.equal(reParsed.privateKey, config.privateKey);
});

test("WireGuardConfigParser rejects invalid configurations", () => {
  assert.throws(() => {
    WireGuardConfigParser.parse("[Interface]\nAddress = 10.0.0.1/32\n");
  }, /Missing required 'PrivateKey'/);

  assert.throws(() => {
    WireGuardConfigParser.parse("[Interface]\nPrivateKey = abc\n[Peer]\nPublicKey = def\n");
  }, /Missing required 'Endpoint'/);
});

test("WireGuardProvider validates keys and handles connection lifecycle", async () => {
  const validConfig = WireGuardConfigParser.parse(SAMPLE_WG_CONF);
  const provider = new WireGuardProvider(validConfig);

  assert.equal(provider.mode, "wireguard");
  const initialStatus = await provider.getStatus();
  assert.equal(initialStatus.state, "disconnected");

  // Connect
  await provider.connect();
  const connectedStatus = await provider.getStatus();
  assert.equal(connectedStatus.state, "connected");
  assert.ok(connectedStatus.connectedSince! > 0);

  const metrics = provider.getMetrics();
  assert.ok(metrics.bytesReceived > 0);
  assert.ok(metrics.bytesSent > 0);
  assert.ok(metrics.lastHandshake! > 0);

  // Disconnect
  await provider.disconnect();
  const disconnectedStatus = await provider.getStatus();
  assert.equal(disconnectedStatus.state, "disconnected");
});

test("WireGuardProvider throws descriptive error on invalid keys", async () => {
  const badKeyConfig = {
    endpoint: "1.2.3.4:51820",
    privateKey: "too-short",
    publicKey: "kL89sD234kdjfn39vksjflsdjflskjdfkljsdf890=",
    address: "10.0.0.2/32",
  };
  const provider = new WireGuardProvider(badKeyConfig);
  await assert.rejects(async () => {
    await provider.connect();
  }, /Invalid WireGuard PrivateKey/);
});

test("VpnManager manages profiles, locations, and Kill Switch", async () => {
  const manager = new VpnManager();

  // Check default locations and profiles
  const locations = manager.getLocations();
  assert.equal(locations.length, DEFAULT_VPN_LOCATIONS.length);
  const profiles = manager.getProfiles();
  assert.ok(profiles.length >= locations.length);

  // Kill Switch behavior
  const ksOn = manager.setKillSwitch(true);
  assert.equal(ksOn.killSwitchEnabled, true);
  // When disconnected and kill switch is enabled, killSwitchEngaged is true
  assert.equal(ksOn.killSwitchEngaged, true);

  // Location selection
  const locStatus = await manager.selectLocation("loc-nl-ams");
  assert.equal(manager.getSelectedLocation()?.country, "Netherlands");

  // Import custom profile
  const imported = manager.importConfig(SAMPLE_WG_CONF, "Mullvad US Test");
  assert.equal(imported.name, "Mullvad US Test");
  assert.equal(manager.getActiveProfile()?.id, imported.id);

  // Export config
  const exported = manager.exportConfig(imported.id);
  assert.ok(exported.includes(imported.config.publicKey));

  // Connect via manager
  const connStatus = await manager.connect();
  assert.equal(connStatus.state, "connected");
  // When connected, killSwitchEngaged is false (traffic allowed through tunnel)
  assert.equal(connStatus.killSwitchEngaged, false);

  // Disconnect
  const disconnStatus = await manager.disconnect();
  assert.equal(disconnStatus.state, "disconnected");
  // When disconnected again, killSwitchEngaged becomes true
  assert.equal(disconnStatus.killSwitchEngaged, true);

  manager.setKillSwitch(false);
  assert.equal(manager.getStatus().killSwitchEngaged, false);
});
