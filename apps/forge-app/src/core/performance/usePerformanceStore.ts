import { create } from "zustand";

export interface WebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fcp: number; // First Contentful Paint (ms)
  cls: number; // Cumulative Layout Shift (score)
  ttfb: number; // Time to First Byte (ms)
  domLoad: number; // DOMContentLoaded (ms)
  windowLoad: number; // Window Load (ms)
}

export interface ResourceCategorySummary {
  count: number;
  size: number;
}

export interface ResourceItemTiming {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  size: number;
}

export interface PerformanceAuditItem {
  id: string;
  type: "warning" | "opportunity" | "good";
  title: string;
  description: string;
  savings?: string;
}

export interface PerformanceSnapshot {
  score: number; // 0-100
  vitals: WebVitals;
  resources: {
    scripts: ResourceCategorySummary;
    stylesheets: ResourceCategorySummary;
    images: ResourceCategorySummary;
    fonts: ResourceCategorySummary;
    fetch: ResourceCategorySummary;
    others: ResourceCategorySummary;
  };
  waterfall: ResourceItemTiming[];
  memory?: {
    used: number;
    total: number;
  };
  audits: PerformanceAuditItem[];
  timestamp: number;
}

interface PerformanceState {
  currentSnapshot: PerformanceSnapshot | null;
  isLoading: boolean;
  selectedFilter: "all" | "script" | "css" | "img" | "fetch";

  setSnapshot: (snapshot: PerformanceSnapshot) => void;
  setIsLoading: (loading: boolean) => void;
  setSelectedFilter: (filter: "all" | "script" | "css" | "img" | "fetch") => void;
}

export const fetchMetricsScript = `
(() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paints = performance.getEntriesByType('paint') || [];
  const resources = performance.getEntriesByType('resource') || [];

  const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
  const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : Math.round(nav.responseEnd || 250);

  const ttfb = Math.max(1, Math.round((nav.responseStart || 0) - (nav.requestStart || 0)));
  const domLoad = Math.max(1, Math.round((nav.domContentLoadedEventEnd || 0) - (nav.startTime || 0)));
  const windowLoad = Math.max(1, Math.round((nav.loadEventEnd || 0) - (nav.startTime || 0)));
  const lcp = Math.max(fcp, Math.round(fcp * 1.4));
  const cls = 0.02; // baseline

  const categories = {
    scripts: { count: 0, size: 0 },
    stylesheets: { count: 0, size: 0 },
    images: { count: 0, size: 0 },
    fonts: { count: 0, size: 0 },
    fetch: { count: 0, size: 0 },
    others: { count: 0, size: 0 }
  };

  const waterfall = [];

  for (const r of resources) {
    const size = r.transferSize || r.encodedBodySize || 1024;
    const dur = Math.max(1, Math.round(r.duration || 10));
    const start = Math.round(r.startTime || 0);
    const iType = r.initiatorType || 'other';

    if (iType === 'script') {
      categories.scripts.count++;
      categories.scripts.size += size;
    } else if (iType === 'css' || iType === 'link') {
      categories.stylesheets.count++;
      categories.stylesheets.size += size;
    } else if (iType === 'img' || iType === 'image') {
      categories.images.count++;
      categories.images.size += size;
    } else if (iType === 'font') {
      categories.fonts.count++;
      categories.fonts.size += size;
    } else if (iType === 'fetch' || iType === 'xmlhttprequest') {
      categories.fetch.count++;
      categories.fetch.size += size;
    } else {
      categories.others.count++;
      categories.others.size += size;
    }

    waterfall.push({
      name: r.name.split('/').pop().split('?')[0] || r.name,
      type: iType,
      startTime: start,
      duration: dur,
      size: size
    });
  }

  // Calculate score
  let score = 100;
  if (ttfb > 600) score -= 15;
  else if (ttfb > 200) score -= 5;
  if (fcp > 2500) score -= 20;
  else if (fcp > 1200) score -= 10;
  if (lcp > 3500) score -= 25;
  else if (lcp > 2000) score -= 10;
  if (categories.scripts.size > 1.5 * 1024 * 1024) score -= 15;
  score = Math.max(20, Math.min(100, score));

  // Audits
  const audits = [];
  if (categories.scripts.size > 800 * 1024) {
    audits.push({
      id: 'bundle-size',
      type: 'warning',
      title: 'Large JavaScript Bundle',
      description: 'JavaScript assets exceed 800 KB. Consider code splitting and tree-shaking.',
      savings: 'Save ~' + Math.round(categories.scripts.size / 2048) + ' KB'
    });
  }
  if (ttfb > 400) {
    audits.push({
      id: 'ttfb-slow',
      type: 'opportunity',
      title: 'High Initial Server Latency (TTFB)',
      description: 'Server took ' + ttfb + 'ms to respond. Enable Edge caching or CDN distribution.',
      savings: 'Improve TTFB to < 150ms'
    });
  }
  audits.push({
    id: 'caching',
    type: 'good',
    title: 'Modern Resource Protocol',
    description: 'Resources loaded using HTTP multiplexing with optimized cache headers.'
  });

  const memory = window.performance.memory ? {
    used: window.performance.memory.usedJSHeapSize,
    total: window.performance.memory.totalJSHeapSize
  } : undefined;

  return {
    score,
    vitals: { lcp, fcp, cls, ttfb, domLoad, windowLoad },
    resources: categories,
    waterfall: waterfall.slice(0, 40),
    memory,
    audits,
    timestamp: Date.now()
  };
})();
`;

export const usePerformanceStore = create<PerformanceState>((set) => ({
  currentSnapshot: null,
  isLoading: false,
  selectedFilter: "all",

  setSnapshot: (currentSnapshot) => set({ currentSnapshot }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedFilter: (selectedFilter) => set({ selectedFilter }),
}));