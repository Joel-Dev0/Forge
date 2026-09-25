import test from "node:test";
import assert from "node:assert/strict";
import { TorManager, TorConnection } from "../src/index.ts";

test("TorConnection relay generation", () => {
  const circuit = TorConnection.createRandomCircuit();

  assert.ok(circuit.id.startsWith("circuit_"));
  assert.equal(circuit.nodes.length, 3);
  assert.equal(circuit.nodes[0].type, "guard");
  assert.equal(circuit.nodes[1].type, "relay");
  assert.equal(circuit.nodes[2].type, "exit");
  assert.ok(circuit.buildDurationMs > 0);
  assert.ok(circuit.nodes[0].country);
  assert.ok(circuit.nodes[2].country);
});

test("TorManager bootstrap state progression", async () => {
  const manager = new TorManager();
  const statesRecorded: string[] = [];

  manager.events.onStateChanged((state) => {
    statesRecorded.push(state);
  });

  assert.equal(manager.getStatus().state, "DISCONNECTED");

  await manager.connect();

  assert.equal(manager.getStatus().state, "CONNECTED");
  assert.ok(statesRecorded.includes("STARTING"));
  assert.ok(statesRecorded.includes("CONNECTING"));
  assert.ok(statesRecorded.includes("CONNECTED"));

  const initialCircuit = manager.getStatus().circuit;
  assert.ok(initialCircuit);
  assert.equal(initialCircuit?.nodes.length, 3);

  // Rotate circuit
  const newCirc = await manager.newCircuit();
  assert.notEqual(newCirc.id, initialCircuit?.id);

  // Stop manager
  await manager.disconnect();
  assert.equal(manager.getStatus().state, "DISCONNECTED");
});
