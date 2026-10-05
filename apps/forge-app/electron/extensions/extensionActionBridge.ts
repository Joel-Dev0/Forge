/**
 * Extension Action Bridge (Phase 6)
 *
 * Implements Chrome Extension Action / BrowserAction semantics:
 *   - chrome.action.setBadgeText({ text, tabId })
 *   - chrome.action.setBadgeBackgroundColor({ color, tabId })
 *   - chrome.action.setBadgeTextColor({ color, tabId })
 *   - chrome.action.setTitle({ title, tabId })
 *   - chrome.action.setIcon({ imageData | path, tabId })
 *   - chrome.action.onClicked
 *
 * Provides real-time badge updates to Forge's UI toolbar and calculates
 * anchored popup positioning beneath extension icons.
 */

import { ipcMain, BrowserWindow, screen } from "electron";

export interface ActionBadgeState {
  text: string;
  textColor?: string;
  backgroundColor?: string;
  title?: string;
  icon?: string;
}

export interface ExtensionActionInfo {
  extensionId: string;
  defaultBadge: ActionBadgeState;
  tabBadges: Record<number, ActionBadgeState>;
  defaultTitle: string;
  defaultPopup?: string;
}

export class ExtensionActionBridge {
  private static instance: ExtensionActionBridge;
  private actions = new Map<string, ExtensionActionInfo>();

  static getInstance(): ExtensionActionBridge {
    if (!ExtensionActionBridge.instance) {
      ExtensionActionBridge.instance = new ExtensionActionBridge();
    }
    return ExtensionActionBridge.instance;
  }

  /**
   * Register or initialize an action for an extension.
   */
  registerAction(extensionId: string, manifestAction?: any): void {
    const cleanId = extensionId.toLowerCase();
    if (this.actions.has(cleanId)) return;

    this.actions.set(cleanId, {
      extensionId: cleanId,
      defaultBadge: {
        text: "",
        backgroundColor: "#e06c75",
        textColor: "#ffffff",
      },
      tabBadges: {},
      defaultTitle: manifestAction?.default_title || "",
      defaultPopup: manifestAction?.default_popup,
    });
  }

  /**
   * Unregister an action on extension uninstall.
   */
  unregisterAction(extensionId: string): void {
    this.actions.delete(extensionId.toLowerCase());
    this.notifyBadgeChange(extensionId.toLowerCase());
  }

  /**
   * Set badge text (chrome.action.setBadgeText).
   */
  setBadgeText(extensionId: string, text: string, tabId?: number): void {
    const cleanId = extensionId.toLowerCase();
    let action = this.actions.get(cleanId);
    if (!action) {
      this.registerAction(cleanId);
      action = this.actions.get(cleanId)!;
    }

    if (typeof tabId === "number") {
      if (!action.tabBadges[tabId]) {
        action.tabBadges[tabId] = { ...action.defaultBadge };
      }
      action.tabBadges[tabId].text = text;
    } else {
      action.defaultBadge.text = text;
    }

    this.notifyBadgeChange(cleanId);
  }

  /**
   * Set badge background color (chrome.action.setBadgeBackgroundColor).
   */
  setBadgeBackgroundColor(extensionId: string, color: string, tabId?: number): void {
    const cleanId = extensionId.toLowerCase();
    let action = this.actions.get(cleanId);
    if (!action) {
      this.registerAction(cleanId);
      action = this.actions.get(cleanId)!;
    }

    if (typeof tabId === "number") {
      if (!action.tabBadges[tabId]) {
        action.tabBadges[tabId] = { ...action.defaultBadge };
      }
      action.tabBadges[tabId].backgroundColor = color;
    } else {
      action.defaultBadge.backgroundColor = color;
    }

    this.notifyBadgeChange(cleanId);
  }

  /**
   * Set action title (chrome.action.setTitle).
   */
  setTitle(extensionId: string, title: string, tabId?: number): void {
    const cleanId = extensionId.toLowerCase();
    let action = this.actions.get(cleanId);
    if (!action) {
      this.registerAction(cleanId);
      action = this.actions.get(cleanId)!;
    }

    if (typeof tabId === "number") {
      if (!action.tabBadges[tabId]) {
        action.tabBadges[tabId] = { ...action.defaultBadge };
      }
      action.tabBadges[tabId].title = title;
    } else {
      action.defaultTitle = title;
    }

    this.notifyBadgeChange(cleanId);
  }

  /**
   * Get active badge state for an extension, resolving tab override if available.
   */
  getBadgeState(extensionId: string, tabId?: number): ActionBadgeState {
    const cleanId = extensionId.toLowerCase();
    const action = this.actions.get(cleanId);
    if (!action) {
      return { text: "", backgroundColor: "#e06c75", textColor: "#ffffff" };
    }

    if (typeof tabId === "number" && action.tabBadges[tabId]) {
      return action.tabBadges[tabId];
    }
    return action.defaultBadge;
  }

  /**
   * Get all active action badges across all installed extensions.
   */
  getAllBadges(tabId?: number): Record<string, ActionBadgeState> {
    const result: Record<string, ActionBadgeState> = {};
    for (const [id] of this.actions) {
      result[id] = this.getBadgeState(id, tabId);
    }
    return result;
  }

  /**
   * Calculate optimal popup window bounds anchored directly beneath toolbar button.
   */
  calculateAnchoredBounds(
    anchor: { x: number; y: number; width: number; height: number },
    popupWidth = 380,
    popupHeight = 540
  ): { x: number; y: number; width: number; height: number } {
    const display = screen.getDisplayNearestPoint({ x: anchor.x, y: anchor.y });
    const workArea = display.workArea;

    let x = Math.round(anchor.x + anchor.width / 2 - popupWidth / 2);
    let y = Math.round(anchor.y + anchor.height + 6);

    // Clamp horizontally to workArea
    if (x + popupWidth > workArea.x + workArea.width) {
      x = workArea.x + workArea.width - popupWidth - 10;
    }
    if (x < workArea.x + 10) {
      x = workArea.x + 10;
    }

    // Clamp vertically: if not enough space below, open above
    if (y + popupHeight > workArea.y + workArea.height) {
      y = Math.max(workArea.y + 10, anchor.y - popupHeight - 6);
    }

    return { x, y, width: popupWidth, height: popupHeight };
  }

  private notifyBadgeChange(extensionId: string): void {
    const badge = this.getBadgeState(extensionId);
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("extensions:action:badge-updated", {
            extensionId,
            badge,
          });
        } catch {}
      }
    }
  }

  /**
   * Register IPC handlers for action management and badge querying.
   */
  registerIPC(): void {
    // ── Server-side validation helpers ────────────────────────────────────────
    const isExtId = (v: unknown): v is string =>
      typeof v === "string" && /^[a-z][a-z0-9]{31}$/i.test(v);
    const isStr = (v: unknown): v is string => typeof v === "string";
    const isObj = (v: unknown): v is Record<string, unknown> =>
      v !== null && typeof v === "object" && !Array.isArray(v);
    const isPosInt = (v: unknown): v is number =>
      typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v > 0;

    ipcMain.handle("extensions:action:get-all-badges", (_event, tabId?: unknown) => {
      return this.getAllBadges(isPosInt(tabId) ? tabId : undefined);
    });

    ipcMain.handle("extensions:action:get-badge", (_event, payload: unknown) => {
      if (!isObj(payload)) return { text: "", backgroundColor: "#e06c75", textColor: "#ffffff" };
      const { extensionId, tabId } = payload as Record<string, unknown>;
      if (!isExtId(extensionId)) return { text: "", backgroundColor: "#e06c75", textColor: "#ffffff" };
      return this.getBadgeState(extensionId, isPosInt(tabId) ? tabId : undefined);
    });

    ipcMain.handle("extensions:action:set-badge-text", (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false };
      const { extensionId, text, tabId } = payload as Record<string, unknown>;
      if (!isExtId(extensionId)) return { success: false, error: "Invalid extensionId" };
      const safeText = isStr(text) ? text.slice(0, 64) : "";
      this.setBadgeText(extensionId, safeText, isPosInt(tabId) ? tabId : undefined);
      return { success: true };
    });

    ipcMain.handle("extensions:action:set-badge-color", (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false };
      const { extensionId, color, tabId } = payload as Record<string, unknown>;
      if (!isExtId(extensionId)) return { success: false, error: "Invalid extensionId" };
      const safeColor = isStr(color) ? color.slice(0, 100) : "#e06c75";
      this.setBadgeBackgroundColor(extensionId, safeColor, isPosInt(tabId) ? tabId : undefined);
      return { success: true };
    });

    ipcMain.handle("extensions:action:set-title", (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false };
      const { extensionId, title, tabId } = payload as Record<string, unknown>;
      if (!isExtId(extensionId)) return { success: false, error: "Invalid extensionId" };
      const safeTitle = isStr(title) ? title.slice(0, 256) : "";
      this.setTitle(extensionId, safeTitle, isPosInt(tabId) ? tabId : undefined);
      return { success: true };
    });

    ipcMain.handle("extensions:action:set-icon", (_event, payload: unknown) => {
      if (!isObj(payload)) return { success: false };
      const { extensionId, icon, tabId } = payload as Record<string, unknown>;
      if (!isExtId(extensionId)) return { success: false, error: "Invalid extensionId" };
      this.setIcon(extensionId, isStr(icon) ? icon : "", isPosInt(tabId) ? tabId : undefined);
      return { success: true };
    });
  }
}
