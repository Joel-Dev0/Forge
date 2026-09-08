import { create } from "zustand";

export interface ApiMetricSummary {
  totalCalls: number;
  successRate: number; // percentage 0-100
  avgDuration: number; // ms
  errorCount: number;
  totalBytes: number;
}

interface ApiMonitorState {
  selectedApiId: string | null;
  methodFilter: "ALL" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  statusFilter: "ALL" | "2xx" | "4xx" | "5xx";
  searchQuery: string;
  activeDetailTab: "payload" | "response" | "headers" | "curl";

  setSelectedApiId: (id: string | null) => void;
  setMethodFilter: (method: "ALL" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH") => void;
  setStatusFilter: (status: "ALL" | "2xx" | "4xx" | "5xx") => void;
  setSearchQuery: (q: string) => void;
  setActiveDetailTab: (tab: "payload" | "response" | "headers" | "curl") => void;
}

export const useApiMonitorStore = create<ApiMonitorState>((set) => ({
  selectedApiId: null,
  methodFilter: "ALL",
  statusFilter: "ALL",
  searchQuery: "",
  activeDetailTab: "response",

  setSelectedApiId: (selectedApiId) => set({ selectedApiId }),
  setMethodFilter: (methodFilter) => set({ methodFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveDetailTab: (activeDetailTab) => set({ activeDetailTab }),
}));

export function computeApiMetrics(entries: NetworkEntry[]): ApiMetricSummary {
  const apiEntries = entries.filter((e) => e.resourceType === "fetch" || e.resourceType === "xhr" || e.url.includes("/api/"));
  if (apiEntries.length === 0) {
    return { totalCalls: 0, successRate: 100, avgDuration: 0, errorCount: 0, totalBytes: 0 };
  }

  let totalDuration = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalBytes = 0;

  for (const e of apiEntries) {
    totalDuration += e.duration || 0;
    totalBytes += e.size || 0;
    if (e.status >= 200 && e.status < 400) {
      successCount++;
    } else if (e.status >= 400 || e.state === "failed") {
      errorCount++;
    }
  }

  return {
    totalCalls: apiEntries.length,
    successRate: Math.round((successCount / apiEntries.length) * 100),
    avgDuration: Math.round(totalDuration / apiEntries.length),
    errorCount,
    totalBytes,
  };
}

export function generateCurlCommand(entry: NetworkEntry): string {
  const parts: string[] = [`curl -X ${entry.method} "${entry.url}"`];

  for (const [k, v] of Object.entries(entry.requestHeaders || {})) {
    parts.push(`  -H "${k}: ${v}"`);
  }

  if (entry.postData && entry.method !== "GET") {
    parts.push(`  -d '${entry.postData}'`);
  }

  return parts.join(" \\\n");
}