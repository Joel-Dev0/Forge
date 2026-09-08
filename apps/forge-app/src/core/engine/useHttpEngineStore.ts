import { create } from "zustand";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD";

export interface HttpTiming {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export interface HttpSecurity {
  authorized: boolean;
  protocol?: string;
  cipher?: string;
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

export interface HistoryItem {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  status: number;
  duration: number;
  response: HttpResponse;
}

interface HttpEngineState {
  url: string;
  method: HttpMethod;
  headersText: string;
  bodyText: string;
  isLoading: boolean;
  error: string | null;
  response: HttpResponse | null;
  history: HistoryItem[];
  inspectorTab: "body" | "headers" | "timing" | "wire" | "security";

  setUrl: (url: string) => void;
  setMethod: (method: HttpMethod) => void;
  setHeadersText: (headers: string) => void;
  setBodyText: (body: string) => void;
  setInspectorTab: (tab: "body" | "headers" | "timing" | "wire" | "security") => void;
  sendRequest: () => Promise<void>;
  loadHistoryItem: (item: HistoryItem) => void;
  clearHistory: () => void;
}

function parseHeadersString(str: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = str.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const k = trimmed.substring(0, colonIdx).trim();
      const v = trimmed.substring(colonIdx + 1).trim();
      headers[k] = v;
    }
  }
  return headers;
}

export const useHttpEngineStore = create<HttpEngineState>((set, get) => ({
  url: "https://httpbin.org/get",
  method: "GET",
  headersText: "Accept: application/json\nX-Engine: Forge-Native",
  bodyText: '{\n  "app": "Forge",\n  "stage": "A",\n  "hello": "HTTP Engine"\n}',
  isLoading: false,
  error: null,
  response: null,
  history: [],
  inspectorTab: "body",

  setUrl: (url) => set({ url }),
  setMethod: (method) => set({ method }),
  setHeadersText: (headersText) => set({ headersText }),
  setBodyText: (bodyText) => set({ bodyText }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),

  sendRequest: async () => {
    const { url, method, headersText, bodyText } = get();
    if (!url.trim()) return;

    set({ isLoading: true, error: null });

    const headers = parseHeadersString(headersText);
    const body = method !== "GET" && method !== "HEAD" ? bodyText : undefined;

    try {
      const forgeHttp = (window as any).forge?.http;
      if (!forgeHttp?.request) {
        throw new Error("Forge native HTTP engine is only available inside Electron");
      }

      const res = await forgeHttp.request({
        url,
        method,
        headers,
        body,
        followRedirects: true,
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || "HTTP Engine execution failed");
      }

      const respData: HttpResponse = res.data;
      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        method,
        url,
        status: respData.status,
        duration: respData.timing.total,
        response: respData,
      };

      set((state) => ({
        isLoading: false,
        response: respData,
        error: null,
        history: [historyItem, ...state.history].slice(0, 30),
      }));
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to execute request",
      });
    }
  },

  loadHistoryItem: (item) => {
    set({
      url: item.url,
      method: item.method,
      response: item.response,
      error: null,
    });
  },

  clearHistory: () => set({ history: [] }),
}));
