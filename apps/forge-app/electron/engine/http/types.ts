export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH" | "OPTIONS";

export interface HttpRequestOptions {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  timeout?: number;
}

export interface HttpTiming {
  dns: number;       // DNS lookup duration (ms)
  tcp: number;       // TCP connection handshake duration (ms)
  tls: number;       // TLS handshake duration (ms, 0 for plain HTTP)
  ttfb: number;      // Time to First Byte from request sent (ms)
  download: number;  // Content download duration (ms)
  total: number;     // Total round-trip time (ms)
}

export interface HttpSecurity {
  authorized: boolean;
  protocol?: string; // e.g. "TLSv1.3"
  cipher?: string;   // e.g. "TLS_AES_256_GCM_SHA384"
  serverName?: string;
  certSubject?: string;
  certIssuer?: string;
  certValidTo?: string;
}

export interface HttpResponse {
  url: string;
  status: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  contentLength: number;
  timing: HttpTiming;
  security?: HttpSecurity;
  rawRequest: string;
  rawResponseHeaders: string;
  redirectCount: number;
}
