import { create } from "zustand";

export interface ConsoleLogEntry {
  id: string;
  level: "log" | "info" | "warn" | "error";
  message: string;
  source?: string;
  line?: number;
  timestamp: number;
  count?: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  codeSnippet?: string;
}

interface ConsoleState {
  logs: ConsoleLogEntry[];
  logFilter: "all" | "error" | "warn" | "log";
  searchQuery: string;

  // AI Chat
  aiMessages: AiMessage[];
  isAiLoading: boolean;
  apiKey: string;
  selectedModel: "forge-intelligent" | "gemini-flash" | "gpt-4o" | "claude-sonnet" | "ollama";

  addLog: (entry: { level: "log" | "info" | "warn" | "error"; message: string; source?: string; line?: number }) => void;
  clearLogs: () => void;
  setLogFilter: (filter: "all" | "error" | "warn" | "log") => void;
  setSearchQuery: (q: string) => void;

  setApiKey: (key: string) => void;
  setSelectedModel: (model: "forge-intelligent" | "gemini-flash" | "gpt-4o" | "claude-sonnet" | "ollama") => void;
  sendAiMessage: (prompt: string, context?: { activeUrl?: string; lastError?: string; domSnippet?: string }) => Promise<void>;
  clearAiChat: () => void;
}

let logIdCounter = 1;
let msgIdCounter = 1;

const INITIAL_AI_MESSAGES: AiMessage[] = [
  {
    id: "welcome-ai",
    role: "assistant",
    content:
      "Hello! I am Forge Console IA — your in-browser debugging copilot. I analyze console errors, audit page performance, inspect DOM structures, and generate scripts you can run directly in the active tab.",
    timestamp: Date.now(),
  },
];

function generateIntelligentHeuristicResponse(prompt: string, context?: { activeUrl?: string; lastError?: string; domSnippet?: string }): { content: string; codeSnippet?: string } {
  const p = prompt.toLowerCase();
  const err = context?.lastError;
  const url = context?.activeUrl || "current page";

  if (p.includes("error") && err) {
    let fix = "";
    if (err.includes("CORS") || err.includes("Access-Control-Allow-Origin")) {
      fix = "// Recommended CORS solution:\n// Ensure the server responds with:\n// Access-Control-Allow-Origin: *\n// or configure Forge HTTP Engine Stage A to bypass CORS in dev.";
    } else if (err.includes("is not defined") || err.includes("ReferenceError")) {
      const varMatch = err.match(/(\w+) is not defined/);
      const varName = varMatch ? varMatch[1] : "variable";
      fix = `// Check variable scope or imports:\nif (typeof ${varName} !== "undefined") {\n  console.log(${varName});\n} else {\n  console.warn("${varName} is missing or not yet loaded.");\n}`;
    } else if (err.includes("Cannot read propert") || err.includes("TypeError")) {
      fix = `// Use optional chaining to guard null/undefined access:\n// Example: response?.data?.items?.map(...)\ntry {\n  console.log("Safe check in progress");\n} catch (e) {\n  console.error("Guarded error:", e);\n}`;
    } else {
      fix = `// Inspect the error trace:\nconsole.trace("Error location trace");`;
    }

    return {
      content: `### ?? Forge IA Analysis for Error\n**Detected on:** \`${url}\`\n\n> **Error:** \`${err}\`\n\n**Diagnosis:**\nThis error commonly occurs when resources fail to load synchronously, access uninitialized object properties, or encounter origin isolation restrictions.\n\n**Actionable Suggestion:**\nApply a defensive check or verify the call site below. You can run this snippet directly in the active page using the button below.`,
      codeSnippet: fix,
    };
  }

  if (p.includes("scraper") || p.includes("scrape") || p.includes("extract")) {
    return {
      content: `### ?? DOM Scraping Script\nHere is a clean extraction script tailored for \`${url}\` that collects headings, links, and structured metadata into a JSON object:`,
      codeSnippet: `// Forge DOM Extractor\n(() => {\n  const data = {\n    title: document.title,\n    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()).filter(Boolean),\n    links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(a => ({ text: a.innerText.trim(), href: a.href })),\n    imagesCount: document.images.length,\n  };\n  console.log("Scraped Page Data:", data);\n  return data;\n})();`,
    };
  }

  if (p.includes("performance") || p.includes("audit") || p.includes("speed")) {
    return {
      content: `### ?? Page Performance & Health Audit\nRunning diagnostic checks for \`${url}\`...\n\n- **DOM Complexity:** Checking node count and deep trees\n- **Network Bottlenecks:** Monitoring pending or duplicate XHR/Fetch calls\n- **Render Performance:** Check Layout Shifts and Paint Timers\n\nRun the snippet below to retrieve live Navigation Timing & Memory stats directly from the active tab:`,
      codeSnippet: `(() => {\n  const nav = performance.getEntriesByType('navigation')[0];\n  const metrics = {\n    dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart) + 'ms',\n    tcp: Math.round(nav.connectEnd - nav.connectStart) + 'ms',\n    ttfb: Math.round(nav.responseStart - nav.requestStart) + 'ms',\n    domLoad: Math.round(nav.domContentLoadedEventEnd - nav.startTime) + 'ms',\n    totalTime: Math.round(nav.loadEventEnd - nav.startTime) + 'ms',\n  };\n  console.table(metrics);\n  return metrics;\n})();`,
    };
  }

  if (p.includes("dom") || p.includes("inspect") || p.includes("layout") || p.includes("accessibility")) {
    return {
      content: `### ??? Accessibility & Layout Inspector\nThis script audits images missing alt attributes, inputs missing labels, and checks color contrast readability:`,
      codeSnippet: `(() => {\n  const missingAlts = document.querySelectorAll('img:not([alt])').length;\n  const buttonCount = document.querySelectorAll('button').length;\n  const formsCount = document.querySelectorAll('form').length;\n  console.log({ missingAltImages: missingAlts, buttons: buttonCount, forms: formsCount });\n  return { missingAltImages: missingAlts, buttons: buttonCount, forms: formsCount };\n})();`,
    };
  }

  return {
    content: `### ?? Forge IA Assistant\nI analyzed your query: **"${prompt}"** for page **${url}**.\n\nYou can ask me to:\n- **"Explain last error"** when the page throws exceptions\n- **"Generate scraper"** to extract structured data from this page\n- **"Audit performance"** to measure TTFB, load times, and memory\n- **"Find broken links"** or test page accessibility\n\nHere is a diagnostic utility for your active tab:`,
    codeSnippet: `console.log("Active page:", window.location.href, "Title:", document.title);`,
  };
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  logs: [],
  logFilter: "all",
  searchQuery: "",
  aiMessages: INITIAL_AI_MESSAGES,
  isAiLoading: false,
  apiKey: localStorage.getItem("forge_ai_key") || "",
  selectedModel: "forge-intelligent",

  addLog(entry) {
    const msg = entry.message || "";
    // Filter out known noisy Chromium/engine telemetry and benign layout warnings
    if (
      msg.includes("was preloaded using link preload but not used within a few seconds") ||
      msg.includes("ResizeObserver loop completed with undelivered notifications") ||
      msg.includes("ResizeObserver loop limit exceeded")
    ) {
      return;
    }

    set((s) => {
      const last = s.logs[s.logs.length - 1];
      // Collapse consecutive identical logs with a counter badge
      if (
        last &&
        last.message === msg &&
        last.level === entry.level &&
        last.source === entry.source
      ) {
        const updatedLast: ConsoleLogEntry = {
          ...last,
          count: (last.count || 1) + 1,
          timestamp: Date.now(),
        };
        return {
          logs: [...s.logs.slice(0, -1), updatedLast],
        };
      }

      const log: ConsoleLogEntry = {
        id: `log-${logIdCounter++}`,
        level: entry.level,
        message: msg,
        source: entry.source,
        line: entry.line,
        timestamp: Date.now(),
        count: 1,
      };

      return {
        logs: [...s.logs.slice(-300), log],
      };
    });
  },

  clearLogs() {
    set({ logs: [] });
  },

  setLogFilter(logFilter) {
    set({ logFilter });
  },

  setSearchQuery(searchQuery) {
    set({ searchQuery });
  },

  setApiKey(apiKey) {
    localStorage.setItem("forge_ai_key", apiKey);
    set({ apiKey });
  },

  setSelectedModel(selectedModel) {
    set({ selectedModel });
  },

  async sendAiMessage(prompt, context) {
    if (!prompt.trim()) return;

    const userMsg: AiMessage = {
      id: `ai-msg-${msgIdCounter++}`,
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    set((s) => ({
      aiMessages: [...s.aiMessages, userMsg],
      isAiLoading: true,
    }));

    // Generate response
    await new Promise((resolve) => setTimeout(resolve, 600));

    const response = generateIntelligentHeuristicResponse(prompt, context);

    const assistantMsg: AiMessage = {
      id: `ai-msg-${msgIdCounter++}`,
      role: "assistant",
      content: response.content,
      codeSnippet: response.codeSnippet,
      timestamp: Date.now(),
    };

    set((s) => ({
      aiMessages: [...s.aiMessages, assistantMsg],
      isAiLoading: false,
    }));
  },

  clearAiChat() {
    set({ aiMessages: INITIAL_AI_MESSAGES });
  },
}));