import { type TorCircuit, type TorCircuitNode } from "./TorState.ts";

export const SAMPLE_TOR_RELAYS: TorCircuitNode[] = [
  // Guards
  { name: "flokinetGuard", ip: "185.100.86.102", country: "Iceland", countryCode: "IS", type: "guard", fingerprint: "9B54A71295D31D4536780C94821F23B890A45321" },
  { name: "torserversCH", ip: "179.43.142.221", country: "Switzerland", countryCode: "CH", type: "guard", fingerprint: "47A2BC9081E2749A5012354BF820E942B590AC34" },
  { name: "dfriGuard01", ip: "193.187.91.44", country: "Sweden", countryCode: "SE", type: "guard", fingerprint: "E385B921049AC7815F8301B79E1029C8571029BA" },
  { name: "calyxGuard", ip: "162.247.74.200", country: "United States", countryCode: "US", type: "guard", fingerprint: "5C89A1209B658C90218E90128B47C590E8912AC4" },

  // Relays (Middle)
  { name: "cccRelayBerlin", ip: "195.201.34.19", country: "Germany", countryCode: "DE", type: "relay", fingerprint: "28B5C91029581AC94820184712059AB1294875BC" },
  { name: "relaysNL03", ip: "94.142.241.111", country: "Netherlands", countryCode: "NL", type: "relay", fingerprint: "81049AB75C9102948175BC90184712059AB12948" },
  { name: "privacyNodeFR", ip: "51.15.82.13", country: "France", countryCode: "FR", type: "relay", fingerprint: "194875BC90184712059AB1294881049AB75C9102" },
  { name: "nordicRelayFI", ip: "95.216.14.77", country: "Finland", countryCode: "FI", type: "relay", fingerprint: "75BC90184712059AB1294881049AB75C91021948" },

  // Exits
  { name: "privacyFoundationExit", ip: "185.220.101.5", country: "Germany", countryCode: "DE", type: "exit", fingerprint: "F90184712059AB1294881049AB75C9102194875B" },
  { name: "swissExit02", ip: "185.220.100.252", country: "Switzerland", countryCode: "CH", type: "exit", fingerprint: "AB1294881049AB75C9102194875BF90184712059" },
  { name: "civisExitNL", ip: "185.220.102.8", country: "Netherlands", countryCode: "NL", type: "exit", fingerprint: "049AB75C9102194875BF90184712059AB1294881" },
  { name: "noNameExitRO", ip: "185.220.103.11", country: "Romania", countryCode: "RO", type: "exit", fingerprint: "75C9102194875BF90184712059AB1294881049AB" },
];

export class TorConnection {
  public static createRandomCircuit(): TorCircuit {
    const guards = SAMPLE_TOR_RELAYS.filter((r) => r.type === "guard");
    const relays = SAMPLE_TOR_RELAYS.filter((r) => r.type === "relay");
    const exits = SAMPLE_TOR_RELAYS.filter((r) => r.type === "exit");

    const guard = guards[Math.floor(Math.random() * guards.length)];
    const relay = relays[Math.floor(Math.random() * relays.length)];
    const exit = exits[Math.floor(Math.random() * exits.length)];

    return {
      id: `circuit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nodes: [guard, relay, exit],
      establishedAt: Date.now(),
      buildDurationMs: 450 + Math.floor(Math.random() * 350),
    };
  }
}
