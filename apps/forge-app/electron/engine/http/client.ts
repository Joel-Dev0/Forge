import net from "node:net";
import tls from "node:tls";
import { performance } from "node:perf_hooks";
import { parseHttpUrl } from "./url.js";
import { parseHeaderBlock, decodeChunked, decompressBody, type ParsedHeaders } from "./responseParser.js";
import type { HttpRequestOptions, HttpResponse, HttpTiming, HttpSecurity } from "./types.js";

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_MAX_REDIRECTS = 5;

export async function request(
  options: HttpRequestOptions,
  redirectCount = 0
): Promise<HttpResponse> {
  const urlObj = parseHttpUrl(options.url);
  const method = (options.method || "GET").toUpperCase();
  const followRedirects = options.followRedirects !== false;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;

  if (redirectCount > maxRedirects) {
    throw new Error(`Exceeded maximum redirect count of ${maxRedirects}`);
  }

  return new Promise<HttpResponse>((resolve, reject) => {
    const tStart = performance.now();
    let tDns = tStart;
    let tTcp = tStart;
    let tTls = tStart;
    let tFirstByte = 0;

    let socket: net.Socket | tls.TLSSocket;
    let isResolved = false;
    let timeoutTimer: NodeJS.Timeout | null = null;

    function cleanup() {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (!socket.destroyed) socket.destroy();
    }

    function safeReject(err: Error) {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(err);
    }

    // Build raw HTTP request wire string
    const hostHeader =
      (urlObj.isTls && urlObj.port === 443) || (!urlObj.isTls && urlObj.port === 80)
        ? urlObj.hostname
        : `${urlObj.hostname}:${urlObj.port}`;

    const headersToSend: Record<string, string> = {
      Host: hostHeader,
      "User-Agent": "Forge/0.1 (CustomEngine)",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate",
      Connection: "close",
    };

    if (options.body) {
      const bodyBytes = Buffer.from(options.body, "utf-8");
      headersToSend["Content-Length"] = String(bodyBytes.length);
      if (!options.headers?.["content-type"] && !options.headers?.["Content-Type"]) {
        // Auto-detect JSON if starting with { or [
        const trimmed = options.body.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
          headersToSend["Content-Type"] = "application/json; charset=utf-8";
        } else {
          headersToSend["Content-Type"] = "text/plain; charset=utf-8";
        }
      }
    }

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headersToSend[k] = v;
      }
    }

    let requestWire = `${method} ${urlObj.path} HTTP/1.1\r\n`;
    for (const [k, v] of Object.entries(headersToSend)) {
      requestWire += `${k}: ${v}\r\n`;
    }
    requestWire += "\r\n";

    // Setup socket
    if (urlObj.isTls) {
      socket = tls.connect({
        host: urlObj.hostname,
        port: urlObj.port,
        servername: urlObj.hostname, // SNI support
        rejectUnauthorized: false,    // Permissive for dev inspection
      });
    } else {
      socket = net.createConnection({
        host: urlObj.hostname,
        port: urlObj.port,
      });
    }

    timeoutTimer = setTimeout(() => {
      safeReject(new Error(`HTTP request timed out after ${timeoutMs}ms for ${urlObj.href}`));
    }, timeoutMs);

    socket.on("lookup", () => {
      tDns = performance.now();
    });

    socket.on("connect", () => {
      tTcp = performance.now();
      if (!urlObj.isTls) {
        // Plain HTTP: send request immediately on connect
        sendRequest();
      }
    });

    if (urlObj.isTls) {
      (socket as tls.TLSSocket).on("secureConnect", () => {
        tTls = performance.now();
        sendRequest();
      });
    }

    function sendRequest() {
      socket.write(requestWire, "utf-8", () => {
        if (options.body) {
          socket.write(options.body, "utf-8");
        }
      });
    }

    let rawAccumulator = Buffer.alloc(0);
    let parsedHeaders: ParsedHeaders | null = null;
    let headerDelimiterIdx = -1;

    socket.on("data", (chunk: Buffer) => {
      if (tFirstByte === 0) {
        tFirstByte = performance.now();
      }

      rawAccumulator = Buffer.concat([rawAccumulator, chunk]);

      // Detect header end if not parsed yet
      if (!parsedHeaders) {
        headerDelimiterIdx = rawAccumulator.indexOf("\r\n\r\n");
        if (headerDelimiterIdx !== -1) {
          const headerBuffer = rawAccumulator.subarray(0, headerDelimiterIdx);
          const headerStr = headerBuffer.toString("latin1");
          try {
            parsedHeaders = parseHeaderBlock(headerStr);
          } catch (err: any) {
            safeReject(err);
            return;
          }
        }
      }

      if (parsedHeaders) {
        const bodyBuffer = rawAccumulator.subarray(headerDelimiterIdx + 4);

        // Check completion if Content-Length is provided
        if (parsedHeaders.contentLength !== null) {
          if (bodyBuffer.length >= parsedHeaders.contentLength) {
            finishResponse(parsedHeaders, bodyBuffer.subarray(0, parsedHeaders.contentLength));
          }
        } else if (parsedHeaders.isChunked) {
          const { isComplete, data } = decodeChunked(bodyBuffer);
          if (isComplete) {
            finishResponse(parsedHeaders, data);
          }
        }
      }
    });

    socket.on("end", () => {
      if (isResolved) return;
      if (parsedHeaders) {
        const bodyBuffer = rawAccumulator.subarray(headerDelimiterIdx + 4);
        if (parsedHeaders.isChunked) {
          const { data } = decodeChunked(bodyBuffer);
          finishResponse(parsedHeaders, data);
        } else {
          finishResponse(parsedHeaders, bodyBuffer);
        }
      } else if (rawAccumulator.length > 0) {
        // Fallback for servers without standard HTTP headers
        finishResponse(
          {
            raw: "",
            httpVersion: "HTTP/1.0",
            status: 200,
            statusText: "OK",
            headers: {},
            isChunked: false,
            contentLength: rawAccumulator.length,
          },
          rawAccumulator
        );
      } else {
        safeReject(new Error(`Connection closed before response received from ${urlObj.href}`));
      }
    });

    socket.on("error", (err: Error) => {
      safeReject(err);
    });

    async function finishResponse(headers: ParsedHeaders, rawBody: Buffer) {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      const tEnd = performance.now();

      // Check for Redirect (301, 302, 303, 307, 308)
      if (
        followRedirects &&
        [301, 302, 303, 307, 308].includes(headers.status) &&
        headers.headers["location"]
      ) {
        const redirectLocation = headers.headers["location"];
        const nextUrl = new URL(redirectLocation, urlObj.href).href;

        // For 303 See Other (and standard browser redirect for 301/302), switch to GET
        let nextMethod = method as HttpRequestOptions["method"];
        let nextBody = options.body;
        if (headers.status === 303 || ((headers.status === 301 || headers.status === 302) && method === "POST")) {
          nextMethod = "GET";
          nextBody = undefined;
        }

        try {
          const redirectedRes = await request(
            {
              ...options,
              url: nextUrl,
              method: nextMethod,
              body: nextBody,
            },
            redirectCount + 1
          );
          resolve(redirectedRes);
          return;
        } catch (err: any) {
          reject(err);
          return;
        }
      }

      // Decompress body if encoded
      const decompressedBuffer = decompressBody(rawBody, headers.contentEncoding);
      const bodyText = decompressedBuffer.toString("utf-8");

      // Calculate timings
      const dnsTime = Math.max(0, Math.round(tDns - tStart));
      const tcpTime = Math.max(0, Math.round(tTcp - (urlObj.isTls ? tDns : tStart)));
      const tlsTime = urlObj.isTls ? Math.max(0, Math.round(tTls - tTcp)) : 0;
      const ttfbTime = Math.max(0, Math.round((tFirstByte || tEnd) - (urlObj.isTls ? tTls : tTcp)));
      const downloadTime = Math.max(0, Math.round(tEnd - (tFirstByte || tEnd)));
      const totalTime = Math.max(0, Math.round(tEnd - tStart));

      const timing: HttpTiming = {
        dns: dnsTime,
        tcp: tcpTime,
        tls: tlsTime,
        ttfb: ttfbTime,
        download: downloadTime,
        total: totalTime,
      };

      // Extract TLS Security info if HTTPS
      let security: HttpSecurity | undefined;
      if (urlObj.isTls && socket instanceof tls.TLSSocket) {
        try {
          const cipher = socket.getCipher();
          const cert = socket.getPeerCertificate();
          security = {
            authorized: socket.authorized,
            protocol: socket.getProtocol() || undefined,
            cipher: cipher ? cipher.name : undefined,
            serverName: urlObj.hostname,
            certSubject: cert?.subject?.CN,
            certIssuer: cert?.issuer?.O || cert?.issuer?.CN,
            certValidTo: cert?.valid_to,
          };
        } catch {
          security = { authorized: socket.authorized };
        }
      }

      resolve({
        url: urlObj.href,
        status: headers.status,
        statusText: headers.statusText,
        httpVersion: headers.httpVersion,
        headers: headers.headers,
        body: bodyText,
        contentLength: rawBody.length,
        timing,
        security,
        rawRequest: requestWire,
        rawResponseHeaders: headers.raw,
        redirectCount,
      });
    }
  });
}
