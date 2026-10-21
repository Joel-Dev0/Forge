import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { app, session, ipcMain, type Session as ElectronSession } from "electron";
import { evaluateAdBlockRequest, getAdBlockShieldHtml } from "../adblock/adblockAdapter.js";
import { evaluateFocusRequest, updateFocusState, getFocusShieldHtml, type FocusStatePayload } from "../focus/socialFilterEngine.js";
import { setupCorsBypassInterceptor } from "../compat/compatManager.js";
import { ElectronPrivateSessionManager } from "../privacy/privateSessionManager.js";
import { onNewSessionPartition } from "../extensions/extensionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredSessions = new Set<string>();

/**
 * Ensures all security, privacy, adblocking, and filtering interceptors
 * are attached to an Electron session partition.
 */
export function configureSessionPartition(ses: ElectronSession, partitionName: string) {
  if (configuredSessions.has(partitionName)) return;
  configuredSessions.add(partitionName);

  // If this is a temporary private or Tor session, configure leak defenses & proxy
  if (ElectronPrivateSessionManager.getInstance().isPrivateOrTorPartition(partitionName)) {
    ElectronPrivateSessionManager.getInstance().configurePrivatePartition(ses, partitionName);
  }

  // 1. Attach Guest Preload Script
  const guestPreload = fs.existsSync(path.join(__dirname, "guestPreload.cjs"))
    ? path.join(__dirname, "guestPreload.cjs")
    : path.join(__dirname, "../guestPreload.cjs");
  if (fs.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
    } catch (err) {
      console.warn(`[SessionManager] Could not set preloads for ${partitionName}:`, err);
    }
  }

  // 2. Intercept web requests for Adblocking & Social Media Filtering
  ses.webRequest.onBeforeRequest((details, callback) => {
    try {
      // Ignore internal protocol schemes
      if (details.url.startsWith("devtools:") || details.url.startsWith("chrome-extension:")) {
        callback({});
        return;
      }

      // Check Focus Mode Social Filtering
      const focusDecision = evaluateFocusRequest(details.url);
      if (focusDecision.blocked) {
        if (details.resourceType === "mainFrame") {
          const html = getFocusShieldHtml(focusDecision.platformName || "Social Media", focusDecision.reason || "");
          callback({ redirectURL: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
          return;
        } else {
          callback({ cancel: true });
          return;
        }
      }

      // Check AdBlock Engine
      const adblock = evaluateAdBlockRequest({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        referrer: details.referrer,
      });

      if (adblock.cancel) {
        if (details.resourceType === "mainFrame") {
          const html = getAdBlockShieldHtml(
            details.url,
            adblock.decision.category || "ad",
            adblock.decision.rule?.raw
          );
          callback({ redirectURL: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
          return;
        } else {
          const lowerUrl = (details.url || "").toLowerCase();
          // Defuse Optimizely datafiles & prevent 30s onReady promise timeout on news sites
          if (lowerUrl.includes("optimizely.com") && (lowerUrl.includes("/datafiles/") || lowerUrl.includes(".json") || lowerUrl.includes("datafile"))) {
            const emptyDatafile = JSON.stringify({
              version: "4",
              rollouts: [],
              experiments: [],
              featureFlags: [],
              audiences: [],
              events: [],
              attributes: [],
              anonymizeIP: true,
              botFiltering: false,
            });
            callback({ redirectURL: `data:application/json;charset=utf-8,${encodeURIComponent(emptyDatafile)}` });
            return;
          }
          callback({ cancel: true });
          return;
        }
      }
    } catch {
      // Fail-open on unexpected parsing errors to avoid bricking normal page loads
    }

    callback({});
  });

  // 3. Attach CORS & Local Security Bypass Interceptor
  setupCorsBypassInterceptor(ses);

  // 4. Hook partition into dynamic extension session bridge
  try {
    onNewSessionPartition(partitionName, ses);
  } catch (err) {
    console.warn(`[SessionManager] Could not attach extension bridge to ${partitionName}:`, err);
  }
}

/**
 * Initializes the Session Manager and registers IPC handlers
 */
export function initSessionManager() {
  ElectronPrivateSessionManager.getInstance().registerIPC();

  // Always configure default partition immediately
  const defaultSes = session.fromPartition("persist:forge");
  configureSessionPartition(defaultSes, "persist:forge");

  // Automatically configure any new partition dynamically created by a webview
  app.on("session-created", (createdSession) => {
    try {
      // Find partition name if available
      const partition = (createdSession as any)._partition || (createdSession as any).partition || "";
      if (partition) {
        configureSessionPartition(createdSession, partition);
      }
    } catch {}
  });

  // IPC: Clear partition data (Cookies, cache, LocalStorage, IndexedDB)
  ipcMain.handle("sessions:clear-data", async (_event, partition: string, types: string[] = ["cache", "cookies", "storage"]) => {
    try {
      const targetSes = session.fromPartition(partition);
      const storages: (
        | "appcache"
        | "cookies"
        | "filesystem"
        | "indexdb"
        | "localstorage"
        | "shadercache"
        | "websql"
        | "serviceworkers"
        | "cachestorage"
      )[] = [];

      if (types.includes("cookies")) storages.push("cookies");
      if (types.includes("storage")) {
        storages.push("localstorage", "indexdb", "websql", "serviceworkers", "cachestorage");
      }

      if (storages.length > 0) {
        await targetSes.clearStorageData({ storages });
      }

      if (types.includes("cache")) {
        await targetSes.clearCache();
      }

      console.log(`[SessionManager] Cleared ${types.join(", ")} for partition ${partition}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[SessionManager] Error clearing data for ${partition}:`, err);
      return { success: false, error: err?.message };
    }
  });

  // IPC: Sync Focus Mode state from renderer
  ipcMain.handle("focus:sync-state", (_event, payload: FocusStatePayload) => {
    updateFocusState(payload);
    return true;
  });
}
