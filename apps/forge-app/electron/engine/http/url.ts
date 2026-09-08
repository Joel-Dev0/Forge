export interface ParsedHttpUrl {
  protocol: "http:" | "https:";
  hostname: string;
  port: number;
  path: string;
  isTls: boolean;
  href: string;
}

export function parseHttpUrl(input: string): ParsedHttpUrl {
  let raw = input.trim();
  if (!raw) throw new Error("URL cannot be empty");

  if (!/^https?:\/\//i.test(raw)) {
    if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) {
      raw = `http://${raw}`;
    } else {
      raw = `https://${raw}`;
    }
  }

  const parsed = new URL(raw);
  const protocol = parsed.protocol.toLowerCase() as "http:" | "https:";
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Forge HTTP Engine supports http: and https:`);
  }

  const isTls = protocol === "https:";
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : isTls
      ? 443
      : 80;

  const path = `${parsed.pathname || "/"}${parsed.search || ""}`;

  return {
    protocol,
    hostname: parsed.hostname,
    port,
    path,
    isTls,
    href: parsed.href,
  };
}
