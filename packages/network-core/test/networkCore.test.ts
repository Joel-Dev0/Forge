import test from "node:test";
import assert from "node:assert/strict";
import {
  DirectProvider,
  ProxyProvider,
  WireGuardProvider,
  NetworkManager,
} from "../src/index.ts";

test("DirectProvider works as expected", async () => {
  const provider = new DirectProvider({ ip: "1.2.3.4", country: "Colombia" });
  assert.equal(provider.mode, "direct");

  const initialStatus = await provider.getStatus();
  assert.equal(initialStatus.mode, "direct");
  assert.equal(initialStatus.state, "connected");
  assert.equal(initialStatus.location?.country, "Colombia");

  // Test alias GetStatus
  const aliasStatus = await provider.GetStatus!();
  assert.equal(aliasStatus.state, "connected");

  await provider.disconnect();
  const disconnected = await provider.getStatus();
  assert.equal(disconnected.state, "disconnected");
});

test("ProxyProvider formats Electron proxy rules correctly", async () => {
  const httpProxy = new ProxyProvider({
    protocol: "http",
    host: "127.0.0.1",
    port: 8080,
  });

  const httpRules = httpProxy.toElectronProxyRules();
  assert.equal(httpRules.proxyRules, "http://127.0.0.1:8080;https://127.0.0.1:8080");
  assert.ok(httpRules.proxyBypassRules.includes("<local>"));

  const socks5Proxy = new ProxyProvider({
    protocol: "socks5",
    host: "proxy.forge.internal",
    port: 1080,
    bypassRules: ["*.local", "192.168.1.*"],
  });

  const socks5Rules = socks5Proxy.toElectronProxyRules();
  assert.equal(socks5Rules.proxyRules, "socks5://proxy.forge.internal:1080");
  assert.ok(socks5Rules.proxyBypassRules.includes("*.local"));

  await socks5Proxy.connect();
  const status = await socks5Proxy.getStatus();
  assert.equal(status.state, "connected");
  assert.equal(status.activeConfig?.protocol, "socks5");
  assert.equal(status.activeConfig?.port, 1080);
});

test("ProxyProvider validates inputs", async () => {
  const invalid = new ProxyProvider({
    protocol: "http",
    host: "",
    port: 8080,
  });

  await assert.rejects(async () => {
    await invalid.connect();
  }, /Proxy host cannot be empty/);
});

test("WireGuardProvider provides Phase 3 readiness interface", async () => {
  const wg = new WireGuardProvider({
    endpoint: "vpn.example.com:51820",
    publicKey: "test-pubkey",
    privateKey: "test-privkey",
    address: "10.0.0.2/24",
  });

  assert.equal(wg.mode, "wireguard");
  const status = await wg.getStatus();
  assert.equal(status.mode, "wireguard");
  assert.equal(status.state, "disconnected");

  await assert.rejects(async () => {
    await wg.connect();
  }, /Invalid WireGuard/);
});

test("NetworkManager orchestrates provider switching and notifications", async () => {
  const manager = new NetworkManager();
  assert.equal(manager.getActiveMode(), "direct");

  let lastStatus: any = null;
  const unsubscribe = manager.onStatusChange((s) => {
    lastStatus = s;
  });

  const proxyStatus = await manager.switchProvider("proxy", {
    protocol: "socks5",
    host: "127.0.0.1",
    port: 9050,
  });

  assert.equal(manager.getActiveMode(), "proxy");
  assert.equal(proxyStatus.mode, "proxy");
  assert.equal(proxyStatus.state, "connected");
  assert.equal(lastStatus?.mode, "proxy");

  const reverted = await manager.disconnect();
  assert.equal(manager.getActiveMode(), "direct");
  assert.equal(reverted.mode, "direct");
  assert.equal(reverted.state, "connected");

  unsubscribe();
});
