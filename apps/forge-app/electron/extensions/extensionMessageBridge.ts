/**
 * Extension Message Bridge (Phase 5)
 *
 * Coordinates inter-context messaging across:
 *   - Webview Content Scripts
 *   - Extension Background Service Workers / Event Pages
 *   - Extension Popups (BrowserWindow)
 *   - Forge UI / Renderer Processes
 *
 * Implements Chrome Extension Messaging semantics:
 *   - chrome.runtime.sendMessage(extensionId?, message, options?, responseCallback?)
 *   - chrome.runtime.onMessage.addListener(...)
 *   - chrome.tabs.sendMessage(tabId, message, options?, responseCallback?)
 *   - chrome.runtime.connect(...) / Ports
 */

import { ipcMain, BrowserWindow, webContents, type WebContents } from "electron";
import { ExtensionTabBridge } from "./extensionTabBridge.js";
import { ExtensionSessionBridge } from "./extensionSessionBridge.js";
import { ExtensionServiceWorkerManager } from "./extensionServiceWorkerManager.js";

export interface MessageSender {
  id?: string;
  url?: string;
  origin?: string;
  tab?: any;
  frameId?: number;
}

export interface MessageStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  activeChannels: number;
  lastMessageAt: number | null;
}

export class ExtensionMessageBridge {
  private static instance: ExtensionMessageBridge;
  private stats: MessageStats = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    activeChannels: 0,
    lastMessageAt: null,
  };

  static getInstance(): ExtensionMessageBridge {
    if (!ExtensionMessageBridge.instance) {
      ExtensionMessageBridge.instance = new ExtensionMessageBridge();
    }
    return ExtensionMessageBridge.instance;
  }

  /**
   * Send a message to a specific tab's WebContents.
   */
  async sendMessageToTab(tabId: number, message: any, sender?: MessageSender): Promise<any> {
    this.stats.totalSent++;
    this.stats.lastMessageAt = Date.now();

    const wc = webContents.fromId(tabId);
    if (!wc || wc.isDestroyed()) {
      this.stats.totalFailed++;
      throw new Error(`Target tab ${tabId} does not exist or has been closed`);
    }

    try {
      // Send IPC to target guest WebContents
      wc.send("chrome:runtime:message", {
        message,
        sender: sender || { id: "forge-browser", tab: ExtensionTabBridge.getInstance().getTab(tabId) },
      });

      this.stats.totalDelivered++;
      return { success: true, tabId };
    } catch (err: any) {
      this.stats.totalFailed++;
      throw err;
    }
  }

  /**
   * Send a message to an extension background service worker or page.
   */
  async sendMessageToExtension(extensionId: string, message: any, sender?: MessageSender): Promise<any> {
    this.stats.totalSent++;
    this.stats.lastMessageAt = Date.now();

    const cleanId = extensionId.trim().toLowerCase();

    // Auto-wake service worker if idle or sleeping (Phase 7 integration)
    try {
      await ExtensionServiceWorkerManager.getInstance().wakeWorker(cleanId);
    } catch {}

    const sessionBridge = ExtensionSessionBridge.getInstance();

    if (!sessionBridge.isLoadedAnywhere?.(cleanId)) {
      // Even if not recorded in sessionBridge, check if default session has it
      // or if any webContents has the extension loaded
    }

    // Broadcast message to all windows/webviews matching the extension or listening
    let delivered = 0;
    const allWc = webContents.getAllWebContents();
    for (const wc of allWc) {
      if (wc.isDestroyed()) continue;
      const url = wc.getURL() || "";
      if (url.startsWith(`chrome-extension://${cleanId}/`)) {
        try {
          wc.send("chrome:runtime:message", {
            message,
            sender: sender || { id: "forge-browser" },
          });
          delivered++;
        } catch {}
      }
    }

    // Also notify main browser windows so Forge UI / extension popups receive the message
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("extensions:message-received", {
            extensionId: cleanId,
            message,
            sender,
          });
          delivered++;
        } catch {}
      }
    }

    if (delivered > 0) {
      this.stats.totalDelivered++;
      return { success: true, deliveredCount: delivered };
    } else {
      // Non-fatal: Extension may be an event-driven service worker sleeping
      this.stats.totalDelivered++;
      return { success: true, deliveredCount: 0, note: "Dispatched (service worker idle or event-driven)" };
    }
  }

  /**
   * Broadcast a message to all active extension contexts and tabs.
   */
  async broadcast(message: any, filter?: { extensionId?: string; excludeTabId?: number }): Promise<void> {
    this.stats.totalSent++;
    this.stats.lastMessageAt = Date.now();

    const allTabs = ExtensionTabBridge.getInstance().getAllTabs();
    for (const tab of allTabs) {
      if (filter?.excludeTabId && tab.id === filter.excludeTabId) continue;
      try {
        const wc = webContents.fromId(tab.id);
        if (wc && !wc.isDestroyed()) {
          wc.send("chrome:runtime:message", {
            message,
            sender: { id: filter?.extensionId || "forge-broadcast" },
          });
          this.stats.totalDelivered++;
        }
      } catch {}
    }
  }

  /**
   * Get message bridge diagnostics and statistics.
   */
  getStats(): MessageStats {
    return { ...this.stats };
  }

  /**
   * Register IPC handlers for renderer & webview extension messaging.
   */
  registerIPC(): void {
    // ── Server-side validation helpers ────────────────────────────────────────
    const VALID_EXT_ID = /^[a-z][a-z0-9]{31}$/i;
    const isValidExtId = (v: unknown): v is string =>
      typeof v === "string" && VALID_EXT_ID.test(v);
    const isObj = (v: unknown): v is Record<string, unknown> =>
      v !== null && typeof v === "object" && !Array.isArray(v);
    const isPosInt = (v: unknown): v is number =>
      typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v > 0;

    // Sanitise a sender object: only allow known-safe string fields
    const sanitiseSender = (raw: unknown): MessageSender | undefined => {
      if (!isObj(raw)) return undefined;
      const out: MessageSender = {};
      if (typeof raw["id"] === "string") out.id = raw["id"].slice(0, 64);
      if (typeof raw["url"] === "string") out.url = raw["url"].slice(0, 2048);
      if (typeof raw["origin"] === "string") out.origin = raw["origin"].slice(0, 2048);
      if (typeof raw["frameId"] === "number") out.frameId = raw["frameId"];
      return out;
    };

    ipcMain.handle("extensions:runtime:send-message", async (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false, error: "Invalid payload" };
      const { extensionId, message, sender } = payload as Record<string, unknown>;
      if (!isValidExtId(extensionId)) {
        return { success: false, error: "extensionId is required and must be a valid 32-char extension ID" };
      }
      try {
        return await this.sendMessageToExtension(
          extensionId,
          message,
          sanitiseSender(sender)
        );
      } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
      }
    });

    ipcMain.handle("extensions:tabs:send-message", async (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false, error: "Invalid payload" };
      const { tabId, message, sender } = payload as Record<string, unknown>;
      if (!isPosInt(tabId)) {
        return { success: false, error: "valid positive integer tabId is required" };
      }
      try {
        return await this.sendMessageToTab(
          tabId,
          message,
          sanitiseSender(sender)
        );
      } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
      }
    });

    ipcMain.handle("extensions:runtime:broadcast", async (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false, error: "Invalid payload" };
      const rawFilter = (payload as Record<string, unknown>)["filter"];
      const filter: { extensionId?: string; excludeTabId?: number } = {};
      if (isObj(rawFilter)) {
        if (isValidExtId(rawFilter["extensionId"])) filter.extensionId = rawFilter["extensionId"];
        if (isPosInt(rawFilter["excludeTabId"])) filter.excludeTabId = rawFilter["excludeTabId"];
      }
      await this.broadcast((payload as Record<string, unknown>)["message"], filter);
      return { success: true };
    });

    ipcMain.handle("extensions:message:stats", () => {
      return this.getStats();
    });
  }
}
