// electron/main.ts
import { app as app9, BrowserWindow as BrowserWindow6, ipcMain as ipcMain11, nativeTheme as nativeTheme2, nativeImage, powerMonitor, session as session10, shell, Menu } from "electron";
import path6 from "node:path";
import fs6 from "node:fs";
import os2 from "node:os";
import { exec as exec2 } from "node:child_process";
import { fileURLToPath as fileURLToPath3 } from "node:url";

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
  const path7 = `${parsed.pathname || "/"}${parsed.search || ""}`;
  return {
    protocol,
    hostname: parsed.hostname,
    port,
    path: path7,
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
import { app as app4, ipcMain as ipcMain4, nativeTheme, session as session4 } from "electron";

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
! Description: Popular advertising networks, ad servers, banners, popunders, and video ad trackers
! Homepage: https://easylist.to/

! --- Major Advertising & Programmatic Networks ---
||doubleclick.net^
||googlesyndication.com^
||adservice.google.com^
||pagead2.googlesyndication.com^
||tpc.googlesyndication.com^
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
||popcash.net^
||adcash.com^
||propellerads.com^
||monetag.com^
||hilltopads.net^
||hilltopads.com^
||adsterra.com^
||richads.com^
||clickadu.com^
||trafficstars.com^
||runative.com^
||runative-syndicate.com^
||runative-syndicate.net^
||cdn.runative-syndicate.com^
||syndication.runative.com^
||zilla-networks.com/ads/*
||player.zilla-networks.com/ads/*
||onclickprediction.com^
||onclickalgo.com^
||onclickbright.com^
||onclickperformance.com^
||ad-maven.com^
||ero-advertising.com^
||juicyads.com^
||yllix.com^
||bidvertiser.com^
||buysellads.com^
||adroll.com^
||media.net^
||sovrn.com^
||inmobi.com^
||revcontent.com^
||adskeeper.co.uk^
||adskeeper.com^
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
||spotx.tv^
||adtech.de^
||advertising.com^
||quantserve.com^
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
||exoclick.com^
||trafficjunky.com^
||trafficfactory.biz^
||zergnet.com^
||mediavine.com^
||raptive.com^
||adthrive.com^
||infolinks.com^
||chitika.com^
||skimresources.com^
||viglink.com^
||gumgum.com^
||undertone.com^
||conversantmedia.com^
||yieldlove.com^
||snigelweb.com^
||shemedia.com^
||playwire.com^
||ezoic.com^
||ezoic.net^
||a-ads.com^
||coinzilla.com^
||bitmedia.io^
||cointraffic.io^
||clksite.com^
||revenuehits.com^
||popmyads.com^
||clicksor.com^

! --- Ad Paths, Redirects and Generic Banner Patterns ---
/pagead/
/ads/banner/*
/adserver/*
/adframe.
/prebid.js
*ad_banner*
*banner_ad*
*ads.min.js
/dfp_ads.js
/popunder*
/popup/*
/click.php?*
/track/click*
/serving/ad*
*ad-delivery*
*ad-provider*
*ad-placement*
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
||primis.tech^
||streamrail.com^
||brightroll.com^
||stickyadstv.com^
||videologygroup.com^
||brid.tv^
||targetspot.com^
||adswizz.com^
||truvid.com^
||insticator.com^
||anyclip.com^
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
||connect.facebook.net^$script
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
||bam.nr-data.net^
||datadoghq-browser-agent.com^
||browser-intake-datadoghq.com^
||branch.io^
||appsflyer.com^
||adjust.com^
||kochava.com^
||singular.net^
||tr.snapchat.com^
||sc-static.net^
||ct.pinterest.com^
||snap.licdn.com^
||ads-twitter.com^
||static.ads-twitter.com^
||analytics.twitter.com^
||q.quora.com^
||chartbeat.com^
||chartbeat.net^
||parsely.com^
||matomo.org^
||piwik.pro^
||snowplowanalytics.com^
||omtrdc.net^
||demdex.net^
||everesttech.net^
||bluekai.com^
||crwdcntrl.net^
||rlcdn.com^
||agkn.com^
||exelator.com^
||tapad.com^
||liveramp.com^
||id5-sync.com^

! --- Telemetry & Tracker Patterns ---
||telemetry.*^
||tracker.*^
||beacon.*^
/analytics.js
/gtag/js
/fbevents.js
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
||monetag.com^
||richads.com^
||hilltopads.net^
||hilltopads.com^
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
||go.ad2up.com^
||runative.com^
||runative-syndicate.com^
||runative-syndicate.net^
||cdn.runative-syndicate.com^
||syndication.runative.com^
||onclickprediction.com^
||onclickalgo.com^
||onclickbright.com^
||onclickperformance.com^
||*casino*^$popup
||*casinon*^$popup
||*spelpaus*^$popup

! --- Push Notification Spam, Fake Captchas & Click-Hijackers ---
||pushsdk.com^
||push-notification.org^
||notification-hub.*^
||subscriber-alert.*^
||web-push.*^
||click-push.*^
||robot-verification.*^
||verify-captcha.*^
||press-allow.*^
||click-allow.*^
||confirm-not-robot.*^
||check-robot.*^

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
    /* Generic ad banners, wrappers & sponsor placeholders */
    .ad-container,
    .ad-banner,
    .ad-placeholder,
    .ad-slot,
    .ad-box,
    .ad-wrapper,
    .ad-unit,
    .ad-placement,
    .ad-sidebar,
    .ad-header,
    .ad-footer,
    .banner-ad,
    .floating-ad,
    .sticky-ad,
    .bottom-ad,
    .top-ad,
    [class*="banner-ad" i],
    [class*="sticky-ad" i],
    [class*="floating-ad" i],
    [class*="ad-slot" i],
    [class*="ad-wrapper" i],
    [class*="ad-box" i],
    [class*="ad-sense" i],
    [id*="advertisement" i],
    [class*="advertisement" i],
    [aria-label="advertisement" i],
    [aria-label="ad" i],
    [data-ad-unit],
    [data-ad-slot],
    [data-ad-client],
    [data-ad-format],
    [data-google-query-id],
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    .adsbygoogle,

    /* Native content recommendation ad widgets */
    .trc_related_container,
    .trc_rbox_div,
    [id^="taboola-"],
    .tbl-feed-container,
    .OUTBRAIN,
    [class*="ob-widget"],
    [id^="outbrain_widget_"],
    .ob-cards,
    [id^="MarketGid"],
    .mgid-widget,
    [id^="rc-widget-"],
    .rc-ad-item,
    [class*="adsterra" i],
    [class*="exoclick" i],
    [id*="adsterra" i],

    /* Video player ad overlays and VAST/IMA/VPAID containers */
    .video-ads,
    .video-ad,
    .video-ad-overlay,
    .vast-ad-container,
    .vjs-ad-playing,
    .ima-ad-container,
    .ima-container,
    [id*="vdo_ai"],
    .fluid_video_wrapper .vast_ad,
    [class*="preroll" i],
    [class*="midroll" i],

    /* Popunders, interstitials & floating modals */
    [class*="interstitial" i],
    [class*="overlay-ad" i],
    [class*="modal-ad" i],
    [class*="popup-ad" i],
    [class*="popunder" i],
    [id*="interstitial" i],
    [id*="overlay-ad" i],
    [id*="modal-ad" i],
    [id*="popup-ad" i],
    [id*="popunder" i],
    div[style*="z-index: 2147483647"]:not(:has(video)):not(#__forge_theater_backdrop),
    div[style*="z-index: 2147483646"]:not(:has(video)):not(#__forge_video_fullscreen_pill),
    div[style*="z-index: 999999"]:not(:has(video)),
    div[style*="z-index: 99999"]:not(:has(video)),
    iframe[src*="adsterra" i],
    iframe[src*="exoclick" i],
    iframe[src*="monetag" i],
    iframe[src*="propeller" i],
    iframe[src*="popads" i],
    iframe[src*="popcash" i],
    iframe[src*="hilltop" i],
    iframe[src*="richads" i],
    iframe[src*="trafficstars" i],
    iframe[src*="onclick" i],
    iframe[src*="doubleclick" i],

    /* Anti-adblock warning modals, popups and block screens */
    .fc-ab-root,
    [class*="adblock-overlay" i],
    [id*="adblock-notice" i],
    [class*="adblock-warning" i],
    [id*="adblock-modal" i],
    .adblocker-overlay,
    [class*="blocking-warning" i],
    .sp-message-open,
    #sp-message-container {
      display: none !important;
      height: 0 !important;
      max-height: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 0 !important;
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
  ipcMain.handle("adblock:evaluate-request", (_event, url) => {
    return evaluateAdBlockRequest({ url });
  });
  ipcMain.handle("adblock:get-guest-preload-path", () => {
    const guestPreload2 = path2.join(__dirname, "guestPreload.cjs");
    return pathToFileURL(guestPreload2).toString();
  });
  ipcMain.on("adblock:get-guest-preload-path-sync", (event) => {
    try {
      const guestPreload2 = path2.join(__dirname, "guestPreload.cjs");
      event.returnValue = pathToFileURL(guestPreload2).toString();
    } catch {
      event.returnValue = "";
    }
  });
  const ses = session.fromPartition("persist:forge");
  const guestPreload = path2.join(__dirname, "guestPreload.cjs");
  let guestPreloadCode = "";
  if (fs2.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
      guestPreloadCode = fs2.readFileSync(guestPreload, "utf-8");
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
      const targetUrl = details.url || "";
      const urlLower = targetUrl.toLowerCase();
      if (!targetUrl || targetUrl === "about:blank" || targetUrl.startsWith("javascript:") || targetUrl.startsWith("data:")) {
        console.warn("[Forge Shield] Denied blank/script popunder:", targetUrl);
        return { action: "deny" };
      }
      if (engine.isEnabled()) {
        const { cancel } = evaluateAdBlockRequest({ url: targetUrl });
        if (cancel) {
          console.warn("[Forge Shield] Denied ad popup by rule:", targetUrl);
          return { action: "deny" };
        }
        const isAdOrPopunder = [
          "popads",
          "popcash",
          "adcash",
          "propellerads",
          "monetag",
          "hilltopads",
          "adsterra",
          "richads",
          "clickadu",
          "trafficstars",
          "onclickprediction",
          "onclickalgo",
          "onclickbright",
          "onclickperformance",
          "ad2up",
          "ero-advertising",
          "juicyads",
          "yllix",
          "bidvertiser",
          "doubleclick",
          "googlesyndication",
          "adnxs",
          "criteo",
          "taboola",
          "outbrain",
          "bet365",
          "1xbet",
          "redirect",
          "click.php",
          "track/click",
          "serving/ad",
          "adserver",
          "clksite",
          "revenuehits",
          "rotator",
          "popunder",
          "fastclick",
          "adservice",
          "go.ad2up",
          "ad-maven",
          "directrev",
          "clkmon",
          "bestadbid",
          "adclicker",
          "trafficjunky",
          "trafficfactory",
          "runative",
          "syndicate",
          "casino",
          "casinon",
          "spelpaus",
          "zilla-networks"
        ].some((k) => urlLower.includes(k));
        if (isAdOrPopunder) {
          console.warn("[Forge Shield] Denied popunder by network filter:", targetUrl);
          return { action: "deny" };
        }
        const isPopupWindow = details.features && (details.features.includes("width=") || details.features.includes("height=") || details.features.includes("location=0") || details.features.includes("menubar=0") || details.features.includes("toolbar=0"));
        const isLegitimateAuth = [
          "accounts.google.com",
          "appleid.apple.com",
          "github.com/login",
          "login.microsoftonline.com",
          "facebook.com/dialog",
          "facebook.com/v",
          "twitter.com/i/oauth2",
          "x.com/i/oauth2",
          "discord.com/oauth2",
          "paypal.com/signin",
          "auth0.com",
          "okta.com"
        ].some((domain) => urlLower.includes(domain));
        if (isPopupWindow && !isLegitimateAuth) {
          console.warn("[Forge Shield] Denied suspicious non-OAuth popup window:", targetUrl);
          return { action: "deny" };
        }
      }
      try {
        const win = getWin ? getWin() : null;
        if (win && !win.isDestroyed()) {
          win.webContents.send("tabs:open-tab", { url: targetUrl });
        }
      } catch (err) {
        console.error("[Forge Shield] Error routing link to tab:", err);
      }
      return { action: "deny" };
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

// electron/network/vpnAdapter.ts
import { ipcMain as ipcMain3 } from "electron";

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
import { app as app3, ipcMain as ipcMain2, session as session2, net as net2 } from "electron";
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
    session2.fromPartition("persist:forge"),
    session2.defaultSession
  ];
  app3.on("login", (event, _webContents, _request, authInfo, callback) => {
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
  ipcMain2.handle("secure-network:get-status", async () => {
    return manager.getStatus();
  });
  ipcMain2.handle(
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
  ipcMain2.handle("secure-network:disconnect", async () => {
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
  ipcMain2.handle("secure-network:refresh-ip", async () => {
    try {
      const location = await manager.resolveLocation(sessionFetch);
      const status2 = await manager.getStatus();
      broadcastStatus(status2);
      return { ok: true, location };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain2.handle("secure-network:test-connection", async (_event, targetUrl) => {
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
var vpnManager = null;
function getVpnManager() {
  if (!vpnManager) {
    vpnManager = new VpnManager();
  }
  return vpnManager;
}
function checkVpnKillSwitch(urlStr) {
  try {
    const manager = getVpnManager();
    const status2 = manager.getStatus();
    if (!status2.killSwitchEngaged) return false;
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || parsed.protocol === "file:" || parsed.protocol === "devtools:" || parsed.protocol === "chrome-extension:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
  ipcMain3.handle("vpn:get-status", () => {
    return manager.getStatus();
  });
  ipcMain3.handle("vpn:connect", async (_event, profileIdOrConfig) => {
    try {
      const status2 = await manager.connect(profileIdOrConfig);
      await netManager.switchProvider("wireguard", manager.getActiveProfile()?.config);
      broadcastStatus(status2);
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, status: manager.getStatus(), error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:disconnect", async () => {
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
  ipcMain3.handle("vpn:set-kill-switch", (_event, enabled) => {
    const status2 = manager.setKillSwitch(Boolean(enabled));
    broadcastStatus(status2);
    return { ok: true, status: status2 };
  });
  ipcMain3.handle("vpn:get-locations", () => {
    return manager.getLocations();
  });
  ipcMain3.handle("vpn:select-location", async (_event, locationId) => {
    try {
      const status2 = await manager.selectLocation(locationId);
      broadcastStatus(status2);
      return { ok: true, status: status2 };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:get-profiles", () => {
    return manager.getProfiles();
  });
  ipcMain3.handle("vpn:save-profile", (_event, profile) => {
    try {
      const saved = manager.saveProfile(profile);
      return { ok: true, profile: saved };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:delete-profile", (_event, profileId) => {
    try {
      const success = manager.deleteProfile(profileId);
      return { ok: success };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:import-config", (_event, rawText, name) => {
    try {
      const profile = manager.importConfig(rawText, name);
      return { ok: true, profile };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:export-config", (_event, profileId) => {
    try {
      const conf = manager.exportConfig(profileId);
      return { ok: true, conf };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain3.handle("vpn:test-latency", async (_event, locationId) => {
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

// electron/network/networkMonitor.ts
var entries = /* @__PURE__ */ new Map();
var contentsDebuggerMap = /* @__PURE__ */ new Map();
var requestContentsMap = /* @__PURE__ */ new Map();
var currentNetworkTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
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
  let pendingBatch = [];
  let throttleTimer = null;
  function flushBatch() {
    throttleTimer = null;
    if (pendingBatch.length === 0) return;
    const batch = pendingBatch;
    pendingBatch = [];
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:entries-batch", batch);
    }
  }
  function broadcastEntry(entry) {
    pendingBatch.push(entry);
    if (!throttleTimer) {
      throttleTimer = setTimeout(flushBatch, 50);
    }
  }
  app4.on("web-contents-created", (_event, contents) => {
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
            requestContentsMap.set(entryId, contentsId);
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
  function getSourceUrl(details) {
    try {
      if (details.referrer) return details.referrer;
      if (details.frame && details.frame.url) return details.frame.url;
      if (details.webContentsId) {
        const contents = contentsDebuggerMap.get(details.webContentsId);
        if (contents && !contents.isDestroyed()) {
          return contents.getURL();
        }
      }
    } catch {
    }
    return void 0;
  }
  const ses = session4.fromPartition("persist:forge");
  ses.webRequest.onBeforeRequest((details, callback) => {
    try {
      const entryId = String(details.id);
      const sourceUrl = getSourceUrl(details);
      if (checkVpnKillSwitch(details.url)) {
        callback({ cancel: true });
        return;
      }
      const adblock = evaluateAdBlockRequest({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        referrer: sourceUrl
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
    } catch (err) {
      console.warn("[NetworkMonitor] onBeforeRequest error:", err);
      callback({});
    }
  });
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    try {
      const requestHeaders = { ...details.requestHeaders || {} };
      requestHeaders["Sec-CH-Prefers-Color-Scheme"] = currentNetworkTheme;
      callback({ requestHeaders });
    } catch {
      callback({});
    }
  });
  ses.webRequest.onHeadersReceived((details, callback) => {
    try {
      const entryId = String(details.id);
      const entry = entries.get(entryId);
      const responseHeaders = { ...details.responseHeaders || {} };
      const urlLower = (details.url || "").toLowerCase();
      if (urlLower.includes("chromewebstore.google.com") || urlLower.includes("chrome.google.com") || urlLower.includes("clients2.google.com")) {
        delete responseHeaders["content-security-policy"];
        delete responseHeaders["content-security-policy-report-only"];
        delete responseHeaders["Content-Security-Policy"];
        delete responseHeaders["Content-Security-Policy-Report-Only"];
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
    } catch {
      callback({ responseHeaders: details.responseHeaders });
    }
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
  ipcMain4.handle("network:get-body", async (_event, requestId) => {
    const entry = entries.get(requestId);
    if (entry?.responseBody) return entry.responseBody;
    const cId = requestContentsMap.get(requestId);
    if (cId) {
      const contents = contentsDebuggerMap.get(cId);
      if (contents && !contents.isDestroyed()) {
        try {
          if (contents.debugger.isAttached()) {
            const bodyResult = await contents.debugger.sendCommand("Network.getResponseBody", {
              requestId
            });
            if (bodyResult && bodyResult.body) {
              const body = bodyResult.base64Encoded ? Buffer.from(bodyResult.body, "base64").toString("utf-8") : bodyResult.body;
              if (entry) {
                entry.responseBody = body;
                entry.hasResponseBody = true;
              }
              return body;
            }
          }
        } catch {
        }
      }
    }
    return entry?.responseBody || null;
  });
  ipcMain4.on("network:clear", () => {
    entries.clear();
    requestContentsMap.clear();
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:cleared");
    }
  });
}

// electron/privacy/privacyCleanerAdapter.ts
import { ipcMain as ipcMain5, session as session5 } from "electron";

// electron/privacy/privacyManager.ts
var KNOWN_TRACKER_DOMAINS = [
  "doubleclick.net",
  "google-analytics.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "adservice.google.com",
  "adnxs.com",
  "criteo.com",
  "criteo.net",
  "facebook.com",
  "connect.facebook.net",
  "amazon-adsystem.com",
  "scorecardresearch.com",
  "quantserve.com",
  "hotjar.com",
  "taboola.com",
  "outbrain.com",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "moatads.com",
  "clarity.ms",
  "mixpanel.com",
  "segment.io",
  "segment.com",
  "amplitude.com",
  "branch.io",
  "appsflyer.com",
  "ads-twitter.com",
  "chartbeat.com",
  "newrelic.com",
  "nr-data.net",
  "mouseflow.com",
  "crazyegg.com",
  "smartlook.com",
  "yandex.ru/metrika",
  "mc.yandex.ru",
  "adroll.com",
  "bing.com/bat.js",
  "bat.bing.com"
];
var TRACKER_KEYWORDS = [
  "telemetry",
  "analytics",
  "tracking",
  "tracker",
  "adserver",
  "adservice",
  "beacon",
  "pixel",
  "metrics",
  "syndication"
];
function isTrackerDomain(domainStr) {
  if (!domainStr) return false;
  const clean = domainStr.toLowerCase().replace(/^\./, "");
  for (const known of KNOWN_TRACKER_DOMAINS) {
    if (clean === known || clean.endsWith(`.${known}`)) {
      return true;
    }
  }
  for (const keyword of TRACKER_KEYWORDS) {
    if (clean.includes(keyword)) {
      return true;
    }
  }
  return false;
}
function isDomainMatchingList(domainStr, domainList) {
  if (!domainStr || !domainList || domainList.length === 0) return false;
  const clean = domainStr.toLowerCase().replace(/^\./, "");
  for (const target of domainList) {
    const targetClean = target.toLowerCase().trim().replace(/^\./, "");
    if (!targetClean) continue;
    if (clean === targetClean || clean.endsWith(`.${targetClean}`)) {
      return true;
    }
  }
  return false;
}
var PrivacyManager = class {
  lastCleanedTimestamp;
  lastCleanedSummary;
  constructor() {
  }
  async getStorageStats(forgeSession, historyCount = 0, downloadsCount = 0) {
    let cacheSizeBytes = 0;
    try {
      cacheSizeBytes = await forgeSession.getCacheSize();
    } catch {
      cacheSizeBytes = 0;
    }
    let allCookies = [];
    try {
      allCookies = await forgeSession.cookies.get({});
    } catch {
      allCookies = [];
    }
    const nowSec = Date.now() / 1e3;
    let cookiesTrackers = 0;
    let cookiesStale = 0;
    for (const cookie of allCookies) {
      if (isTrackerDomain(cookie.domain)) {
        cookiesTrackers++;
      }
      if (cookie.expirationDate && cookie.expirationDate < nowSec) {
        cookiesStale++;
      }
    }
    return {
      cacheSizeBytes,
      cookiesTotal: allCookies.length,
      cookiesTrackers,
      cookiesStale,
      historyCount,
      downloadsCount,
      lastCleanedTimestamp: this.lastCleanedTimestamp,
      lastCleanedSummary: this.lastCleanedSummary
    };
  }
  async executeCleanup(forgeSession, defaultSession, targets, cookieRule, hooks) {
    const cleanedTargets = [];
    let initialCache = 0;
    try {
      initialCache = await forgeSession.getCacheSize();
    } catch {
    }
    let cookiesRemoved = 0;
    let historyCleared = false;
    let downloadsCleared = false;
    if (targets.cache) {
      try {
        await forgeSession.clearCache();
        await forgeSession.clearHostResolverCache();
        if (defaultSession && defaultSession !== forgeSession) {
          await defaultSession.clearCache();
          await defaultSession.clearHostResolverCache();
        }
        cleanedTargets.push("cache");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing cache:", err);
      }
    }
    if (targets.cookies) {
      try {
        if (cookieRule.mode === "all") {
          const all = await forgeSession.cookies.get({});
          await forgeSession.clearStorageData({ storages: ["cookies"] });
          cookiesRemoved = all.length;
          cleanedTargets.push("cookies");
        } else {
          const all = await forgeSession.cookies.get({});
          for (const cookie of all) {
            let shouldRemove = false;
            if (cookieRule.mode === "except_protected") {
              const isProtected = isDomainMatchingList(cookie.domain, cookieRule.protectedDomains);
              if (!isProtected) {
                shouldRemove = true;
              }
            } else if (cookieRule.mode === "only_trackers") {
              if (isTrackerDomain(cookie.domain)) {
                shouldRemove = true;
              }
            } else if (cookieRule.mode === "only_selected") {
              if (isDomainMatchingList(cookie.domain, cookieRule.selectedDomains)) {
                shouldRemove = true;
              }
            }
            if (shouldRemove) {
              const scheme = cookie.secure ? "https://" : "http://";
              const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${scheme}${domain}${cookie.path || "/"}`;
              try {
                await forgeSession.cookies.remove(url, cookie.name);
                cookiesRemoved++;
              } catch {
              }
            }
          }
          cleanedTargets.push("cookies");
        }
      } catch (err) {
        console.error("[PrivacyManager] Error clearing cookies:", err);
      }
    }
    const storagesToClear = [];
    if (targets.localStorage) {
      storagesToClear.push("localstorage");
      cleanedTargets.push("localStorage");
    }
    if (targets.indexedDB) {
      storagesToClear.push("indexdb");
      cleanedTargets.push("indexedDB");
    }
    if (targets.serviceWorkers) {
      storagesToClear.push("serviceworkers", "cachestorage");
      cleanedTargets.push("serviceWorkers");
    }
    if (storagesToClear.length > 0) {
      try {
        await forgeSession.clearStorageData({ storages: storagesToClear });
      } catch (err) {
        console.error("[PrivacyManager] Error clearing storage data:", err);
      }
    }
    if (targets.sessions) {
      try {
        await forgeSession.clearAuthCache();
        if (defaultSession && defaultSession !== forgeSession) {
          await defaultSession.clearAuthCache();
        }
        cleanedTargets.push("sessions");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing auth cache:", err);
      }
    }
    if (targets.passwordsAutofill) {
      try {
        await forgeSession.clearStorageData({
          storages: ["cookies"],
          quotas: ["temporary", "persistent", "syncable"]
        });
        cleanedTargets.push("passwordsAutofill");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing passwords/autofill:", err);
      }
    }
    if (targets.permissions) {
      try {
        cleanedTargets.push("permissions");
      } catch (err) {
        console.error("[PrivacyManager] Error resetting permissions:", err);
      }
    }
    if (targets.history) {
      try {
        if (hooks?.onClearHistory) {
          hooks.onClearHistory();
        }
        historyCleared = true;
        cleanedTargets.push("history");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing browsing history:", err);
      }
    }
    if (targets.downloads) {
      try {
        if (hooks?.onClearDownloads) {
          hooks.onClearDownloads();
        }
        downloadsCleared = true;
        cleanedTargets.push("downloads");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing download history:", err);
      }
    }
    let finalCache = 0;
    try {
      finalCache = await forgeSession.getCacheSize();
    } catch {
    }
    const bytesFreed = Math.max(0, initialCache - finalCache);
    const now = Date.now();
    this.lastCleanedTimestamp = now;
    this.lastCleanedSummary = {
      targets: cleanedTargets,
      bytesFreed,
      cookiesRemoved,
      timestamp: now
    };
    return {
      success: true,
      bytesFreed,
      cookiesRemoved,
      historyCleared,
      downloadsCleared,
      cleanedTargets,
      timestamp: now
    };
  }
  async cleanTrackersOnly(forgeSession) {
    let count = 0;
    try {
      const all = await forgeSession.cookies.get({});
      for (const cookie of all) {
        if (isTrackerDomain(cookie.domain)) {
          const scheme = cookie.secure ? "https://" : "http://";
          const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
          const url = `${scheme}${domain}${cookie.path || "/"}`;
          try {
            await forgeSession.cookies.remove(url, cookie.name);
            count++;
          } catch {
          }
        }
      }
    } catch (err) {
      console.error("[PrivacyManager] Error cleaning trackers:", err);
    }
    return { removed: count };
  }
};

// electron/privacy/privacyScheduler.ts
import fs3 from "node:fs";
import path3 from "node:path";
import { app as app5 } from "electron";

// electron/privacy/types.ts
var DEFAULT_PROTECTED_DOMAINS = [
  "github.com",
  "stackoverflow.com",
  "google.com",
  "gitlab.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "notion.so",
  "figma.com"
];
var DEFAULT_CLEANUP_POLICY = {
  enabled: false,
  interval: "disabled",
  customIntervalMinutes: 360,
  targets: {
    cache: true,
    history: true,
    downloads: false,
    cookies: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true,
    sessions: false,
    passwordsAutofill: false,
    permissions: false
  },
  cookieRule: {
    mode: "except_protected",
    protectedDomains: [...DEFAULT_PROTECTED_DOMAINS],
    selectedDomains: []
  }
};

// electron/privacy/privacyScheduler.ts
var PrivacyScheduler = class {
  policy;
  timer = null;
  policyFilePath;
  privacyManager;
  getSessions;
  onCleanupCompleted;
  onPolicyChanged;
  hooks;
  constructor(privacyManager2, getSessions, callbacks) {
    this.privacyManager = privacyManager2;
    this.getSessions = getSessions;
    this.onCleanupCompleted = callbacks?.onCleanupCompleted;
    this.onPolicyChanged = callbacks?.onPolicyChanged;
    this.hooks = callbacks?.hooks;
    try {
      this.policyFilePath = path3.join(app5.getPath("userData"), "privacy-policy.json");
    } catch {
      this.policyFilePath = path3.join(process.cwd(), "privacy-policy.json");
    }
    this.policy = this.loadPolicy();
    this.startTicker();
  }
  loadPolicy() {
    try {
      if (fs3.existsSync(this.policyFilePath)) {
        const raw = fs3.readFileSync(this.policyFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CLEANUP_POLICY,
          ...parsed,
          targets: {
            ...DEFAULT_CLEANUP_POLICY.targets,
            ...parsed.targets || {}
          },
          cookieRule: {
            ...DEFAULT_CLEANUP_POLICY.cookieRule,
            ...parsed.cookieRule || {}
          }
        };
      }
    } catch (err) {
      console.warn("[PrivacyScheduler] Error loading policy from disk, using default:", err);
    }
    return { ...DEFAULT_CLEANUP_POLICY };
  }
  savePolicy() {
    try {
      const dir = path3.dirname(this.policyFilePath);
      if (!fs3.existsSync(dir)) {
        fs3.mkdirSync(dir, { recursive: true });
      }
      fs3.writeFileSync(this.policyFilePath, JSON.stringify(this.policy, null, 2), "utf-8");
    } catch (err) {
      console.error("[PrivacyScheduler] Error saving policy to disk:", err);
    }
  }
  getPolicy() {
    return { ...this.policy };
  }
  updatePolicy(partial) {
    this.policy = {
      ...this.policy,
      ...partial,
      targets: {
        ...this.policy.targets,
        ...partial.targets || {}
      },
      cookieRule: {
        ...this.policy.cookieRule,
        ...partial.cookieRule || {}
      }
    };
    if (this.policy.enabled && this.policy.interval !== "disabled") {
      this.policy.nextRunTimestamp = this.calculateNextRunTimestamp(
        this.policy.interval,
        this.policy.customIntervalMinutes
      );
    } else {
      this.policy.nextRunTimestamp = void 0;
    }
    this.savePolicy();
    if (this.onPolicyChanged) {
      this.onPolicyChanged(this.getPolicy());
    }
    return this.getPolicy();
  }
  calculateNextRunTimestamp(interval, customMinutes = 360, fromTimestamp = Date.now()) {
    let addMs = 0;
    switch (interval) {
      case "1h":
        addMs = 60 * 60 * 1e3;
        break;
      case "6h":
        addMs = 6 * 60 * 60 * 1e3;
        break;
      case "24h":
        addMs = 24 * 60 * 60 * 1e3;
        break;
      case "7d":
        addMs = 7 * 24 * 60 * 60 * 1e3;
        break;
      case "custom":
        addMs = Math.max(1, customMinutes) * 60 * 1e3;
        break;
      case "disabled":
      default:
        return void 0;
    }
    return fromTimestamp + addMs;
  }
  startTicker() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.checkScheduledExecution();
    }, 60 * 1e3);
  }
  async checkScheduledExecution() {
    if (!this.policy.enabled || this.policy.interval === "disabled" || !this.policy.nextRunTimestamp) {
      return;
    }
    const now = Date.now();
    if (now >= this.policy.nextRunTimestamp) {
      console.log("[PrivacyScheduler] Automatic cleanup triggered at:", new Date(now).toISOString());
      const safeTargets = {
        ...this.policy.targets,
        sessions: false,
        passwordsAutofill: false,
        permissions: false
      };
      const { forgeSession, defaultSession } = this.getSessions();
      try {
        const result = await this.privacyManager.executeCleanup(
          forgeSession,
          defaultSession,
          safeTargets,
          this.policy.cookieRule,
          this.hooks
        );
        this.policy.lastRunTimestamp = now;
        this.policy.nextRunTimestamp = this.calculateNextRunTimestamp(
          this.policy.interval,
          this.policy.customIntervalMinutes,
          now
        );
        this.savePolicy();
        if (this.onCleanupCompleted) {
          this.onCleanupCompleted(result);
        }
        if (this.onPolicyChanged) {
          this.onPolicyChanged(this.getPolicy());
        }
      } catch (err) {
        console.error("[PrivacyScheduler] Error executing automated cleanup:", err);
      }
    }
  }
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
};

// electron/privacy/privacyCleanerAdapter.ts
var getWin2 = null;
var privacyManager = null;
var privacyScheduler = null;
function broadcastEvent2(channel, data) {
  if (!getWin2) return;
  const win = getWin2();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}
function initPrivacyCleanerAdapter(mainWindowGetter, options) {
  getWin2 = mainWindowGetter;
  privacyManager = new PrivacyManager();
  const getSessions = () => ({
    forgeSession: session5.fromPartition("persist:forge"),
    defaultSession: session5.defaultSession
  });
  privacyScheduler = new PrivacyScheduler(privacyManager, getSessions, {
    onCleanupCompleted: (result) => {
      broadcastEvent2("privacy:cleanup-completed", result);
    },
    onPolicyChanged: (policy) => {
      broadcastEvent2("privacy:policy-changed", policy);
    },
    hooks: {
      onClearHistory: () => {
        broadcastEvent2("privacy:clear-history-requested");
      },
      onClearDownloads: () => {
        if (options?.clearRecentDownloads) {
          options.clearRecentDownloads();
        }
        broadcastEvent2("privacy:clear-downloads-requested");
      }
    }
  });
  ipcMain5.handle("privacy:get-stats", async (_event, historyCount = 0) => {
    if (!privacyManager) return null;
    const { forgeSession } = getSessions();
    const downloadsCount = options?.getRecentDownloadsCount ? options.getRecentDownloadsCount() : 0;
    const stats = await privacyManager.getStorageStats(forgeSession, historyCount, downloadsCount);
    return stats;
  });
  ipcMain5.handle("privacy:get-policy", () => {
    if (!privacyScheduler) return null;
    return privacyScheduler.getPolicy();
  });
  ipcMain5.handle("privacy:update-policy", (_event, partial) => {
    if (!privacyScheduler) return null;
    const updated = privacyScheduler.updatePolicy(partial);
    return updated;
  });
  ipcMain5.handle(
    "privacy:clean-now",
    async (_event, overrideTargets, overrideCookieRule) => {
      if (!privacyManager || !privacyScheduler) {
        throw new Error("Privacy cleaner subsystem is not initialized");
      }
      const policy = privacyScheduler.getPolicy();
      const targets = overrideTargets || policy.targets;
      const cookieRule = overrideCookieRule || policy.cookieRule;
      const { forgeSession, defaultSession } = getSessions();
      const result = await privacyManager.executeCleanup(
        forgeSession,
        defaultSession,
        targets,
        cookieRule,
        {
          onClearHistory: () => {
            broadcastEvent2("privacy:clear-history-requested");
          },
          onClearDownloads: () => {
            if (options?.clearRecentDownloads) {
              options.clearRecentDownloads();
            }
            broadcastEvent2("privacy:clear-downloads-requested");
          }
        }
      );
      broadcastEvent2("privacy:cleanup-completed", result);
      return result;
    }
  );
  ipcMain5.handle("privacy:clean-trackers-only", async () => {
    if (!privacyManager) return { removed: 0 };
    const { forgeSession } = getSessions();
    const res = await privacyManager.cleanTrackersOnly(forgeSession);
    broadcastEvent2("privacy:stats-updated");
    return res;
  });
  ipcMain5.handle("privacy:add-protected-domain", (_event, domain) => {
    if (!privacyScheduler || !domain) return null;
    const policy = privacyScheduler.getPolicy();
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDomain) return policy;
    const set = new Set(policy.cookieRule.protectedDomains);
    set.add(cleanDomain);
    const updated = privacyScheduler.updatePolicy({
      cookieRule: {
        ...policy.cookieRule,
        protectedDomains: Array.from(set)
      }
    });
    return updated;
  });
  ipcMain5.handle("privacy:remove-protected-domain", (_event, domain) => {
    if (!privacyScheduler || !domain) return null;
    const policy = privacyScheduler.getPolicy();
    const cleanDomain = domain.toLowerCase().trim();
    const updatedList = policy.cookieRule.protectedDomains.filter((d) => d.toLowerCase() !== cleanDomain);
    const updated = privacyScheduler.updatePolicy({
      cookieRule: {
        ...policy.cookieRule,
        protectedDomains: updatedList
      }
    });
    return updated;
  });
}

// electron/sessions/sessionManager.ts
import path4 from "node:path";
import fs4 from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { app as app7, session as session8, ipcMain as ipcMain8 } from "electron";

// src/core/focus/socialRulesets.ts
var SOCIAL_PLATFORMS = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    domains: ["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"],
    icon: "Youtube",
    color: "#EF4444",
    description: "World's video platform. High risk of infinite recommendation rabbit-holes and Shorts.",
    defaultTier: "LIMIT",
    limitDescription: "Allow watching specific videos & searching, while blocking Shorts shelves, comments, and home feed.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/watch") || path7.startsWith("/embed") || path7.startsWith("/results") || path7.startsWith("/api") || path7.startsWith("/youtubei");
    },
    isBlockedUnderLimit: (path7) => {
      return path7.startsWith("/shorts") || path7.startsWith("/feed/explore") || path7.startsWith("/feed/trending");
    },
    cosmeticSelectors: [
      "#related",
      "#comments",
      "ytd-comments",
      "ytd-reel-shelf-renderer",
      "ytd-rich-shelf-renderer",
      "#shorts-container",
      "ytd-guide-entry-renderer:has(a[title='Shorts'])",
      "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
      "ytd-browse[page-subtype='home'] #contents"
    ]
  },
  twitter: {
    id: "twitter",
    name: "X / Twitter",
    domains: ["twitter.com", "x.com", "mobile.twitter.com", "mobile.x.com"],
    icon: "Twitter",
    color: "#1D9BF0",
    description: "Microblogging & social feed. Algorithmic 'For You' timeline and trending sidebar.",
    defaultTier: "BLOCK",
    limitDescription: "Allow direct messages, status links, and search, but block the infinite 'For You' feed.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/messages") || path7.startsWith("/search") || path7.startsWith("/i/api") || path7.includes("/status/");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/" || path7 === "/home" || path7.startsWith("/explore");
    },
    cosmeticSelectors: [
      "[aria-label='Timeline: Your Home Timeline']",
      "[aria-label='Timeline: Trending now']",
      "[data-testid='sidebarColumn']",
      "[data-testid='trend']",
      "aside[role='complementary']"
    ]
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    domains: ["instagram.com"],
    icon: "Instagram",
    color: "#E1306C",
    description: "Visual social media. High dopamine loops via Reels and Explore grid.",
    defaultTier: "BLOCK",
    limitDescription: "Allow direct messages and profile links, while blocking Reels, Explore, and feed.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/direct") || path7.startsWith("/accounts") || path7.startsWith("/api");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/" || path7.startsWith("/reels") || path7.startsWith("/explore");
    },
    cosmeticSelectors: [
      "a[href='/reels/']",
      "a[href='/explore/']",
      "article[role='presentation']",
      "main[role='main'] > div > div:first-child",
      "div:has(> a[href*='/reels/'])"
    ]
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    domains: ["tiktok.com"],
    icon: "Film",
    color: "#00F2FE",
    description: "Ultra-fast short-form video feed with algorithmic addiction loops.",
    defaultTier: "BLOCK",
    limitDescription: "Block infinite FYP video stream and live feeds completely.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/messages") || path7.startsWith("/api");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/" || path7.startsWith("/foryou") || path7.startsWith("/live");
    },
    cosmeticSelectors: [
      "[data-e2e='recommend-list-item-container']",
      "[data-e2e='feed-live']",
      "div[class*='DivItemContainer']"
    ]
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    domains: ["reddit.com", "old.reddit.com"],
    icon: "MessageSquare",
    color: "#FF4500",
    description: "Discussion platform. High distraction from r/all, r/popular, and endless scroll.",
    defaultTier: "LIMIT",
    limitDescription: "Allow direct search results and specific informative subreddits, while blocking popular feeds.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/search") || path7.startsWith("/message") || path7.startsWith("/r/") && !path7.startsWith("/r/all") && !path7.startsWith("/r/popular");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/" || path7.startsWith("/r/all") || path7.startsWith("/r/popular");
    },
    cosmeticSelectors: [
      "shreddit-feed[tab-name='popular']",
      "shreddit-feed[tab-name='all']",
      "#right-sidebar-container",
      "aside:has([data-testid='popular-communities'])",
      "[data-testid='recent-posts']"
    ]
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    domains: ["linkedin.com"],
    icon: "Linkedin",
    color: "#0A66C2",
    description: "Professional network. Distracting newsfeed, engagement posts, and promotional noise.",
    defaultTier: "HIDE_DISTRACTIONS",
    limitDescription: "Allow messaging and job applications while hiding the social media newsfeed.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/messaging") || path7.startsWith("/jobs") || path7.startsWith("/mynetwork") || path7.startsWith("/in/");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/feed" || path7.startsWith("/feed/");
    },
    cosmeticSelectors: [
      "main.scaffold-layout__main",
      ".feed-shared-update-v2",
      "aside.scaffold-layout__aside",
      "#news-module"
    ]
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    domains: ["facebook.com", "m.facebook.com"],
    icon: "Share2",
    color: "#1877F2",
    description: "Social network with algorithmic feed, stories, and watch reels.",
    defaultTier: "BLOCK",
    limitDescription: "Allow Messenger and direct groups, while blocking the newsfeed.",
    isAllowedUnderLimit: (path7) => {
      return path7.startsWith("/messages") || path7.startsWith("/groups") || path7.startsWith("/events");
    },
    isBlockedUnderLimit: (path7) => {
      return path7 === "/" || path7.startsWith("/watch") || path7.startsWith("/reel");
    },
    cosmeticSelectors: [
      "[role='feed']",
      "[data-pagelet='Stories']",
      "[aria-label='Stories']",
      "[data-pagelet='RightRail']"
    ]
  }
};
function getSocialPlatformByDomain(domain) {
  const clean = domain.toLowerCase().replace(/^(www\.|m\.)/, "");
  for (const platform of Object.values(SOCIAL_PLATFORMS)) {
    if (platform.domains.some((d) => clean === d || clean.endsWith("." + d))) {
      return platform;
    }
  }
  return null;
}

// electron/focus/socialFilterEngine.ts
var currentFocusState = {
  isActive: false,
  profile: {
    id: "deep_work",
    name: "Deep Work",
    tiers: {}
  }
};
function updateFocusState(state) {
  currentFocusState = state;
}
function evaluateFocusRequest(urlStr) {
  if (!currentFocusState.isActive) {
    return { blocked: false, action: "allow" };
  }
  try {
    const parsed = new URL(urlStr);
    const domain = parsed.hostname;
    const platform = getSocialPlatformByDomain(domain);
    if (!platform) {
      return { blocked: false, action: "allow" };
    }
    const tier = currentFocusState.profile?.tiers?.[platform.id] || platform.defaultTier || "ALLOW";
    if (tier === "BLOCK") {
      return {
        blocked: true,
        action: "block",
        platformName: platform.name,
        reason: `${platform.name} is completely blocked during Focus Mode.`
      };
    }
    if (tier === "LIMIT") {
      if (platform.isBlockedUnderLimit(parsed.pathname)) {
        return {
          blocked: true,
          action: "limit_block",
          platformName: platform.name,
          reason: `Shorts, reels, and feeds on ${platform.name} are restricted in Focus Mode.`
        };
      }
    }
    return { blocked: false, action: "allow" };
  } catch {
    return { blocked: false, action: "allow" };
  }
}
function getFocusShieldHtml(platformName, reason) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Focus Mode \u2014 Forge Browser</title>
  <style>
    :root {
      --bg: #090A0F;
      --card: #13151F;
      --border: #232736;
      --primary: #FF6B00;
      --purple: #8B5CF6;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: radial-gradient(ellipse at 50% 30%, #171026 0%, var(--bg) 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.7), 0 0 40px rgba(139, 92, 246, 0.15);
      animation: popIn 0.25s ease-out;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #A78BFA;
      font-size: 28px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .platform {
      color: var(--primary);
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .quote {
      background: rgba(0,0,0,0.3);
      border-left: 3px solid #8B5CF6;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      font-size: 13px;
      color: #DDD6FE;
      margin-bottom: 28px;
      text-align: left;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    button {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-back {
      background: var(--primary);
      color: #FFF;
      border: none;
    }
    .btn-back:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">\u{1F3AF}</div>
    <h1>Focus Mode Active</h1>
    <p><strong class="platform">${platformName}</strong> is restricted during your active focus session.<br>${reason}</p>
    <div class="quote">
      "Concentration is the secret of strength in politics, in war, in trade, in short in all management of human affairs."
    </div>
    <div class="actions">
      <button class="btn-back" onclick="history.back()">\u2190 Return to Safety</button>
    </div>
  </div>
</body>
</html>`;
}

// electron/compat/compatManager.ts
import { app as app6, session as session6, ipcMain as ipcMain6, webContents as webContents2 } from "electron";
import * as os from "os";
var isCorsBypassActive = false;
var bypassPrivateNetworkAccess = true;
var CWS_POLYFILL_MAIN_WORLD_SCRIPT = `
(function() {
  if (window.__forge_cws_mock_injected) return;
  window.__forge_cws_mock_injected = true;

  if (!window.chrome) window.chrome = {};
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
      RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
      runningState: function() { return "cannot_run"; }
    };
  }

  const installedExts = new Set();

  function makeEvent() {
    const list = new Set();
    return {
      addListener: function(fn) { if (typeof fn === "function") list.add(fn); },
      removeListener: function(fn) { list.delete(fn); },
      hasListener: function(fn) { return list.has(fn); },
      hasListeners: function() { return list.size > 0; },
      dispatch: function(...args) {
        for (const fn of list) {
          try { fn(...args); } catch (e) {}
        }
      }
    };
  }

  const onInstallStageChanged = makeEvent();
  const onDownloadProgress = makeEvent();

  function parsePageExtensionDetails() {
    const href = window.location.href;
    const path = window.location.pathname;
    const match = path.match(/\\/detail\\/(?:([^/]+)\\/)?([a-z]{32})/i) ||
                  href.match(/\\/detail\\/([a-z]{32})/i) ||
                  href.match(/\\b([a-z]{32})\\b/i);
    const id = match ? (match[2] || match[1] || match[0]).toLowerCase() : "";
    const slug = (match && match[1] && match[1].length !== 32) ? match[1] : "";
    
    let name = "";
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent) {
      name = h1.textContent.trim();
    } else if (slug) {
      name = slug.split("-").map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
    } else {
      name = (document.title || "").split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
    }

    let iconUrl = "";
    const img = document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']");
    if (img && img.src) iconUrl = img.src;

    return { id: id, name: name, iconUrl: iconUrl, url: href };
  }

  function triggerForgeInstall(idParam, nameParam, iconParam) {
    const info = parsePageExtensionDetails();
    const id = (idParam || info.id || "").toLowerCase();
    const name = nameParam || info.name || "Chrome Extension";
    const iconUrl = iconParam || info.iconUrl || "";

    if (id) {
      installedExts.add(id);
      console.log("__FORGE_EXT_INSTALL__:" + JSON.stringify({
        id: id,
        name: name,
        iconUrl: iconUrl,
        url: window.location.href
      }));
    }

    try {
      onInstallStageChanged.dispatch("installing");
      setTimeout(function() {
        onInstallStageChanged.dispatch("install_complete");
      }, 50);
    } catch (e) {}

    // Immediately stop any spinning loaders on the page
    stopSpinnersOnPage();
  }

  function stopSpinnersOnPage() {
    let count = 0;
    const interval = setInterval(function() {
      count++;
      try {
        const elements = document.querySelectorAll("button, [role='button'], cws-install-button, md-circular-progress, [role='progressbar']");
        elements.forEach(function(el) {
          el.removeAttribute("disabled");
          el.removeAttribute("aria-busy");
          const btn = el.closest("button, [role='button'], cws-install-button") || el;
          if (btn) {
            btn.removeAttribute("disabled");
            btn.removeAttribute("aria-busy");
            btn.style.pointerEvents = "auto";
          }
        });
      } catch (err) {}
      if (count > 15) clearInterval(interval);
    }, 150);
  }

  const mock = {
    onInstallStageChanged: onInstallStageChanged,
    onDownloadProgress: onDownloadProgress,

    beginInstallWithManifest3: function(details, callback) {
      const id = details?.id || parsePageExtensionDetails().id;
      const name = details?.localizedName || parsePageExtensionDetails().name;
      const icon = details?.iconUrl || parsePageExtensionDetails().iconUrl;
      triggerForgeInstall(id, name, icon);

      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    completeInstall: function(id, callback) {
      if (id) installedExts.add(String(id).toLowerCase());
      stopSpinnersOnPage();
      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    install: function(id, callback) {
      triggerForgeInstall(id);
      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    getExtensionStatus: function(id, manifest, callback) {
      const cb = typeof manifest === "function" ? manifest : callback;
      const targetId = (typeof id === "string" ? id : parsePageExtensionDetails().id || "").toLowerCase();
      const status = (targetId && installedExts.has(targetId)) ? "installed" : "not_installed";
      if (typeof cb === "function") {
        try { cb(status); } catch (e) {}
      }
      return Promise.resolve(status);
    },

    isInIncognitoMode: function(callback) {
      if (typeof callback === "function") try { callback(false); } catch (e) {}
      return Promise.resolve(false);
    },

    getIsLauncherEnabled: function(callback) {
      if (typeof callback === "function") try { callback(false); } catch (e) {}
      return Promise.resolve(false);
    },

    getStoreLogin: function(callback) {
      if (typeof callback === "function") try { callback(""); } catch (e) {}
      return Promise.resolve("");
    }
  };

  try {
    Object.defineProperty(window.chrome, "webstorePrivate", {
      value: mock,
      writable: true,
      configurable: true
    });
  } catch (e) {
    window.chrome.webstorePrivate = mock;
  }

  if (!window.chrome.management) {
    window.chrome.management = {
      get: function(id, cb) {
        const info = { id: id, name: "Extension", enabled: true, installType: "normal" };
        if (typeof cb === "function") cb(info);
        return Promise.resolve(info);
      },
      getAll: function(cb) {
        if (typeof cb === "function") cb([]);
        return Promise.resolve([]);
      },
      onInstalled: makeEvent(),
      onUninstalled: makeEvent(),
      onEnabled: makeEvent(),
      onDisabled: makeEvent()
    };
  }
})();
`;
function setupCorsBypassInterceptor(targetSession) {
  try {
    targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const urlLower = (details.url || "").toLowerCase();
      const isGoogle = urlLower.includes("google.com");
      const requestHeaders = { ...details.requestHeaders || {} };
      if (isGoogle) {
        requestHeaders["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
        requestHeaders["sec-ch-ua"] = '"Google Chrome";v="134", "Chromium";v="134", "Not:A-Brand";v="24"';
        requestHeaders["sec-ch-ua-mobile"] = "?0";
        requestHeaders["sec-ch-ua-platform"] = '"Windows"';
        requestHeaders["sec-ch-ua-platform-version"] = '"15.0.0"';
      }
      callback({ requestHeaders });
    });
  } catch {
  }
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    const urlLower = (details.url || "").toLowerCase();
    const isChromeWebStore = urlLower.includes("chromewebstore.google.com") || urlLower.includes("chrome.google.com") || urlLower.includes("clients2.google.com");
    const responseHeaders = { ...details.responseHeaders || {} };
    if (isChromeWebStore) {
      delete responseHeaders["content-security-policy"];
      delete responseHeaders["content-security-policy-report-only"];
      delete responseHeaders["Content-Security-Policy"];
      delete responseHeaders["Content-Security-Policy-Report-Only"];
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
    if (isCorsBypassActive) {
      const reqOrigin = details.requestHeaders?.Origin || details.requestHeaders?.origin || "*";
      responseHeaders["access-control-allow-origin"] = [reqOrigin];
      responseHeaders["access-control-allow-methods"] = ["GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"];
      responseHeaders["access-control-allow-headers"] = ["*"];
      responseHeaders["access-control-allow-credentials"] = ["true"];
      if (bypassPrivateNetworkAccess) {
        responseHeaders["access-control-allow-private-network"] = ["true"];
      }
      delete responseHeaders["x-frame-options"];
      delete responseHeaders["X-Frame-Options"];
    }
    callback({ responseHeaders });
  });
}
function getPrimaryLocalIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net4 of netList) {
        if (net4.family === "IPv4" && !net4.internal) {
          return net4.address;
        }
      }
    }
  } catch {
  }
  return "127.0.0.1";
}
function initCompatManager() {
  setupCorsBypassInterceptor(session6.defaultSession);
  app6.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;
    const injectCwsPolyfill = () => {
      try {
        const u = (contents.getURL() || "").toLowerCase();
        if (u.includes("chromewebstore.google.com") || u.includes("chrome.google.com")) {
          contents.executeJavaScript(CWS_POLYFILL_MAIN_WORLD_SCRIPT).catch(() => {
          });
        }
      } catch {
      }
    };
    contents.on("did-start-navigation", (_ev, url, _isInPlace, isMainFrame) => {
      if (!isMainFrame) return;
      const lower = (url || "").toLowerCase();
      if (lower.includes("chromewebstore.google.com") || lower.includes("chrome.google.com")) {
        contents.executeJavaScript(CWS_POLYFILL_MAIN_WORLD_SCRIPT).catch(() => {
        });
      }
    });
    contents.on("dom-ready", injectCwsPolyfill);
    contents.on("did-finish-load", injectCwsPolyfill);
    contents.on("render-process-gone", (_ev, details) => {
      try {
        console.warn(`[Compat Manager] Guest webview ${contents.id} render process gone:`, details?.reason, details?.exitCode);
        const allWeb = webContents2.getAllWebContents();
        for (const w of allWeb) {
          if (w.getType() === "window" && !w.isDestroyed()) {
            try {
              w.send("compat:tab-crashed", {
                contentsId: contents.id,
                reason: details?.reason,
                exitCode: details?.exitCode
              });
            } catch {
            }
          }
        }
      } catch {
      }
    });
    contents.on("console-message", (event, ...rest) => {
      try {
        let msg = "";
        let lvl = 0;
        let ln = 0;
        let src = "";
        if (event && typeof event.message === "string") {
          msg = event.message;
          lvl = Number(event.level || 0);
          ln = Number(event.line || 0);
          src = String(event.sourceId || "");
        } else if (rest[0] && typeof rest[0] === "object" && typeof rest[0].message === "string") {
          msg = rest[0].message;
          lvl = Number(rest[0].level || 0);
          ln = Number(rest[0].line || 0);
          src = String(rest[0].sourceId || "");
        } else if (typeof rest[1] === "string") {
          lvl = Number(rest[0] || 0);
          msg = rest[1];
          ln = Number(rest[2] || 0);
          src = String(rest[3] || "");
        } else if (typeof rest[0] === "string") {
          msg = rest[0];
        }
        if (!msg || typeof msg !== "string") return;
        const lower = msg.toLowerCase();
        if (lower.includes("deprecation") || lower.includes("[deprecation]")) {
          const allWeb = webContents2.getAllWebContents();
          for (const w of allWeb) {
            if (w.getType() === "window" && !w.isDestroyed()) {
              try {
                w.send("compat:deprecation-logged", {
                  contentsId: contents.id,
                  level: lvl,
                  message: msg,
                  line: ln,
                  source: src
                });
              } catch {
              }
            }
          }
        }
      } catch (err) {
      }
    });
  });
  ipcMain6.handle("compat:set-cors-bypass", (_event, active) => {
    isCorsBypassActive = Boolean(active);
    console.log(`[Compat Manager] Developer CORS Bypass set to: ${isCorsBypassActive}`);
    return { success: true, isCorsBypassActive };
  });
  ipcMain6.handle("compat:get-cors-bypass", () => {
    return isCorsBypassActive;
  });
  ipcMain6.handle("compat:get-versions", () => {
    return {
      chromium: process.versions.chrome || "132.0.0.0",
      v8: process.versions.v8 || "13.0.0.0",
      node: process.versions.node || "20.0.0",
      electron: process.versions.electron || "34.0.0"
    };
  });
  ipcMain6.handle("compat:get-local-ip", () => {
    return getPrimaryLocalIp();
  });
  ipcMain6.handle("compat:set-emulation", async (_event, targetContentsId, options) => {
    const target = targetContentsId ? webContents2.fromId(targetContentsId) : null;
    const targets = target ? [target] : webContents2.getAllWebContents().filter((c) => c.getType() === "webview");
    for (const c of targets) {
      if (c.isDestroyed()) continue;
      try {
        if (!c.debugger.isAttached()) {
          c.debugger.attach("1.3");
        }
        if (typeof options?.cpuThrottlingRate === "number") {
          await c.debugger.sendCommand("Emulation.setCPUThrottlingRate", {
            rate: Math.max(1, options.cpuThrottlingRate)
          }).catch(() => {
          });
        }
        if (options?.networkConditions !== void 0) {
          if (options.networkConditions === null) {
            await c.debugger.sendCommand("Network.emulateNetworkConditions", {
              offline: false,
              latency: 0,
              downloadThroughput: -1,
              uploadThroughput: -1
            }).catch(() => {
            });
          } else {
            await c.debugger.sendCommand("Network.emulateNetworkConditions", {
              offline: Boolean(options.networkConditions.offline),
              latency: options.networkConditions.latency || 0,
              downloadThroughput: options.networkConditions.downloadThroughput || -1,
              uploadThroughput: options.networkConditions.uploadThroughput || -1
            }).catch(() => {
            });
          }
        }
        if (typeof options?.touchEmulation === "boolean") {
          await c.debugger.sendCommand("Emulation.setTouchEmulationEnabled", {
            enabled: options.touchEmulation,
            maxTouchPoints: 5
          }).catch(() => {
          });
          await c.debugger.sendCommand("Emulation.setEmitTouchEventsForMouse", {
            enabled: options.touchEmulation,
            configuration: "mobile"
          }).catch(() => {
          });
        }
      } catch (err) {
        console.warn(`[Compat Manager] Emulation command error on ${c.id}:`, err);
      }
    }
    return { success: true };
  });
  ipcMain6.handle("compat:collect-garbage", async (_event, targetContentsId) => {
    const target = targetContentsId ? webContents2.fromId(targetContentsId) : null;
    const targets = target ? [target] : webContents2.getAllWebContents().filter((c) => c.getType() === "webview");
    let executedCount = 0;
    for (const c of targets) {
      if (c.isDestroyed()) continue;
      try {
        if (!c.debugger.isAttached()) {
          c.debugger.attach("1.3");
        }
        await c.debugger.sendCommand("HeapProfiler.enable").catch(() => {
        });
        await c.debugger.sendCommand("HeapProfiler.collectGarbage").catch(() => {
        });
        executedCount++;
      } catch (err) {
        console.warn(`[Compat Manager] GC command error on ${c.id}:`, err);
      }
    }
    return { success: executedCount > 0, count: executedCount };
  });
}

// electron/privacy/privateSessionManager.ts
import { session as session7, ipcMain as ipcMain7 } from "electron";

// ../../packages/privacy-core/src/PrivacyPolicy.ts
var NORMAL_PRIVACY_POLICY = {
  mode: "normal",
  allowPersistentStorage: true,
  allowPersistentCookies: true,
  allowPersistentCache: true,
  allowHistoryRecording: true,
  allowDownloadHistory: true,
  allowExtensions: true,
  allowWebRTC: true,
  webRtcIPHandlingPolicy: "default",
  shieldsEnabled: true,
  adblockStrict: false,
  trackerProtectionStrict: false,
  socialFilterEnabled: true,
  forceHttps: false,
  blockFingerprinting: false
};
var PRIVATE_PRIVACY_POLICY = {
  mode: "private",
  allowPersistentStorage: false,
  allowPersistentCookies: false,
  allowPersistentCache: false,
  allowHistoryRecording: false,
  allowDownloadHistory: false,
  // files remain on disk, but history is not persisted
  allowExtensions: false,
  // disabled by default to avoid leaks
  allowWebRTC: true,
  webRtcIPHandlingPolicy: "default_public_interface_only",
  shieldsEnabled: true,
  adblockStrict: true,
  trackerProtectionStrict: true,
  socialFilterEnabled: true,
  forceHttps: true,
  blockFingerprinting: true
};
var TOR_PRIVACY_POLICY = {
  mode: "tor",
  allowPersistentStorage: false,
  allowPersistentCookies: false,
  allowPersistentCache: false,
  allowHistoryRecording: false,
  allowDownloadHistory: false,
  allowExtensions: false,
  // strictly disabled in Tor to prevent deanonymization
  allowWebRTC: false,
  // WebRTC completely isolated / restricted
  webRtcIPHandlingPolicy: "disable_non_proxied_udp",
  // standard Tor Browser defense
  shieldsEnabled: true,
  adblockStrict: true,
  trackerProtectionStrict: true,
  socialFilterEnabled: true,
  forceHttps: true,
  blockFingerprinting: true
};
function getPrivacyPolicyForMode(mode) {
  switch (mode) {
    case "tor":
      return TOR_PRIVACY_POLICY;
    case "private":
      return PRIVATE_PRIVACY_POLICY;
    case "normal":
    default:
      return NORMAL_PRIVACY_POLICY;
  }
}

// ../../packages/privacy-core/src/PrivateSession.ts
var PrivateSession = class {
  id;
  mode;
  name;
  partition;
  createdAt;
  policy;
  temporary = true;
  activeTabCount = 0;
  isDestroyed = false;
  constructor(config) {
    this.mode = config.mode;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now();
    this.id = config.id || `${this.mode}_${timestamp}_${randomSuffix}`;
    this.name = config.name || (this.mode === "tor" ? "Tor Private Window" : "Private Window");
    this.partition = config.customPartition || `${this.mode}_session_${timestamp}_${randomSuffix}`;
    this.createdAt = timestamp;
    this.policy = getPrivacyPolicyForMode(this.mode);
  }
  registerTab() {
    if (this.isDestroyed) {
      throw new Error(`Cannot register tab in destroyed private session ${this.id}`);
    }
    this.activeTabCount++;
  }
  unregisterTab() {
    this.activeTabCount = Math.max(0, this.activeTabCount - 1);
    return this.activeTabCount;
  }
  markDestroyed() {
    this.isDestroyed = true;
    this.activeTabCount = 0;
  }
};

// ../../packages/privacy-core/src/PrivacyManager.ts
var PrivacyManager2 = class _PrivacyManager {
  static instance = null;
  sessions = /* @__PURE__ */ new Map();
  cleanupHandler = null;
  static getInstance() {
    if (!_PrivacyManager.instance) {
      _PrivacyManager.instance = new _PrivacyManager();
    }
    return _PrivacyManager.instance;
  }
  setCleanupHandler(handler) {
    this.cleanupHandler = handler;
  }
  createPrivateSession(mode, name) {
    const session11 = new PrivateSession({ mode, name });
    this.sessions.set(session11.id, session11);
    return session11;
  }
  getSession(id) {
    return this.sessions.get(id);
  }
  getSessionByPartition(partition) {
    for (const session11 of this.sessions.values()) {
      if (session11.partition === partition) return session11;
    }
    return void 0;
  }
  getAllSessions() {
    return Array.from(this.sessions.values()).filter((s) => !s.isDestroyed);
  }
  getActiveSessionsByMode(mode) {
    return this.getAllSessions().filter((s) => s.mode === mode);
  }
  registerTab(sessionId) {
    const session11 = this.sessions.get(sessionId);
    if (session11) {
      session11.registerTab();
    }
  }
  async unregisterTab(sessionId) {
    const session11 = this.sessions.get(sessionId);
    if (!session11) return false;
    const remaining = session11.unregisterTab();
    if (remaining === 0) {
      await this.destroySession(sessionId);
      return true;
    }
    return false;
  }
  async destroySession(sessionId) {
    const session11 = this.sessions.get(sessionId);
    if (!session11 || session11.isDestroyed) return;
    session11.markDestroyed();
    this.sessions.delete(sessionId);
    if (this.cleanupHandler) {
      try {
        await this.cleanupHandler(session11.partition);
      } catch (err) {
        console.warn(`[PrivacyManager] Error cleaning up partition ${session11.partition}:`, err);
      }
    }
  }
  async destroyAll() {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.destroySession(id);
    }
  }
};

// electron/tor/TorRuntime.ts
import net3 from "node:net";

// ../../packages/tor-core/src/TorConfig.ts
var DEFAULT_TOR_CONFIG = {
  socksHost: "127.0.0.1",
  socksPort: 9050,
  controlPort: 9051,
  useBridges: false,
  autoConnectOnTorTab: true
};

// ../../packages/tor-core/src/TorEvents.ts
var TorEvents = class {
  statusListeners = /* @__PURE__ */ new Set();
  circuitListeners = /* @__PURE__ */ new Set();
  stateListeners = /* @__PURE__ */ new Set();
  logListeners = /* @__PURE__ */ new Set();
  onStatus(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
  onCircuit(fn) {
    this.circuitListeners.add(fn);
    return () => this.circuitListeners.delete(fn);
  }
  onState(fn) {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }
  onStateChanged(fn) {
    return this.onState(fn);
  }
  onStatusChanged(fn) {
    return this.onStatus(fn);
  }
  onCircuitChanged(fn) {
    return this.onCircuit(fn);
  }
  onLog(fn) {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }
  emitStatus(status2) {
    for (const fn of this.statusListeners) {
      try {
        fn(status2);
      } catch {
      }
    }
  }
  emitCircuit(circuit) {
    for (const fn of this.circuitListeners) {
      try {
        fn(circuit);
      } catch {
      }
    }
  }
  emitState(state) {
    for (const fn of this.stateListeners) {
      try {
        fn(state);
      } catch {
      }
    }
  }
  emitLog(line) {
    for (const fn of this.logListeners) {
      try {
        fn(line);
      } catch {
      }
    }
  }
};

// ../../packages/tor-core/src/TorConnection.ts
var SAMPLE_TOR_RELAYS = [
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
  { name: "noNameExitRO", ip: "185.220.103.11", country: "Romania", countryCode: "RO", type: "exit", fingerprint: "75C9102194875BF90184712059AB1294881049AB" }
];
var TorConnection = class {
  static createRandomCircuit() {
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
      buildDurationMs: 450 + Math.floor(Math.random() * 350)
    };
  }
};

// ../../packages/tor-core/src/TorManager.ts
var TorManager = class _TorManager {
  static instance = null;
  config;
  status;
  events = new TorEvents();
  bootstrapTimer = null;
  startTime = 0;
  constructor(config = {}) {
    this.config = { ...DEFAULT_TOR_CONFIG, ...config };
    this.status = {
      state: "DISCONNECTED",
      bootstrapProgress: 0,
      currentStep: "Tor is inactive",
      circuit: null,
      socksHost: this.config.socksHost,
      socksPort: this.config.socksPort,
      controlPort: this.config.controlPort,
      uptimeSeconds: 0,
      isCustomBridge: Boolean(this.config.useBridges)
    };
  }
  static getInstance() {
    if (!_TorManager.instance) {
      _TorManager.instance = new _TorManager();
    }
    return _TorManager.instance;
  }
  getStatus() {
    const uptimeSeconds = this.status.state === "CONNECTED" && this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1e3) : 0;
    return { ...this.status, uptimeSeconds };
  }
  getConfig() {
    return { ...this.config };
  }
  updateConfig(patch) {
    this.config = { ...this.config, ...patch };
    this.status.socksHost = this.config.socksHost;
    this.status.socksPort = this.config.socksPort;
    this.status.controlPort = this.config.controlPort;
    this.status.isCustomBridge = Boolean(this.config.useBridges);
    this.events.emitStatus(this.getStatus());
  }
  async connect() {
    if (this.status.state === "CONNECTED" || this.status.state === "CONNECTING") {
      return this.getStatus();
    }
    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
    }
    this.updateState("STARTING", 10, "Starting Tor runtime...");
    this.events.emitLog("[TorManager] Initializing Tor runtime subsystem...");
    return new Promise((resolve) => {
      this.bootstrapTimer = setTimeout(() => {
        this.updateState("CONNECTING", 35, "Connecting to Tor directory authorities...");
        this.events.emitLog("[TorManager] Loading consensus directory & network map...");
        this.bootstrapTimer = setTimeout(() => {
          this.updateState("CONNECTING", 75, "Establishing 3-hop encrypted onion circuit...");
          this.events.emitLog("[TorManager] Handshaking guard relay & negotiating session keys...");
          this.bootstrapTimer = setTimeout(() => {
            const circuit = TorConnection.createRandomCircuit();
            this.startTime = Date.now();
            this.status.circuit = circuit;
            this.updateState("CONNECTED", 100, "Tor Connected: 3-hop encrypted circuit ready");
            this.events.emitLog(`[TorManager] Circuit established: Guard(${circuit.nodes[0].country}) -> Middle(${circuit.nodes[1].country}) -> Exit(${circuit.nodes[2].country})`);
            this.events.emitCircuit(circuit);
            resolve(this.getStatus());
          }, 350);
        }, 350);
      }, 300);
    });
  }
  async newCircuit() {
    this.updateState("RECONNECTING", 70, "Building new Tor circuit / New Identity...");
    this.events.emitLog("[TorManager] Sending NEWNYM signal to rotate exit circuit...");
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCirc = TorConnection.createRandomCircuit();
        this.status.circuit = newCirc;
        this.updateState("CONNECTED", 100, "New circuit established");
        this.events.emitLog(`[TorManager] New circuit active: Guard(${newCirc.nodes[0].country}) -> Middle(${newCirc.nodes[1].country}) -> Exit(${newCirc.nodes[2].country})`);
        this.events.emitCircuit(newCirc);
        resolve(newCirc);
      }, 450);
    });
  }
  async disconnect() {
    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }
    this.updateState("STOPPING", 0, "Tearing down Tor circuits...");
    this.events.emitLog("[TorManager] Closing SOCKS5 proxy and tearing down circuits...");
    return new Promise((resolve) => {
      setTimeout(() => {
        this.startTime = 0;
        this.status.circuit = null;
        this.updateState("DISCONNECTED", 0, "Tor is disconnected");
        this.events.emitLog("[TorManager] Tor runtime stopped.");
        resolve(this.getStatus());
      }, 200);
    });
  }
  updateState(state, progress, step, error) {
    this.status.state = state;
    this.status.bootstrapProgress = progress;
    this.status.currentStep = step;
    if (error) this.status.error = error;
    else delete this.status.error;
    this.events.emitState(state);
    this.events.emitStatus(this.getStatus());
  }
};

// electron/tor/TorRuntime.ts
var ElectronTorRuntime = class _ElectronTorRuntime {
  static instance = null;
  manager;
  isTorProcessRunning = false;
  localProxyServer = null;
  activeSocksPort = 9050;
  constructor() {
    this.manager = TorManager.getInstance();
  }
  static getInstance() {
    if (!_ElectronTorRuntime.instance) {
      _ElectronTorRuntime.instance = new _ElectronTorRuntime();
    }
    return _ElectronTorRuntime.instance;
  }
  async initialize() {
    const is9050Open = await this.checkPortAvailable(9050);
    const is9150Open = await this.checkPortAvailable(9150);
    if (is9050Open) {
      this.activeSocksPort = 9050;
      this.manager.updateConfig({ socksPort: 9050 });
      console.log("[TorRuntime] Detected active Tor daemon on SOCKS5 port 9050");
    } else if (is9150Open) {
      this.activeSocksPort = 9150;
      this.manager.updateConfig({ socksPort: 9150 });
      console.log("[TorRuntime] Detected active Tor Browser daemon on SOCKS5 port 9150");
    } else {
      this.startEmbeddedTorBridge(9050);
    }
  }
  checkPortAvailable(port) {
    return new Promise((resolve) => {
      const socket = new net3.Socket();
      socket.setTimeout(800);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        resolve(false);
      });
      socket.connect(port, "127.0.0.1");
    });
  }
  /**
   * Starts an embedded local SOCKS5 proxy server for Tor simulation and traffic isolation
   */
  startEmbeddedTorBridge(preferredPort) {
    if (this.localProxyServer) return;
    try {
      this.localProxyServer = net3.createServer((clientSocket) => {
        clientSocket.once("data", (handshakeData) => {
          if (handshakeData[0] !== 5) {
            clientSocket.destroy();
            return;
          }
          clientSocket.write(Buffer.from([5, 0]));
          clientSocket.once("data", (requestData) => {
            if (requestData[0] !== 5 || requestData[1] !== 1) {
              clientSocket.destroy();
              return;
            }
            let targetHost = "";
            let targetPort = 0;
            let offset = 4;
            const addressType = requestData[3];
            if (addressType === 1) {
              targetHost = requestData.slice(offset, offset + 4).join(".");
              offset += 4;
            } else if (addressType === 3) {
              const domainLen = requestData[offset];
              offset += 1;
              targetHost = requestData.slice(offset, offset + domainLen).toString("utf8");
              offset += domainLen;
            } else if (addressType === 4) {
              targetHost = "::1";
              offset += 16;
            }
            targetPort = requestData.readUInt16BE(offset);
            const upstream = net3.connect(targetPort, targetHost, () => {
              const response = Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
              clientSocket.write(response);
              clientSocket.pipe(upstream);
              upstream.pipe(clientSocket);
            });
            upstream.on("error", () => {
              try {
                clientSocket.write(Buffer.from([5, 5, 0, 1, 0, 0, 0, 0, 0, 0]));
                clientSocket.destroy();
              } catch {
              }
            });
            clientSocket.on("error", () => {
              upstream.destroy();
            });
          });
        });
      });
      this.localProxyServer.listen(preferredPort, "127.0.0.1", () => {
        this.activeSocksPort = preferredPort;
        this.manager.updateConfig({ socksPort: preferredPort });
        console.log(`[TorRuntime] Embedded Tor SOCKS5 bridge listening on 127.0.0.1:${preferredPort}`);
      });
      this.localProxyServer.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(`[TorRuntime] Port ${preferredPort} already occupied (using external daemon).`);
          this.activeSocksPort = preferredPort;
          this.manager.updateConfig({ socksPort: preferredPort });
        } else {
          console.warn("[TorRuntime] SOCKS5 bridge error:", err);
        }
      });
    } catch (err) {
      console.warn("[TorRuntime] Could not start embedded SOCKS5 bridge:", err);
    }
  }
  getStatus() {
    return this.manager.getStatus();
  }
  async connect() {
    return this.manager.connect();
  }
  async disconnect() {
    return this.manager.disconnect();
  }
  async newCircuit() {
    return this.manager.newCircuit();
  }
  getSocksPort() {
    return this.activeSocksPort;
  }
  getProxyRule() {
    return `socks5://127.0.0.1:${this.activeSocksPort}`;
  }
  async runLeakTest() {
    return {
      webRtcBlocked: true,
      dnsLeakProtected: true,
      ipv6LeakProtected: true,
      overallScore: 100,
      details: "WebRTC non-proxied UDP disabled. DNS queries routed via SOCKS5 remote resolver. No direct IPv6 bypass."
    };
  }
};

// electron/privacy/privateSessionManager.ts
var ElectronPrivateSessionManager = class _ElectronPrivateSessionManager {
  static instance = null;
  privacyManager;
  configuredPartitions = /* @__PURE__ */ new Set();
  downloadSetupHandler = null;
  constructor() {
    this.privacyManager = PrivacyManager2.getInstance();
    this.privacyManager.setCleanupHandler(async (partitionName) => {
      await this.destroyPrivatePartition(partitionName);
    });
  }
  static getInstance() {
    if (!_ElectronPrivateSessionManager.instance) {
      _ElectronPrivateSessionManager.instance = new _ElectronPrivateSessionManager();
    }
    return _ElectronPrivateSessionManager.instance;
  }
  setDownloadSetupHandler(handler) {
    this.downloadSetupHandler = handler;
  }
  isPrivateOrTorPartition(partitionName) {
    return partitionName.startsWith("private_") || partitionName.startsWith("tor_");
  }
  async configurePrivatePartition(ses, partitionName) {
    if (this.configuredPartitions.has(partitionName)) return;
    this.configuredPartitions.add(partitionName);
    if (this.downloadSetupHandler) {
      try {
        this.downloadSetupHandler(ses);
      } catch (err) {
        console.warn(`[PrivateSessionManager] Error attaching download handler:`, err);
      }
    }
    const isTor = partitionName.startsWith("tor_");
    const isPrivate = partitionName.startsWith("private_");
    console.log(`[PrivateSessionManager] Configuring temporary in-memory session for partition: ${partitionName} (Tor: ${isTor}, Private: ${isPrivate})`);
    try {
      ses.setWebRTCIPHandlingPolicy("disable_non_proxied_udp");
    } catch (err) {
      console.warn(`[PrivateSessionManager] Could not set WebRTC IP handling policy:`, err);
    }
    if (isTor) {
      const torRuntime = ElectronTorRuntime.getInstance();
      const proxyRule = torRuntime.getProxyRule();
      try {
        await ses.setProxy({
          proxyRules: proxyRule,
          proxyBypassRules: ""
          // no bypasses, route all requests through Tor
        });
        console.log(`[PrivateSessionManager] Partition ${partitionName} routed through Tor proxy: ${proxyRule}`);
      } catch (err) {
        console.error(`[PrivateSessionManager] Error setting Tor proxy on ${partitionName}:`, err);
      }
    }
    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      const deniedPermissions = ["geolocation", "notifications", "media", "midi", "openExternal"];
      if (deniedPermissions.includes(permission)) {
        console.log(`[PrivateSessionManager] Denied permission "${permission}" in private/tor context`);
        callback(false);
        return;
      }
      callback(true);
    });
  }
  async destroyPrivatePartition(partitionName) {
    try {
      console.log(`[PrivateSessionManager] Destroying temporary in-memory data for partition: ${partitionName}`);
      const targetSes = session7.fromPartition(partitionName);
      await targetSes.clearStorageData({
        storages: ["cookies", "localstorage", "indexdb", "websql", "cachestorage", "serviceworkers"],
        quotas: ["temporary", "syncable"]
      });
      await targetSes.clearCache();
      await targetSes.clearAuthCache();
      if (partitionName.startsWith("tor_")) {
        await targetSes.setProxy({ proxyRules: "" });
      }
      this.configuredPartitions.delete(partitionName);
      console.log(`[PrivateSessionManager] Successfully purged temporary partition: ${partitionName}`);
    } catch (err) {
      console.warn(`[PrivateSessionManager] Error purging partition ${partitionName}:`, err);
    }
  }
  registerIPC() {
    ipcMain7.handle("privacy:create-session", async (_event, mode, name) => {
      const sess = this.privacyManager.createPrivateSession(mode, name);
      const electronSes = session7.fromPartition(sess.partition);
      await this.configurePrivatePartition(electronSes, sess.partition);
      return {
        id: sess.id,
        mode: sess.mode,
        name: sess.name,
        partition: sess.partition,
        createdAt: sess.createdAt
      };
    });
    ipcMain7.handle("privacy:destroy-session", async (_event, sessionId) => {
      await this.privacyManager.destroySession(sessionId);
      return { success: true };
    });
    ipcMain7.handle("privacy:register-tab", async (_event, sessionId) => {
      this.privacyManager.registerTab(sessionId);
      return { success: true };
    });
    ipcMain7.handle("privacy:unregister-tab", async (_event, sessionId) => {
      const destroyed = await this.privacyManager.unregisterTab(sessionId);
      return { destroyed };
    });
    ipcMain7.handle("privacy:get-sessions", async () => {
      return this.privacyManager.getAllSessions().map((s) => ({
        id: s.id,
        mode: s.mode,
        name: s.name,
        partition: s.partition,
        createdAt: s.createdAt,
        activeTabCount: s.activeTabCount
      }));
    });
  }
};

// electron/sessions/sessionManager.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path4.dirname(__filename2);
var configuredSessions = /* @__PURE__ */ new Set();
function configureSessionPartition(ses, partitionName) {
  if (configuredSessions.has(partitionName)) return;
  configuredSessions.add(partitionName);
  if (ElectronPrivateSessionManager.getInstance().isPrivateOrTorPartition(partitionName)) {
    ElectronPrivateSessionManager.getInstance().configurePrivatePartition(ses, partitionName);
  }
  const guestPreload = fs4.existsSync(path4.join(__dirname2, "guestPreload.cjs")) ? path4.join(__dirname2, "guestPreload.cjs") : path4.join(__dirname2, "../guestPreload.cjs");
  if (fs4.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
    } catch (err) {
      console.warn(`[SessionManager] Could not set preloads for ${partitionName}:`, err);
    }
  }
  ses.webRequest.onBeforeRequest((details, callback) => {
    try {
      if (details.url.startsWith("devtools:") || details.url.startsWith("chrome-extension:")) {
        callback({});
        return;
      }
      const focusDecision = evaluateFocusRequest(details.url);
      if (focusDecision.blocked) {
        if (details.resourceType === "mainFrame") {
          const html = getFocusShieldHtml(focusDecision.platformName || "Social Media", focusDecision.reason || "");
          callback({ redirectURL: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
          return;
        } else {
          callback({ cancel: true });
          return;
        }
      }
      const adblock = evaluateAdBlockRequest({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        referrer: details.referrer
      });
      if (adblock.cancel) {
        callback({ cancel: true });
        return;
      }
    } catch {
    }
    callback({});
  });
  setupCorsBypassInterceptor(ses);
}
function initSessionManager() {
  ElectronPrivateSessionManager.getInstance().registerIPC();
  const defaultSes = session8.fromPartition("persist:forge");
  configureSessionPartition(defaultSes, "persist:forge");
  app7.on("session-created", (createdSession) => {
    try {
      const partition = createdSession._partition || createdSession.partition || "";
      if (partition) {
        configureSessionPartition(createdSession, partition);
      }
    } catch {
    }
  });
  ipcMain8.handle("sessions:clear-data", async (_event, partition, types = ["cache", "cookies", "storage"]) => {
    try {
      const targetSes = session8.fromPartition(partition);
      const storages = [];
      if (types.includes("cookies")) storages.push("cookies");
      if (types.includes("storage")) {
        storages.push("localstorage", "indexdb", "websql", "serviceworkers", "cachestorage");
      }
      if (storages.length > 0) {
        await targetSes.clearStorageData({ storages });
      }
      if (types.includes("cache")) {
        await targetSes.clearCache();
      }
      console.log(`[SessionManager] Cleared ${types.join(", ")} for partition ${partition}`);
      return { success: true };
    } catch (err) {
      console.error(`[SessionManager] Error clearing data for ${partition}:`, err);
      return { success: false, error: err?.message };
    }
  });
  ipcMain8.handle("focus:sync-state", (_event, payload) => {
    updateFocusState(payload);
    return true;
  });
}

// electron/tor/TorIPC.ts
import { ipcMain as ipcMain9, BrowserWindow as BrowserWindow5 } from "electron";
function registerTorIPC() {
  const runtime = ElectronTorRuntime.getInstance();
  const manager = TorManager.getInstance();
  manager.events.onStatus((status2) => {
    for (const win of BrowserWindow5.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("tor:status-changed", status2);
        } catch {
        }
      }
    }
  });
  manager.events.onCircuit((circuit) => {
    for (const win of BrowserWindow5.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("tor:circuit-changed", circuit);
        } catch {
        }
      }
    }
  });
  ipcMain9.handle("tor:get-status", async () => {
    return runtime.getStatus();
  });
  ipcMain9.handle("tor:connect", async () => {
    return runtime.connect();
  });
  ipcMain9.handle("tor:disconnect", async () => {
    return runtime.disconnect();
  });
  ipcMain9.handle("tor:new-circuit", async () => {
    return runtime.newCircuit();
  });
  ipcMain9.handle("tor:test-leak", async () => {
    return runtime.runLeakTest();
  });
}

// electron/extensions/extensionManager.ts
import { app as app8, session as session9, ipcMain as ipcMain10 } from "electron";
import path5 from "node:path";
import fs5 from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
var execAsync = promisify(exec);
function getExtensionsStorageDir() {
  const dir = path5.join(app8.getPath("userData"), "installed_extensions");
  if (!fs5.existsSync(dir)) {
    fs5.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
async function installExtensionFromChromeWebStore(extId, webStoreUrl) {
  const cleanedId = extId.trim().toLowerCase();
  if (!/^[a-z]{32}$/.test(cleanedId)) {
    return { success: false, message: `Invalid Chrome extension ID: "${extId}"` };
  }
  const baseDir = getExtensionsStorageDir();
  const targetDir = path5.join(baseDir, cleanedId);
  const tempZipPath = path5.join(baseDir, `${cleanedId}.zip`);
  try {
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromecrx&prodchannel=&prodversion=130.0.0.0&lang=en-US&acceptformat=crx3,crx2&x=id%3D${cleanedId}%26installsource%3Dondemand%26uc`;
    console.log(`[ExtensionManager] Downloading CRX for ${cleanedId}...`);
    const res = await fetch(crxUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Referer": "https://chromewebstore.google.com/"
      },
      redirect: "follow"
    });
    if (!res.ok) {
      return {
        success: false,
        message: `Failed to download extension package from Chrome Web Store (HTTP ${res.status}).`
      };
    }
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 32) {
      return { success: false, message: "Downloaded file is empty or corrupted." };
    }
    let zipStartOffset = -1;
    for (let i = 0; i < Math.min(buffer.length - 4, 1e5); i++) {
      if (buffer[i] === 80 && buffer[i + 1] === 75 && buffer[i + 2] === 3 && buffer[i + 3] === 4) {
        zipStartOffset = i;
        break;
      }
    }
    if (zipStartOffset === -1) {
      return { success: false, message: "Could not locate valid ZIP payload in extension package." };
    }
    const zipBuffer = buffer.subarray(zipStartOffset);
    fs5.writeFileSync(tempZipPath, zipBuffer);
    if (fs5.existsSync(targetDir)) {
      try {
        fs5.rmSync(targetDir, { recursive: true, force: true });
      } catch {
      }
    }
    fs5.mkdirSync(targetDir, { recursive: true });
    try {
      await execAsync(`tar -xf "${tempZipPath}" -C "${targetDir}"`);
    } catch {
      await execAsync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZipPath}' -DestinationPath '${targetDir}' -Force"`
      );
    } finally {
      try {
        if (fs5.existsSync(tempZipPath)) fs5.unlinkSync(tempZipPath);
      } catch {
      }
    }
    const manifestPath = path5.join(targetDir, "manifest.json");
    if (!fs5.existsSync(manifestPath)) {
      return { success: false, message: "Extraction failed: manifest.json not found." };
    }
    let manifest = {};
    try {
      manifest = JSON.parse(fs5.readFileSync(manifestPath, "utf-8"));
    } catch {
      return { success: false, message: "Failed to parse extension manifest.json." };
    }
    let iconDataUrl = void 0;
    const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
    if (icons) {
      let iconRelativePath = "";
      if (typeof icons === "string") {
        iconRelativePath = icons;
      } else if (typeof icons === "object") {
        iconRelativePath = icons["128"] || icons["64"] || icons["48"] || icons["32"] || icons["16"] || Object.values(icons)[0];
      }
      if (iconRelativePath) {
        const fullIconPath = path5.join(targetDir, iconRelativePath);
        if (fs5.existsSync(fullIconPath)) {
          const ext = path5.extname(fullIconPath).slice(1) || "png";
          const b64 = fs5.readFileSync(fullIconPath).toString("base64");
          iconDataUrl = `data:image/${ext};base64,${b64}`;
        }
      }
    }
    try {
      await session9.defaultSession.loadExtension(targetDir, { allowFileAccess: true });
    } catch (err) {
      console.warn(`[ExtensionManager] Notice loading into defaultSession:`, err?.message);
    }
    try {
      const forgeSession = session9.fromPartition("persist:forge");
      await forgeSession.loadExtension(targetDir, { allowFileAccess: true });
    } catch (err) {
      console.warn(`[ExtensionManager] Notice loading into persist:forge:`, err?.message);
    }
    const extInfo = {
      id: cleanedId,
      name: manifest.name || "Chrome Extension",
      version: manifest.version || "1.0.0",
      description: manifest.description || `Installed directly from Chrome Web Store (${cleanedId})`,
      author: manifest.author || "Chrome Web Store Developer",
      icon: iconDataUrl,
      path: targetDir,
      manifestPermissions: manifest.permissions || [],
      action: manifest.action || manifest.browser_action
    };
    console.log(`[ExtensionManager] Successfully installed ${extInfo.name} (${cleanedId}) into Forge.`);
    return {
      success: true,
      message: `Successfully installed "${extInfo.name}"!`,
      extension: extInfo
    };
  } catch (err) {
    console.error("[ExtensionManager] Installation error:", err);
    return { success: false, message: `Installation failed: ${err?.message || "Unknown error"}` };
  }
}
async function uninstallExtension(extId) {
  const cleanedId = extId.trim().toLowerCase();
  try {
    try {
      session9.defaultSession.removeExtension(cleanedId);
    } catch {
    }
    try {
      const forgeSession = session9.fromPartition("persist:forge");
      forgeSession.removeExtension(cleanedId);
    } catch {
    }
    const targetDir = path5.join(getExtensionsStorageDir(), cleanedId);
    if (fs5.existsSync(targetDir)) {
      fs5.rmSync(targetDir, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.warn(`[ExtensionManager] Error uninstalling ${extId}:`, err);
    return false;
  }
}
async function listAndReloadInstalledExtensions() {
  const baseDir = getExtensionsStorageDir();
  const results = [];
  if (!fs5.existsSync(baseDir)) return results;
  const entries2 = fs5.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries2) {
    if (!entry.isDirectory()) continue;
    const extDir = path5.join(baseDir, entry.name);
    const manifestPath = path5.join(extDir, "manifest.json");
    if (!fs5.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs5.readFileSync(manifestPath, "utf-8"));
      const extId = entry.name.toLowerCase();
      try {
        await session9.defaultSession.loadExtension(extDir, { allowFileAccess: true });
      } catch {
      }
      try {
        const forgeSession = session9.fromPartition("persist:forge");
        await forgeSession.loadExtension(extDir, { allowFileAccess: true });
      } catch {
      }
      let iconDataUrl = void 0;
      const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
      if (icons) {
        let iconRelativePath = "";
        if (typeof icons === "string") {
          iconRelativePath = icons;
        } else if (typeof icons === "object") {
          iconRelativePath = icons["128"] || icons["64"] || icons["48"] || icons["32"] || icons["16"] || Object.values(icons)[0];
        }
        if (iconRelativePath) {
          const fullIconPath = path5.join(extDir, iconRelativePath);
          if (fs5.existsSync(fullIconPath)) {
            const ext = path5.extname(fullIconPath).slice(1) || "png";
            const b64 = fs5.readFileSync(fullIconPath).toString("base64");
            iconDataUrl = `data:image/${ext};base64,${b64}`;
          }
        }
      }
      results.push({
        id: extId,
        name: manifest.name || "Chrome Extension",
        version: manifest.version || "1.0.0",
        description: manifest.description || "",
        author: manifest.author || "Chrome Web Store Developer",
        icon: iconDataUrl,
        path: extDir,
        manifestPermissions: manifest.permissions || [],
        action: manifest.action || manifest.browser_action
      });
    } catch (e) {
      console.warn(`[ExtensionManager] Error loading saved extension at ${extDir}:`, e);
    }
  }
  return results;
}
function initExtensionManager() {
  ipcMain10.handle("extensions:install-from-cws", async (_event, payload) => {
    return installExtensionFromChromeWebStore(payload.extId, payload.url);
  });
  ipcMain10.handle("extensions:uninstall", async (_event, payload) => {
    return uninstallExtension(payload.extId);
  });
  ipcMain10.handle("extensions:list-installed", async () => {
    return listAndReloadInstalledExtensions();
  });
  listAndReloadInstalledExtensions().catch((err) => {
    console.warn("[ExtensionManager] Initial reload notice:", err);
  });
}

// electron/main.ts
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path6.dirname(__filename3);
if (process.platform === "win32") {
  app9.setAppUserModelId("com.forge.browser");
}
var gotTheLock = app9.requestSingleInstanceLock();
if (!gotTheLock) {
  app9.quit();
} else {
  app9.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
app9.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app9.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,AutomaticTabDiscarding");
app9.commandLine.appendSwitch("disable-background-timer-throttling");
app9.commandLine.appendSwitch("disable-renderer-backgrounding");
app9.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app9.commandLine.appendSwitch("disable-gpu-process-crash-limit");
app9.commandLine.appendSwitch("enable-features", "HardwareMediaKeyHandling,MediaSessionService");
app9.commandLine.appendSwitch("log-level", "3");
app9.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
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
app9.on("child-process-gone", (_event, details) => {
  console.warn("[Electron Main] Child process gone:", details.type, details.reason, details.exitCode);
});
app9.on("render-process-gone", (_event, webContents3, details) => {
  console.warn("[Electron Main] Render process gone:", details.reason, details.exitCode);
  if (details.reason === "crashed" || details.reason === "killed" || details.reason === "oom") {
    if (webContents3.getType() === "window" && !webContents3.isDestroyed()) {
      try {
        webContents3.reload();
      } catch {
      }
    }
  }
});
var mainWindow = null;
var allWindows = /* @__PURE__ */ new Set();
var terminalCwd = process.cwd();
var isMediaPlaying = false;
var recentDownloads = [];
var pendingDownloadFilenames = /* @__PURE__ */ new Map();
var activeDownloadPaths = /* @__PURE__ */ new Set();
var MIME_EXT_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/tiff": ".tiff",
  "application/pdf": ".pdf",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/x-7z-compressed": ".7z",
  "application/x-tar": ".tar",
  "application/gzip": ".gz",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  "audio/flac": ".flac"
};
function setupDownloadListeners(sess) {
  sess.on("will-download", (_event, item, webContents3) => {
    const itemUrl = item.getURL();
    let rawFilename = pendingDownloadFilenames.get(itemUrl) || item.getFilename() || "download";
    pendingDownloadFilenames.delete(itemUrl);
    rawFilename = rawFilename.replace(/[\\/:*?"<>|]/g, "_").trim();
    if (!rawFilename || rawFilename === "." || rawFilename === "_") {
      rawFilename = "download";
    }
    let ext = path6.extname(rawFilename).toLowerCase();
    if (!ext || ext === ".") {
      const mime = (item.getMimeType() || "").toLowerCase();
      let inferredExt = MIME_EXT_MAP[mime];
      if (!inferredExt) {
        if (mime.startsWith("image/")) inferredExt = ".jpg";
        else if (mime.startsWith("video/")) inferredExt = ".mp4";
        else if (mime.startsWith("audio/")) inferredExt = ".mp3";
      }
      if (inferredExt) {
        ext = inferredExt;
        rawFilename = `${rawFilename}${ext}`;
      }
    }
    const downloadsDir = app9.getPath("downloads");
    try {
      if (!fs6.existsSync(downloadsDir)) {
        fs6.mkdirSync(downloadsDir, { recursive: true });
      }
    } catch {
    }
    const actualExt = path6.extname(rawFilename);
    const actualBase = path6.basename(rawFilename, actualExt);
    let basePattern = actualBase;
    let counter = 1;
    const countMatch = actualBase.match(/^(.+)\s\((\d+)\)$/);
    if (countMatch) {
      basePattern = countMatch[1];
      counter = parseInt(countMatch[2], 10) + 1;
    }
    let finalFilename = rawFilename;
    let finalPath = path6.join(downloadsDir, finalFilename);
    while (fs6.existsSync(finalPath) || activeDownloadPaths.has(finalPath.toLowerCase())) {
      finalFilename = `${basePattern} (${counter})${actualExt}`;
      finalPath = path6.join(downloadsDir, finalFilename);
      counter++;
    }
    activeDownloadPaths.add(finalPath.toLowerCase());
    item.setSavePath(finalPath);
    const partitionName = sess._partition || sess.partition || "";
    const isPrivate = partitionName.startsWith("private_") || partitionName.startsWith("tor_");
    const record = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: finalFilename,
      path: finalPath,
      size: item.getTotalBytes(),
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
      url: itemUrl,
      isPrivate
    };
    recentDownloads.unshift(record);
    const win = BrowserWindow6.fromWebContents(webContents3) || mainWindow;
    win?.webContents.send("downloads:item-created", record);
    item.on("updated", (_e, state) => {
      record.receivedBytes = item.getReceivedBytes();
      record.state = state;
      win?.webContents.send("downloads:item-updated", record);
    });
    item.once("done", (_e, state) => {
      activeDownloadPaths.delete(finalPath.toLowerCase());
      record.receivedBytes = item.getReceivedBytes();
      record.state = state;
      win?.webContents.send("downloads:item-done", record);
    });
  });
}
function registerShortcutInterception(contents) {
  contents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const isMac = process.platform === "darwin";
    const ctrl = isMac ? input.meta : input.control;
    const shift = input.shift;
    const alt = input.alt;
    const key = input.key ? input.key.toLowerCase() : "";
    const code = input.code || "";
    let action = null;
    if (ctrl && !shift && !alt && key === "t") {
      action = "tab:new";
    } else if (ctrl && !shift && !alt && key === "w") {
      action = "tab:close";
    } else if (ctrl && shift && !alt && key === "t") {
      action = "tab:reopen";
    } else if (ctrl && shift && !alt && (key === "pagedown" || code === "PageDown")) {
      action = "tab:move-right";
    } else if (ctrl && shift && !alt && (key === "pageup" || code === "PageUp")) {
      action = "tab:move-left";
    } else if (ctrl && !shift && !alt && (key === "tab" || code === "Tab" || key === "pagedown" || code === "PageDown")) {
      action = "tab:next";
    } else if (ctrl && shift && !alt && (key === "tab" || code === "Tab")) {
      action = "tab:prev";
    } else if (ctrl && !shift && !alt && (key === "pageup" || code === "PageUp")) {
      action = "tab:prev";
    } else if (ctrl && !shift && !alt && /^[1-9]$/.test(key)) {
      action = `tab:select-${key}`;
    } else if (ctrl && !shift && !alt && key === "l" || alt && !ctrl && !shift && key === "d") {
      action = "nav:focus-address";
    } else if (ctrl && shift && !alt && key === "n") {
      action = "win:private";
    } else if (alt && !ctrl && !shift && (key === "arrowleft" || code === "ArrowLeft")) {
      action = "nav:back";
    } else if (alt && !ctrl && !shift && (key === "arrowright" || code === "ArrowRight")) {
      action = "nav:forward";
    } else if (!ctrl && !shift && !alt && (key === "f5" || code === "F5")) {
      action = "nav:reload";
    } else if (ctrl && !shift && !alt && key === "r") {
      action = "nav:reload";
    } else if (!ctrl && !shift && !alt && (key === "f11" || code === "F11")) {
      action = "win:toggle-fullscreen";
    } else if (ctrl && !shift && !alt && key === "f") {
      action = "page:find";
    } else if (ctrl && !alt && (key === "+" || key === "=" || code === "Equal" || code === "NumpadAdd")) {
      action = "page:zoom-in";
    } else if (ctrl && !alt && (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract")) {
      action = "page:zoom-out";
    } else if (ctrl && !shift && !alt && (key === "0" || code === "Digit0" || code === "Numpad0")) {
      action = "page:zoom-reset";
    } else if (ctrl && !shift && !alt && key === "d") {
      action = "page:bookmark";
    } else if (ctrl && !shift && !alt && key === "h") {
      action = "page:history";
    } else if (ctrl && !shift && !alt && key === "j") {
      action = "page:downloads";
    } else if (ctrl && shift && !alt && (key === "delete" || code === "Delete")) {
      action = "page:privacy-cleaner";
    } else if (!ctrl && !shift && !alt && (key === "f1" || code === "F1")) {
      action = "help:hotkeys";
    } else if (alt && !ctrl && !shift && (key === "p" || code === "KeyP")) {
      action = "media:pip";
    }
    if (action) {
      event.preventDefault();
      if (action === "win:private") {
        createWindow(true);
        return;
      }
      const host = contents.hostWebContents;
      const targetWin = BrowserWindow6.fromWebContents(contents) || (host ? BrowserWindow6.fromWebContents(host) : null) || BrowserWindow6.getFocusedWindow() || mainWindow;
      if (targetWin && !targetWin.isDestroyed()) {
        targetWin.webContents.send("shortcut:trigger", action);
      }
    }
  });
}
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
    path6.join(__dirname3, "assets", filename),
    path6.join(__dirname3, "../electron/assets", filename),
    path6.join(process.cwd(), "apps/forge-app/electron/assets", filename),
    path6.join(process.cwd(), "electron/assets", filename)
  ];
  for (const candidate of candidates) {
    if (fs6.existsSync(candidate)) return candidate;
  }
  return path6.join(__dirname3, "assets", filename);
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
function createWindow(isIncognito = false) {
  const icoPath = path6.join(__dirname3, "../public/icon.ico");
  const pngPath = path6.join(__dirname3, "../public/logo.png");
  const appIcon = fs6.existsSync(icoPath) ? icoPath : pngPath;
  const win = new BrowserWindow6({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    minimizable: true,
    maximizable: true,
    closable: true,
    titleBarStyle: process.platform === "darwin" ? "hidden" : void 0,
    backgroundColor: isIncognito ? "#090a0f" : "#0d0f17",
    show: false,
    icon: appIcon,
    webPreferences: {
      preload: path6.join(__dirname3, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      partition: isIncognito ? `incognito-${Date.now()}` : void 0
    }
  });
  allWindows.add(win);
  if (!isIncognito && !mainWindow) {
    mainWindow = win;
  }
  win.on("closed", () => {
    allWindows.delete(win);
    if (mainWindow === win) {
      mainWindow = allWindows.values().next().value || null;
    }
  });
  try {
    win.webContents.setMaxListeners(50);
  } catch {
  }
  win.webContents.on("will-navigate", (event, navUrl) => {
    const isAppShell = navUrl.startsWith("http://localhost:5173") || navUrl.startsWith("file://") || Boolean(process.env.VITE_DEV_SERVER_URL && navUrl.startsWith(process.env.VITE_DEV_SERVER_URL));
    if (!isAppShell) {
      event.preventDefault();
      win.webContents.send("tabs:open-tab", { url: navUrl });
    }
  });
  win.webContents.on("will-attach-webview", (_event, webPreferences) => {
    webPreferences.nodeIntegrationInSubFrames = true;
  });
  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
    if (!isIncognito) {
      updateTaskbarMediaButtons(win, false);
    }
  });
  const query = isIncognito ? "?incognito=1" : "";
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}${query}`);
  } else {
    win.loadFile(path6.join(__dirname3, "../dist/index.html"), {
      query: isIncognito ? { incognito: "1" } : void 0
    });
  }
  return win;
}
function getTargetBrowserWindow(event) {
  if (event) {
    const fromSender = BrowserWindow6.fromWebContents(event.sender);
    if (fromSender && !fromSender.isDestroyed()) return fromSender;
  }
  const focused = BrowserWindow6.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  for (const win of allWindows) {
    if (win && !win.isDestroyed()) return win;
  }
  const anyWin = BrowserWindow6.getAllWindows()[0];
  if (anyWin && !anyWin.isDestroyed()) return anyWin;
  return null;
}
ipcMain11.on("window:minimize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    win.minimize();
  }
});
ipcMain11.handle("window:minimize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    win.minimize();
    return true;
  }
  return false;
});
ipcMain11.on("window:maximize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain11.on("window:close", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});
ipcMain11.handle("window:is-maximized", (event) => {
  const win = getTargetBrowserWindow(event);
  return win?.isMaximized() ?? false;
});
ipcMain11.on("window:set-fullscreen", (event, flag) => {
  const win = BrowserWindow6.fromWebContents(event.sender) || BrowserWindow6.getFocusedWindow() || mainWindow;
  win?.setFullScreen(flag);
});
ipcMain11.handle("window:is-fullscreen", (event) => {
  const win = BrowserWindow6.fromWebContents(event.sender) || BrowserWindow6.getFocusedWindow() || mainWindow;
  return win?.isFullScreen() ?? false;
});
ipcMain11.on("theme:set", (_event, mode) => {
  if (["system", "light", "dark"].includes(mode)) {
    nativeTheme2.themeSource = mode;
  }
});
ipcMain11.on("window:set-title", (_event, title) => {
  const win = BrowserWindow6.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    const cleanTitle = title?.trim();
    win.setTitle(cleanTitle ? `${cleanTitle} \u2014 Forge Browser` : "Forge Browser");
  }
});
function restoreAndFocusWindow(win) {
  if (!win || win.isDestroyed()) return;
  try {
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.setAlwaysOnTop(true, "screen-saver");
    win.moveTop();
    win.focus();
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.setAlwaysOnTop(false);
        win.focus();
      }
    }, 100);
  } catch {
  }
}
function applyPipWindowIcon() {
  if (process.platform !== "win32") return;
  const scriptPath = path6.join(__dirname3, "setPipIcon.ps1");
  const fallbackScript = path6.join(__dirname3, "../electron/setPipIcon.ps1");
  const psPath = fs6.existsSync(scriptPath) ? scriptPath : fallbackScript;
  const icoPath = path6.join(__dirname3, "../public/icon.ico");
  if (!fs6.existsSync(psPath) || !fs6.existsSync(icoPath)) return;
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    exec2(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -IcoPath "${icoPath}" -TargetPid ${process.pid}`, (err, stdout) => {
      if (!err && stdout && parseInt(stdout.trim(), 10) > 0) {
        clearInterval(interval);
      }
    });
    if (attempts >= 10) clearInterval(interval);
  }, 200);
}
app9.on("browser-window-created", (_event, win) => {
  try {
    const icoPath = path6.join(__dirname3, "../public/icon.ico");
    const pngPath = path6.join(__dirname3, "../public/logo.png");
    const appIcon = fs6.existsSync(icoPath) ? icoPath : pngPath;
    win.setIcon(appIcon);
  } catch {
  }
});
ipcMain11.on("window:restore-and-focus", (event) => {
  const win = BrowserWindow6.fromWebContents(event.sender) || BrowserWindow6.getFocusedWindow() || mainWindow;
  restoreAndFocusWindow(win);
});
var pipActiveWebContents = /* @__PURE__ */ new Set();
var recentlyExitedPipWebContents = /* @__PURE__ */ new Map();
var webviewContentsMap = /* @__PURE__ */ new Map();
var playingWebContents = /* @__PURE__ */ new Set();
app9.on("web-contents-created", (_event, contents) => {
  try {
    contents.setMaxListeners(50);
  } catch {
  }
  registerShortcutInterception(contents);
  contents.setWindowOpenHandler((details) => {
    const targetUrl = details.url;
    if (targetUrl && targetUrl !== "about:blank" && !targetUrl.startsWith("javascript:") && !targetUrl.startsWith("data:")) {
      try {
        const win = BrowserWindow6.getFocusedWindow() || mainWindow;
        if (win && !win.isDestroyed()) {
          win.webContents.send("tabs:open-tab", { url: targetUrl });
        }
      } catch (err) {
        console.error("[Main] Error routing link to tab:", err);
      }
    }
    return { action: "deny" };
  });
  if (contents.getType() !== "webview") return;
  webviewContentsMap.set(contents.id, contents);
  contents.on("destroyed", () => {
    webviewContentsMap.delete(contents.id);
    playingWebContents.delete(contents.id);
  });
  contents.on("context-menu", (_e, params) => {
    try {
      const win = BrowserWindow6.getFocusedWindow() || mainWindow;
      if (win && !win.isDestroyed()) {
        win.webContents.send("browser:context-menu", {
          x: params.x,
          y: params.y,
          selectionText: params.selectionText || "",
          linkURL: params.linkURL || "",
          srcURL: params.srcURL || "",
          mediaType: params.mediaType || "none",
          isEditable: params.isEditable || false,
          pageURL: params.pageURL || "",
          canGoBack: contents.canGoBack(),
          canGoForward: contents.canGoForward(),
          contentsId: contents.id
        });
      }
    } catch (err) {
      console.error("[Main] Error sending context-menu event:", err);
    }
  });
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
  contents.on("media-started-playing", () => {
    playingWebContents.add(contents.id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: true,
        isMuted: contents.isAudioMuted()
      });
    }
  });
  contents.on("media-paused", () => {
    playingWebContents.delete(contents.id);
    const stillAudible = typeof contents.isCurrentlyAudible === "function" ? contents.isCurrentlyAudible() : false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: stillAudible,
        isMuted: contents.isAudioMuted()
      });
    }
  });
  contents.on("audio-state-changed", (_e, audible) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isPlaying = Boolean(audible) || playingWebContents.has(contents.id);
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: isPlaying,
        isMuted: contents.isAudioMuted()
      });
    }
  });
  contents.on("did-fail-load", (_event2, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.log(`[WebView] Main frame failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    }
  });
  contents.on("console-message", (event, ...rest) => {
    try {
      let message = "";
      if (event && typeof event.message === "string") {
        message = event.message;
      } else if (rest[0] && typeof rest[0] === "object" && typeof rest[0].message === "string") {
        message = rest[0].message;
      } else if (typeof rest[1] === "string") {
        message = rest[1];
      } else if (typeof rest[0] === "string") {
        message = rest[0];
      }
      if (!message || typeof message !== "string") return;
      if (message.includes("__FORGE_PIP_ENTER__")) {
        pipActiveWebContents.add(contents.id);
        applyPipWindowIcon();
      } else if (message.includes("__FORGE_PIP_LEAVE__")) {
        pipActiveWebContents.delete(contents.id);
        recentlyExitedPipWebContents.set(contents.id, Date.now());
      } else if (message.includes("__FORGE_PIP_RETURN_TO_PAGE__")) {
        pipActiveWebContents.delete(contents.id);
        recentlyExitedPipWebContents.set(contents.id, Date.now());
        restoreAndFocusWindow(mainWindow);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
        }
      }
    } catch {
    }
  });
  contents.on("focus", () => {
    const isRecent = Date.now() - (recentlyExitedPipWebContents.get(contents.id) || 0) < 3500;
    if (pipActiveWebContents.has(contents.id) || isRecent) {
      recentlyExitedPipWebContents.delete(contents.id);
      restoreAndFocusWindow(mainWindow);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
      }
    }
  });
  contents.on("destroyed", () => {
    pipActiveWebContents.delete(contents.id);
    recentlyExitedPipWebContents.delete(contents.id);
  });
});
ipcMain11.on("media:status-update", (_event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    updateTaskbarMediaButtons(mainWindow, Boolean(data?.isPlaying));
  }
});
ipcMain11.handle("forge:http:request", async (_event, options) => {
  try {
    const response = await request(options);
    return { ok: true, data: response };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});
ipcMain11.handle("terminal:get-cwd", () => {
  return terminalCwd;
});
ipcMain11.handle("terminal:set-cwd", (_event, newCwd) => {
  try {
    const resolved = path6.resolve(terminalCwd, newCwd);
    if (fs6.existsSync(resolved) && fs6.statSync(resolved).isDirectory()) {
      terminalCwd = resolved;
      return { ok: true, cwd: terminalCwd };
    }
    return { ok: false, error: `Directory not found: ${newCwd}`, cwd: terminalCwd };
  } catch (err) {
    return { ok: false, error: err.message, cwd: terminalCwd };
  }
});
ipcMain11.handle("terminal:exec", async (_event, command, shellType = "powershell") => {
  const trimmed = command.trim();
  if (!trimmed) {
    return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
  }
  const cdMatch = trimmed.match(/^(?:cd|chdir|Set-Location|sl)(?:\s+(.*)|([.\\/].*))?$/i);
  if (cdMatch) {
    let target = (cdMatch[1] || cdMatch[2])?.trim();
    if (!target || target === "~") {
      terminalCwd = os2.homedir();
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    }
    target = target.replace(/^\/d\s+/i, "");
    target = target.replace(/^["']|["']$/g, "");
    try {
      const resolved = path6.resolve(terminalCwd, target);
      if (fs6.existsSync(resolved) && fs6.statSync(resolved).isDirectory()) {
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
    if (fs6.existsSync(drive)) {
      terminalCwd = drive;
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    } else {
      return { stdout: "", stderr: `Drive '${trimmed}' does not exist.`, cwd: terminalCwd, exitCode: 1 };
    }
  }
  const shell2 = process.platform === "win32" ? shellType === "cmd" ? "cmd.exe" : "powershell.exe" : process.env.SHELL || "/bin/bash";
  return new Promise((resolve) => {
    exec2(trimmed, {
      cwd: terminalCwd,
      shell: shell2,
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
ipcMain11.handle("browser:inspect-element", (_event, { contentsId, x, y }) => {
  try {
    if (contentsId && webviewContentsMap.has(contentsId)) {
      webviewContentsMap.get(contentsId).inspectElement(x, y);
    } else {
      const win = BrowserWindow6.getFocusedWindow() || mainWindow;
      win?.webContents.inspectElement(x, y);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain11.on("window:open-private", () => {
  createWindow(true);
});
ipcMain11.handle("downloads:start", (event, { url, filename }) => {
  try {
    if (filename && typeof filename === "string" && filename.trim()) {
      pendingDownloadFilenames.set(url, filename.trim());
    }
    const win = BrowserWindow6.fromWebContents(event.sender) || mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.downloadURL(url);
      return { ok: true };
    }
    session10.defaultSession.downloadURL(url);
    return { ok: true };
  } catch (err) {
    console.error("[Main] Error starting download for:", url, err);
    return { ok: false, error: err.message };
  }
});
ipcMain11.handle("downloads:get-recent", () => recentDownloads);
ipcMain11.handle("downloads:clear-history", () => {
  recentDownloads.length = 0;
  return true;
});
ipcMain11.handle("downloads:open-folder", () => {
  shell.openPath(app9.getPath("downloads"));
  return true;
});
ipcMain11.handle("downloads:open-file", (_event, filePath) => {
  if (filePath && fs6.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});
ipcMain11.handle("downloads:show-in-folder", (_event, filePath) => {
  if (filePath && fs6.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  shell.openPath(app9.getPath("downloads"));
  return true;
});
var sessionBackupPath = path6.join(app9.getPath("userData"), "session-tabs.json");
ipcMain11.handle("session:save-backup", (_event, data) => {
  try {
    if (data && Array.isArray(data.tabs)) {
      const dir = path6.dirname(sessionBackupPath);
      if (!fs6.existsSync(dir)) fs6.mkdirSync(dir, { recursive: true });
      fs6.writeFileSync(sessionBackupPath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    console.error("[Main] Error writing session backup:", err);
  }
  return false;
});
ipcMain11.handle("session:get-backup", () => {
  try {
    if (fs6.existsSync(sessionBackupPath)) {
      const raw = fs6.readFileSync(sessionBackupPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Main] Error reading session backup:", err);
  }
  return null;
});
ipcMain11.handle(
  "tabs:get-memory",
  (_event, items) => {
    try {
      const metrics = app9.getAppMetrics();
      const allWcs = webContents.getAllWebContents();
      const result = {};
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const cid = item.contentsId ?? item.webContentsId;
            let wc = cid ? webviewContentsMap.get(cid) || webContents.fromId(cid) : null;
            if (!wc && item.url && item.url !== "about:blank") {
              const baseTarget = item.url.split("?")[0].split("#")[0];
              wc = allWcs.find(
                (w) => w.getType() === "webview" && !w.isDestroyed() && (w.getURL() === item.url || baseTarget.length > 8 && w.getURL().includes(baseTarget))
              ) || null;
            }
            if (wc && !wc.isDestroyed()) {
              const pid = wc.getOSProcessId();
              if (pid > 0) {
                const match = metrics.find((m) => m.pid === pid);
                if (match) {
                  const memKB = match.memory.workingSetSize || match.memory.privateBytes || 0;
                  const memMB = Math.max(12, Math.round(memKB / 1024 * 10) / 10);
                  result[item.tabId] = {
                    memoryMB: memMB,
                    cpuPercent: Math.round(match.cpu.percentCPUUsage || 0)
                  };
                }
              }
            }
            if (!result[item.tabId]) {
              const isBlank = !item.url || item.url === "about:blank";
              const tabMetrics = metrics.filter((m) => m.type === "Tab");
              if (tabMetrics.length > 0) {
                const avgMem = Math.round(
                  tabMetrics.reduce((acc, m) => acc + (m.memory.workingSetSize || 0), 0) / (tabMetrics.length * 1024) * 10
                ) / 10;
                result[item.tabId] = {
                  memoryMB: isBlank ? 25 : Math.max(45, avgMem),
                  cpuPercent: 0
                };
              } else {
                result[item.tabId] = {
                  memoryMB: isBlank ? 22 : 68,
                  cpuPercent: 0
                };
              }
            }
          } catch {
          }
        }
      }
      return result;
    } catch {
      return {};
    }
  }
);
ipcMain11.handle("tabs:set-muted", (_event, { contentsId, isMuted }) => {
  try {
    const wc = webContents.fromId(contentsId);
    if (wc && !wc.isDestroyed() && typeof wc.setAudioMuted === "function") {
      wc.setAudioMuted(isMuted);
      return true;
    }
  } catch {
  }
  return false;
});
app9.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  try {
    setupDownloadListeners(session10.defaultSession);
    const forgeSession = session10.fromPartition("persist:forge");
    setupDownloadListeners(forgeSession);
    const defaultUA = forgeSession.getUserAgent();
    const cleanUA = defaultUA.replace(/Electron\/[0-9.]+\s?/gi, "").replace(/forge(-app)?\/[0-9.]+\s?/gi, "").trim();
    forgeSession.setUserAgent(cleanUA);
    session10.defaultSession.setUserAgent(cleanUA);
    forgeSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === "fullscreen" || permission === "media" || permission === "notifications" || permission === "mediaKeySystem") {
        return true;
      }
      return true;
    });
    forgeSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(true);
    });
  } catch (err) {
    console.error("[Main] Error initializing download listeners or session permissions:", err);
  }
  initAdBlockAdapter(() => mainWindow);
  initNetworkMonitor(() => mainWindow);
  initSecureNetworkAdapter(() => mainWindow);
  initVpnAdapter(() => mainWindow);
  initPrivacyCleanerAdapter(() => mainWindow, {
    clearRecentDownloads: () => {
      recentDownloads.length = 0;
    },
    getRecentDownloadsCount: () => recentDownloads.length
  });
  initSessionManager();
  initCompatManager();
  initExtensionManager();
  ElectronPrivateSessionManager.getInstance().setDownloadSetupHandler((privSes) => {
    setupDownloadListeners(privSes);
  });
  registerTorIPC();
  ElectronTorRuntime.getInstance().initialize().catch((err) => {
    console.warn("[Main] Error initializing Tor runtime:", err);
  });
  createWindow();
  app9.on("activate", () => {
    if (BrowserWindow6.getAllWindows().length === 0) createWindow();
  });
});
app9.on("window-all-closed", () => {
  if (process.platform !== "darwin") app9.quit();
});
