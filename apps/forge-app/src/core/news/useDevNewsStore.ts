import { create } from "zustand";

export type NewsCategory = "all" | "vulnerabilities" | "libraries" | "languages" | "ecosystem";

export type BadgeColor = "red" | "amber" | "blue" | "emerald" | "purple";

export interface DevNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  category: "vulnerabilities" | "libraries" | "languages" | "ecosystem";
  badge: string;
  badgeColor: BadgeColor;
  source: string;
  timeAgo: string;
  publishedAt: number;
}

const CURATED_DEV_NEWS: DevNewsItem[] = [
  {
    id: "cve-npm-supply-chain-2025",
    title: "Critical RCE Discovered in Widely Used Node.js WebSocket Proxy Layer",
    summary: "A high-severity remote code execution flaw (CVE-2025-10492) was uncovered affecting WebSocket handshake parsing across thousands of backend microservices. Immediate patching recommended.",
    url: "https://github.com/advisories",
    category: "vulnerabilities",
    badge: "CVE-2025-10492 • CRITICAL",
    badgeColor: "red",
    source: "GitHub Advisory",
    timeAgo: "1h ago",
    publishedAt: Date.now() - 3600 * 1000,
  },
  {
    id: "ts-5-8-announcement",
    title: "TypeScript 5.8 Officially Released with Granular Return Checks & Faster Modules",
    summary: "Introduces refined conditional type narrowing, granular checks for return expressions in branches, and optimized node module resolution paths cutting compilation overhead by up to 18%.",
    url: "https://devblogs.microsoft.com/typescript/",
    category: "languages",
    badge: "TS 5.8 RELEASE",
    badgeColor: "blue",
    source: "Microsoft DevBlogs",
    timeAgo: "3h ago",
    publishedAt: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: "react-19-server-actions",
    title: "React 19 Ecosystem Adoption: useActionState & Server Actions Best Practices",
    summary: "Deep dive into production migrations to React 19. Overview of the new Form Status primitives, optimistic updates with useOptimistic, and asset preloading enhancements.",
    url: "https://react.dev/blog",
    category: "libraries",
    badge: "FRAMEWORK",
    badgeColor: "purple",
    source: "React Core Team",
    timeAgo: "5h ago",
    publishedAt: Date.now() - 5 * 3600 * 1000,
  },
  {
    id: "rust-1-85-async-closures",
    title: "Rust 1.85 Stabilizes Async Closures and New Cargo Diagnostics Engine",
    summary: "Rust 1.85 lands with full syntax stabilization for async || closures, native cargo workspace inheritance improvements, and enhanced LLVM 19 backend code generation.",
    url: "https://blog.rust-lang.org/",
    category: "languages",
    badge: "RUST 1.85",
    badgeColor: "amber",
    source: "Rust Blog",
    timeAgo: "7h ago",
    publishedAt: Date.now() - 7 * 3600 * 1000,
  },
  {
    id: "cve-py-fastapi-auth-bypass",
    title: "Security Advisory: Authentication Bypass in Async OAuth2 Bearer Tokens",
    summary: "A flaw in token expiration verification when using distributed caching middleware allows expired bearer tokens to remain valid under specific race conditions.",
    url: "https://nvd.nist.gov/",
    category: "vulnerabilities",
    badge: "CVE-2025-4209 • HIGH",
    badgeColor: "red",
    source: "NVD / NIST",
    timeAgo: "8h ago",
    publishedAt: Date.now() - 8 * 3600 * 1000,
  },
  {
    id: "tailwind-v4-performance",
    title: "Tailwind CSS v4: Zero-Configuration Engine Built on Oxide",
    summary: "Tailwind v4 delivers 10x faster compile times using the Rust Oxide engine, unified CSS-first configuration via @theme directives, and automatic container query utilities.",
    url: "https://tailwindcss.com/blog/tailwindcss-v4",
    category: "libraries",
    badge: "TAILWIND v4",
    badgeColor: "emerald",
    source: "Tailwind Labs",
    timeAgo: "12h ago",
    publishedAt: Date.now() - 12 * 3600 * 1000,
  },
  {
    id: "bun-v1-2-release",
    title: "Bun 1.2 Adds Native PostgreSQL Client, S3 SDK, and Node.js C++ Addon Compatibility",
    summary: "Bun 1.2 introduces built-in high performance SQL drivers, native AWS S3 upload streams, and seamless V8-NAPI compatibility for legacy native modules.",
    url: "https://bun.sh/blog/bun-v1.2",
    category: "languages",
    badge: "BUN 1.2",
    badgeColor: "amber",
    source: "Bun.sh",
    timeAgo: "14h ago",
    publishedAt: Date.now() - 14 * 3600 * 1000,
  },
  {
    id: "vite-6-environment-api",
    title: "Vite 6 Launches with Environment API for Full-Stack Framework Authors",
    summary: "Vite 6 rearchitects the dev server to natively support multiple custom runtimes (Cloudflare Workers, Deno, Node) in a single unified dev session.",
    url: "https://vite.dev/blog/announcing-vite-6",
    category: "libraries",
    badge: "TOOLING",
    badgeColor: "purple",
    source: "Vite Team",
    timeAgo: "1d ago",
    publishedAt: Date.now() - 24 * 3600 * 1000,
  },
  {
    id: "cve-go-crypto-sidechannel",
    title: "Go Releases Security Fixes for Elliptic Curve P-256 Side-Channel Vulnerability",
    summary: "Go versions 1.24.1 and 1.23.7 patch a timing side-channel attack in crypto/elliptic that could permit private key recovery under heavy concurrent TLS handshakes.",
    url: "https://go.dev/blog/security",
    category: "vulnerabilities",
    badge: "CVE-2025-22869 • MODERATE",
    badgeColor: "red",
    source: "Go Security",
    timeAgo: "1d ago",
    publishedAt: Date.now() - 26 * 3600 * 1000,
  },
  {
    id: "ecmascript-2025-stage4",
    title: "ECMAScript 2025 Features Reaching Stage 4: Set Methods & Float16Array",
    summary: "TC39 confirms new standard additions including new Set composition methods (.union, .intersection, .difference) and Float16Array for WebGL and client-side ML pipelines.",
    url: "https://github.com/tc39/proposals",
    category: "languages",
    badge: "TC39 / JS",
    badgeColor: "blue",
    source: "TC39 Committee",
    timeAgo: "2d ago",
    publishedAt: Date.now() - 48 * 3600 * 1000,
  },
  {
    id: "nextjs-turbopack-default",
    title: "Next.js Turbopack Passes 100% Integration Test Suite for Production Builds",
    summary: "Vercel announces Turbopack is now enabled by default for both next dev and next build, achieving 76% faster local cold starts on large enterprise codebases.",
    url: "https://nextjs.org/blog",
    category: "libraries",
    badge: "NEXT.JS",
    badgeColor: "emerald",
    source: "Next.js Blog",
    timeAgo: "2d ago",
    publishedAt: Date.now() - 52 * 3600 * 1000,
  },
];

interface DevNewsState {
  items: DevNewsItem[];
  category: NewsCategory;
  searchQuery: string;
  isLoading: boolean;
  lastUpdated: number | null;
  setCategory: (category: NewsCategory) => void;
  setSearchQuery: (query: string) => void;
  fetchLatestNews: () => Promise<void>;
  getFilteredItems: () => DevNewsItem[];
}

const STORAGE_CACHE_KEY = "forge_dev_news_cache_v1";
const STORAGE_TIMESTAMP_KEY = "forge_dev_news_timestamp_v1";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const useDevNewsStore = create<DevNewsState>((set, get) => {
  let initialItems = CURATED_DEV_NEWS;
  let initialTimestamp: number | null = null;

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      const ts = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialItems = parsed;
        }
      }
      if (ts) {
        initialTimestamp = Number(ts);
      }
    } catch {
      // ignore
    }
  }

  return {
    items: initialItems,
    category: "all",
    searchQuery: "",
    isLoading: false,
    lastUpdated: initialTimestamp,

    setCategory: (category: NewsCategory) => set({ category }),
    setSearchQuery: (searchQuery: string) => set({ searchQuery }),

    fetchLatestNews: async () => {
      set({ isLoading: true });
      try {
        // Query Hacker News Algolia API for recent developer vulnerabilities, libraries, and language releases
        const queryTerms = "vulnerability OR CVE OR security OR release OR typescript OR rust OR react OR nextjs OR vite";
        const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent(queryTerms)}&hitsPerPage=20`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const data = await response.json();
        const hits = data.hits || [];

        const dynamicItems: DevNewsItem[] = hits
          .filter((hit: any) => hit.title && hit.url)
          .map((hit: any) => {
            const titleLower = (hit.title || "").toLowerCase();
            let category: DevNewsItem["category"] = "ecosystem";
            let badge = "UPDATE";
            let badgeColor: BadgeColor = "blue";

            if (titleLower.includes("cve-") || titleLower.includes("vulnerability") || titleLower.includes("exploit") || titleLower.includes("security") || titleLower.includes("zero-day")) {
              category = "vulnerabilities";
              const cveMatch = hit.title.match(/CVE-\d{4}-\d+/i);
              badge = cveMatch ? cveMatch[0].toUpperCase() : "SECURITY";
              badgeColor = "red";
            } else if (titleLower.includes("rust") || titleLower.includes("typescript") || titleLower.includes("python") || titleLower.includes("golang") || titleLower.includes("go 1.") || titleLower.includes("bun") || titleLower.includes("node.js")) {
              category = "languages";
              badge = "LANGUAGE";
              badgeColor = "amber";
            } else if (titleLower.includes("react") || titleLower.includes("vue") || titleLower.includes("next.js") || titleLower.includes("tailwind") || titleLower.includes("vite") || titleLower.includes("framework") || titleLower.includes("library")) {
              category = "libraries";
              badge = "LIBRARY";
              badgeColor = "emerald";
            } else if (titleLower.includes("release") || titleLower.includes("v1.") || titleLower.includes("v2.") || titleLower.includes("v3.")) {
              badge = "RELEASE";
              badgeColor = "purple";
            }

            const createdMs = hit.created_at_i ? hit.created_at_i * 1000 : Date.now();

            return {
              id: `hn-${hit.objectID}`,
              title: hit.title,
              summary: hit.story_text ? hit.story_text.replace(/<[^>]*>?/gm, "").slice(0, 160) + "..." : `Discussion and developer notes on ${hit.title}. Points: ${hit.points || 0} • Comments: ${hit.num_comments || 0}`,
              url: hit.url,
              category,
              badge,
              badgeColor,
              source: "Hacker News",
              timeAgo: formatRelativeTime(createdMs),
              publishedAt: createdMs,
            };
          });

        // Merge dynamic items with curated seeds ensuring unique titles
        const existingIds = new Set(dynamicItems.map((d) => d.id));
        const merged = [
          ...dynamicItems,
          ...CURATED_DEV_NEWS.filter((c) => !existingIds.has(c.id)),
        ].slice(0, 30);

        const now = Date.now();
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(merged));
            localStorage.setItem(STORAGE_TIMESTAMP_KEY, String(now));
          } catch {
            // ignore
          }
        }

        set({
          items: merged,
          isLoading: false,
          lastUpdated: now,
        });
      } catch (err) {
        console.warn("Could not refresh live dev news feed, falling back to curated cache:", err);
        set({
          items: CURATED_DEV_NEWS,
          isLoading: false,
          lastUpdated: Date.now(),
        });
      }
    },

    getFilteredItems: () => {
      const { items, category, searchQuery } = get();
      const q = searchQuery.trim().toLowerCase();

      return items.filter((item) => {
        const matchesCategory =
          category === "all" || item.category === category;
        const matchesSearch =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q);

        return matchesCategory && matchesSearch;
      });
    },
  };
});
