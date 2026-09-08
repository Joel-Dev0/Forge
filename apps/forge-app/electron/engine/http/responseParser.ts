import zlib from "node:zlib";

export interface ParsedHeaders {
  raw: string;
  httpVersion: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  isChunked: boolean;
  contentLength: number | null;
  contentEncoding?: string;
  contentType?: string;
}

export function parseHeaderBlock(headerStr: string): ParsedHeaders {
  const lines = headerStr.split(/\r?\n/);
  const statusLine = lines[0] || "";
  const match = statusLine.match(/^(HTTP\/\d\.\d)\s+(\d{3})(?:\s+(.*))?$/i);

  if (!match) {
    throw new Error(`Malformed HTTP status line: "${statusLine}"`);
  }

  const httpVersion = match[1].toUpperCase();
  const status = parseInt(match[2], 10);
  const statusText = match[3] ? match[3].trim() : "";

  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();
      if (headers[key]) {
        headers[key] = `${headers[key]}, ${val}`;
      } else {
        headers[key] = val;
      }
    }
  }

  const transferEncoding = headers["transfer-encoding"]?.toLowerCase() || "";
  const isChunked = transferEncoding.includes("chunked");

  let contentLength: number | null = null;
  if (headers["content-length"]) {
    const parsedLen = parseInt(headers["content-length"], 10);
    if (!isNaN(parsedLen)) contentLength = parsedLen;
  }

  return {
    raw: headerStr,
    httpVersion,
    status,
    statusText,
    headers,
    isChunked,
    contentLength,
    contentEncoding: headers["content-encoding"],
    contentType: headers["content-type"],
  };
}

export function decodeChunked(buffer: Buffer): { data: Buffer; isComplete: boolean } {
  const chunks: Buffer[] = [];
  let offset = 0;
  let isComplete = false;

  while (offset < buffer.length) {
    const crlf = buffer.indexOf("\r\n", offset);
    if (crlf === -1) break;

    const line = buffer.subarray(offset, crlf).toString("ascii").trim();
    const lenStr = line.split(";")[0].trim();
    const len = parseInt(lenStr, 16);

    if (isNaN(len)) {
      break;
    }

    if (len === 0) {
      isComplete = true;
      break;
    }

    const chunkStart = crlf + 2;
    const chunkEnd = chunkStart + len;
    if (chunkEnd > buffer.length) {
      // Needs more data from socket
      break;
    }

    chunks.push(buffer.subarray(chunkStart, chunkEnd));
    offset = chunkEnd + 2; // skip CRLF
  }

  return {
    data: Buffer.concat(chunks),
    isComplete,
  };
}

export function decompressBody(body: Buffer, encoding?: string): Buffer {
  if (!encoding || body.length === 0) return body;
  const enc = encoding.toLowerCase().trim();
  try {
    if (enc.includes("gzip")) {
      return zlib.gunzipSync(body);
    }
    if (enc.includes("deflate")) {
      try {
        return zlib.inflateSync(body);
      } catch {
        return zlib.inflateRawSync(body);
      }
    }
    if (enc.includes("br")) {
      return zlib.brotliDecompressSync(body);
    }
  } catch (err) {
    console.warn("Forge HTTP Engine: Decompression warning, falling back to raw body", err);
  }
  return body;
}
