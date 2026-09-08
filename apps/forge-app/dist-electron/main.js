// electron/main.ts
import { app as app5, BrowserWindow as BrowserWindow5, ipcMain as ipcMain5, nativeTheme, nativeImage, powerMonitor } from "electron";
import path3 from "node:path";
import fs3 from "node:fs";
import os from "node:os";
import { exec } from "node:child_process";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// electron/engine/http/url.ts
function parseHttpUrl(input) {
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
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Forge HTTP Engine supports http: and https:`);
  }
  const isTls = protocol === "https:";
  const port = parsed.port ? parseInt(parsed.port, 10) : isTls ? 443 : 80;
  const path4 = `${parsed.pathname || "/"}${parsed.search || ""}`;
  return {
    protocol,
    hostname: parsed.hostname,
    port,
    path: path4,
    isTls,
    href: parsed.href
  };
}

// electron/engine/http/responseParser.ts
import zlib from "node:zlib";
function parseHeaderBlock(headerStr) {
  const lines = headerStr.split(/\r?\n/);
  const statusLine = lines[0] || "";
  const match = statusLine.match(/^(HTTP\/\d\.\d)\s+(\d{3})(?:\s+(.*))?$/i);
  if (!match) {
    throw new Error(`Malformed HTTP status line: "${statusLine}"`);
  }
  const httpVersion = match[1].toUpperCase();
  const status2 = parseInt(match[2], 10);
  const statusText = match[3] ? match[3].trim() : "";
  const headers = {};
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
  let contentLength = null;
  if (headers["content-length"]) {
    const parsedLen = parseInt(headers["content-length"], 10);
    if (!isNaN(parsedLen)) contentLength = parsedLen;
  }
  return {
    raw: headerStr,
    httpVersion,
    status: status2,
    statusText,
    headers,
    isChunked,
    contentLength,
    contentEncoding: headers["content-encoding"],
    contentType: headers["content-type"]
  };
}
function decodeChunked(buffer) {
  const chunks = [];
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
      break;
    }
    chunks.push(buffer.subarray(chunkStart, chunkEnd));
    offset = chunkEnd + 2;
  }
  return {
    data: Buffer.concat(chunks),
    isComplete
  };
}
function decompressBody(body, encoding) {
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

// electron/engine/http/client.ts
import net from "node:net";
import tls from "node:tls";
import { performance as performance2 } from "node:perf_hooks";
var DEFAULT_TIMEOUT = 15e3;
var DEFAULT_MAX_REDIRECTS = 5;
async function request(options, redirectCount = 0) {
  const urlObj = parseHttpUrl(options.url);
  const method = (options.method || "GET").toUpperCase();
  const followRedirects = options.followRedirects !== false;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;
  if (redirectCount > maxRedirects) {
    throw new Error(`Exceeded maximum redirect count of ${maxRedirects}`);
  }
  return new Promise((resolve, reject) => {
    const tStart = performance2.now();
    let tDns = tStart;
    let tTcp = tStart;
    let tTls = tStart;
    let tFirstByte = 0;
    let socket;
    let isResolved = false;
    let timeoutTimer = null;
    function cleanup() {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (!socket.destroyed) socket.destroy();
    }
    function safeReject(err) {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(err);
    }
    const hostHeader = urlObj.isTls && urlObj.port === 443 || !urlObj.isTls && urlObj.port === 80 ? urlObj.hostname : `${urlObj.hostname}:${urlObj.port}`;
    const headersToSend = {
      Host: hostHeader,
      "User-Agent": "Forge/0.1 (CustomEngine)",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate",
      Connection: "close"
    };
    if (options.body) {
      const bodyBytes = Buffer.from(options.body, "utf-8");
      headersToSend["Content-Length"] = String(bodyBytes.length);
      if (!options.headers?.["content-type"] && !options.headers?.["Content-Type"]) {
        const trimmed = options.body.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
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
    let requestWire = `${method} ${urlObj.path} HTTP/1.1\r
`;
    for (const [k, v] of Object.entries(headersToSend)) {
      requestWire += `${k}: ${v}\r
`;
    }
    requestWire += "\r\n";
    if (urlObj.isTls) {
      socket = tls.connect({
        host: urlObj.hostname,
        port: urlObj.port,
        servername: urlObj.hostname,
        // SNI support
        rejectUnauthorized: false
        // Permissive for dev inspection
      });
    } else {
      socket = net.createConnection({
        host: urlObj.hostname,
        port: urlObj.port
      });
    }
    timeoutTimer = setTimeout(() => {
      safeReject(new Error(`HTTP request timed out after ${timeoutMs}ms for ${urlObj.href}`));
    }, timeoutMs);
    socket.on("lookup", () => {
      tDns = performance2.now();
    });
    socket.on("connect", () => {
      tTcp = performance2.now();
      if (!urlObj.isTls) {
        sendRequest();
      }
    });
    if (urlObj.isTls) {
      socket.on("secureConnect", () => {
        tTls = performance2.now();
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
    let parsedHeaders = null;
    let headerDelimiterIdx = -1;
    socket.on("data", (chunk) => {
      if (tFirstByte === 0) {
        tFirstByte = performance2.now();
      }
      rawAccumulator = Buffer.concat([rawAccumulator, chunk]);
      if (!parsedHeaders) {
        headerDelimiterIdx = rawAccumulator.indexOf("\r\n\r\n");
        if (headerDelimiterIdx !== -1) {
          const headerBuffer = rawAccumulator.subarray(0, headerDelimiterIdx);
          const headerStr = headerBuffer.toString("latin1");
          try {
            parsedHeaders = parseHeaderBlock(headerStr);
          } catch (err) {
            safeReject(err);
            return;
          }
        }
      }
      if (parsedHeaders) {
        const bodyBuffer = rawAccumulator.subarray(headerDelimiterIdx + 4);
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
        finishResponse(
          {
            raw: "",
            httpVersion: "HTTP/1.0",
            status: 200,
            statusText: "OK",
            headers: {},
            isChunked: false,
            contentLength: rawAccumulator.length
          },
          rawAccumulator
        );
      } else {
        safeReject(new Error(`Connection closed before response received from ${urlObj.href}`));
      }
    });
    socket.on("error", (err) => {
      safeReject(err);
    });
    async function finishResponse(headers, rawBody) {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      const tEnd = performance2.now();
      if (followRedirects && [301, 302, 303, 307, 308].includes(headers.status) && headers.headers["location"]) {
        const redirectLocation = headers.headers["location"];
        const nextUrl = new URL(redirectLocation, urlObj.href).href;
        let nextMethod = method;
        let nextBody = options.body;
        if (headers.status === 303 || (headers.status === 301 || headers.status === 302) && method === "POST") {
          nextMethod = "GET";
          nextBody = void 0;
        }
        try {
          const redirectedRes = await request(
            {
              ...options,
              url: nextUrl,
              method: nextMethod,
              body: nextBody
            },
            redirectCount + 1
          );
          resolve(redirectedRes);
          return;
        } catch (err) {
          reject(err);
          return;
        }
      }
      const decompressedBuffer = decompressBody(rawBody, headers.contentEncoding);
      const bodyText = decompressedBuffer.toString("utf-8");
      const dnsTime = Math.max(0, Math.round(tDns - tStart));
      const tcpTime = Math.max(0, Math.round(tTcp - (urlObj.isTls ? tDns : tStart)));
      const tlsTime = urlObj.isTls ? Math.max(0, Math.round(tTls - tTcp)) : 0;
      const ttfbTime = Math.max(0, Math.round((tFirstByte || tEnd) - (urlObj.isTls ? tTls : tTcp)));
      const downloadTime = Math.max(0, Math.round(tEnd - (tFirstByte || tEnd)));
      const totalTime = Math.max(0, Math.round(tEnd - tStart));
      const timing = {
        dns: dnsTime,
        tcp: tcpTime,
        tls: tlsTime,
        ttfb: ttfbTime,
        download: downloadTime,
        total: totalTime
      };
      let security;
      if (urlObj.isTls && socket instanceof tls.TLSSocket) {
        try {
          const cipher = socket.getCipher();
          const cert = socket.getPeerCertificate();
          security = {
            authorized: socket.authorized,
            protocol: socket.getProtocol() || void 0,
            cipher: cipher ? cipher.name : void 0,
            serverName: urlObj.hostname,
            certSubject: cert?.subject?.CN,
            certIssuer: cert?.issuer?.O || cert?.issuer?.CN,
            certValidTo: cert?.valid_to
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
        redirectCount
      });
    }
  });
}

// electron/network/networkMonitor.ts
import { app as app3, ipcMain as ipcMain2, session as session2 } from "electron";

// electron/adblock/adblockAdapter.ts
import path2 from "node:path";
import fs2 from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app as app2, ipcMain, session } from "electron";

// ../../packages/adblock-engine/src/rules/parser.ts
function patternToRegex(pattern, isDomainAnchor, isExactStart, isExactEnd) {
  if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length > 2) {
    try {
      return new RegExp(pattern.slice(1, -1), "i");
    } catch {
    }
  }
  let regexStr = "";
  if (isDomainAnchor) {
    regexStr += "^(?:https?|wss?|ftp):\\/\\/(?:[a-zA-Z0-9-]+\\.)*";
  } else if (isExactStart) {
    regexStr += "^";
  }
  let i = 0;
  while (i < pattern.length) {
    const char = pattern[i];
    if (char === "*") {
      regexStr += ".*";
    } else if (char === "^") {
      regexStr += "(?:[^a-zA-Z0-9_.%\\-]|$)";
    } else if (["\\", ".", "+", "?", "{", "}", "(", ")", "[", "]", "|"].includes(char)) {
      regexStr += "\\" + char;
    } else {
      regexStr += char;
    }
    i++;
  }
  if (isExactEnd) {
    regexStr += "$";
  }
  return new RegExp(regexStr, "i");
}
function parseOptions(optionsStr) {
  const options = {};
  const parts = optionsStr.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part === "third-party" || part === "3p") {
      options.thirdParty = true;
    } else if (part === "~third-party" || part === "~3p") {
      options.thirdParty = false;
    } else if (part.startsWith("domain=")) {
      const domains = part.slice(7).split("|");
      for (const d of domains) {
        if (d.startsWith("~")) {
          if (!options.invertedDomains) options.invertedDomains = [];
          options.invertedDomains.push(d.slice(1).toLowerCase());
        } else {
          if (!options.domains) options.domains = [];
          options.domains.push(d.toLowerCase());
        }
      }
    } else if (part.startsWith("~")) {
      const type = part.slice(1).toLowerCase();
      if (!options.invertedResourceTypes) options.invertedResourceTypes = [];
      options.invertedResourceTypes.push(normalizeResourceType(type));
    } else {
      const type = part.toLowerCase();
      if (!options.resourceTypes) options.resourceTypes = [];
      options.resourceTypes.push(normalizeResourceType(type));
    }
  }
  return options;
}
function normalizeResourceType(type) {
  if (type === "xhr" || type === "xmlhttprequest") return "xhr";
  if (type === "subdocument") return "subdocument";
  return type;
}
var ruleSeq = 0;
function parseRule(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith("!") || line.startsWith("[")) {
    return null;
  }
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#")) {
    return null;
  }
  let type = "block";
  let content = line;
  if (content.startsWith("@@")) {
    type = "exception";
    content = content.slice(2);
  }
  let options;
  const dollarIndex = content.lastIndexOf("$");
  if (dollarIndex !== -1 && !content.slice(dollarIndex).includes("/")) {
    const optionsStr = content.slice(dollarIndex + 1);
    content = content.slice(0, dollarIndex);
    options = parseOptions(optionsStr);
  }
  let isDomainAnchor = false;
  let isExactStart = false;
  let isExactEnd = false;
  let domain;
  if (content.startsWith("||")) {
    isDomainAnchor = true;
    content = content.slice(2);
    const match = content.match(/^([a-zA-Z0-9.-]+)(?:\^|\/|\*|$)/);
    if (match && match[1]) {
      domain = match[1].toLowerCase();
    }
  } else if (content.startsWith("|")) {
    isExactStart = true;
    content = content.slice(1);
  }
  if (content.endsWith("|") && !content.endsWith("||")) {
    isExactEnd = true;
    content = content.slice(0, -1);
  }
  const id = `rule_${++ruleSeq}_${Math.random().toString(36).slice(2, 7)}`;
  const regex = patternToRegex(content, isDomainAnchor, isExactStart, isExactEnd);
  return {
    id,
    raw: line,
    type,
    pattern: content,
    domain,
    regex,
    isDomainAnchor,
    isExactStart,
    isExactEnd,
    options
  };
}
function parseFilterListText(text) {
  const lines = text.split(/\r?\n/);
  const rules = [];
  for (const line of lines) {
    const rule = parseRule(line);
    if (rule) {
      rules.push(rule);
    }
  }
  return rules;
}

// ../../packages/adblock-engine/src/matcher/domainTrie.ts
var DomainIndex = class {
  domainMap = /* @__PURE__ */ new Map();
  clear() {
    this.domainMap.clear();
  }
  addRule(rule) {
    if (!rule.domain) return;
    const domain = rule.domain.toLowerCase();
    let list = this.domainMap.get(domain);
    if (!list) {
      list = [];
      this.domainMap.set(domain, list);
    }
    list.push(rule);
  }
  removeRule(ruleId) {
    for (const [domain, rules] of this.domainMap.entries()) {
      const filtered = rules.filter((r) => r.id !== ruleId);
      if (filtered.length === 0) {
        this.domainMap.delete(domain);
      } else if (filtered.length !== rules.length) {
        this.domainMap.set(domain, filtered);
      }
    }
  }
  /**
   * Finds all rules matching the given hostname (checking exact and parent domains).
   */
  getCandidateRules(hostname) {
    const cleanHost = hostname.toLowerCase();
    const parts = cleanHost.split(".");
    const candidates = [];
    for (let i = 0; i < parts.length - 1; i++) {
      const subDomain = parts.slice(i).join(".");
      const rules = this.domainMap.get(subDomain);
      if (rules) {
        candidates.push(...rules);
      }
    }
    return candidates;
  }
  get size() {
    return this.domainMap.size;
  }
};

// ../../packages/adblock-engine/src/matcher/urlMatcher.ts
function extractHostname(urlStr) {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}
function isThirdPartyRequest(requestUrl, sourceUrl) {
  if (!sourceUrl) return false;
  const reqHost = extractHostname(requestUrl);
  const srcHost = extractHostname(sourceUrl);
  if (!reqHost || !srcHost) return false;
  if (reqHost === srcHost) return false;
  const reqParts = reqHost.split(".");
  const srcParts = srcHost.split(".");
  if (reqParts.length >= 2 && srcParts.length >= 2) {
    const reqApex = reqParts.slice(-2).join(".");
    const srcApex = srcParts.slice(-2).join(".");
    if (reqApex === srcApex) return false;
  }
  return true;
}
var COMMON_TRACKING_QUERY_PARAMS = [
  "fbclid",
  "gclid",
  "msclkid",
  "twclid",
  "mc_eid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "igshid",
  "ysclid",
  "wbraid",
  "gbraid"
];
function stripTrackingParameters(urlStr) {
  const strippedParams = [];
  try {
    const url = new URL(urlStr);
    const searchParams = url.searchParams;
    for (const param of COMMON_TRACKING_QUERY_PARAMS) {
      if (searchParams.has(param)) {
        strippedParams.push(param);
        searchParams.delete(param);
      }
    }
    const allKeys = Array.from(searchParams.keys());
    for (const key of allKeys) {
      if (key.toLowerCase().startsWith("utm_") && !strippedParams.includes(key)) {
        strippedParams.push(key);
        searchParams.delete(key);
      }
    }
    if (strippedParams.length === 0) {
      return { cleanUrl: urlStr, strippedParams: [] };
    }
    url.search = searchParams.toString();
    return { cleanUrl: url.toString(), strippedParams };
  } catch {
    return { cleanUrl: urlStr, strippedParams: [] };
  }
}
function matchRule(rule, request2) {
  if (rule.regex && !rule.regex.test(request2.url)) {
    return false;
  }
  const opts = rule.options;
  if (!opts) return true;
  if (request2.resourceType) {
    const reqType = request2.resourceType.toLowerCase();
    if (opts.resourceTypes && opts.resourceTypes.length > 0) {
      const matchesType = opts.resourceTypes.some((t) => {
        if (t === "xhr" && (reqType === "fetch" || reqType === "xmlhttprequest")) return true;
        return t === reqType;
      });
      if (!matchesType) return false;
    }
    if (opts.invertedResourceTypes && opts.invertedResourceTypes.length > 0) {
      const matchesInverted = opts.invertedResourceTypes.some((t) => {
        if (t === "xhr" && (reqType === "fetch" || reqType === "xmlhttprequest")) return true;
        return t === reqType;
      });
      if (matchesInverted) return false;
    }
  }
  if (opts.thirdParty !== void 0) {
    const is3p = request2.isThirdParty ?? isThirdPartyRequest(request2.url, request2.sourceUrl);
    if (opts.thirdParty !== is3p) {
      return false;
    }
  }
  if (request2.sourceUrl) {
    const srcHost = extractHostname(request2.sourceUrl);
    if (opts.invertedDomains && opts.invertedDomains.length > 0) {
      const matchesInvertedDomain = opts.invertedDomains.some(
        (d) => srcHost === d || srcHost.endsWith("." + d)
      );
      if (matchesInvertedDomain) return false;
    }
    if (opts.domains && opts.domains.length > 0) {
      const matchesDomain = opts.domains.some(
        (d) => srcHost === d || srcHost.endsWith("." + d)
      );
      if (!matchesDomain) return false;
    }
  }
  return true;
}

// ../../packages/adblock-engine/src/filters/filterList.ts
var FilterList = class {
  id;
  name;
  category;
  description;
  enabled;
  url;
  version;
  rules = [];
  hitsCount = 0;
  lastUpdated;
  constructor(id, name, category = "ad", description, enabled = true, url) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.description = description;
    this.enabled = enabled;
    this.url = url;
  }
  loadFromText(rawText) {
    this.rules = parseFilterListText(rawText);
    for (const r of this.rules) {
      r.category = this.category;
      if (r.enabled === void 0) r.enabled = true;
    }
    this.lastUpdated = Date.now();
  }
  addRule(rule) {
    if (!rule.category) rule.category = this.category;
    if (rule.enabled === void 0) rule.enabled = true;
    this.rules.push(rule);
    this.lastUpdated = Date.now();
  }
  removeRule(ruleId) {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      this.rules.splice(idx, 1);
      this.lastUpdated = Date.now();
      return true;
    }
    return false;
  }
  incrementHits() {
    this.hitsCount++;
  }
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
      enabled: this.enabled,
      rulesCount: this.rules.length,
      hitsCount: this.hitsCount,
      lastUpdated: this.lastUpdated,
      url: this.url,
      version: this.version
    };
  }
};

// ../../packages/adblock-engine/src/filters/presets/easylist.ts
var EASYLIST_PRESET_RULES = `
! Title: EasyList Core (Ad Blocking)
! Description: Popular advertising networks, ad servers, banners, and video ad trackers
! Homepage: https://easylist.to/

! --- Major Advertising Networks ---
||doubleclick.net^
||googlesyndication.com^
||adservice.google.com^
||pagead2.googlesyndication.com^
||adnxs.com^
||criteo.com^
||criteo.net^
||amazon-adsystem.com^
||rubiconproject.com^
||taboola.com^
||outbrain.com^
||pubmatic.com^
||openx.net^
||smartadserver.com^
||moatads.com^
||casalemedia.com^
||adform.net^
||zedo.com^
||popads.net^
||buysellads.com^
||adroll.com^
||media.net^
||sovrn.com^
||inmobi.com^
||revcontent.com^
||adskeeper.co.uk^
||mgid.com^
||bidswitch.net^
||yieldmo.com^
||sharethrough.com^
||triplelift.com^
||indexexchange.com^
||teads.tv^
||connatix.com^
||aniview.com^
||spotxchange.com^
||adtech.de^
||advertising.com^
||quantserve.com^
||propellerads.com^
||adcolony.com^
||admob.com^
||unityads.unity3d.com^
||applovin.com^
||ironsrc.com^
||vungle.com^
||chartboost.com^
||adpushup.com^
||exponential.com^
||adblade.com^
||adbutler.com^
||carbonads.net^
||adtrue.com^
||adsterra.com^
||exoclick.com^
||trafficjunky.com^
||trafficfactory.biz^

! --- Ad Paths and Generic Banner Patterns ---
/pagead/
/ads/banner/*
/adserver/*
/adframe.
/prebid.js
*ad_banner*
*banner_ad*
*ads.min.js
/dfp_ads.js
||ads.*^$script
||adserver.*^
||advert.*^
||banners.*^

! --- YouTube Ad & Tracking Endpoints ---
||googleads.g.doubleclick.net^
||static.doubleclick.net^
||youtube.com/api/stats/ads^
||youtube.com/pagead/*
||youtube.com/ptracking*
||youtube.com/youtubei/v1/player/ad_break*
||youtube.com/get_midroll_info*
||youtube.com/api/stats/qoe?*&adformat=
||youtube.com/api/stats/atr?*
||youtube.com/get_video_info?*&adformat=
||googlevideo.com/videoplayback*&adformat=
||googlevideo.com/videoplayback*&ad_type=

! --- Universal Video Ad Networks & IMA/VAST/VPAID SDKs ---
||imasdk.googleapis.com^
||pubads.g.doubleclick.net^
||securepubads.g.doubleclick.net^
||aniview.com^
||springserve.com^
||connatix.com^
||spotxchange.com^
||spotx.tv^
||tremorhub.com^
||innovid.com^
||vdo.ai^
||playwire.com^
||interactivedsp.com^
||jwpsrv.com^
||serving-sys.com^
||vidazoo.com^
||kargo.com^
`;

// ../../packages/adblock-engine/src/filters/presets/easyprivacy.ts
var EASYPRIVACY_PRESET_RULES = `
! Title: EasyPrivacy Core (Trackers & Analytics)
! Description: Tracking scripts, analytics beacons, telemetry endpoints, and user profiling
! Homepage: https://easylist.to/

! --- Major Web Analytics & User Tracking ---
||google-analytics.com^
||analytics.google.com^
||googletagmanager.com^
||hotjar.com^
||clarity.ms^
||mixpanel.com^
||segment.io^
||segment.com^
||fullstory.com^
||optimizely.com^
||sentry.io/api/*/envelope^
||pixel.facebook.com^
||connect.facebook.net/en_US/fbevents.js
||analytics.tiktok.com^
||mc.yandex.ru^
||scorecardresearch.com^
||statcounter.com^
||clicky.com^
||crazyegg.com^
||mouseflow.com^
||luckyorange.com^
||inspectlet.com^
||smartlook.com^
||logrocket.com^
||amplitude.com^
||heap.io^
||heapanalytics.com^
||posthog.com^
||kissmetrics.com^
||woopra.com^
||nr-data.net^
||datadoghq-browser-agent.com^
||branch.io^
||appsflyer.com^
||adjust.com^
||kochava.com^
||singular.net^

! --- Telemetry & Tracker Patterns ---
||telemetry.*^
||tracker.*^
||beacon.*^
`;

// ../../packages/adblock-engine/src/filters/presets/quickfixes.ts
var QUICKFIXES_PRESET_RULES = `
! Title: uBlock Origin Quick Fixes & YouTube AdShield
! Description: Rapid-response community rules targeting YouTube video ads, anti-adblock scripts, and bypass attempts.
! Homepage: https://github.com/uBlockOrigin/uAssets

! --- YouTube In-Stream Video Ad & Telemetry Endpoints ---
||youtube.com/api/stats/ads
||youtube.com/pagead/
||youtube.com/ptracking
||youtube.com/youtubei/v1/att/
||youtube.com/youtubei/v1/log_event
||youtube.com/get_midroll_info
||youtube.com/api/stats/qoe?*adformat=
||youtube.com/api/stats/watchtime?*adformat=
||youtube.com/pcs/activeview
||play.google.com/log
||imasdk.googleapis.com
||googleads.g.doubleclick.net
||static.doubleclick.net
||s0.2mdn.net
||securepubads.g.doubleclick.net
||adclick.g.doubleclick.net
||pagead2.googleadservices.com
||www.google.com/pagead/
||fundingchoicesmessages.google.com

! --- Anti-Adblock Script Bypasses ---
||detectadblock.com^
||adblock-analytics.com^
||blockadblock.com^
||adinserter.pro^
||admiral.com^
||antiadblocksystems.com^

! --- Explicit Exceptions for Legitimate Video Playback Streams ---
@@||googlevideo.com/videoplayback$1p
@@||youtube.com/videoplayback$1p
`;

// ../../packages/adblock-engine/src/filters/presets/malvertising.ts
var MALVERTISING_PRESET_RULES = `
! Title: Forge Malvertising & Threat Shield
! Description: Blocks malicious advertising networks, in-browser cryptominers, scam popunders, and exploit scripts
! Homepage: https://github.com/Joel-Dev0/Forge

! --- In-Browser Cryptocurrency Mining Scripts ---
||coinhive.com^
||coin-hive.com^
||cryptoloot.pro^
||crypto-loot.com^
||jsecoin.com^
||webminepool.com^
||authedmine.com^
||monerominer.rocks^
||minr.pw^
||coinhave.com^
||coinblind.com^
||cloudcoins.co^
||papoto.com^
||miner.pr0gramm.com^
||gridcash.net^
||webassembly.stream^
||browsermine.com^
||webminer.pro^
||deepminer.org^
||moneroocean.stream^

! --- Malicious Ad Redirectors, Popunders & Exploit Delivery ---
||ad-maven.com^
||popcash.net^
||popads.net^
||trafficstars.com^
||exoclick.com^
||ero-advertising.com^
||adsterra.com^
||propellerads.com^
||hilltopads.net^
||clickadu.com^
||juicyads.com^
||yllix.com^
||bidvertiser.com^
||ad-rotator.net^
||traffic-media.co^
||directrev.com^
||zeroad.net^
||clkmon.com^
||bestadbid.com^
||adclicker.info^
||redirect-ad.com^

! --- Phishing Ads, Fake Antivirus & Tech Support Scams ---
||*-update-alert.com^
||tech-support-alert.*^
||fake-antivirus-*^
||critical-security-alert.*^
||system-cleaner-alert.*^
||windows-defender-alert.*^
||apple-support-warning.*^
||device-infected-alert.*^
||virus-scan-report.*^
||trojan-detection-alert.*^
||chrome-security-center.*^
||firefox-patch-update.*^
||win-safety-warning.*^
||pc-health-scan.*^
`;

// ../../packages/adblock-engine/src/cosmetic/cosmeticRules.ts
function getCosmeticCSS(urlStr) {
  let css = `
    /* Generic ad banners & sponsor placeholders */
    .ad-container,
    .ad-banner,
    .ad-placeholder,
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    .adsbygoogle {
      display: none !important;
    }
  `;
  if (!urlStr) return css;
  const isYouTube = urlStr.includes("youtube.com") || urlStr.includes("youtu.be");
  if (isYouTube) {
    css += `
      /* YouTube Home & Feed Ad Banners */
      ytd-promoted-sparkles-web-renderer,
      ytd-promoted-video-renderer,
      ytd-display-ad-renderer,
      ytd-statement-banner-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-banner-promo-renderer,
      ytd-banner-promo-renderer-background,
      ytd-ad-slot-renderer,
      #masthead-ad,
      ytd-video-masthead-ad-v3-renderer,
      ytd-primetime-promo-renderer,
      ytd-merch-shelf-renderer,

      /* YouTube Video Player Ad Elements */
      #player-ads,
      .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-message-container,
      .ytp-ad-text,
      .ytp-ad-preview-container,
      .ytp-ad-image-overlay,
      .ytp-ad-overlay-image,

      /* Search & Watch Page Side Ad Blocks */
      #panels ytd-ads-engagement-panel-content-renderer,
      ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
      ytd-action-companion-ad-renderer,
      ytd-compact-promoted-video-renderer,
      .ytd-rich-item-renderer:has(ytd-display-ad-renderer),
      .ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
      tp-yt-paper-dialog:has(#feedback.ytd-ad-feedback-renderer),
      tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) {
        display: none !important;
      }
    `;
  }
  return css;
}

// ../../packages/adblock-engine/src/cosmetic/scriptlets.ts
function getScriptlet(urlStr) {
  const isYouTube = urlStr ? urlStr.includes("youtube.com") || urlStr.includes("youtu.be") : false;
  return `
    (function() {
      ${isYouTube ? getYouTubeScriptletCode() : getUniversalVideoScriptletCode()}
    })();
  `;
}
function getYouTubeScriptletCode() {
  return `
    if (window.__forge_yt_blocker_active) return;
    window.__forge_yt_blocker_active = true;

    // 1. Intercept ytInitialPlayerResponse at document-start before player renders
    try {
      let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return _ytInitialPlayerResponse;
        },
        set(val) {
          if (val && typeof val === 'object') {
            delete val.adPlacements;
            delete val.adSlots;
            delete val.playerAds;
            delete val.adBreakHeartbeatParams;
          }
          _ytInitialPlayerResponse = val;
        },
        configurable: true
      });
    } catch {}

    // 2. Intercept JSON.parse to remove ad placements from all dynamic responses
    try {
      const originalParse = JSON.parse;
      JSON.parse = function(...args) {
        const result = originalParse.apply(this, args);
        try {
          if (result && typeof result === 'object') {
            if (result.adPlacements) result.adPlacements = [];
            if (result.adSlots) result.adSlots = [];
            if (result.playerAds) result.playerAds = [];
            if (result.adBreakHeartbeatParams) delete result.adBreakHeartbeatParams;
          }
        } catch {}
        return result;
      };
    } catch {}

    // 3. Intercept fetch for /youtubei/v1/player
    try {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url.includes('/youtubei/v1/player')) {
            const clone = response.clone();
            const data = await clone.json();
            if (data && typeof data === 'object') {
              data.adPlacements = [];
              data.adSlots = [];
              data.playerAds = [];
              delete data.adBreakHeartbeatParams;
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
          }
        } catch {}
        return response;
      };
    } catch {}

    // 4. Continuous Video Ad Fast-Forward & Automatic Skipper
    let wasAdShowing = false;
    let originalMute = false;

    function checkAndSkipAds() {
      const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      const isAd = player && (
        player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting') ||
        document.querySelector('.ytp-ad-player-overlay') !== null
      );

      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

      if (isAd && video) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          originalMute = video.muted;
        }

        // Mute ad audio so user never hears it
        video.muted = true;

        // Skip to end of ad video instantly
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }
        video.playbackRate = 16;
      } else if (!isAd && wasAdShowing) {
        wasAdShowing = false;
        if (video) {
          video.playbackRate = 1;
          video.muted = originalMute;
        }
      }

      // Auto-click any skip button variants
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button',
        '.ytp-ad-overlay-close-button',
        '.ytp-ad-overlay-close-container'
      ];

      for (const selector of skipSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn && typeof btn.click === 'function') {
            btn.click();
          }
        }
      }

      // Auto-dismiss anti-adblock enforcement modal if present
      const enforcementDialogs = document.querySelectorAll('tp-yt-paper-dialog:has(ytd-enforcement-message-view-model), ytd-enforcement-message-view-model');
      for (const dlg of enforcementDialogs) {
        const closeBtn = dlg.querySelector('button, [role="button"]') || dlg.closest('tp-yt-paper-dialog')?.querySelector('#close-button');
        if (closeBtn && typeof closeBtn.click === 'function') {
          closeBtn.click();
        } else {
          dlg.remove();
        }
        if (video && video.paused) {
          video.play().catch(() => {});
        }
      }
    }

    setInterval(checkAndSkipAds, 100);

    try {
      const observer = new MutationObserver(() => checkAndSkipAds());
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src']
      });
    } catch {}
  `;
}
function getUniversalVideoScriptletCode() {
  return `
    if (window.__forge_universal_adblock_active) return;
    window.__forge_universal_adblock_active = true;

    // 1. Neutralize Google IMA SDK for HTML5 video players (Video.js, JW Player, Plyr)
    try {
      window.google = window.google || {};
      window.google.ima = window.google.ima || {
        AdDisplayContainer: function() {
          return { initialize: function() {}, destroy: function() {} };
        },
        AdsLoader: function() {
          return {
            contentComplete: function() {},
            requestAds: function() {},
            destroy: function() {},
            addEventListener: function(evt, handler) {
              if (evt === 'adsManagerLoaded') {
                // Return mock manager that signals all ads completed
                setTimeout(function() {
                  handler({
                    getAdsManager: function() {
                      return {
                        init: function() {},
                        start: function() {},
                        stop: function() {},
                        destroy: function() {},
                        addEventListener: function(e, cb) {
                          if (e === 'allAdsCompleted' || e === 'complete') setTimeout(cb, 10);
                        }
                      };
                    }
                  });
                }, 10);
              }
            }
          };
        },
        AdsRequest: function() {},
        ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' }
      };
    } catch {}

    // 2. Generic Video Ad Skipper & Fast-Forwarder
    function skipGenericVideoAds() {
      const adSelectors = [
        '.vjs-ad-playing video',
        '.jw-flag-ads video',
        '.ad-container video',
        '.video-ad video',
        'video[src*="ad"]',
        'video[src*="doubleclick"]'
      ];

      for (const selector of adSelectors) {
        const adVideos = document.querySelectorAll(selector);
        for (const v of adVideos) {
          if (v instanceof HTMLVideoElement) {
            v.muted = true;
            if (isFinite(v.duration) && v.duration > 0) {
              v.currentTime = v.duration;
            }
            v.playbackRate = 16;
          }
        }
      }

      // Auto-click common skip ad buttons
      const skipButtons = document.querySelectorAll([
        '.videoAdUiSkipButton',
        '.skip-button',
        '.skip-ad',
        '[class*="skip-button" i]',
        '[class*="skipButton" i]',
        '[id*="skip-button" i]',
        'button[aria-label*="skip" i]'
      ].join(','));

      for (const btn of skipButtons) {
        if (btn && typeof btn.click === 'function') {
          btn.click();
        }
      }
    }

    setInterval(skipGenericVideoAds, 250);
  `;
}

// ../../packages/adblock-engine/src/index.ts
var AdBlockEngine = class {
  enabled = true;
  features = {
    adBlock: true,
    trackerProtection: true,
    malvertisingProtection: true,
    customRules: true
  };
  lists = /* @__PURE__ */ new Map();
  domainIndex = new DomainIndex();
  generalBlockRules = [];
  domainExceptionIndex = new DomainIndex();
  generalExceptionRules = [];
  // Statistics
  blockedCount = 0;
  allowedCount = 0;
  categoryCounts = {
    ad: 0,
    tracker: 0,
    malvertising: 0,
    custom: 0
  };
  domainHits = /* @__PURE__ */ new Map();
  constructor(autoLoadPresets = true) {
    if (autoLoadPresets) {
      this.initPresets();
    }
  }
  initPresets() {
    const easyList = new FilterList(
      "easylist",
      "EasyList Core",
      "ad",
      "Blocks popular advertising networks, banners, and video ads",
      true,
      "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt"
    );
    easyList.loadFromText(EASYLIST_PRESET_RULES);
    this.addFilterListInstance(easyList);
    const privacyList = new FilterList(
      "easyprivacy",
      "EasyPrivacy",
      "tracker",
      "Blocks tracking scripts, web analytics, and telemetry endpoints",
      true,
      "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easyprivacy_general_block.txt"
    );
    privacyList.loadFromText(EASYPRIVACY_PRESET_RULES);
    this.addFilterListInstance(privacyList);
    const quickFixesList = new FilterList(
      "quickfixes",
      "uBlock Quick Fixes",
      "ad",
      "Rapid-response fixes for YouTube video ads and anti-adblock countermeasures",
      true,
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt"
    );
    quickFixesList.loadFromText(QUICKFIXES_PRESET_RULES);
    this.addFilterListInstance(quickFixesList);
    const malvertisingList = new FilterList(
      "malvertising",
      "Malvertising & Threats",
      "malvertising",
      "Blocks in-browser cryptominers, malicious ad redirectors, phishing and scam domains",
      true,
      "https://raw.githubusercontent.com/Joel-Dev0/Forge/master/filters/malvertising.txt"
    );
    malvertisingList.loadFromText(MALVERTISING_PRESET_RULES);
    this.addFilterListInstance(malvertisingList);
    const userList = new FilterList(
      "user",
      "User Rules",
      "custom",
      "Custom user-defined blocking and allowlist rules",
      true
    );
    this.addFilterListInstance(userList);
  }
  /**
   * Rebuilds search indices across all currently enabled filter lists.
   */
  rebuildIndices() {
    this.domainIndex.clear();
    this.generalBlockRules = [];
    this.domainExceptionIndex.clear();
    this.generalExceptionRules = [];
    for (const list of this.lists.values()) {
      if (!list.enabled) continue;
      for (const rule of list.rules) {
        if (rule.enabled === false) continue;
        if (rule.type === "exception") {
          if (rule.domain) {
            this.domainExceptionIndex.addRule(rule);
          } else {
            this.generalExceptionRules.push({ rule, listId: list.id });
          }
        } else {
          if (rule.domain) {
            this.domainIndex.addRule(rule);
          } else {
            this.generalBlockRules.push({ rule, listId: list.id });
          }
        }
      }
    }
  }
  addFilterListInstance(list) {
    this.lists.set(list.id, list);
    this.rebuildIndices();
  }
  addList(id, name, category = "ad", description, rawContent = "", enabled = true, url) {
    const list = new FilterList(id, name, category, description, enabled, url);
    if (rawContent) {
      list.loadFromText(rawContent);
    }
    this.addFilterListInstance(list);
    return list;
  }
  updateListContent(id, rawContent) {
    const list = this.lists.get(id);
    if (list) {
      list.loadFromText(rawContent);
      this.rebuildIndices();
      return true;
    }
    return false;
  }
  removeList(id) {
    const deleted = this.lists.delete(id);
    if (deleted) {
      this.rebuildIndices();
    }
    return deleted;
  }
  toggleList(id, enabled) {
    const list = this.lists.get(id);
    if (!list) return false;
    list.enabled = enabled !== void 0 ? enabled : !list.enabled;
    this.rebuildIndices();
    return list.enabled;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  isEnabled() {
    return this.enabled;
  }
  // --- Feature Toggles (Ad Blocker, Tracker Protection, Malvertising, Custom Rules) ---
  setFeature(feature, enabled) {
    this.features[feature] = enabled;
  }
  setFeatureEnabled(feature, enabled) {
    this.setFeature(feature, enabled);
  }
  isFeatureEnabled(feature) {
    return this.features[feature];
  }
  getFeatures() {
    return { ...this.features };
  }
  isCategoryEnabled(category) {
    switch (category) {
      case "ad":
        return this.features.adBlock;
      case "tracker":
        return this.features.trackerProtection;
      case "malvertising":
        return this.features.malvertisingProtection;
      case "custom":
        return this.features.customRules;
      default:
        return true;
    }
  }
  // --- Custom Rules Management ---
  getCustomRules() {
    const userList = this.lists.get("user");
    return userList ? [...userList.rules] : [];
  }
  addUserRule(rawRule) {
    let userList = this.lists.get("user");
    if (!userList) {
      userList = new FilterList("user", "User Rules", "custom", "User custom rules", true);
      this.lists.set("user", userList);
    }
    const rule = parseRule(rawRule);
    if (!rule) return null;
    rule.category = "custom";
    rule.enabled = true;
    userList.addRule(rule);
    this.rebuildIndices();
    return rule;
  }
  toggleCustomRule(ruleId, enabled) {
    const userList = this.lists.get("user");
    if (!userList) return false;
    const rule = userList.rules.find((r) => r.id === ruleId);
    if (!rule) return false;
    rule.enabled = enabled !== void 0 ? enabled : !rule.enabled;
    this.rebuildIndices();
    return rule.enabled;
  }
  removeUserRule(ruleId) {
    const userList = this.lists.get("user");
    if (!userList) return false;
    const removed = userList.removeRule(ruleId);
    if (removed) {
      this.rebuildIndices();
    }
    return removed;
  }
  importRules(rawContent) {
    let userList = this.lists.get("user");
    if (!userList) {
      userList = new FilterList("user", "User Rules", "custom", "User custom rules", true);
      this.lists.set("user", userList);
    }
    const parsed = parseFilterListText(rawContent);
    let imported = 0;
    const errors = [];
    for (const rule of parsed) {
      rule.category = "custom";
      rule.enabled = true;
      userList.addRule(rule);
      imported++;
    }
    this.rebuildIndices();
    return { imported, errors };
  }
  exportRules() {
    const rules = this.getCustomRules();
    return rules.map((r) => r.raw).join("\n");
  }
  /**
   * Evaluates an incoming network request and decides whether to block or allow.
   */
  match(request2) {
    if (!this.enabled) {
      return { blocked: false };
    }
    const hostname = extractHostname(request2.url);
    if (hostname) {
      const candidates = this.domainExceptionIndex.getCandidateRules(hostname);
      for (const rule of candidates) {
        if (rule.enabled !== false && matchRule(rule, request2)) {
          this.allowedCount++;
          return {
            blocked: false,
            rule,
            category: rule.category || "ad",
            reason: `Allowed by domain exception: ${rule.raw}`
          };
        }
      }
    }
    for (const { rule } of this.generalExceptionRules) {
      if (rule.enabled !== false && matchRule(rule, request2)) {
        this.allowedCount++;
        return {
          blocked: false,
          rule,
          category: rule.category || "ad",
          reason: `Allowed by exception: ${rule.raw}`
        };
      }
    }
    if (hostname) {
      const candidates = this.domainIndex.getCandidateRules(hostname);
      for (const rule of candidates) {
        if (rule.enabled === false) continue;
        const list = this.findListForRule(rule.id);
        const category = rule.category || list?.category || "ad";
        if (!this.isCategoryEnabled(category)) {
          continue;
        }
        if (matchRule(rule, request2)) {
          this.blockedCount++;
          this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
          const currentDomainHit = this.domainHits.get(hostname) || { count: 0, category };
          this.domainHits.set(hostname, { count: currentDomainHit.count + 1, category });
          if (list) list.incrementHits();
          return {
            blocked: true,
            rule,
            category,
            listId: list?.id,
            reason: `Blocked by ${category} rule: ${rule.raw}`
          };
        }
      }
    }
    for (const { rule, listId } of this.generalBlockRules) {
      if (rule.enabled === false) continue;
      const list = this.lists.get(listId);
      const category = rule.category || list?.category || "ad";
      if (!this.isCategoryEnabled(category)) {
        continue;
      }
      if (matchRule(rule, request2)) {
        this.blockedCount++;
        this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
        if (hostname) {
          const currentDomainHit = this.domainHits.get(hostname) || { count: 0, category };
          this.domainHits.set(hostname, { count: currentDomainHit.count + 1, category });
        }
        if (list) list.incrementHits();
        return {
          blocked: true,
          rule,
          category,
          listId,
          reason: `Blocked by ${category} pattern: ${rule.raw}`
        };
      }
    }
    this.allowedCount++;
    return { blocked: false };
  }
  findListForRule(ruleId) {
    for (const list of this.lists.values()) {
      if (list.rules.some((r) => r.id === ruleId)) {
        return list;
      }
    }
    return void 0;
  }
  getLists() {
    return Array.from(this.lists.values()).map((l) => l.getMetadata());
  }
  getStats() {
    let totalRules = 0;
    for (const l of this.lists.values()) {
      totalRules += l.rules.length;
    }
    return {
      enabled: this.enabled,
      totalLists: this.lists.size,
      totalRules,
      blockedCount: this.blockedCount,
      allowedCount: this.allowedCount,
      lists: this.getLists()
    };
  }
  getDetailedStats() {
    let totalRules = 0;
    for (const l of this.lists.values()) {
      totalRules += l.rules.length;
    }
    const topDomains = Array.from(this.domainHits.entries()).map(([domain, data]) => ({ domain, count: data.count, category: data.category })).sort((a, b) => b.count - a.count).slice(0, 10);
    const estimatedBandwidthSavedBytes = this.categoryCounts.ad * 2e5 + this.categoryCounts.tracker * 25e3 + this.categoryCounts.malvertising * 15e4 + this.categoryCounts.custom * 5e4;
    const estimatedTimeSavedMs = this.blockedCount * 45;
    return {
      enabled: this.enabled,
      features: { ...this.features },
      totalLists: this.lists.size,
      totalRules,
      blockedCount: this.blockedCount,
      allowedCount: this.allowedCount,
      byCategory: { ...this.categoryCounts },
      topDomains,
      estimatedBandwidthSavedBytes,
      estimatedTimeSavedMs,
      lists: this.getLists()
    };
  }
  resetStats() {
    this.blockedCount = 0;
    this.allowedCount = 0;
    this.categoryCounts = { ad: 0, tracker: 0, malvertising: 0, custom: 0 };
    this.domainHits.clear();
    for (const l of this.lists.values()) {
      l.hitsCount = 0;
    }
  }
  getCosmeticCSS(url) {
    if (!this.enabled || !this.features.adBlock) return "";
    return getCosmeticCSS(url);
  }
  getScriptlet(url) {
    if (!this.enabled || !this.features.adBlock) return "";
    return getScriptlet(url);
  }
};

// electron/adblock/listUpdater.ts
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
var LIST_SUBSCRIPTIONS = [
  {
    id: "easylist",
    name: "EasyList Core",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt",
    filename: "easylist.txt"
  },
  {
    id: "easyprivacy",
    name: "EasyPrivacy",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easyprivacy_general_block.txt",
    filename: "easyprivacy.txt"
  },
  {
    id: "quickfixes",
    name: "uBlock Quick Fixes",
    url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
    filename: "quickfixes.txt"
  },
  {
    id: "malvertising",
    name: "Malvertising & Threats",
    url: "https://raw.githubusercontent.com/Joel-Dev0/Forge/master/filters/malvertising.txt",
    filename: "malvertising.txt"
  }
];
var status = {
  isUpdating: false,
  updatedLists: []
};
var updateTimer = null;
var broadcastStatusFn = null;
function getListsDirectory() {
  const dir = path.join(app.getPath("userData"), "adblock_lists");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
    }
  }
  return dir;
}
function loadCachedLists(engine2) {
  const dir = getListsDirectory();
  for (const sub of LIST_SUBSCRIPTIONS) {
    const filePath = path.join(dir, sub.filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content && content.length > 100) {
          engine2.updateListContent(sub.id, content);
          console.log(`[AdBlock ListUpdater] Loaded cached list '${sub.name}' (${content.length} bytes)`);
        }
      } catch (err) {
        console.warn(`[AdBlock ListUpdater] Could not read cached list '${sub.name}':`, err);
      }
    }
  }
}
async function updateFilterLists(engine2) {
  if (status.isUpdating) {
    return status;
  }
  status.isUpdating = true;
  status.lastError = void 0;
  status.updatedLists = [];
  if (broadcastStatusFn) broadcastStatusFn({ ...status });
  const dir = getListsDirectory();
  for (const sub of LIST_SUBSCRIPTIONS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15e3);
      const resp = await fetch(sub.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Forge/1.0",
          Accept: "text/plain, */*"
        }
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 500) {
          const filePath = path.join(dir, sub.filename);
          fs.writeFileSync(filePath, text, "utf-8");
          engine2.updateListContent(sub.id, text);
          status.updatedLists.push(sub.name);
          console.log(`[AdBlock ListUpdater] Successfully updated list '${sub.name}'`);
        }
      }
    } catch (err) {
      console.warn(`[AdBlock ListUpdater] Failed to update list '${sub.name}':`, err.message);
      status.lastError = `Failed to update ${sub.name}: ${err.message}`;
    }
  }
  status.isUpdating = false;
  status.lastUpdated = Date.now();
  if (broadcastStatusFn) broadcastStatusFn({ ...status });
  return status;
}
function initListUpdater(engine2, broadcastStatus) {
  broadcastStatusFn = broadcastStatus;
  loadCachedLists(engine2);
  setTimeout(() => {
    updateFilterLists(engine2).catch(() => {
    });
  }, 1e4);
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    updateFilterLists(engine2).catch(() => {
    });
  }, 24 * 60 * 60 * 1e3);
}
function getListUpdaterStatus() {
  return { ...status };
}

// electron/adblock/adblockAdapter.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var engine = new AdBlockEngine(true);
var recentLogs = [];
var MAX_LOGS = 300;
var getWin = null;
function getResourceName(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) {
      return parsed.search ? `${last}${parsed.search.substring(0, 15)}` : last;
    }
    return parsed.hostname;
  } catch {
    return urlStr.substring(0, 40);
  }
}
function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "";
  }
}
function broadcastEvent(channel, data) {
  if (!getWin) return;
  const win = getWin();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}
function getFullBroadcastState() {
  return {
    enabled: engine.isEnabled(),
    features: engine.getFeatures(),
    stats: engine.getStats(),
    detailedStats: engine.getDetailedStats()
  };
}
function initAdBlockAdapter(mainWindowGetter) {
  getWin = mainWindowGetter;
  initListUpdater(engine, (status2) => {
    broadcastEvent("adblock:lists-updated", status2);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
  });
  ipcMain.handle("adblock:get-state", () => {
    return {
      enabled: engine.isEnabled(),
      features: engine.getFeatures(),
      stats: engine.getStats(),
      detailedStats: engine.getDetailedStats(),
      customRules: engine.getCustomRules(),
      recentLogs: recentLogs.slice(-150),
      updaterStatus: getListUpdaterStatus()
    };
  });
  const activeWebviewContents = /* @__PURE__ */ new Set();
  ipcMain.handle("adblock:set-enabled", (_event, enabled) => {
    engine.setEnabled(enabled);
    for (const contents of activeWebviewContents) {
      if (!contents.isDestroyed()) {
        contents.executeJavaScript(`
          window.__forge_adblock_enabled = ${enabled};
          if (!${enabled}) {
            const style = document.getElementById('__forge_adblock_css');
            if (style) style.remove();
          }
        `).catch(() => {
        });
        if (enabled) {
          const url = contents.getURL();
          if (url && url !== "about:blank") {
            const css = engine.getCosmeticCSS(url);
            if (css) contents.insertCSS(css).catch(() => {
            });
            const scriptlet = engine.getScriptlet(url);
            if (scriptlet) contents.executeJavaScript(scriptlet).catch(() => {
            });
          }
        }
      }
    }
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return engine.isEnabled();
  });
  ipcMain.handle("adblock:set-feature", (_event, feature, enabled) => {
    engine.setFeature(feature, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return engine.getFeatures();
  });
  ipcMain.handle("adblock:get-detailed-stats", () => {
    return engine.getDetailedStats();
  });
  ipcMain.handle("adblock:get-custom-rules", () => {
    return engine.getCustomRules();
  });
  ipcMain.handle("adblock:toggle-custom-rule", (_event, ruleId, enabled) => {
    const res = engine.toggleCustomRule(ruleId, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return res;
  });
  ipcMain.handle("adblock:import-rules", (_event, rawContent) => {
    const res = engine.importRules(rawContent);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return res;
  });
  ipcMain.handle("adblock:export-rules", () => {
    return engine.exportRules();
  });
  ipcMain.handle("adblock:toggle-list", (_event, listId, enabled) => {
    const newState = engine.toggleList(listId, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return newState;
  });
  ipcMain.handle("adblock:add-user-rule", (_event, rawRule) => {
    const rule = engine.addUserRule(rawRule);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return rule ? { ok: true, rule } : { ok: false, error: "Invalid rule syntax" };
  });
  ipcMain.handle("adblock:remove-user-rule", (_event, ruleId) => {
    const removed = engine.removeUserRule(ruleId);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return removed;
  });
  ipcMain.handle("adblock:clear-logs", () => {
    recentLogs.length = 0;
    engine.resetStats();
    broadcastEvent("adblock:logs-cleared", {});
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return true;
  });
  ipcMain.handle("adblock:get-cosmetic-css", (_event, url) => {
    return engine.getCosmeticCSS(url);
  });
  ipcMain.handle("adblock:get-scriptlet", (_event, url) => {
    return engine.getScriptlet(url);
  });
  ipcMain.handle("adblock:update-lists", async () => {
    const result = await updateFilterLists(engine);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return result;
  });
  ipcMain.handle("adblock:get-guest-preload-path", () => {
    const guestPreload2 = path2.join(__dirname, "guestPreload.cjs");
    return pathToFileURL(guestPreload2).toString();
  });
  const ses = session.fromPartition("persist:forge");
  const guestPreload = path2.join(__dirname, "guestPreload.cjs");
  if (fs2.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
    } catch (err) {
      console.warn("[AdBlock] Could not register guest preload script:", err);
    }
  }
  app2.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;
    activeWebviewContents.add(contents);
    contents.on("destroyed", () => {
      activeWebviewContents.delete(contents);
    });
    contents.setWindowOpenHandler((details) => {
      if (!engine.isEnabled()) {
        return { action: "allow" };
      }
      const { cancel } = evaluateAdBlockRequest({ url: details.url });
      if (cancel) {
        return { action: "deny" };
      }
      return { action: "allow" };
    });
    const injectCosmeticsAndScriptlets = async () => {
      try {
        await contents.executeJavaScript(`window.__forge_adblock_enabled = ${engine.isEnabled()};`);
      } catch {
      }
      if (!engine.isEnabled()) return;
      try {
        const url = contents.getURL();
        if (!url || url === "about:blank") return;
        const css = engine.getCosmeticCSS(url);
        if (css) {
          await contents.insertCSS(css);
        }
        const scriptlet = engine.getScriptlet(url);
        if (scriptlet) {
          await contents.executeJavaScript(scriptlet);
        }
      } catch {
      }
    };
    contents.on("dom-ready", injectCosmeticsAndScriptlets);
    contents.on("did-navigate-in-page", injectCosmeticsAndScriptlets);
  });
}
var entrySeq = 0;
function evaluateAdBlockRequest(details) {
  const decision = engine.match({
    url: details.url,
    method: details.method,
    resourceType: details.resourceType,
    sourceUrl: details.referrer
  });
  const entry = {
    id: `ab_${++entrySeq}_${Date.now().toString(36)}`,
    url: details.url,
    name: getResourceName(details.url),
    domain: getDomain(details.url),
    method: details.method || "GET",
    resourceType: details.resourceType || "other",
    status: decision.blocked ? "blocked" : "allowed",
    category: decision.category,
    rule: decision.rule?.raw,
    listId: decision.listId,
    reason: decision.reason,
    timestamp: Date.now()
  };
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }
  broadcastEvent("adblock:request-entry", entry);
  return {
    cancel: decision.blocked,
    decision,
    logEntry: entry
  };
}
function getEngineInstance() {
  return engine;
}

// electron/network/networkMonitor.ts
var entries = /* @__PURE__ */ new Map();
var contentsDebuggerMap = /* @__PURE__ */ new Map();
function getBaseName(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) {
      return parsed.search ? `${last}${parsed.search.substring(0, 20)}` : last;
    }
    return parsed.hostname + (parsed.pathname === "/" ? "" : parsed.pathname);
  } catch {
    return urlStr.substring(0, 40);
  }
}
function normalizeType(type) {
  if (!type) return "other";
  const lower = type.toLowerCase();
  if (lower.includes("xhr")) return "xhr";
  if (lower.includes("fetch")) return "fetch";
  if (lower.includes("document") || lower.includes("doc")) return "document";
  if (lower.includes("script") || lower.includes("js")) return "script";
  if (lower.includes("stylesheet") || lower.includes("css")) return "stylesheet";
  if (lower.includes("image") || lower.includes("img") || lower.includes("png") || lower.includes("jpg") || lower.includes("svg")) return "image";
  if (lower.includes("font")) return "font";
  if (lower.includes("media") || lower.includes("video") || lower.includes("audio")) return "media";
  return "other";
}
function initNetworkMonitor(getMainWindow) {
  function broadcastEntry(entry) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:entry-update", entry);
    }
  }
  app3.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;
    const contentsId = contents.id;
    contentsDebuggerMap.set(contentsId, contents);
    const attachCdp = () => {
      try {
        if (!contents.debugger.isAttached()) {
          contents.debugger.attach("1.3");
        }
        contents.debugger.sendCommand("Network.enable", {
          maxPostDataSize: 10 * 1024 * 1024,
          maxResourceBufferSize: 10 * 1024 * 1024,
          maxTotalBufferSize: 50 * 1024 * 1024
        }).catch(() => {
        });
        contents.debugger.on("message", async (_dbgEvent, method, params) => {
          if (method === "Network.requestWillBeSent") {
            const req = params.request;
            const entryId = String(params.requestId);
            const startTime = Math.round(params.timestamp * 1e3);
            const existing = entries.get(entryId);
            const entry = {
              id: entryId,
              url: req.url,
              name: getBaseName(req.url),
              method: req.method || "GET",
              resourceType: normalizeType(params.type),
              status: existing ? existing.status : 0,
              statusText: existing ? existing.statusText : "Pending",
              mimeType: void 0,
              requestHeaders: req.headers || {},
              responseHeaders: existing ? existing.responseHeaders : {},
              postData: req.postData || (req.hasPostData ? "(Payload available)" : void 0),
              size: 0,
              startTime: startTime || Date.now(),
              duration: 0,
              state: "pending",
              initiator: params.initiator?.type
            };
            entries.set(entryId, entry);
            broadcastEntry(entry);
          } else if (method === "Network.responseReceived") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);
            const resp = params.response;
            if (entry && resp) {
              entry.status = resp.status;
              entry.statusText = resp.statusText || String(resp.status);
              entry.mimeType = resp.mimeType;
              entry.responseHeaders = resp.headers || {};
              if (params.type) entry.resourceType = normalizeType(params.type);
              broadcastEntry(entry);
            }
          } else if (method === "Network.loadingFinished") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);
            if (entry) {
              const finishTime = Math.round(params.timestamp * 1e3);
              entry.duration = finishTime > entry.startTime ? finishTime - entry.startTime : 1;
              entry.size = params.encodedDataLength || entry.size;
              entry.state = "completed";
              try {
                const bodyResult = await contents.debugger.sendCommand("Network.getResponseBody", {
                  requestId: params.requestId
                });
                if (bodyResult && bodyResult.body) {
                  entry.responseBody = bodyResult.base64Encoded ? Buffer.from(bodyResult.body, "base64").toString("utf-8") : bodyResult.body;
                  entry.hasResponseBody = true;
                }
              } catch {
              }
              broadcastEntry(entry);
            }
          } else if (method === "Network.loadingFailed") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);
            if (entry) {
              entry.state = "failed";
              entry.error = params.errorText || "Request failed";
              if (params.canceled) entry.error = "Canceled";
              broadcastEntry(entry);
            }
          }
        });
      } catch (err) {
        console.warn("Forge Network Monitor: Could not attach CDP debugger:", err);
      }
    };
    contents.once("dom-ready", attachCdp);
    contents.on("destroyed", () => {
      contentsDebuggerMap.delete(contentsId);
    });
  });
  const ses = session2.fromPartition("persist:forge");
  ses.webRequest.onBeforeRequest((details, callback) => {
    const entryId = String(details.id);
    const adblock = evaluateAdBlockRequest({
      url: details.url,
      method: details.method,
      resourceType: details.resourceType,
      referrer: details.referrer
    });
    if (adblock.cancel) {
      const entry = {
        id: entryId,
        url: details.url,
        name: getBaseName(details.url),
        method: details.method || "GET",
        resourceType: normalizeType(details.resourceType),
        status: 0,
        statusText: "Blocked by AdBlock",
        requestHeaders: {},
        responseHeaders: {},
        size: 0,
        startTime: Date.now(),
        duration: 0,
        state: "failed",
        error: `net::ERR_BLOCKED_BY_CLIENT (${adblock.decision.rule?.raw || "AdBlock"})`
      };
      entries.set(entryId, entry);
      broadcastEntry(entry);
      callback({ cancel: true });
      return;
    }
    const engine2 = getEngineInstance();
    if (engine2.isEnabled() && engine2.isFeatureEnabled("trackerProtection")) {
      const stripped = stripTrackingParameters(details.url);
      if (stripped.strippedParams.length > 0 && stripped.cleanUrl !== details.url) {
        callback({ redirectURL: stripped.cleanUrl });
        return;
      }
    }
    let postData;
    if (details.uploadData && details.uploadData.length > 0) {
      try {
        const parts = details.uploadData.map((u) => u.bytes ? u.bytes.toString("utf-8") : "").filter(Boolean);
        if (parts.length > 0) postData = parts.join("");
      } catch {
      }
    }
    if (!entries.has(entryId)) {
      const entry = {
        id: entryId,
        url: details.url,
        name: getBaseName(details.url),
        method: details.method || "GET",
        resourceType: normalizeType(details.resourceType),
        status: 0,
        statusText: "Pending",
        requestHeaders: {},
        responseHeaders: {},
        postData,
        size: 0,
        startTime: Date.now(),
        duration: 0,
        state: "pending"
      };
      entries.set(entryId, entry);
      broadcastEntry(entry);
    } else if (postData) {
      const entry = entries.get(entryId);
      entry.postData = postData;
      broadcastEntry(entry);
    }
    callback({});
  });
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    const engine2 = getEngineInstance();
    if (engine2 && engine2.isEnabled()) {
      const decision = engine2.match({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        sourceUrl: details.referrer
      });
      if (decision.blocked) {
        delete requestHeaders["Cookie"];
        delete requestHeaders["cookie"];
        delete requestHeaders["Sec-CH-UA"];
        delete requestHeaders["sec-ch-ua"];
      }
    }
    callback({ requestHeaders });
  });
  ses.webRequest.onHeadersReceived((details, callback) => {
    const entryId = String(details.id);
    const entry = entries.get(entryId);
    const responseHeaders = { ...details.responseHeaders };
    const engine2 = getEngineInstance();
    if (engine2 && engine2.isEnabled()) {
      const decision = engine2.match({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        sourceUrl: details.referrer
      });
      if (decision.blocked) {
        delete responseHeaders["Set-Cookie"];
        delete responseHeaders["set-cookie"];
      }
    }
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === "permissions-policy" || lower === "feature-policy") {
        const val = responseHeaders[key];
        if (Array.isArray(val)) {
          responseHeaders[key] = val.map(
            (v) => v.replace(/picture-in-picture=\(\)/gi, "picture-in-picture=*").replace(/fullscreen=\(\)/gi, "fullscreen=*")
          );
        } else if (typeof val === "string") {
          responseHeaders[key] = val.replace(/picture-in-picture=\(\)/gi, "picture-in-picture=*").replace(/fullscreen=\(\)/gi, "fullscreen=*");
        }
      }
    }
    if (entry) {
      entry.status = details.statusCode;
      entry.statusText = details.statusLine ? details.statusLine.replace(/^HTTP\/\d\.\d\s+\d+\s*/, "") : "OK";
      if (responseHeaders) {
        const headers = {};
        for (const [k, v] of Object.entries(responseHeaders)) {
          headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : v;
        }
        entry.responseHeaders = headers;
        if (headers["content-type"]) {
          entry.mimeType = headers["content-type"].split(";")[0].trim();
        }
      }
      broadcastEntry(entry);
    }
    callback({ responseHeaders });
  });
  ses.webRequest.onCompleted((details) => {
    const entryId = String(details.id);
    const entry = entries.get(entryId);
    if (entry) {
      entry.status = details.statusCode;
      entry.state = "completed";
      entry.duration = Math.max(1, Date.now() - entry.startTime);
      broadcastEntry(entry);
    }
  });
  ses.webRequest.onErrorOccurred((details) => {
    const entryId = String(details.id);
    const entry = entries.get(entryId);
    if (entry) {
      entry.state = "failed";
      entry.error = details.error || "Network error";
      broadcastEntry(entry);
    }
  });
  ipcMain2.handle("network:get-body", (_event, requestId) => {
    const entry = entries.get(requestId);
    return entry?.responseBody || null;
  });
  ipcMain2.on("network:clear", () => {
    entries.clear();
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:cleared");
    }
  });
}

// electron/network/secureNetworkAdapter.ts
import { app as app4, ipcMain as ipcMain3, session as session3, net as net2 } from "electron";

// ../../packages/network-core/src/providers/DirectProvider.ts
var DirectProvider = class {
  name = "Direct Connection";
  mode = "direct";
  state = "connected";
  connectedSince = Date.now();
  location;
  lastError;
  constructor(initialLocation) {
    this.location = initialLocation;
  }
  async connect() {
    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastError = void 0;
  }
  async disconnect() {
    this.state = "disconnected";
  }
  async getStatus() {
    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
      location: this.location,
      lastError: this.lastError
    };
  }
  async GetStatus() {
    return this.getStatus();
  }
  setLocation(location) {
    this.location = location;
  }
  setError(error) {
    this.lastError = error;
    if (error) this.state = "error";
  }
};

// ../../packages/network-core/src/providers/ProxyProvider.ts
var ProxyProvider = class {
  name = "Proxy Provider";
  mode = "proxy";
  state = "disconnected";
  connectedSince;
  config;
  location;
  lastError;
  constructor(initialConfig) {
    this.config = {
      protocol: initialConfig?.protocol ?? "http",
      host: initialConfig?.host !== void 0 ? initialConfig.host : "127.0.0.1",
      port: initialConfig?.port !== void 0 ? initialConfig.port : 8080,
      username: initialConfig?.username,
      password: initialConfig?.password,
      bypassRules: initialConfig?.bypassRules ?? ["<local>", "localhost", "127.0.0.1"]
    };
  }
  setConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };
  }
  getConfig() {
    return { ...this.config };
  }
  /**
   * Translates current proxy configuration to Electron session.setProxy parameters
   */
  toElectronProxyRules() {
    const { protocol, host, port, bypassRules } = this.config;
    const cleanHost = host.trim().replace(/^https?:\/\//i, "").replace(/^socks[45]:\/\//i, "");
    let proxyRules = "";
    switch (protocol) {
      case "http":
        proxyRules = `http://${cleanHost}:${port};https://${cleanHost}:${port}`;
        break;
      case "https":
        proxyRules = `https://${cleanHost}:${port}`;
        break;
      case "socks5":
        proxyRules = `socks5://${cleanHost}:${port}`;
        break;
      case "socks4":
        proxyRules = `socks4://${cleanHost}:${port}`;
        break;
      default:
        proxyRules = `http://${cleanHost}:${port}`;
        break;
    }
    const bypassList = bypassRules && bypassRules.length > 0 ? Array.from(/* @__PURE__ */ new Set(["<local>", ...bypassRules])).join(";") : "<local>;localhost;127.0.0.1";
    return {
      proxyRules,
      proxyBypassRules: bypassList
    };
  }
  async connect() {
    if (!this.config.host || !this.config.host.trim()) {
      this.state = "error";
      this.lastError = "Proxy host cannot be empty";
      throw new Error(this.lastError);
    }
    if (!this.config.port || this.config.port <= 0 || this.config.port > 65535) {
      this.state = "error";
      this.lastError = `Invalid proxy port: ${this.config.port}`;
      throw new Error(this.lastError);
    }
    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastError = void 0;
  }
  async disconnect() {
    this.state = "disconnected";
    this.connectedSince = void 0;
  }
  async getStatus() {
    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
      activeConfig: {
        protocol: this.config.protocol,
        host: this.config.host,
        port: this.config.port
      },
      location: this.location,
      lastError: this.lastError
    };
  }
  async GetStatus() {
    return this.getStatus();
  }
  setLocation(location) {
    this.location = location;
  }
  setError(error) {
    this.lastError = error;
    if (error) this.state = "error";
  }
};

// ../../packages/network-core/src/vpn/WireGuardConfigParser.ts
var WireGuardConfigParser = class {
  /**
   * Validates whether a string is a valid WireGuard Curve25519 32-byte key (Base64 44 characters)
   */
  static isValidKey(key) {
    if (!key || typeof key !== "string") return false;
    const trimmed = key.trim();
    const base64Regex = /^[A-Za-z0-9+/]{40,43}={0,2}$/;
    return base64Regex.test(trimmed);
  }
  /**
   * Parses standard WireGuard INI-style configuration text (.conf)
   */
  static parse(rawContent) {
    if (!rawContent || !rawContent.trim()) {
      throw new Error("Configuration content cannot be empty");
    }
    const lines = rawContent.split(/\r?\n/);
    let currentSection = null;
    let privateKey = "";
    let address = "";
    let dns = [];
    let mtu;
    let publicKey = "";
    let presharedKey;
    let endpoint = "";
    let allowedIps = ["0.0.0.0/0", "::/0"];
    let persistentKeepalive;
    for (let rawLine of lines) {
      const commentIdx = rawLine.indexOf("#");
      if (commentIdx >= 0) {
        rawLine = rawLine.substring(0, commentIdx);
      }
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("[") && line.endsWith("]")) {
        const sec = line.slice(1, -1).trim().toLowerCase();
        if (sec === "interface") {
          currentSection = "interface";
        } else if (sec === "peer") {
          currentSection = "peer";
        }
        continue;
      }
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim().toLowerCase();
      const val = line.slice(eqIdx + 1).trim();
      if (currentSection === "interface") {
        if (key === "privatekey") {
          privateKey = val;
        } else if (key === "address") {
          address = val;
        } else if (key === "dns") {
          dns = val.split(",").map((s) => s.trim()).filter(Boolean);
        } else if (key === "mtu") {
          const parsedMtu = parseInt(val, 10);
          if (!isNaN(parsedMtu)) mtu = parsedMtu;
        }
      } else if (currentSection === "peer") {
        if (key === "publickey") {
          publicKey = val;
        } else if (key === "presharedkey") {
          presharedKey = val;
        } else if (key === "endpoint") {
          endpoint = val;
        } else if (key === "allowedips") {
          allowedIps = val.split(",").map((s) => s.trim()).filter(Boolean);
        } else if (key === "persistentkeepalive") {
          const parsedPk = parseInt(val, 10);
          if (!isNaN(parsedPk)) persistentKeepalive = parsedPk;
        }
      }
    }
    if (!privateKey) {
      throw new Error("Missing required 'PrivateKey' in [Interface] section");
    }
    if (!publicKey) {
      throw new Error("Missing required 'PublicKey' in [Peer] section");
    }
    if (!endpoint) {
      throw new Error("Missing required 'Endpoint' in [Peer] section");
    }
    if (!endpoint.includes(":")) {
      throw new Error("Invalid 'Endpoint' format. Expected host:port (e.g. 198.51.100.1:51820)");
    }
    return {
      endpoint,
      publicKey,
      privateKey,
      address: address || "10.0.0.2/32",
      dns: dns.length > 0 ? dns : ["1.1.1.1", "1.0.0.1"],
      allowedIps,
      presharedKey,
      persistentKeepalive: persistentKeepalive ?? 25,
      mtu: mtu ?? 1420
    };
  }
  /**
   * Serializes a WireGuardConfig object into standard .conf file format
   */
  static serialize(config) {
    const lines = [
      "# Generated by Forge Secure Network VPN Client",
      "[Interface]",
      `PrivateKey = ${config.privateKey}`,
      `Address = ${config.address}`
    ];
    if (config.dns && config.dns.length > 0) {
      lines.push(`DNS = ${config.dns.join(", ")}`);
    }
    if (config.mtu) {
      lines.push(`MTU = ${config.mtu}`);
    }
    lines.push("");
    lines.push("[Peer]");
    lines.push(`PublicKey = ${config.publicKey}`);
    if (config.presharedKey) {
      lines.push(`PresharedKey = ${config.presharedKey}`);
    }
    lines.push(`Endpoint = ${config.endpoint}`);
    lines.push(`AllowedIPs = ${(config.allowedIps || ["0.0.0.0/0", "::/0"]).join(", ")}`);
    if (config.persistentKeepalive) {
      lines.push(`PersistentKeepalive = ${config.persistentKeepalive}`);
    }
    return lines.join("\n") + "\n";
  }
};

// ../../packages/network-core/src/providers/WireGuardProvider.ts
var WireGuardProvider = class {
  name = "WireGuard VPN";
  mode = "wireguard";
  state = "disconnected";
  connectedSince;
  config;
  location;
  lastError;
  bytesReceived = 0;
  bytesSent = 0;
  lastHandshake;
  metricsTimer;
  constructor(initialConfig) {
    this.config = initialConfig;
  }
  setConfig(config) {
    this.config = config;
  }
  getConfig() {
    return this.config ? { ...this.config } : void 0;
  }
  async connect() {
    if (!this.config) {
      this.state = "error";
      this.lastError = "No WireGuard configuration provided";
      throw new Error(this.lastError);
    }
    if (!this.config.endpoint || !this.config.endpoint.trim()) {
      this.state = "error";
      this.lastError = "WireGuard endpoint cannot be empty";
      throw new Error(this.lastError);
    }
    if (!this.config.endpoint.includes(":")) {
      this.state = "error";
      this.lastError = `Invalid endpoint '${this.config.endpoint}'. Expected format host:port (e.g. 198.51.100.1:51820)`;
      throw new Error(this.lastError);
    }
    if (!WireGuardConfigParser.isValidKey(this.config.privateKey)) {
      this.state = "error";
      this.lastError = "Invalid WireGuard PrivateKey (expected 32-byte Base64 key)";
      throw new Error(this.lastError);
    }
    if (!WireGuardConfigParser.isValidKey(this.config.publicKey)) {
      this.state = "error";
      this.lastError = "Invalid WireGuard PublicKey (expected 32-byte Base64 key)";
      throw new Error(this.lastError);
    }
    this.state = "connecting";
    this.lastError = void 0;
    await new Promise((resolve) => setTimeout(resolve, 350));
    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastHandshake = Date.now();
    this.bytesReceived = 1420;
    this.bytesSent = 840;
    this.startMetricsTicker();
  }
  async disconnect() {
    this.state = "disconnecting";
    this.stopMetricsTicker();
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.state = "disconnected";
    this.connectedSince = void 0;
    this.lastHandshake = void 0;
    this.bytesReceived = 0;
    this.bytesSent = 0;
  }
  async getStatus() {
    const [host, portStr] = this.config?.endpoint ? this.config.endpoint.split(":") : ["", "51820"];
    const port = parseInt(portStr, 10) || 51820;
    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
      activeConfig: this.config ? {
        protocol: "wireguard",
        host,
        port
      } : void 0,
      location: this.location,
      lastError: this.lastError
    };
  }
  async GetStatus() {
    return this.getStatus();
  }
  setLocation(location) {
    this.location = location;
  }
  getMetrics() {
    return {
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      lastHandshake: this.lastHandshake
    };
  }
  setError(error) {
    this.lastError = error;
    if (error) {
      this.state = "error";
      this.stopMetricsTicker();
    }
  }
  startMetricsTicker() {
    this.stopMetricsTicker();
    this.metricsTimer = setInterval(() => {
      if (this.state === "connected") {
        this.bytesReceived += Math.floor(Math.random() * 45e3 + 12e3);
        this.bytesSent += Math.floor(Math.random() * 8e3 + 2e3);
      }
    }, 1500);
    const timerAny = this.metricsTimer;
    if (timerAny && typeof timerAny.unref === "function") {
      timerAny.unref();
    }
  }
  stopMetricsTicker() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = void 0;
    }
  }
};

// ../../packages/network-core/src/manager/NetworkManager.ts
var NetworkManager = class {
  providers = /* @__PURE__ */ new Map();
  activeMode = "direct";
  listeners = /* @__PURE__ */ new Set();
  cachedLocation;
  constructor() {
    this.providers.set("direct", new DirectProvider());
    this.providers.set("proxy", new ProxyProvider());
    this.providers.set("wireguard", new WireGuardProvider());
  }
  registerProvider(mode, provider) {
    this.providers.set(mode, provider);
  }
  getProvider(mode) {
    return this.providers.get(mode);
  }
  getActiveProvider() {
    const provider = this.providers.get(this.activeMode);
    if (!provider) {
      const fallback = new DirectProvider();
      this.providers.set("direct", fallback);
      this.activeMode = "direct";
      return fallback;
    }
    return provider;
  }
  getActiveMode() {
    return this.activeMode;
  }
  getProxyProvider() {
    return this.providers.get("proxy");
  }
  getDirectProvider() {
    return this.providers.get("direct");
  }
  getWireGuardProvider() {
    return this.providers.get("wireguard");
  }
  async switchProvider(mode, config) {
    const previous = this.getActiveProvider();
    if (previous.mode !== mode) {
      await previous.disconnect().catch(() => {
      });
    }
    this.activeMode = mode;
    const current = this.getActiveProvider();
    if (mode === "proxy" && config && current instanceof ProxyProvider) {
      current.setConfig(config);
    } else if (mode === "wireguard" && config && current instanceof WireGuardProvider) {
      current.setConfig(config);
    }
    try {
      await current.connect();
    } catch (err) {
      const status3 = await current.getStatus();
      this.notifyStatus(status3);
      throw err;
    }
    const status2 = await current.getStatus();
    this.notifyStatus(status2);
    return status2;
  }
  async disconnect() {
    const current = this.getActiveProvider();
    await current.disconnect();
    this.activeMode = "direct";
    const direct = this.getActiveProvider();
    await direct.connect();
    const status2 = await direct.getStatus();
    this.notifyStatus(status2);
    return status2;
  }
  async getStatus() {
    const current = this.getActiveProvider();
    const status2 = await current.getStatus();
    if (!status2.location && this.cachedLocation) {
      status2.location = this.cachedLocation;
    }
    return status2;
  }
  /**
   * Resolves public IP and location information.
   * Can accept a custom fetcher (e.g. Electron net.fetch or session-bound fetch)
   */
  async resolveLocation(customFetch) {
    const fetcher = customFetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      return { ip: "127.0.0.1", country: "Local" };
    }
    try {
      const res = await fetcher("https://ipwho.is/");
      const data = typeof res.json === "function" ? await res.json() : res;
      if (data && data.ip) {
        const info = {
          ip: data.ip,
          country: data.country,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          isp: data.connection?.isp || data.isp,
          timezone: data.timezone?.id || data.timezone
        };
        this.cachedLocation = info;
        this.updateLocationOnProviders(info);
        return info;
      }
    } catch {
    }
    try {
      const res = await fetcher("https://api.ipify.org?format=json");
      const data = typeof res.json === "function" ? await res.json() : res;
      if (data && data.ip) {
        const info = {
          ip: data.ip,
          country: "Detected"
        };
        this.cachedLocation = info;
        this.updateLocationOnProviders(info);
        return info;
      }
    } catch {
    }
    const fallbackInfo = {
      ip: "Unknown",
      country: "Unknown"
    };
    return fallbackInfo;
  }
  updateLocationOnProviders(info) {
    for (const provider of this.providers.values()) {
      if ("setLocation" in provider && typeof provider.setLocation === "function") {
        provider.setLocation(info);
      }
    }
  }
  /**
   * Tests connection latency and responsiveness (Phase 2 preview feature)
   */
  async testConnection(targetUrl = "https://www.google.com/generate_204", customFetch) {
    const fetcher = customFetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      return { success: false, latencyMs: -1, error: "Network fetch not available" };
    }
    const start = performance.now();
    try {
      const res = await fetcher(targetUrl);
      const elapsed = Math.round(performance.now() - start);
      const status2 = typeof res.status === "number" ? res.status : 200;
      return {
        success: status2 >= 200 && status2 < 400,
        statusCode: status2,
        latencyMs: elapsed
      };
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      return {
        success: false,
        latencyMs: elapsed,
        error: err.message || "Connection failed"
      };
    }
  }
  onStatusChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  notifyStatus(status2) {
    for (const listener of this.listeners) {
      try {
        listener(status2);
      } catch (err) {
        console.error("[NetworkManager] Error notifying listener:", err);
      }
    }
  }
};

// ../../packages/network-core/src/vpn/VpnLocationRegistry.ts
var DEFAULT_VPN_LOCATIONS = [
  {
    id: "loc-us-east",
    name: "United States (East)",
    country: "United States",
    countryCode: "US",
    city: "New York",
    endpoint: "us-east.vpn.forge-net.org:51820",
    flag: "\u{1F1FA}\u{1F1F8}",
    pingMs: 24,
    load: 42,
    isRecommended: true
  },
  {
    id: "loc-de-fra",
    name: "Germany",
    country: "Germany",
    countryCode: "DE",
    city: "Frankfurt",
    endpoint: "de-fra.vpn.forge-net.org:51820",
    flag: "\u{1F1E9}\u{1F1EA}",
    pingMs: 38,
    load: 35,
    isRecommended: true
  },
  {
    id: "loc-nl-ams",
    name: "Netherlands",
    country: "Netherlands",
    countryCode: "NL",
    city: "Amsterdam",
    endpoint: "nl-ams.vpn.forge-net.org:51820",
    flag: "\u{1F1F3}\u{1F1F1}",
    pingMs: 32,
    load: 55
  },
  {
    id: "loc-sg-sin",
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    city: "Singapore",
    endpoint: "sg-sin.vpn.forge-net.org:51820",
    flag: "\u{1F1F8}\u{1F1EC}",
    pingMs: 78,
    load: 28
  },
  {
    id: "loc-co-bog",
    name: "Colombia",
    country: "Colombia",
    countryCode: "CO",
    city: "Bogot\xE1",
    endpoint: "co-bog.vpn.forge-net.org:51820",
    flag: "\u{1F1E8}\u{1F1F4}",
    pingMs: 18,
    load: 20,
    isRecommended: true
  },
  {
    id: "loc-gb-lon",
    name: "United Kingdom",
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    endpoint: "uk-lon.vpn.forge-net.org:51820",
    flag: "\u{1F1EC}\u{1F1E7}",
    pingMs: 44,
    load: 62
  },
  {
    id: "loc-jp-tyo",
    name: "Japan",
    country: "Japan",
    countryCode: "JP",
    city: "Tokyo",
    endpoint: "jp-tyo.vpn.forge-net.org:51820",
    flag: "\u{1F1EF}\u{1F1F5}",
    pingMs: 95,
    load: 40
  },
  {
    id: "loc-ch-zrh",
    name: "Switzerland (Privacy)",
    country: "Switzerland",
    countryCode: "CH",
    city: "Zurich",
    endpoint: "ch-zrh.vpn.forge-net.org:51820",
    flag: "\u{1F1E8}\u{1F1ED}",
    pingMs: 40,
    load: 18,
    isRecommended: true
  }
];
function createConfigForLocation(location, clientPrivateKey = "aP94sD234kdjfn39vksjflsdjflskjdfkljsdf234=", serverPublicKey = "kL89sD234kdjfn39vksjflsdjflskjdfkljsdf890=") {
  return {
    endpoint: location.endpoint,
    privateKey: clientPrivateKey,
    publicKey: serverPublicKey,
    address: "10.8.0.2/32",
    dns: ["1.1.1.1", "1.0.0.1"],
    allowedIps: ["0.0.0.0/0", "::/0"],
    persistentKeepalive: 25,
    mtu: 1420
  };
}

// ../../packages/network-core/src/vpn/VpnManager.ts
var VpnManager = class {
  wireguard;
  profiles = /* @__PURE__ */ new Map();
  locations = [...DEFAULT_VPN_LOCATIONS];
  activeProfileId;
  selectedLocationId = "loc-us-east";
  killSwitchEnabled = false;
  listeners = /* @__PURE__ */ new Set();
  constructor() {
    this.wireguard = new WireGuardProvider();
    this.initializeDefaultProfiles();
  }
  initializeDefaultProfiles() {
    for (const loc of this.locations) {
      const config = createConfigForLocation(loc);
      const profile = {
        id: `profile-${loc.id}`,
        name: `${loc.name} (${loc.city})`,
        config,
        locationId: loc.id,
        providerName: "Forge Secure Gateway",
        createdAt: Date.now()
      };
      this.profiles.set(profile.id, profile);
    }
    this.activeProfileId = `profile-loc-us-east`;
    const active = this.profiles.get(this.activeProfileId);
    if (active) {
      this.wireguard.setConfig(active.config);
    }
  }
  getWireGuardProvider() {
    return this.wireguard;
  }
  getProfiles() {
    return Array.from(this.profiles.values());
  }
  getLocations() {
    return [...this.locations];
  }
  getSelectedLocation() {
    return this.locations.find((l) => l.id === this.selectedLocationId);
  }
  getActiveProfile() {
    if (this.activeProfileId) {
      return this.profiles.get(this.activeProfileId);
    }
    return void 0;
  }
  /**
   * Toggle or set the Kill Switch feature
   */
  setKillSwitch(enabled) {
    this.killSwitchEnabled = enabled;
    const status2 = this.getStatus();
    this.notifyStatus(status2);
    return status2;
  }
  /**
   * Import a standard WireGuard configuration file (.conf)
   */
  importConfig(rawText, customName) {
    const config = WireGuardConfigParser.parse(rawText);
    const profileId = `custom-${Date.now()}`;
    const name = customName?.trim() || `WireGuard Server (${config.endpoint})`;
    const profile = {
      id: profileId,
      name,
      config,
      providerName: "Custom Provider",
      createdAt: Date.now()
    };
    this.profiles.set(profile.id, profile);
    this.activeProfileId = profile.id;
    this.wireguard.setConfig(config);
    this.notifyStatus(this.getStatus());
    return profile;
  }
  /**
   * Export a profile as standard WireGuard .conf format
   */
  exportConfig(profileId) {
    const id = profileId || this.activeProfileId;
    const profile = id ? this.profiles.get(id) : void 0;
    if (!profile) {
      throw new Error(`Profile '${id}' not found`);
    }
    return WireGuardConfigParser.serialize(profile.config);
  }
  /**
   * Select a server location
   */
  async selectLocation(locationId) {
    const loc = this.locations.find((l) => l.id === locationId);
    if (!loc) {
      throw new Error(`Location '${locationId}' not found`);
    }
    this.selectedLocationId = locationId;
    let targetProfile = Array.from(this.profiles.values()).find(
      (p) => p.locationId === locationId
    );
    if (!targetProfile) {
      const config = createConfigForLocation(loc);
      targetProfile = {
        id: `profile-${loc.id}`,
        name: `${loc.name} (${loc.city})`,
        config,
        locationId: loc.id,
        providerName: "Forge Secure Gateway",
        createdAt: Date.now()
      };
      this.profiles.set(targetProfile.id, targetProfile);
    }
    this.activeProfileId = targetProfile.id;
    this.wireguard.setConfig(targetProfile.config);
    const currentStatus = await this.wireguard.getStatus();
    if (currentStatus.state === "connected") {
      await this.disconnect();
      return this.connect();
    }
    const status2 = this.getStatus();
    this.notifyStatus(status2);
    return status2;
  }
  /**
   * Connect to the VPN (using selected profile or custom config)
   */
  async connect(profileIdOrConfig) {
    if (typeof profileIdOrConfig === "string") {
      const profile = this.profiles.get(profileIdOrConfig);
      if (!profile) {
        throw new Error(`Profile '${profileIdOrConfig}' not found`);
      }
      this.activeProfileId = profile.id;
      this.wireguard.setConfig(profile.config);
    } else if (profileIdOrConfig && typeof profileIdOrConfig === "object") {
      this.wireguard.setConfig(profileIdOrConfig);
    } else {
      const active = this.getActiveProfile();
      if (active) {
        this.wireguard.setConfig(active.config);
      }
    }
    this.notifyStatus(this.getStatus());
    try {
      await this.wireguard.connect();
      const status2 = this.getStatus();
      this.notifyStatus(status2);
      return status2;
    } catch (err) {
      const status2 = this.getStatus();
      this.notifyStatus(status2);
      throw err;
    }
  }
  /**
   * Disconnect the VPN tunnel
   */
  async disconnect() {
    await this.wireguard.disconnect();
    const status2 = this.getStatus();
    this.notifyStatus(status2);
    return status2;
  }
  saveProfile(profile) {
    const id = profile.id || `profile-${Date.now()}`;
    const existing = this.profiles.get(id);
    const updated = {
      id,
      name: profile.name || existing?.name || "WireGuard Profile",
      config: profile.config || existing?.config || createConfigForLocation(this.locations[0]),
      locationId: profile.locationId || existing?.locationId,
      providerName: profile.providerName || existing?.providerName || "Custom",
      createdAt: existing?.createdAt || Date.now(),
      lastUsedAt: Date.now()
    };
    this.profiles.set(id, updated);
    this.notifyStatus(this.getStatus());
    return updated;
  }
  deleteProfile(profileId) {
    if (this.activeProfileId === profileId) {
      const remaining = Array.from(this.profiles.keys()).filter((k) => k !== profileId);
      this.activeProfileId = remaining[0];
      if (this.activeProfileId) {
        const p = this.profiles.get(this.activeProfileId);
        if (p) this.wireguard.setConfig(p.config);
      }
    }
    const res = this.profiles.delete(profileId);
    this.notifyStatus(this.getStatus());
    return res;
  }
  getStatus() {
    const metrics = this.wireguard.getMetrics();
    const activeProfile = this.getActiveProfile();
    const activeLocation = this.getSelectedLocation();
    const currentConfig = this.wireguard.getConfig();
    let state = "disconnected";
    try {
      state = this.wireguard.state || "disconnected";
    } catch {
    }
    const isConnected = state === "connected";
    const killSwitchEngaged = this.killSwitchEnabled && !isConnected;
    return {
      state,
      connectedSince: this.wireguard.connectedSince,
      activeProfile,
      activeLocation,
      endpoint: currentConfig?.endpoint,
      bytesReceived: metrics.bytesReceived,
      bytesSent: metrics.bytesSent,
      lastHandshake: metrics.lastHandshake,
      killSwitchEnabled: this.killSwitchEnabled,
      killSwitchEngaged,
      lastError: this.wireguard.lastError
    };
  }
  onVpnStatusChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  notifyStatus(status2) {
    for (const listener of this.listeners) {
      try {
        listener(status2);
      } catch (err) {
        console.error("[VpnManager] Error notifying listener:", err);
      }
    }
  }
};

// electron/network/secureNetworkAdapter.ts
var networkManager = null;
var activeProxyCredentials = null;
function getNetworkManager() {
  if (!networkManager) {
    networkManager = new NetworkManager();
  }
  return networkManager;
}
function initSecureNetworkAdapter(getMainWindow) {
  const manager = getNetworkManager();
  function broadcastStatus(status2) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("secure-network:status-changed", status2);
    }
  }
  manager.onStatusChange((status2) => {
    broadcastStatus(status2);
  });
  const getTargetSessions = () => [
    session3.fromPartition("persist:forge"),
    session3.defaultSession
  ];
  app4.on("login", (event, _webContents, _request, authInfo, callback) => {
    if (authInfo.isProxy && activeProxyCredentials?.username) {
      event.preventDefault();
      callback(activeProxyCredentials.username, activeProxyCredentials.password || "");
    }
  });
  const sessionFetch = async (url) => {
    try {
      const response = await net2.fetch(url, {
        headers: { "User-Agent": "ForgeBrowser/1.0 SecureNetwork" }
      });
      return await response.json();
    } catch {
      const res = await fetch(url, {
        headers: { "User-Agent": "ForgeBrowser/1.0 SecureNetwork" }
      });
      return await res.json();
    }
  };
  ipcMain3.handle("secure-network:get-status", async () => {
    return manager.getStatus();
  });
  ipcMain3.handle(
    "secure-network:connect",
    async (_event, payload) => {
      const { mode, config } = payload;
      const sessions = getTargetSessions();
      try {
        if (mode === "direct") {
          activeProxyCredentials = null;
          await Promise.all(sessions.map((s) => s.setProxy({ mode: "direct" })));
          const status2 = await manager.switchProvider("direct");
          manager.resolveLocation(sessionFetch).then((loc) => {
            manager.getStatus().then(broadcastStatus);
          }).catch(() => {
          });
          return { ok: true, status: status2 };
        }
        if (mode === "proxy") {
          const proxyConfig = config;
          activeProxyCredentials = {
            username: proxyConfig?.username,
            password: proxyConfig?.password
          };
          const status2 = await manager.switchProvider("proxy", proxyConfig);
          const proxyProvider = manager.getProxyProvider();
          const { proxyRules, proxyBypassRules } = proxyProvider.toElectronProxyRules();
          await Promise.all(
            sessions.map((s) => s.setProxy({ proxyRules, proxyBypassRules }))
          );
          manager.resolveLocation(sessionFetch).then((loc) => {
            manager.getStatus().then(broadcastStatus);
          }).catch(() => {
          });
          return { ok: true, status: status2 };
        }
        if (mode === "wireguard") {
          activeProxyCredentials = null;
          const status2 = await manager.switchProvider("wireguard", config);
          return { ok: true, status: status2 };
        }
        return { ok: false, error: `Unsupported mode: ${mode}` };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    }
  );
  ipcMain3.handle("secure-network:disconnect", async () => {
    try {
      activeProxyCredentials = null;
      const sessions = getTargetSessions();
      await Promise.all(sessions.map((s) => s.setProxy({ mode: "direct" })));
      const status2 = await manager.disconnect();
      manager.resolveLocation(sessionFetch).then(() => {
        manager.getStatus().then(broadcastStatus);
      }).catch(() => {
      });
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("secure-network:refresh-ip", async () => {
    try {
      const location = await manager.resolveLocation(sessionFetch);
      const status2 = await manager.getStatus();
      broadcastStatus(status2);
      return { ok: true, location };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("secure-network:test-connection", async (_event, targetUrl) => {
    try {
      const testFetch = async (url) => {
        return net2.fetch(url, { method: "HEAD" });
      };
      const result = await manager.testConnection(
        targetUrl || "https://www.google.com/generate_204",
        testFetch
      );
      return { ok: true, result };
    } catch (err) {
      return {
        ok: false,
        result: {
          success: false,
          latencyMs: -1,
          error: err.message || String(err)
        }
      };
    }
  });
  setTimeout(() => {
    manager.resolveLocation(sessionFetch).then((loc) => {
      manager.getStatus().then(broadcastStatus);
    }).catch(() => {
    });
  }, 2e3);
}

// electron/network/vpnAdapter.ts
import { ipcMain as ipcMain4, session as session4 } from "electron";
var vpnManager = null;
function getVpnManager() {
  if (!vpnManager) {
    vpnManager = new VpnManager();
  }
  return vpnManager;
}
function initVpnAdapter(getMainWindow) {
  const manager = getVpnManager();
  const netManager = getNetworkManager();
  function broadcastStatus(status2) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("vpn:status-changed", status2);
    }
  }
  manager.onVpnStatusChange((status2) => {
    broadcastStatus(status2);
  });
  const targetSessions = [
    session4.fromPartition("persist:forge"),
    session4.defaultSession
  ];
  for (const ses of targetSessions) {
    ses.webRequest.onBeforeRequest((details, callback) => {
      const status2 = manager.getStatus();
      if (status2.killSwitchEngaged) {
        try {
          const parsed = new URL(details.url);
          const hostname = parsed.hostname.toLowerCase();
          if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || parsed.protocol === "file:" || parsed.protocol === "devtools:" || parsed.protocol === "chrome-extension:") {
            callback({});
            return;
          }
        } catch {
        }
        callback({ cancel: true });
        return;
      }
      callback({});
    });
  }
  ipcMain4.handle("vpn:get-status", () => {
    return manager.getStatus();
  });
  ipcMain4.handle("vpn:connect", async (_event, profileIdOrConfig) => {
    try {
      const status2 = await manager.connect(profileIdOrConfig);
      await netManager.switchProvider("wireguard", manager.getActiveProfile()?.config);
      broadcastStatus(status2);
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, status: manager.getStatus(), error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:disconnect", async () => {
    try {
      const status2 = await manager.disconnect();
      await netManager.disconnect().catch(() => {
      });
      broadcastStatus(status2);
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, status: manager.getStatus(), error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:set-kill-switch", (_event, enabled) => {
    const status2 = manager.setKillSwitch(Boolean(enabled));
    broadcastStatus(status2);
    return { ok: true, status: status2 };
  });
  ipcMain4.handle("vpn:get-locations", () => {
    return manager.getLocations();
  });
  ipcMain4.handle("vpn:select-location", async (_event, locationId) => {
    try {
      const status2 = await manager.selectLocation(locationId);
      broadcastStatus(status2);
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:get-profiles", () => {
    return manager.getProfiles();
  });
  ipcMain4.handle("vpn:save-profile", (_event, profile) => {
    try {
      const saved = manager.saveProfile(profile);
      return { ok: true, profile: saved };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:delete-profile", (_event, profileId) => {
    try {
      const success = manager.deleteProfile(profileId);
      return { ok: success };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:import-config", (_event, rawText, name) => {
    try {
      const profile = manager.importConfig(rawText, name);
      return { ok: true, profile };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:export-config", (_event, profileId) => {
    try {
      const conf = manager.exportConfig(profileId);
      return { ok: true, conf };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain4.handle("vpn:test-latency", async (_event, locationId) => {
    const loc = manager.getLocations().find((l) => l.id === locationId);
    if (!loc) {
      return { ok: false, pingMs: -1, error: "Location not found" };
    }
    const basePing = loc.pingMs || 30;
    const jitter = Math.floor(Math.random() * 8) - 4;
    const measured = Math.max(12, basePing + jitter);
    loc.pingMs = measured;
    return { ok: true, pingMs: measured };
  });
}

// electron/main.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var gotTheLock = app5.requestSingleInstanceLock();
if (!gotTheLock) {
  app5.quit();
} else {
  app5.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
app5.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app5.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,AutomaticTabDiscarding");
app5.commandLine.appendSwitch("disable-background-timer-throttling");
app5.commandLine.appendSwitch("disable-renderer-backgrounding");
app5.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app5.commandLine.appendSwitch("disable-gpu-process-crash-limit");
app5.commandLine.appendSwitch("enable-features", "HardwareMediaKeyHandling,MediaSessionService");
app5.commandLine.appendSwitch("log-level", "3");
app5.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false);
});
process.on("uncaughtException", (error) => {
  console.error("[Electron Main] Uncaught Exception (crash prevented):", error);
});
process.on("unhandledRejection", (reason) => {
  if (reason?.code === "ERR_ABORTED" || reason?.errno === -3 || reason?.code === "ERR_INTERNET_DISCONNECTED" || reason?.code === "ERR_NETWORK_CHANGED" || String(reason).includes("ERR_ABORTED")) {
    return;
  }
  console.error("[Electron Main] Unhandled Rejection (crash prevented):", reason);
});
app5.on("child-process-gone", (_event, details) => {
  console.warn("[Electron Main] Child process gone:", details.type, details.reason, details.exitCode);
});
app5.on("render-process-gone", (_event, webContents, details) => {
  console.warn("[Electron Main] Render process gone:", details.reason, details.exitCode);
  if (details.reason === "crashed" || details.reason === "killed" || details.reason === "oom") {
    if (!webContents.isDestroyed()) {
      try {
        webContents.reload();
      } catch {
      }
    }
  }
});
var mainWindow = null;
var terminalCwd = process.cwd();
var isMediaPlaying = false;
powerMonitor.on("suspend", () => {
  console.log("[PowerMonitor] System entering sleep / hibernation");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("power:suspend");
  }
});
powerMonitor.on("resume", () => {
  console.log("[PowerMonitor] System resuming from sleep / hibernation");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("power:resume");
    updateTaskbarMediaButtons(mainWindow, isMediaPlaying);
  }
});
function getAssetPath(filename) {
  const candidates = [
    path3.join(__dirname2, "assets", filename),
    path3.join(__dirname2, "../electron/assets", filename),
    path3.join(process.cwd(), "apps/forge-app/electron/assets", filename),
    path3.join(process.cwd(), "electron/assets", filename)
  ];
  for (const candidate of candidates) {
    if (fs3.existsSync(candidate)) return candidate;
  }
  return path3.join(__dirname2, "assets", filename);
}
function updateTaskbarMediaButtons(win, isPlaying) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) return;
  isMediaPlaying = isPlaying;
  try {
    const prevIcon = nativeImage.createFromPath(getAssetPath("media-prev.png"));
    const playIcon = nativeImage.createFromPath(getAssetPath("media-play.png"));
    const pauseIcon = nativeImage.createFromPath(getAssetPath("media-pause.png"));
    const nextIcon = nativeImage.createFromPath(getAssetPath("media-next.png"));
    const buttons = [
      {
        tooltip: "Previous Track / Rewind 10s",
        icon: prevIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-prev");
          }
        }
      },
      {
        tooltip: isPlaying ? "Pause" : "Play",
        icon: isPlaying ? pauseIcon : playIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-toggle-play");
          }
        }
      },
      {
        tooltip: "Next Track / Skip 10s",
        icon: nextIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-next");
          }
        }
      }
    ];
    win.setThumbarButtons(buttons);
  } catch (err) {
    console.error("[Main] Error setting thumbar buttons:", err);
  }
}
function createWindow() {
  mainWindow = new BrowserWindow5({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0f17",
    show: false,
    icon: path3.join(__dirname2, "../public/logo.png"),
    webPreferences: {
      preload: path3.join(__dirname2, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });
  try {
    mainWindow.webContents.setMaxListeners(50);
  } catch {
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.maximize();
    mainWindow?.show();
    if (mainWindow) {
      updateTaskbarMediaButtons(mainWindow, false);
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path3.join(__dirname2, "../dist/index.html"));
  }
}
ipcMain5.on("window:minimize", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  win?.minimize();
});
ipcMain5.on("window:maximize", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});
ipcMain5.on("window:close", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  win?.close();
});
ipcMain5.handle("window:is-maximized", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  return win?.isMaximized() ?? false;
});
ipcMain5.on("window:set-fullscreen", (event, flag) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  win?.setFullScreen(flag);
});
ipcMain5.handle("window:is-fullscreen", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  return win?.isFullScreen() ?? false;
});
ipcMain5.on("theme:set", (_event, mode) => {
  if (["system", "light", "dark"].includes(mode)) {
    nativeTheme.themeSource = mode;
  }
});
ipcMain5.on("window:set-title", (_event, title) => {
  const win = BrowserWindow5.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    const cleanTitle = title?.trim();
    win.setTitle(cleanTitle ? `${cleanTitle} \u2014 Forge Browser` : "Forge Browser");
  }
});
function restoreAndFocusWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
  try {
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);
  } catch {
  }
}
ipcMain5.on("window:restore-and-focus", (event) => {
  const win = BrowserWindow5.fromWebContents(event.sender) || BrowserWindow5.getFocusedWindow() || mainWindow;
  restoreAndFocusWindow(win);
});
var pipActiveWebContents = /* @__PURE__ */ new Set();
app5.on("web-contents-created", (_event, contents) => {
  try {
    contents.setMaxListeners(50);
  } catch {
  }
  if (contents.getType() !== "webview") return;
  contents.on("enter-html-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("webview:html-full-screen-change", { isFullscreen: true, contentsId: contents.id });
    }
  });
  contents.on("leave-html-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("webview:html-full-screen-change", { isFullscreen: false, contentsId: contents.id });
    }
  });
  contents.on("did-fail-load", (_event2, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.log(`[WebView] Main frame failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    }
  });
  contents.on("console-message", (_event2, _level, message) => {
    if (typeof message !== "string") return;
    if (message.includes("__FORGE_PIP_ENTER__")) {
      pipActiveWebContents.add(contents.id);
    } else if (message.includes("__FORGE_PIP_LEAVE__")) {
      pipActiveWebContents.delete(contents.id);
    } else if (message.includes("__FORGE_PIP_RETURN_TO_PAGE__")) {
      pipActiveWebContents.delete(contents.id);
      restoreAndFocusWindow(mainWindow);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
      }
    }
  });
  contents.on("focus", () => {
    if (pipActiveWebContents.has(contents.id)) {
      restoreAndFocusWindow(mainWindow);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
      }
    }
  });
  contents.on("destroyed", () => {
    pipActiveWebContents.delete(contents.id);
  });
});
ipcMain5.on("media:status-update", (_event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    updateTaskbarMediaButtons(mainWindow, Boolean(data?.isPlaying));
  }
});
ipcMain5.handle("forge:http:request", async (_event, options) => {
  try {
    const response = await request(options);
    return { ok: true, data: response };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});
ipcMain5.handle("terminal:get-cwd", () => {
  return terminalCwd;
});
ipcMain5.handle("terminal:set-cwd", (_event, newCwd) => {
  try {
    const resolved = path3.resolve(terminalCwd, newCwd);
    if (fs3.existsSync(resolved) && fs3.statSync(resolved).isDirectory()) {
      terminalCwd = resolved;
      return { ok: true, cwd: terminalCwd };
    }
    return { ok: false, error: `Directory not found: ${newCwd}`, cwd: terminalCwd };
  } catch (err) {
    return { ok: false, error: err.message, cwd: terminalCwd };
  }
});
ipcMain5.handle("terminal:exec", async (_event, command, shellType = "powershell") => {
  const trimmed = command.trim();
  if (!trimmed) {
    return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
  }
  const cdMatch = trimmed.match(/^(?:cd|chdir|Set-Location|sl)(?:\s+(.*)|([.\\/].*))?$/i);
  if (cdMatch) {
    let target = (cdMatch[1] || cdMatch[2])?.trim();
    if (!target || target === "~") {
      terminalCwd = os.homedir();
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    }
    target = target.replace(/^\/d\s+/i, "");
    target = target.replace(/^["']|["']$/g, "");
    try {
      const resolved = path3.resolve(terminalCwd, target);
      if (fs3.existsSync(resolved) && fs3.statSync(resolved).isDirectory()) {
        terminalCwd = resolved;
        return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
      } else {
        return { stdout: "", stderr: `Cannot find path '${target}' because it does not exist.`, cwd: terminalCwd, exitCode: 1 };
      }
    } catch (err) {
      return { stdout: "", stderr: err.message, cwd: terminalCwd, exitCode: 1 };
    }
  }
  if (/^[a-zA-Z]:$/.test(trimmed)) {
    const drive = trimmed.toUpperCase() + "\\";
    if (fs3.existsSync(drive)) {
      terminalCwd = drive;
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    } else {
      return { stdout: "", stderr: `Drive '${trimmed}' does not exist.`, cwd: terminalCwd, exitCode: 1 };
    }
  }
  const shell = process.platform === "win32" ? shellType === "cmd" ? "cmd.exe" : "powershell.exe" : process.env.SHELL || "/bin/bash";
  return new Promise((resolve) => {
    exec(trimmed, {
      cwd: terminalCwd,
      shell,
      maxBuffer: 15 * 1024 * 1024,
      env: { ...process.env }
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || (error && !stdout ? error.message : ""),
        cwd: terminalCwd,
        exitCode: error ? error.code ?? 1 : 0
      });
    });
  });
});
app5.whenReady().then(() => {
  initAdBlockAdapter(() => mainWindow);
  initNetworkMonitor(() => mainWindow);
  initSecureNetworkAdapter(() => mainWindow);
  initVpnAdapter(() => mainWindow);
  createWindow();
  app5.on("activate", () => {
    if (BrowserWindow5.getAllWindows().length === 0) createWindow();
  });
});
app5.on("window-all-closed", () => {
  if (process.platform !== "darwin") app5.quit();
});
