/**
 * Extension Tab Bridge (Phase 3)
 *
 * Maps Chrome Extension Tab API semantics to Forge's <webview> / WebContents tab model:
 *
 *   Chrome Extension Tab API ──► ExtensionTabBridge ──► <webview> WebContents
 *
 * Supported Chrome Tab capabilities:
 *   - chrome.tabs.query({ active: true, currentWindow: true, url: "..." })
 *   - chrome.tabs.get(tabId)
 *   - chrome.tabs.sendMessage(tabId, message)
 *   - chrome.tabs.reload(tabId)
 *   - chrome.tabs.executeScript(tabId, { code, file })
 *   - chrome.tabs.insertCSS(tabId, { code, file })
 */

import { webContents, BrowserWindow, ipcMain, type WebContents } from "electron";

export interface ChromeTab {
  id: number;
  index: number;
  windowId: number;
  highlighted: boolean;
  active: boolean;
  pinned: boolean;
  url: string;
  title: string;
  favIconUrl?: string;
  status: "loading" | "complete";
  incognito: boolean;
  width?: number;
  height?: number;
  sessionId?: string;
  partition?: string;
  forgeTabId?: string;
}

export interface TabQueryFilter {
  active?: boolean;
  currentWindow?: boolean;
  url?: string | string[];
  title?: string;
  status?: "loading" | "complete";
  windowId?: number;
  pinned?: boolean;
}

export interface TabStateRegistration {
  forgeTabId: string;
  webContentsId: number;
  sessionId: string;
  partition: string;
  url: string;
  title: string;
  active: boolean;
  pinned: boolean;
  favIconUrl?: string;
  status: "loading" | "complete";
  incognito: boolean;
}

export class ExtensionTabBridge {
  private static instance: ExtensionTabBridge;
  private tabsByWebContentsId = new Map<number, TabStateRegistration>();
  private activeWebContentsId: number | null = null;

  static getInstance(): ExtensionTabBridge {
    if (!ExtensionTabBridge.instance) {
      ExtensionTabBridge.instance = new ExtensionTabBridge();
    }
    return ExtensionTabBridge.instance;
  }

  /**
   * Register or update a tab's state from the Forge renderer or WebContents lifecycle.
   */
  registerTab(state: TabStateRegistration): void {
    this.tabsByWebContentsId.set(state.webContentsId, state);
    if (state.active) {
      this.activeWebContentsId = state.webContentsId;
    }
  }

  /**
   * Unregister a tab when its webview is destroyed or tab is closed.
   */
  unregisterTab(webContentsId: number): void {
    this.tabsByWebContentsId.delete(webContentsId);
    if (this.activeWebContentsId === webContentsId) {
      this.activeWebContentsId = null;
    }
  }

  /**
   * Automatically track a guest <webview> WebContents lifecycle.
   */
  attachWebContents(contents: WebContents): void {
    if (contents.getType() !== "webview") return;

    const wcId = contents.id;
    const sessionPartition = (contents.session as any)._partition || (contents.session as any).partition || "persist:forge";

    // Register initial state
    const existing = this.tabsByWebContentsId.get(wcId);
    if (!existing) {
      this.registerTab({
        forgeTabId: `wc-${wcId}`,
        webContentsId: wcId,
        sessionId: sessionPartition,
        partition: sessionPartition,
        url: contents.getURL() || "",
        title: contents.getTitle() || "New Tab",
        active: this.tabsByWebContentsId.size === 0,
        pinned: false,
        status: contents.isLoading() ? "loading" : "complete",
        incognito: sessionPartition.startsWith("private_") || sessionPartition.startsWith("tor_"),
      });
    }

    contents.on("did-start-loading", () => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab) tab.status = "loading";
    });

    contents.on("did-stop-loading", () => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab) tab.status = "complete";
    });

    contents.on("did-navigate", (_e, url) => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab) {
        tab.url = url;
        tab.title = contents.getTitle() || tab.title;
        tab.status = "complete";
      }
    });

    contents.on("did-navigate-in-page", (_e, url) => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab) tab.url = url;
    });

    contents.on("page-title-updated", (_e, title) => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab) tab.title = title;
    });

    contents.on("page-favicon-updated", (_e, favicons) => {
      const tab = this.tabsByWebContentsId.get(wcId);
      if (tab && favicons.length > 0) {
        tab.favIconUrl = favicons[0];
      }
    });

    contents.on("destroyed", () => {
      this.unregisterTab(wcId);
    });
  }

  /**
   * Set which tab is currently active.
   */
  setActiveTab(webContentsId: number): void {
    this.activeWebContentsId = webContentsId;
    for (const [id, tab] of this.tabsByWebContentsId) {
      tab.active = id === webContentsId;
    }
  }

  /**
   * Get the active tab.
   */
  getActiveTab(): ChromeTab | null {
    if (this.activeWebContentsId !== null) {
      const tab = this.getTab(this.activeWebContentsId);
      if (tab) return tab;
    }
    const all = this.queryTabs({ active: true });
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Get all registered tabs as ChromeTab objects.
   */
  getAllTabs(): ChromeTab[] {
    return this.queryTabs();
  }

  /**
   * Get tab bridge summary for diagnostics and UI inspection.
   */
  getSummary(): { totalTabs: number; activeTabId: number | null; tabs: ChromeTab[] } {
    const tabs = this.queryTabs();
    return {
      totalTabs: tabs.length,
      activeTabId: this.activeWebContentsId,
      tabs,
    };
  }

  /**
   * Convert internal state to ChromeTab object for extension consumption.
   */
  toChromeTab(state: TabStateRegistration, index = 0): ChromeTab {
    const wc = webContents.fromId(state.webContentsId);
    const win = BrowserWindow.getFocusedWindow();
    const bounds = win?.getBounds();

    return {
      id: state.webContentsId,
      index,
      windowId: win?.id || 1,
      highlighted: state.active,
      active: state.active,
      pinned: state.pinned || false,
      url: wc && !wc.isDestroyed() ? wc.getURL() : state.url,
      title: wc && !wc.isDestroyed() ? wc.getTitle() : state.title,
      favIconUrl: state.favIconUrl,
      status: wc && !wc.isDestroyed() && wc.isLoading() ? "loading" : "complete",
      incognito: state.incognito || state.partition.startsWith("private_") || state.partition.startsWith("tor_"),
      width: bounds?.width,
      height: bounds?.height,
      sessionId: state.sessionId,
      partition: state.partition,
      forgeTabId: state.forgeTabId,
    };
  }

  /**
   * Query tabs matching a Chrome Extension tab query filter.
   */
  queryTabs(filter: TabQueryFilter = {}): ChromeTab[] {
    const results: ChromeTab[] = [];
    let index = 0;

    for (const [wcId, state] of this.tabsByWebContentsId) {
      const wc = webContents.fromId(wcId);
      if (!wc || wc.isDestroyed()) continue;

      if (filter.active !== undefined && state.active !== filter.active) continue;
      if (filter.status !== undefined) {
        const curStatus = wc.isLoading() ? "loading" : "complete";
        if (curStatus !== filter.status) continue;
      }
      if (filter.pinned !== undefined && state.pinned !== filter.pinned) continue;

      if (filter.url) {
        const curUrl = wc.getURL();
        const patterns = Array.isArray(filter.url) ? filter.url : [filter.url];
        const matches = patterns.some((p) => this.matchUrlPattern(curUrl, p));
        if (!matches) continue;
      }

      if (filter.title) {
        const curTitle = wc.getTitle().toLowerCase();
        if (!curTitle.includes(filter.title.toLowerCase())) continue;
      }

      results.push(this.toChromeTab(state, index++));
    }

    // Fallback: If no tabs registered via bridge yet, query active webviews directly
    if (results.length === 0 && (filter.active || filter.currentWindow)) {
      const allWc = webContents.getAllWebContents();
      for (const wc of allWc) {
        if (wc.getType() === "webview" && !wc.isDestroyed()) {
          const tab: ChromeTab = {
            id: wc.id,
            index: 0,
            windowId: BrowserWindow.getFocusedWindow()?.id || 1,
            highlighted: true,
            active: true,
            pinned: false,
            url: wc.getURL(),
            title: wc.getTitle(),
            status: wc.isLoading() ? "loading" : "complete",
            incognito: false,
          };
          results.push(tab);
          break; // Return one active webview
        }
      }
    }

    return results;
  }

  /**
   * Get a specific tab by ID (WebContents ID).
   */
  getTab(tabId: number): ChromeTab | null {
    const state = this.tabsByWebContentsId.get(tabId);
    if (state) {
      return this.toChromeTab(state);
    }

    const wc = webContents.fromId(tabId);
    if (wc && !wc.isDestroyed() && wc.getType() === "webview") {
      return {
        id: wc.id,
        index: 0,
        windowId: BrowserWindow.getFocusedWindow()?.id || 1,
        highlighted: true,
        active: wc.id === this.activeWebContentsId,
        pinned: false,
        url: wc.getURL(),
        title: wc.getTitle(),
        status: wc.isLoading() ? "loading" : "complete",
        incognito: false,
      };
    }

    return null;
  }

  /**
   * Send a message to a specific tab's WebContents (chrome.tabs.sendMessage).
   */
  async sendMessageToTab(tabId: number, message: any): Promise<any> {
    const wc = webContents.fromId(tabId);
    if (!wc || wc.isDestroyed()) {
      throw new Error(`Tab ${tabId} not found or destroyed`);
    }

    // Send via Electron IPC to the target webview's guest context
    wc.send("chrome:runtime:message", message);
    return { success: true };
  }

  /**
   * Reload a tab (chrome.tabs.reload).
   */
  reloadTab(tabId: number): void {
    const wc = webContents.fromId(tabId);
    if (wc && !wc.isDestroyed()) {
      wc.reload();
    }
  }

  /**
   * Update a tab's URL (chrome.tabs.update).
   */
  async updateTab(tabId: number, updateProps: { url?: string; active?: boolean }): Promise<ChromeTab | null> {
    const wc = webContents.fromId(tabId);
    if (!wc || wc.isDestroyed()) return null;

    if (updateProps.url) {
      await wc.loadURL(updateProps.url);
    }
    if (updateProps.active) {
      this.setActiveTab(tabId);
    }

    return this.getTab(tabId);
  }

  /**
   * Execute script on a tab (chrome.tabs.executeScript / chrome.scripting.executeScript).
   */
  async executeScriptOnTab(tabId: number, code: string): Promise<any> {
    const wc = webContents.fromId(tabId);
    if (!wc || wc.isDestroyed()) {
      throw new Error(`Tab ${tabId} not found`);
    }
    return wc.executeJavaScript(code);
  }

  /**
   * Insert CSS into a tab (chrome.tabs.insertCSS / chrome.scripting.insertCSS).
   */
  async insertCssOnTab(tabId: number, css: string): Promise<string> {
    const wc = webContents.fromId(tabId);
    if (!wc || wc.isDestroyed()) {
      throw new Error(`Tab ${tabId} not found`);
    }
    return wc.insertCSS(css);
  }

  /**
   * Register IPC handlers for renderer tab sync and extension tab bridging.
   */
  registerIPC(): void {
    // ── Server-side validation helpers ────────────────────────────────────────
    const isPosInt = (v: unknown): v is number =>
      typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v > 0;
    const isStr = (v: unknown): v is string => typeof v === "string";
    const isObj = (v: unknown): v is Record<string, unknown> =>
      v !== null && typeof v === "object" && !Array.isArray(v);

    // Max sizes to prevent memory exhaustion attacks
    const MAX_CODE_BYTES = 1_000_000; // 1 MB
    const MAX_CSS_BYTES  = 1_000_000; // 1 MB

    // Renderer syncs tab state with the bridge
    ipcMain.handle("extensions:tabs:sync", (_event, tabStates: unknown) => {
      if (Array.isArray(tabStates)) {
        for (const t of tabStates) {
          if (isObj(t) && isPosInt(t["webContentsId"])) {
            this.registerTab(t as TabStateRegistration);
          }
        }
      }
      return { success: true };
    });

    ipcMain.handle("extensions:tabs:set-active", (_event, webContentsId: unknown) => {
      if (!isPosInt(webContentsId)) return { success: false, error: "Invalid webContentsId" };
      this.setActiveTab(webContentsId);
      return { success: true };
    });

    ipcMain.handle("extensions:tabs:query", (_event, filter?: unknown) => {
      return this.queryTabs(isObj(filter) ? filter as TabQueryFilter : {});
    });

    ipcMain.handle("extensions:tabs:get", (_event, tabId: unknown) => {
      if (!isPosInt(tabId)) return null;
      return this.getTab(tabId);
    });

    ipcMain.handle("extensions:tabs:reload", (_event, tabId: unknown) => {
      if (!isPosInt(tabId)) return { success: false, error: "Invalid tabId" };
      this.reloadTab(tabId);
      return { success: true };
    });

    ipcMain.handle("extensions:tabs:update", async (_event, payload: unknown) => {
      if (!isObj(payload)) return null;
      const tabId = payload["tabId"];
      const props = payload["props"];
      if (!isPosInt(tabId)) return null;
      // Allowlist safe update fields only
      const safeProps: { url?: string; active?: boolean } = {};
      if (isObj(props)) {
        if (isStr(props["url"])) safeProps.url = props["url"];
        if (typeof props["active"] === "boolean") safeProps.active = props["active"];
      }
      return this.updateTab(tabId, safeProps);
    });

    ipcMain.handle("extensions:tabs:execute-script", async (_event, payload: unknown) => {
      if (!isObj(payload)) return null;
      const { tabId, code } = payload as { tabId: unknown; code: unknown };
      if (!isPosInt(tabId)) return null;
      if (!isStr(code) || code.length > MAX_CODE_BYTES) return null;
      return this.executeScriptOnTab(tabId, code);
    });

    ipcMain.handle("extensions:tabs:insert-css", async (_event, payload: unknown) => {
      if (!isObj(payload)) return null;
      const { tabId, css } = payload as { tabId: unknown; css: unknown };
      if (!isPosInt(tabId)) return null;
      if (!isStr(css) || css.length > MAX_CSS_BYTES) return null;
      return this.insertCssOnTab(tabId, css);
    });

    ipcMain.handle("extensions:tabs:summary", () => {
      return this.getSummary();
    });
  }

  private matchUrlPattern(url: string, pattern: string): boolean {
    if (pattern === "<all_urls>") return true;
    try {
      const rx = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*/g, ".*")
        .replace(/\\\?/g, ".");
      return new RegExp(`^${rx}$`).test(url);
    } catch {
      return false;
    }
  }
}
