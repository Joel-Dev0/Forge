import { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Sparkles,
  Play,
  Copy,
  Check,
  Trash2,
  Send,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Key,
  Bot,
  ChevronRight,
  Code2,
  Globe,
  CornerDownLeft,
  Folder,
} from "lucide-react";
import { useConsoleStore } from "../../core/console/useConsoleStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useTerminalStore } from "../../core/terminal/useTerminalStore";

interface Props {
  getActiveWebview?: () => WebviewElement | null;
}

export function ConsoleIA({ getActiveWebview }: Props) {
  const [subTab, setSubTab] = useState<"console" | "ai">("console");
  const [commandInput, setCommandInput] = useState("");
  const [multiLineScript, setMultiLineScript] = useState("");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [replHistory, setReplHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [aiInput, setAiInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [runSuccessId, setRunSuccessId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);

  const {
    logs,
    logFilter,
    searchQuery,
    aiMessages,
    isAiLoading,
    apiKey,
    selectedModel,
    addLog,
    clearLogs,
    setLogFilter,
    setSearchQuery,
    setApiKey,
    setSelectedModel,
    sendAiMessage,
    clearAiChat,
  } = useConsoleStore();

  const {
    shellMode,
    cwd,
    isExecuting,
    setShellMode,
    initCwd,
    execSystemCommand,
  } = useTerminalStore();

  const { tabs, activeTabId } = useTabsStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Initialize working directory on mount
  useEffect(() => {
    initCwd();
  }, [initCwd]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-scroll AI chat
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isAiLoading]);

  // Find active webview with DOM fallback
  const resolveWebview = (): WebviewElement | null => {
    if (getActiveWebview) {
      const wv = getActiveWebview();
      if (wv) return wv;
    }
    const allWebviews = Array.from(document.querySelectorAll<WebviewElement>("webview"));
    for (const wv of allWebviews) {
      if (wv.offsetParent !== null || wv.style.display !== "none") {
        return wv;
      }
    }
    return allWebviews[0] || null;
  };

  // Safe wrapper for in-browser JavaScript evaluation
  const createRunnerScript = (code: string) => `
    (async () => {
      try {
        let raw;
        if (${JSON.stringify(code)}.includes('return ') || ${JSON.stringify(code)}.includes('\\n')) {
          raw = await (async () => {
            ${code}
          })();
        } else {
          raw = await (0, eval)(${JSON.stringify(code)});
        }

        if (raw === undefined) return { type: 'undefined', value: 'undefined' };
        if (raw === null) return { type: 'null', value: 'null' };

        if (typeof raw === 'function') {
          return { type: 'function', value: raw.toString().slice(0, 150) };
        }

        if (raw instanceof Element) {
          const tag = raw.tagName.toLowerCase();
          const id = raw.id ? '#' + raw.id : '';
          const cls = raw.className && typeof raw.className === 'string' ? '.' + raw.className.trim().split(/\\s+/).join('.') : '';
          return {
            type: 'element',
            value: '<' + tag + id + cls + '>',
            html: (raw.outerHTML || '').slice(0, 250)
          };
        }

        if (raw instanceof NodeList || raw instanceof HTMLCollection) {
          const items = Array.from(raw).slice(0, 6).map(el => {
            if (el instanceof Element) {
              return '<' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '>';
            }
            return String(el);
          });
          return {
            type: 'nodelist',
            value: 'NodeList(' + raw.length + ') [' + items.join(', ') + (raw.length > 6 ? ', ...' : '') + ']'
          };
        }

        if (typeof raw === 'object') {
          try {
            return { type: 'object', value: JSON.stringify(raw, null, 2) };
          } catch {
            return { type: 'object', value: Object.prototype.toString.call(raw) };
          }
        }

        return { type: typeof raw, value: String(raw) };
      } catch (err) {
        return {
          type: 'error',
          value: err ? (err.stack || err.message || String(err)) : 'Execution error'
        };
      }
    })()
  `;

  // Main Command Execution router (handles PowerShell, CMD, or Browser JS)
  const handleExecute = async (cmdToRun: string, sourcePrefix?: string) => {
    if (!cmdToRun.trim()) return;
    const cmd = cmdToRun.trim();

    // 1. System Shell Execution (PowerShell or CMD)
    if (shellMode === "powershell" || shellMode === "cmd") {
      const promptLabel = shellMode === "powershell" ? `PS ${cwd}> ${cmd}` : `${cwd}> ${cmd}`;

      addLog({
        level: "info",
        message: promptLabel,
        source: shellMode === "powershell" ? "PowerShell" : "CMD",
      });

      const res = await execSystemCommand(cmd);

      if (res.stdout) {
        addLog({
          level: "log",
          message: res.stdout.replace(/\r\n$/, ""),
          source: shellMode === "powershell" ? "PowerShell" : "CMD",
        });
      }

      if (res.stderr) {
        addLog({
          level: "error",
          message: res.stderr.replace(/\r\n$/, ""),
          source: shellMode === "powershell" ? "PowerShell" : "CMD",
        });
      }

      return;
    }

    // 2. In-Browser JavaScript Execution
    addLog({
      level: "info",
      message: `> ${cmd}`,
      source: sourcePrefix || "Browser JS",
    });

    try {
      const wv = resolveWebview();
      if (!wv) {
        const localResult = (0, eval)(cmd);
        addLog({
          level: "log",
          message: `< ${typeof localResult === "object" ? JSON.stringify(localResult, null, 2) : String(localResult)}`,
          source: "Forge Host",
        });
        return;
      }

      const script = createRunnerScript(cmd);
      const evalRes: { type: string; value: string } = await wv.executeJavaScript(script);

      if (!evalRes) {
        addLog({ level: "log", message: `< undefined`, source: "Guest Page" });
        return;
      }

      if (evalRes.type === "error") {
        addLog({
          level: "error",
          message: `< Uncaught: ${evalRes.value}`,
          source: "Runtime Error",
        });
      } else {
        addLog({
          level: "log",
          message: `< ${evalRes.value}`,
          source: evalRes.type === "element" ? "DOM Element" : "Guest Page",
        });
      }
    } catch (err: any) {
      addLog({
        level: "error",
        message: `< ${err.message || String(err)}`,
        source: "Evaluation Error",
      });
    }
  };

  const handleRunSingleLine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    setReplHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput("");
    handleExecute(cmd);
  };

  const handleRunMultiLine = () => {
    if (!multiLineScript.trim()) return;
    handleExecute(multiLineScript.trim(), "Script Pad");
  };

  const handleRunSnippetInPage = async (snippet: string, msgId: string) => {
    try {
      await handleExecute(snippet, "AI Script");
      setRunSuccessId(msgId);
      setTimeout(() => setRunSuccessId(null), 2500);
    } catch (err: any) {
      addLog({
        level: "error",
        message: `[Execution Error]: ${err.message || String(err)}`,
        source: "AI Assistant",
      });
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAskAiAboutError = (errorMsg: string) => {
    setSubTab("ai");
    sendAiMessage(`Explain this error and suggest a fix: "${errorMsg}"`, {
      activeUrl: currentTab?.url,
      lastError: errorMsg,
    });
  };

  const handleSendAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const prompt = aiInput.trim();
    setAiInput("");

    const lastErr = [...logs].reverse().find((l) => l.level === "error")?.message;
    sendAiMessage(prompt, {
      activeUrl: currentTab?.url,
      lastError: lastErr,
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter !== "all" && log.level !== logFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!log.message.toLowerCase().includes(q) && !log.source?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  const getPromptPrefix = () => {
    if (shellMode === "powershell") {
      const folderName = cwd.split(/\\|\//).pop() || cwd;
      return `PS ~${folderName}> `;
    }
    if (shellMode === "cmd") {
      const folderName = cwd.split(/\\|\//).pop() || cwd;
      return `CMD ~${folderName}> `;
    }
    return "> ";
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--forge-surface)] text-[11px] select-text">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40 shrink-0 w-full">
        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1 bg-[var(--forge-input)] p-0.5 rounded-md">
            <button
              onClick={() => setSubTab("console")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                subTab === "console"
                  ? "bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Terminal size={12} className={subTab === "console" ? "text-[#FF6B00]" : ""} />
              Terminal & Console
              {errorCount > 0 && (
                <span className="text-[8px] px-1 rounded-full bg-red-500/20 text-red-500 font-bold font-mono">
                  {errorCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab("ai")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                subTab === "ai"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Sparkles size={12} className="text-[#FF6B00]" />
              Console IA Assistant
            </button>
          </div>

          {/* Engine Selector: PowerShell vs CMD vs Browser JS */}
          {subTab === "console" && (
            <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded-md text-[9px] border border-[var(--forge-border)]">
              <button
                onClick={() => setShellMode("powershell")}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  shellMode === "powershell"
                    ? "bg-[#012456] text-sky-200 shadow-xs border border-sky-400/40"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                }`}
                title="Windows PowerShell 7/5 (Navigate directories, run npm, python, git, scripts)"
              >
                PowerShell
              </button>

              <button
                onClick={() => setShellMode("cmd")}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  shellMode === "cmd"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-500/40"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                }`}
                title="Windows Command Prompt (CMD.EXE)"
              >
                CMD
              </button>

              <button
                onClick={() => setShellMode("browser-js")}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  shellMode === "browser-js"
                    ? "bg-[#FF6B00]/20 text-[#FF6B00] shadow-xs border border-[#FF6B00]/40"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                }`}
                title="In-Browser JavaScript Console (DOM, guest page scripts)"
              >
                Browser JS
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {subTab === "console" ? (
            <>
              {/* Working directory / Target indicator */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] text-[9px] text-[var(--forge-text-muted)] max-w-xs truncate"
                title={shellMode === "browser-js" ? `Guest page: ${currentTab?.url}` : `Working directory: ${cwd}`}
              >
                {shellMode === "browser-js" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <Globe size={10} />
                    <span className="font-mono text-[var(--forge-text)] truncate">
                      {currentTab?.url && currentTab.url !== "about:blank"
                        ? currentTab.url.replace(/^https?:\/\//, "").split("/")[0]
                        : "Guest Page"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <Folder size={10} />
                    <span className="font-mono text-[var(--forge-text)] truncate">{cwd}</span>
                  </>
                )}
              </div>

              {/* Script Pad Toggle */}
              <button
                onClick={() => setIsEditorExpanded((v) => !v)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer border ${
                  isEditorExpanded
                    ? "bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/40"
                    : "bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] border-[var(--forge-border)]"
                }`}
                title="Toggle Script Pad"
              >
                <Code2 size={11} />
                <span>Script Pad</span>
              </button>

              {/* Filter pills */}
              <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
                <button
                  onClick={() => setLogFilter("all")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    logFilter === "all" ? "bg-[var(--forge-surface)] text-[var(--forge-text)] font-bold" : "text-[var(--forge-text-muted)]"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  onClick={() => setLogFilter("error")}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                    logFilter === "error" ? "bg-red-500/20 text-red-500 font-bold" : "text-[var(--forge-text-muted)] hover:text-red-500"
                  }`}
                >
                  <AlertCircle size={9} />
                  {errorCount}
                </button>
                <button
                  onClick={() => setLogFilter("warn")}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                    logFilter === "warn" ? "bg-amber-500/20 text-amber-500 font-bold" : "text-[var(--forge-text-muted)] hover:text-amber-500"
                  }`}
                >
                  <AlertTriangle size={9} />
                  {warnCount}
                </button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] w-28">
                <Search size={10} className="text-[var(--forge-text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[9px] text-[var(--forge-text)] outline-none w-full"
                />
              </div>

              <button
                onClick={clearLogs}
                title="Clear terminal"
                className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="AI Engine Settings"
                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--forge-input)] text-[9px] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
              >
                <Key size={10} />
                <span>Engine: {selectedModel === "forge-intelligent" ? "Forge Built-in" : selectedModel}</span>
              </button>

              <button
                onClick={clearAiChat}
                title="Clear AI Chat"
                className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-view 1: Console / Terminal Output & Execution */}
      {subTab === "console" && (
        <div className="flex-1 flex flex-col w-full overflow-hidden">
          {/* Multi-line Script Pad Drawer */}
          {isEditorExpanded && (
            <div className="border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] p-2.5 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[var(--forge-text)] flex items-center gap-1.5">
                  <Code2 size={12} className="text-[#FF6B00]" />
                  {shellMode === "browser-js"
                    ? "JavaScript Script Pad (In-Page)"
                    : `${shellMode === "powershell" ? "PowerShell" : "Batch"} Script Runner (${cwd})`}
                </span>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-[var(--forge-text-muted)]">Presets:</span>
                  {shellMode === "browser-js" ? (
                    [
                      { label: "Highlight Red", code: 'document.body.style.outline = "4px solid #EF4444";' },
                      { label: "Get All Links", code: 'Array.from(document.querySelectorAll("a[href]")).map(a => a.href);' },
                      { label: "Count DOM", code: 'document.querySelectorAll("*").length;' },
                      { label: "Fetch JSON", code: 'fetch("https://jsonplaceholder.typicode.com/todos/1").then(r => r.json());' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setMultiLineScript(p.code)}
                        className="px-1.5 py-0.5 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[9px] text-[var(--forge-text-muted)] hover:text-[#FF6B00] border border-[var(--forge-border)] cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))
                  ) : (
                    [
                      { label: "List Files (dir)", code: "dir" },
                      { label: "Git Status", code: "git status" },
                      { label: "Python Check", code: "python --version" },
                      { label: "Node Check", code: "node -v" },
                      { label: "Installed Packages", code: "pnpm list --depth 0" },
                      { label: "Parent Dir (cd ..)", code: "cd .." },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setMultiLineScript(p.code)}
                        className="px-1.5 py-0.5 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[9px] text-[var(--forge-text-muted)] hover:text-sky-300 border border-[var(--forge-border)] cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <textarea
                value={multiLineScript}
                onChange={(e) => setMultiLineScript(e.target.value)}
                placeholder={
                  shellMode === "browser-js"
                    ? "// Write in-page JavaScript... Press Execute Script or Ctrl+Enter\nconst title = document.title;\nreturn { title };"
                    : "# Write shell commands (PowerShell / CMD)... Press Execute or Ctrl+Enter\nGet-ChildItem -Path .\ngit status"
                }
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleRunMultiLine();
                  }
                }}
                className="w-full bg-[var(--forge-input)] border border-[var(--forge-border)] p-2 rounded font-mono text-[10px] text-emerald-400 placeholder:text-[var(--forge-text-muted)] outline-none focus:border-[#FF6B00] resize-y"
              />

              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--forge-text-muted)]">
                  Shortcut: <kbd className="px-1 py-0.2 bg-[var(--forge-input)] rounded border border-[var(--forge-border)] font-mono">Ctrl+Enter</kbd> to run.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMultiLineScript("")}
                    className="px-2.5 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[9px] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleRunMultiLine}
                    disabled={isExecuting}
                    className="px-3.5 py-1 bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Play size={10} fill="currentColor" />
                    Execute Script
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Terminal / Logs Output Stream */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 scrollbar-thin bg-black/10">
            {filteredLogs.length === 0 ? (
              <div className="p-6 text-center text-[var(--forge-text-muted)] italic text-[11px] space-y-1">
                <p>Terminal is ready in <strong>{shellMode.toUpperCase()}</strong> mode.</p>
                <p className="text-[9px] opacity-80">
                  {shellMode === "powershell" && "Navigate with 'cd <dir>', list with 'dir' / 'ls', run 'python', 'pnpm', 'git', or custom scripts."}
                  {shellMode === "cmd" && "Run classic Windows command prompt commands in current working directory."}
                  {shellMode === "browser-js" && "Execute live JavaScript expressions in the active browser tab."}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isCommandInput = log.message.startsWith("PS ") || log.message.startsWith("> ") || log.message.includes("> ");
                const isCommandOutput = log.message.startsWith("< ");

                let badgeColor = "text-sky-400";
                let bgRow = "hover:bg-[var(--forge-hover)]";
                let Icon = Info;

                if (log.level === "error") {
                  badgeColor = "text-red-400";
                  bgRow = "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500";
                  Icon = AlertCircle;
                } else if (log.level === "warn") {
                  badgeColor = "text-amber-400";
                  bgRow = "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-amber-500";
                  Icon = AlertTriangle;
                } else if (isCommandInput) {
                  badgeColor = "text-[#FF6B00]";
                  bgRow = "bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 border-l-2 border-[#FF6B00]";
                  Icon = ChevronRight;
                } else if (isCommandOutput) {
                  badgeColor = "text-emerald-400";
                  bgRow = "hover:bg-[var(--forge-hover)] pl-4";
                  Icon = CornerDownLeft;
                }

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2 py-1 rounded transition-colors group ${bgRow}`}
                  >
                    <Icon size={12} className={`mt-0.5 shrink-0 ${badgeColor}`} />

                    <div className="flex-1 min-w-0 break-words whitespace-pre-wrap font-mono leading-relaxed">
                      <span
                        className={
                          log.level === "error"
                            ? "text-red-400"
                            : isCommandInput
                            ? "text-[#FF6B00] font-bold"
                            : isCommandOutput
                            ? "text-emerald-400"
                            : "text-[var(--forge-text)]"
                        }
                      >
                        {log.message}
                      </span>
                    </div>

                    {log.source && (
                      <span className="text-[9px] text-[var(--forge-text-muted)] shrink-0 opacity-70">
                        {log.source}
                      </span>
                    )}

                    <button
                      onClick={() => handleCopy(log.message, log.id)}
                      className="p-0.5 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Copy output"
                    >
                      {copiedId === log.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    </button>

                    {log.level === "error" && (
                      <button
                        onClick={() => handleAskAiAboutError(log.message)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FF6B00]/15 hover:bg-[#FF6B00]/30 text-[#FF6B00] font-sans text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        title="Analyze and suggest fix with Console IA"
                      >
                        <Sparkles size={10} />
                        Ask IA
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Interactive Command Line Prompt */}
          <form
            onSubmit={handleRunSingleLine}
            className="flex items-center gap-1.5 px-3 py-1.5 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] shrink-0 w-full"
          >
            <span className="font-mono text-[10px] text-[#FF6B00] font-bold shrink-0">
              {getPromptPrefix()}
            </span>
            <input
              ref={singleInputRef}
              type="text"
              placeholder={
                shellMode === "powershell"
                  ? "Run PowerShell (e.g. dir, cd <dir>, git status, python test.py)... Press Enter"
                  : shellMode === "cmd"
                  ? "Run CMD (e.g. dir, cd .., type file.txt)... Press Enter"
                  : "Run JavaScript in active page (e.g. document.title, location.href)... Press Enter"
              }
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (replHistory.length === 0) return;
                  const nextIdx = historyIndex < 0 ? replHistory.length - 1 : Math.max(0, historyIndex - 1);
                  setHistoryIndex(nextIdx);
                  setCommandInput(replHistory[nextIdx]);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (historyIndex >= 0) {
                    const nextIdx = historyIndex + 1;
                    if (nextIdx < replHistory.length) {
                      setHistoryIndex(nextIdx);
                      setCommandInput(replHistory[nextIdx]);
                    } else {
                      setHistoryIndex(-1);
                      setCommandInput("");
                    }
                  }
                }
              }}
              className="flex-1 bg-transparent font-mono text-[10px] text-[var(--forge-text)] placeholder:text-[var(--forge-text-muted)] outline-none"
            />
            <button
              type="submit"
              disabled={isExecuting}
              className="px-2.5 py-1 bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white rounded text-[9px] font-bold font-sans flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title="Execute command (Enter)"
            >
              <Play size={9} fill="currentColor" />
              {isExecuting ? "Running..." : "Run"}
            </button>
          </form>
        </div>
      )}

      {/* Sub-view 2: Console IA Assistant */}
      {subTab === "ai" && (
        <div className="flex-1 flex flex-col w-full overflow-hidden relative">
          {showSettings && (
            <div className="p-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] flex flex-col gap-2">
              <span className="font-bold text-[var(--forge-text)] text-[10px]">AI Engine Configuration</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as any)}
                  className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2 py-1 rounded text-[10px] text-[var(--forge-text)] outline-none"
                >
                  <option value="forge-intelligent">Forge Intelligent Heuristics (Built-in)</option>
                  <option value="gemini-flash">Google Gemini 2.5 Flash</option>
                  <option value="gpt-4o">OpenAI GPT-4o</option>
                  <option value="claude-sonnet">Anthropic Claude Sonnet</option>
                  <option value="ollama">Local Ollama (http://localhost:11434)</option>
                </select>

                <input
                  type="password"
                  placeholder="Optional API Key (for cloud models)..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-2 py-1 rounded text-[10px] text-[var(--forge-text)] outline-none"
                />
              </div>
            </div>
          )}

          <div className="px-3 py-1.5 border-b border-[var(--forge-border)] flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-[var(--forge-surface-elevated)]/20 shrink-0">
            <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)] shrink-0">Prompts:</span>
            {[
              "Explain Last Error",
              "Generate PowerShell / Bash Script",
              "Audit Performance & Memory",
              "Generate Page Scraper",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  const lastErr = [...logs].reverse().find((l) => l.level === "error")?.message;
                  sendAiMessage(chip, { activeUrl: currentTab?.url, lastError: lastErr });
                }}
                className="px-2 py-0.5 rounded-full bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[9px] text-[var(--forge-text-muted)] hover:text-[#FF6B00] font-medium shrink-0 transition-colors border border-[var(--forge-border)] cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                    msg.role === "user" ? "bg-[#FF6B00]" : "bg-gradient-to-tr from-[#FF6B00] to-purple-600"
                  }`}
                >
                  {msg.role === "user" ? "U" : <Bot size={13} />}
                </div>

                <div
                  className={`p-3 rounded-lg flex flex-col gap-2 ${
                    msg.role === "user"
                      ? "bg-[#FF6B00] text-white"
                      : "bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text)] shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                    {msg.content}
                  </div>

                  {msg.codeSnippet && (
                    <div className="mt-1 bg-black/40 rounded border border-black/30 overflow-hidden font-mono text-[10px]">
                      <div className="flex items-center justify-between px-2 py-1 bg-black/50 border-b border-white/5">
                        <span className="text-[9px] text-zinc-400">Code / Script</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(msg.codeSnippet!, msg.id)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            {copiedId === msg.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                          <button
                            onClick={() => handleRunSnippetInPage(msg.codeSnippet!, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white text-[9px] font-bold cursor-pointer transition-colors shadow-xs"
                            title="Execute snippet directly"
                          >
                            {runSuccessId === msg.id ? <Check size={10} /> : <Play size={9} fill="currentColor" />}
                            {runSuccessId === msg.id ? "Executed!" : "Run Snippet"}
                          </button>
                        </div>
                      </div>
                      <pre className="p-2.5 overflow-x-auto text-emerald-400">
                        {msg.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex items-center gap-2 text-[var(--forge-text-muted)] text-[10px] italic">
                <Sparkles size={12} className="animate-spin text-[#FF6B00]" />
                Forge IA is diagnosing and composing response...
              </div>
            )}
            <div ref={aiChatEndRef} />
          </div>

          <form
            onSubmit={handleSendAi}
            className="flex items-center gap-2 p-2 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]"
          >
            <input
              type="text"
              placeholder="Ask Console IA about errors, PowerShell commands, or code fixes..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-3 py-1.5 rounded-md text-[11px] text-[var(--forge-text)] placeholder:text-[var(--forge-text-muted)] outline-none focus:border-[#FF6B00]"
            />
            <button
              type="submit"
              disabled={isAiLoading}
              className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white rounded-md font-semibold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send size={11} />
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
