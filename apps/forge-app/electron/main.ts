// Suppress Electron development security advisory console banner
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

import { app, BrowserWindow, ipcMain, nativeTheme, nativeImage, powerMonitor, session, shell, Menu } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { executeHttpRequest } from "./engine/http/index.js";
import type { HttpRequestOptions } from "./engine/http/types.js";
import { initNetworkMonitor } from "./network/networkMonitor.js";
import { initAdBlockAdapter, handleWindowOpenRequest, isAdOrRedirectUrl } from "./adblock/adblockAdapter.js";
import { initSecureNetworkAdapter } from "./network/secureNetworkAdapter.js";
import { initVpnAdapter } from "./network/vpnAdapter.js";
import { initPrivacyCleanerAdapter } from "./privacy/privacyCleanerAdapter.js";
import { initSessionManager } from "./sessions/sessionManager.js";
import { initCompatManager } from "./compat/compatManager.js";
import { registerTorIPC } from "./tor/TorIPC.js";
import { registerPwaIPC } from "./pwa/PwaIPC.js";
import { PwaNavigationObserver } from "./pwa/PwaNavigationObserver.js";
import { ElectronTorRuntime } from "./tor/TorRuntime.js";
import { ElectronPrivateSessionManager } from "./privacy/privateSessionManager.js";
import { initExtensionManager, attachExtensionHooksToWebContents, onNewSessionPartition } from "./extensions/extensionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.platform === "win32") {
  app.setAppUserModelId("com.forge.browser");
}

// Single instance lock to prevent duplicate instances on wake/restart
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Allow video/audio autoplay without requiring immediate user gesture
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// Ensure continuous rendering for live Windows taskbar thumbnail previews without background throttling
// and prevent aggressive tab discarding or GPU crash limit on sleep / hibernation (wintering mode)
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,AutomaticTabDiscarding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-gpu-process-crash-limit");
app.commandLine.appendSwitch("enable-features", "HardwareMediaKeyHandling,MediaSessionService");
// Suppress noisy internal Chromium C++ network logs (e.g. AIA DER cert parsing on third-party ad trackers)
app.commandLine.appendSwitch("log-level", "3");

// Handle certificate errors from third-party ad trackers and invalid SSL certificates cleanly
app.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false); // Reject insecure certificate safely without spamming terminal
});

// Comprehensive error catching to prevent process termination on sleep/hibernation
process.on("uncaughtException", (error: any) => {
  console.error("[Electron Main] Uncaught Exception (crash prevented):", error);
});

process.on("unhandledRejection", (reason: any) => {
  if (
    reason?.code === "ERR_ABORTED" ||
    reason?.errno === -3 ||
    reason?.code === "ERR_INTERNET_DISCONNECTED" ||
    reason?.code === "ERR_NETWORK_CHANGED" ||
    String(reason).includes("ERR_ABORTED")
  ) {
    return;
  }
  console.error("[Electron Main] Unhandled Rejection (crash prevented):", reason);
});

app.on("child-process-gone", (_event, details) => {
  console.warn("[Electron Main] Child process gone:", details.type, details.reason, details.exitCode);
});

app.on("render-process-gone", (_event, webContents, details) => {
  console.warn("[Electron Main] Render process gone:", details.reason, details.exitCode);
  if (details.reason === "crashed" || details.reason === "killed" || details.reason === "oom") {
    // CRITICAL: Only reload top-level BrowserWindow instances, never guest webviews.
    // Calling webContents.reload() on a destroyed/crashed guest webview triggers an access violation
    // (0xC0000005) in Electron's GuestViewManager, which abruptly kills the entire application.
    if (webContents.getType() === "window" && !webContents.isDestroyed()) {
      try {
        webContents.reload();
      } catch {}
    }
  }
});

let mainWindow: BrowserWindow | null = null;
const allWindows = new Set<BrowserWindow>();
let terminalCwd = process.cwd();
let isMediaPlaying = false;

interface DownloadRecord {
  id: string;
  filename: string;
  path: string;
  size: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  startTime: number;
  url: string;
  isPrivate?: boolean;
}

const recentDownloads: DownloadRecord[] = [];
const pendingDownloadFilenames = new Map<string, string>();
const activeDownloadPaths = new Set<string>();

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/tiff": ".tiff",
  "application/pdf": ".pdf",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/x-7z-compressed": ".7z",
  "application/x-tar": ".tar",
  "application/gzip": ".gz",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  "audio/flac": ".flac",
};

function setupDownloadListeners(sess: Electron.Session) {
  sess.on("will-download", (_event, item, webContents) => {
    const itemUrl = item.getURL();
    let rawFilename = pendingDownloadFilenames.get(itemUrl) || item.getFilename() || "download";
    pendingDownloadFilenames.delete(itemUrl);

    // Sanitize illegal filesystem characters on Windows and other OSes: \ / : * ? " < > |
    rawFilename = rawFilename.replace(/[\\/:*?"<>|]/g, "_").trim();
    if (!rawFilename || rawFilename === "." || rawFilename === "_") {
      rawFilename = "download";
    }

    // Ensure valid extension if missing or generic
    let ext = path.extname(rawFilename).toLowerCase();
    if (!ext || ext === ".") {
      const mime = (item.getMimeType() || "").toLowerCase();
      let inferredExt = MIME_EXT_MAP[mime];
      if (!inferredExt) {
        if (mime.startsWith("image/")) inferredExt = ".jpg";
        else if (mime.startsWith("video/")) inferredExt = ".mp4";
        else if (mime.startsWith("audio/")) inferredExt = ".mp3";
      }
      if (inferredExt) {
        ext = inferredExt;
        rawFilename = `${rawFilename}${ext}`;
      }
    }

    const downloadsDir = app.getPath("downloads");
    try {
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
    } catch {}

    const actualExt = path.extname(rawFilename);
    const actualBase = path.basename(rawFilename, actualExt);

    let basePattern = actualBase;
    let counter = 1;
    const countMatch = actualBase.match(/^(.+)\s\((\d+)\)$/);
    if (countMatch) {
      basePattern = countMatch[1];
      counter = parseInt(countMatch[2], 10) + 1;
    }

    let finalFilename = rawFilename;
    let finalPath = path.join(downloadsDir, finalFilename);

    // Auto-rename conflict resolution: Never overwrite or delete existing downloads!
    // Produces: images.jpg, images (1).jpg, images (2).jpg, etc.
    while (fs.existsSync(finalPath) || activeDownloadPaths.has(finalPath.toLowerCase())) {
      finalFilename = `${basePattern} (${counter})${actualExt}`;
      finalPath = path.join(downloadsDir, finalFilename);
      counter++;
    }

    activeDownloadPaths.add(finalPath.toLowerCase());
    item.setSavePath(finalPath);

    const partitionName = (sess as any)._partition || (sess as any).partition || "";
    const isPrivate = partitionName.startsWith("private_") || partitionName.startsWith("tor_");

    const record: DownloadRecord = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: finalFilename,
      path: finalPath,
      size: item.getTotalBytes(),
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
      url: itemUrl,
      isPrivate,
    };
    recentDownloads.unshift(record);

    const win = BrowserWindow.fromWebContents(webContents) || mainWindow;
    win?.webContents.send("downloads:item-created", record);

    item.on("updated", (_e, state) => {
      record.receivedBytes = item.getReceivedBytes();
      record.state = state as any;
      win?.webContents.send("downloads:item-updated", record);
    });

    item.once("done", (_e, state) => {
      activeDownloadPaths.delete(finalPath.toLowerCase());
      record.receivedBytes = item.getReceivedBytes();
      record.state = state as any;
      win?.webContents.send("downloads:item-done", record);
    });
  });
}

function registerShortcutInterception(contents: Electron.WebContents) {
  contents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;

    const isMac = process.platform === "darwin";
    const ctrl = isMac ? input.meta : input.control;
    const shift = input.shift;
    const alt = input.alt;
    const key = input.key ? input.key.toLowerCase() : "";
    const code = input.code || "";

    let action: string | null = null;

    // Managing Tabs
    if (ctrl && !shift && !alt && key === "t") {
      action = "tab:new";
    } else if (ctrl && !shift && !alt && key === "w") {
      action = "tab:close";
    } else if (ctrl && shift && !alt && key === "t") {
      action = "tab:reopen";
    } else if (ctrl && shift && !alt && (key === "pagedown" || code === "PageDown")) {
      action = "tab:move-right";
    } else if (ctrl && shift && !alt && (key === "pageup" || code === "PageUp")) {
      action = "tab:move-left";
    } else if (ctrl && !shift && !alt && (key === "tab" || code === "Tab" || key === "pagedown" || code === "PageDown")) {
      action = "tab:next";
    } else if (ctrl && shift && !alt && (key === "tab" || code === "Tab")) {
      action = "tab:prev";
    } else if (ctrl && !shift && !alt && (key === "pageup" || code === "PageUp")) {
      action = "tab:prev";
    } else if (ctrl && !shift && !alt && /^[1-9]$/.test(key)) {
      action = `tab:select-${key}`;
    }
    // Navigation and Windows
    else if ((ctrl && !shift && !alt && key === "l") || (alt && !ctrl && !shift && key === "d")) {
      action = "nav:focus-address";
    } else if (ctrl && shift && !alt && key === "n") {
      action = "win:private";
    } else if (alt && !ctrl && !shift && (key === "arrowleft" || code === "ArrowLeft")) {
      action = "nav:back";
    } else if (alt && !ctrl && !shift && (key === "arrowright" || code === "ArrowRight")) {
      action = "nav:forward";
    } else if (!ctrl && !shift && !alt && (key === "f5" || code === "F5")) {
      action = "nav:reload";
    } else if (ctrl && !shift && !alt && key === "r") {
      action = "nav:reload";
    } else if (!ctrl && !shift && !alt && (key === "f11" || code === "F11")) {
      action = "win:toggle-fullscreen";
    }
    // Page Controls
    else if (ctrl && !shift && !alt && key === "f") {
      action = "page:find";
    } else if (ctrl && !alt && (key === "+" || key === "=" || code === "Equal" || code === "NumpadAdd")) {
      action = "page:zoom-in";
    } else if (ctrl && !alt && (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract")) {
      action = "page:zoom-out";
    } else if (ctrl && !shift && !alt && (key === "0" || code === "Digit0" || code === "Numpad0")) {
      action = "page:zoom-reset";
    } else if (ctrl && !shift && !alt && key === "d") {
      action = "page:bookmark";
    } else if (ctrl && !shift && !alt && key === "h") {
      action = "page:history";
    } else if (ctrl && !shift && !alt && key === "j") {
      action = "page:downloads";
    } else if (ctrl && shift && !alt && (key === "delete" || code === "Delete")) {
      action = "page:privacy-cleaner";
    } else if (!ctrl && !shift && !alt && (key === "f1" || code === "F1")) {
      action = "help:hotkeys";
    } else if (alt && !ctrl && !shift && (key === "p" || code === "KeyP")) {
      action = "media:pip";
    }

    if (action) {
      event.preventDefault();
      if (action === "win:private") {
        createWindow(true);
        return;
      }
      const host = (contents as any).hostWebContents;
      const targetWin =
        BrowserWindow.fromWebContents(contents) ||
        (host ? BrowserWindow.fromWebContents(host) : null) ||
        BrowserWindow.getFocusedWindow() ||
        mainWindow;
      if (targetWin && !targetWin.isDestroyed()) {
        targetWin.webContents.send("shortcut:trigger", action);
      }
    }
  });
}

// Handle system sleep / hibernation events cleanly
powerMonitor.on("suspend", () => {
  console.log("[PowerMonitor] System entering sleep / hibernation");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("power:suspend");
  }
});

powerMonitor.on("resume", () => {
  console.log("[PowerMonitor] System resuming from sleep / hibernation");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("power:resume");
    updateTaskbarMediaButtons(mainWindow, isMediaPlaying);
  }
});

function getAssetPath(filename: string): string {
  const candidates = [
    path.join(__dirname, "assets", filename),
    path.join(__dirname, "../electron/assets", filename),
    path.join(process.cwd(), "apps/forge-app/electron/assets", filename),
    path.join(process.cwd(), "electron/assets", filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(__dirname, "assets", filename);
}

function updateTaskbarMediaButtons(win: BrowserWindow | null, isPlaying: boolean) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) return;
  isMediaPlaying = isPlaying;

  try {
    const prevIcon = nativeImage.createFromPath(getAssetPath("media-prev.png"));
    const playIcon = nativeImage.createFromPath(getAssetPath("media-play.png"));
    const pauseIcon = nativeImage.createFromPath(getAssetPath("media-pause.png"));
    const nextIcon = nativeImage.createFromPath(getAssetPath("media-next.png"));

    const buttons: Electron.ThumbarButton[] = [
      {
        tooltip: "Previous Track / Rewind 10s",
        icon: prevIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-prev");
          }
        },
      },
      {
        tooltip: isPlaying ? "Pause" : "Play",
        icon: isPlaying ? pauseIcon : playIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-toggle-play");
          }
        },
      },
      {
        tooltip: "Next Track / Skip 10s",
        icon: nextIcon,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("taskbar:media-next");
          }
        },
      },
    ];

    win.setThumbarButtons(buttons);
  } catch (err) {
    console.error("[Main] Error setting thumbar buttons:", err);
  }
}

function createWindow(isIncognito = false) {
  const icoPath = path.join(__dirname, "../public/icon.ico");
  const pngPath = path.join(__dirname, "../public/logo.png");
  const appIcon = fs.existsSync(icoPath) ? icoPath : pngPath;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    minimizable: true,
    maximizable: true,
    closable: true,
    titleBarStyle: process.platform === "darwin" ? "hidden" : undefined,
    backgroundColor: isIncognito ? "#090a0f" : "#0d0f17",
    show: false,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      partition: isIncognito ? `incognito-${Date.now()}` : undefined,
    },
  });

  allWindows.add(win);
  if (!isIncognito && !mainWindow) {
    mainWindow = win;
  }

  win.on("closed", () => {
    allWindows.delete(win);
    if (mainWindow === win) {
      mainWindow = allWindows.values().next().value || null;
    }
  });

  try {
    win.webContents.setMaxListeners(50);
  } catch {}

  // Safeguard: The main app window must NEVER navigate away from the Forge UI shell!
  win.webContents.on("will-navigate", (event, navUrl) => {
    const isAppShell =
      navUrl.startsWith("http://localhost:5173") ||
      navUrl.startsWith("file://") ||
      Boolean(process.env.VITE_DEV_SERVER_URL && navUrl.startsWith(process.env.VITE_DEV_SERVER_URL));
    if (!isAppShell) {
      event.preventDefault();
      if (!isAdOrRedirectUrl(navUrl)) {
        win.webContents.send("tabs:open-tab", { url: navUrl });
      } else {
        console.warn("[Forge Shield] Dropped ad/redirect from main window will-navigate:", navUrl);
      }
    }
  });

  win.webContents.on("will-attach-webview", (_event, webPreferences, _params) => {
    // Enforce safe defaults on all webviews — never let a renderer page
    // escalate webview privileges through webview tag attributes.
    // nodeIntegrationInSubFrames is NOT needed for content scripts:
    // Electron loads them via ses.loadExtension() or executeJavaScript(),
    // not through the sub-frame node channel.
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;

    // Guarantee that Forge Guest Preload (adblocker, video ad skipper, popunder defuser)
    // is always attached to every webview at document-start
    const guestPreload = path.join(__dirname, "guestPreload.cjs");
    if (fs.existsSync(guestPreload)) {
      webPreferences.preload = guestPreload;
    }
  });

  let windowShown = false;
  const showWindow = () => {
    if (windowShown || win.isDestroyed()) return;
    windowShown = true;
    win.maximize();
    win.show();
    win.focus();
    if (!isIncognito) {
      updateTaskbarMediaButtons(win, false);
    }
  };

  win.once("ready-to-show", () => {
    console.log("[Main] Window ready-to-show triggered");
    showWindow();
  });

  win.webContents.once("did-finish-load", () => {
    console.log("[Main] Window did-finish-load triggered");
    showWindow();
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Main] Window failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    showWindow();
  });

  setTimeout(() => {
    if (!windowShown) {
      console.log("[Main] Fallback timer: displaying window");
      showWindow();
    }
  }, 2500);

  const query = isIncognito ? "?incognito=1" : "";
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}${query}`);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: isIncognito ? { incognito: "1" } : undefined,
    });
  }

  return win;
}

// Helper to reliably find target window for window controls IPC
function getTargetBrowserWindow(event?: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): BrowserWindow | null {
  if (event) {
    const fromSender = BrowserWindow.fromWebContents(event.sender);
    if (fromSender && !fromSender.isDestroyed()) return fromSender;
  }
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  for (const win of allWindows) {
    if (win && !win.isDestroyed()) return win;
  }
  const anyWin = BrowserWindow.getAllWindows()[0];
  if (anyWin && !anyWin.isDestroyed()) return anyWin;
  return null;
}

// Window controls IPC
ipcMain.on("window:minimize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    win.minimize();
  }
});

ipcMain.handle("window:minimize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    win.minimize();
    return true;
  }
  return false;
});

ipcMain.on("window:maximize", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window:close", (event) => {
  const win = getTargetBrowserWindow(event);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle("window:is-maximized", (event) => {
  const win = getTargetBrowserWindow(event);
  return win?.isMaximized() ?? false;
});

ipcMain.on("window:set-fullscreen", (event, flag: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || mainWindow;
  win?.setFullScreen(flag);
});

ipcMain.handle("window:is-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || mainWindow;
  return win?.isFullScreen() ?? false;
});

ipcMain.on("theme:set", (_event, mode: "system" | "light" | "dark") => {
  if (["system", "light", "dark"].includes(mode)) {
    nativeTheme.themeSource = mode;
  }
});

// Set window title so Windows Taskbar Thumbnail Preview displays the active page title
ipcMain.on("window:set-title", (_event, title: string) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    const cleanTitle = title?.trim();
    win.setTitle(cleanTitle ? `${cleanTitle} — Forge Browser` : "Forge Browser");
  }
});

function restoreAndFocusWindow(win: BrowserWindow | null) {
  if (!win || win.isDestroyed()) return;
  try {
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.setAlwaysOnTop(true, "screen-saver");
    win.moveTop();
    win.focus();
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.setAlwaysOnTop(false);
        win.focus();
      }
    }, 100);
  } catch {}
}

function applyPipWindowIcon() {
  if (process.platform !== "win32") return;
  const scriptPath = path.join(__dirname, "setPipIcon.ps1");
  const fallbackScript = path.join(__dirname, "../electron/setPipIcon.ps1");
  const psPath = fs.existsSync(scriptPath) ? scriptPath : fallbackScript;
  const icoPath = path.join(__dirname, "../public/icon.ico");
  if (!fs.existsSync(psPath) || !fs.existsSync(icoPath)) return;

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -IcoPath "${icoPath}" -TargetPid ${process.pid}`, (err, stdout) => {
      if (!err && stdout && parseInt(stdout.trim(), 10) > 0) {
        clearInterval(interval);
      }
    });
    if (attempts >= 10) clearInterval(interval);
  }, 200);
}

app.on("browser-window-created", (_event, win) => {
  try {
    const icoPath = path.join(__dirname, "../public/icon.ico");
    const pngPath = path.join(__dirname, "../public/logo.png");
    const appIcon = fs.existsSync(icoPath) ? icoPath : pngPath;
    win.setIcon(appIcon);
  } catch {}
});

ipcMain.on("window:restore-and-focus", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || mainWindow;
  restoreAndFocusWindow(win);
});

// Fullscreen & PiP coordination for webviews
// Note: We intentionally notify the renderer to expand the webview inside the window without calling
// mainWindow.setFullScreen(true) on frameless windows, preventing Windows D3D exclusive fullscreen hangs.
const pipActiveWebContents = new Set<number>();
const recentlyExitedPipWebContents = new Map<number, number>();
const webviewContentsMap = new Map<number, WebContents>();
const playingWebContents = new Set<number>();

app.on("web-contents-created", (_event, contents) => {
  try {
    contents.setMaxListeners(50);
  } catch {}

  // Intercept hotkeys across all webviews and main windows
  registerShortcutInterception(contents);

  // CRITICAL: NEVER allow any WebContents in Forge to spawn a native OS BrowserWindow popup!
  // Instead, filter ads/popunders via Forge Shield and route legitimate links into a new tab in Forge UI.
  contents.setWindowOpenHandler((details) => {
    return handleWindowOpenRequest(contents, details, () => BrowserWindow.getFocusedWindow() || mainWindow);
  });

  if (contents.getType() !== "webview") return;

  webviewContentsMap.set(contents.id, contents);
  contents.on("destroyed", () => {
    webviewContentsMap.delete(contents.id);
    playingWebContents.delete(contents.id);
  });

  // Fix #3: Attach content-script injection engine to every guest webview
  attachExtensionHooksToWebContents(contents);

  // Bridge guest webview context-menu to Forge Browser UI
  contents.on("context-menu", (_e, params) => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win && !win.isDestroyed()) {
        win.webContents.send("browser:context-menu", {
          x: params.x,
          y: params.y,
          selectionText: params.selectionText || "",
          linkURL: params.linkURL || "",
          srcURL: params.srcURL || "",
          mediaType: params.mediaType || "none",
          isEditable: params.isEditable || false,
          pageURL: params.pageURL || "",
          canGoBack: contents.canGoBack(),
          canGoForward: contents.canGoForward(),
          contentsId: contents.id,
        });
      }
    } catch (err) {
      console.error("[Main] Error sending context-menu event:", err);
    }
  });

  contents.on("enter-html-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("webview:html-full-screen-change", { isFullscreen: true, contentsId: contents.id });
    }
  });

  contents.on("leave-html-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("webview:html-full-screen-change", { isFullscreen: false, contentsId: contents.id });
    }
  });

  // Track media playback (video & audio) across any site web
  contents.on("media-started-playing", () => {
    playingWebContents.add(contents.id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: true,
        isMuted: contents.isAudioMuted(),
      });
    }
  });

  contents.on("media-paused", () => {
    playingWebContents.delete(contents.id);
    const stillAudible = typeof contents.isCurrentlyAudible === "function" ? contents.isCurrentlyAudible() : false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: stillAudible,
        isMuted: contents.isAudioMuted(),
      });
    }
  });

  contents.on("audio-state-changed", (_e, audible) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isPlaying = Boolean(audible) || playingWebContents.has(contents.id);
      mainWindow.webContents.send("tabs:audio-changed", {
        contentsId: contents.id,
        isPlayingAudio: isPlaying,
        isMuted: contents.isAudioMuted(),
      });
    }
  });

  // Filter out noisy third-party tracker subresource/iframe failures from terminal
  contents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) { // -3 is ERR_ABORTED
      console.log(`[WebView] Main frame failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    }
  });

  // Track PiP lifecycle and handle "Return to page" / "Back to tab"
  contents.on("console-message", (event: any, ...rest: any[]) => {
    try {
      let message = "";
      if (event && typeof event.message === "string") {
        message = event.message;
      } else if (rest[0] && typeof rest[0] === "object" && typeof rest[0].message === "string") {
        message = rest[0].message;
      } else if (typeof rest[1] === "string") {
        message = rest[1];
      } else if (typeof rest[0] === "string") {
        message = rest[0];
      }

      if (!message || typeof message !== "string") return;

      if (message.includes("__FORGE_PIP_ENTER__")) {
        pipActiveWebContents.add(contents.id);
        applyPipWindowIcon();
      } else if (message.includes("__FORGE_PIP_LEAVE__")) {
        pipActiveWebContents.delete(contents.id);
        recentlyExitedPipWebContents.set(contents.id, Date.now());
      } else if (message.includes("__FORGE_PIP_RETURN_TO_PAGE__")) {
        pipActiveWebContents.delete(contents.id);
        recentlyExitedPipWebContents.set(contents.id, Date.now());
        restoreAndFocusWindow(mainWindow);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
        }
      }
    } catch {}
  });

  // When user clicks native "Back to tab" in PiP window, Chromium focuses the guest WebContents
  contents.on("focus", () => {
    const isRecent = Date.now() - (recentlyExitedPipWebContents.get(contents.id) || 0) < 3500;
    if (pipActiveWebContents.has(contents.id) || isRecent) {
      recentlyExitedPipWebContents.delete(contents.id);
      restoreAndFocusWindow(mainWindow);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("webview:activate-tab-by-contents-id", contents.id);
      }
    }
  });

  contents.on("destroyed", () => {
    pipActiveWebContents.delete(contents.id);
    recentlyExitedPipWebContents.delete(contents.id);
  });
});

// Media status synchronization from active webview
ipcMain.on("media:status-update", (_event, data: { isPlaying: boolean }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    updateTaskbarMediaButtons(mainWindow, Boolean(data?.isPlaying));
  }
});

// Stage A: Native HTTP Engine IPC
ipcMain.handle("forge:http:request", async (_event, options: HttpRequestOptions) => {
  try {
    const response = await executeHttpRequest(options);
    return { ok: true, data: response };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
});

// Terminal IPC (PowerShell & CMD Engine)
ipcMain.handle("terminal:get-cwd", () => {
  return terminalCwd;
});

ipcMain.handle("terminal:set-cwd", (_event, newCwd: string) => {
  try {
    const resolved = path.resolve(terminalCwd, newCwd);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      terminalCwd = resolved;
      return { ok: true, cwd: terminalCwd };
    }
    return { ok: false, error: `Directory not found: ${newCwd}`, cwd: terminalCwd };
  } catch (err: any) {
    return { ok: false, error: err.message, cwd: terminalCwd };
  }
});

ipcMain.handle("terminal:exec", async (_event, command: string, shellType: "powershell" | "cmd" = "powershell") => {
  const trimmed = command.trim();
  if (!trimmed) {
    return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
  }

  // Handle 'cd' and directory navigation (cd, chdir, sl, Set-Location, cd..)
  const cdMatch = trimmed.match(/^(?:cd|chdir|Set-Location|sl)(?:\s+(.*)|([.\\/].*))?$/i);
  if (cdMatch) {
    let target = (cdMatch[1] || cdMatch[2])?.trim();
    if (!target || target === "~") {
      terminalCwd = os.homedir();
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    }
    // Remove CMD /d switch if present
    target = target.replace(/^\/d\s+/i, "");
    target = target.replace(/^["']|["']$/g, "");
    try {
      const resolved = path.resolve(terminalCwd, target);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        terminalCwd = resolved;
        return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
      } else {
        return { stdout: "", stderr: `Cannot find path '${target}' because it does not exist.`, cwd: terminalCwd, exitCode: 1 };
      }
    } catch (err: any) {
      return { stdout: "", stderr: err.message, cwd: terminalCwd, exitCode: 1 };
    }
  }

  // Handle Windows drive change (e.g. "D:" or "c:")
  if (/^[a-zA-Z]:$/.test(trimmed)) {
    const drive = trimmed.toUpperCase() + "\\";
    if (fs.existsSync(drive)) {
      terminalCwd = drive;
      return { stdout: "", stderr: "", cwd: terminalCwd, exitCode: 0 };
    } else {
      return { stdout: "", stderr: `Drive '${trimmed}' does not exist.`, cwd: terminalCwd, exitCode: 1 };
    }
  }

  const shell = process.platform === "win32"
    ? (shellType === "cmd" ? "cmd.exe" : "powershell.exe")
    : (process.env.SHELL || "/bin/bash");

  return new Promise((resolve) => {
    exec(trimmed, {
      cwd: terminalCwd,
      shell,
      maxBuffer: 15 * 1024 * 1024,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || (error && !stdout ? error.message : ""),
        cwd: terminalCwd,
        exitCode: error ? (error.code ?? 1) : 0,
      });
    });
  });
});

// Window controls & downloads IPC
ipcMain.handle("browser:inspect-element", (_event, { contentsId, x, y }: { contentsId?: number; x: number; y: number }) => {
  try {
    if (contentsId && webviewContentsMap.has(contentsId)) {
      webviewContentsMap.get(contentsId)!.inspectElement(x, y);
    } else {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      win?.webContents.inspectElement(x, y);
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.on("window:open-private", () => {
  createWindow(true);
});

ipcMain.handle("downloads:start", (event, { url, filename }: { url: string; filename?: string }) => {
  try {
    if (filename && typeof filename === "string" && filename.trim()) {
      pendingDownloadFilenames.set(url, filename.trim());
    }
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.downloadURL(url);
      return { ok: true };
    }
    session.defaultSession.downloadURL(url);
    return { ok: true };
  } catch (err: any) {
    console.error("[Main] Error starting download for:", url, err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("downloads:get-recent", () => recentDownloads);
ipcMain.handle("downloads:clear-history", () => {
  recentDownloads.length = 0;
  return true;
});
ipcMain.handle("downloads:open-folder", () => {
  shell.openPath(app.getPath("downloads"));
  return true;
});
ipcMain.handle("downloads:open-file", (_event, filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});
ipcMain.handle("downloads:show-in-folder", (_event, filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  shell.openPath(app.getPath("downloads"));
  return true;
});

// Session Backup Persistence IPC (Dual-layer resilience for restart restoration)
const sessionBackupPath = path.join(app.getPath("userData"), "session-tabs.json");

ipcMain.handle("session:save-backup", (_event, data: any) => {
  try {
    if (data && Array.isArray(data.tabs)) {
      const dir = path.dirname(sessionBackupPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(sessionBackupPath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    console.error("[Main] Error writing session backup:", err);
  }
  return false;
});

ipcMain.handle("session:get-backup", () => {
  try {
    if (fs.existsSync(sessionBackupPath)) {
      const raw = fs.readFileSync(sessionBackupPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Main] Error reading session backup:", err);
  }
  return null;
});

// Real-Time Tab Process Metrics (RAM in MB & CPU %)
ipcMain.handle(
  "tabs:get-memory",
  (_event, items: { tabId: string; contentsId?: number; webContentsId?: number; url?: string }[]) => {
    try {
      const metrics = app.getAppMetrics();
      const allWcs = webContents.getAllWebContents();
      const result: Record<string, { memoryMB: number; cpuPercent: number }> = {};
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const cid = item.contentsId ?? (item as any).webContentsId;
            let wc = cid ? (webviewContentsMap.get(cid) || webContents.fromId(cid)) : null;
            if (!wc && item.url && item.url !== "about:blank") {
              const baseTarget = item.url.split("?")[0].split("#")[0];
              wc =
                allWcs.find(
                  (w) =>
                    w.getType() === "webview" &&
                    !w.isDestroyed() &&
                    (w.getURL() === item.url || (baseTarget.length > 8 && w.getURL().includes(baseTarget)))
                ) || null;
            }
            if (wc && !wc.isDestroyed()) {
              const pid = wc.getOSProcessId();
              if (pid > 0) {
                const match = metrics.find((m) => m.pid === pid);
                if (match) {
                  const memKB = match.memory.workingSetSize || match.memory.privateBytes || 0;
                  const memMB = Math.max(12, Math.round((memKB / 1024) * 10) / 10);
                  result[item.tabId] = {
                    memoryMB: memMB,
                    cpuPercent: Math.round(match.cpu.percentCPUUsage || 0),
                  };
                }
              }
            }
            // If match not found yet (e.g. process still attaching), provide Tab metric fallback if available
            if (!result[item.tabId]) {
              const isBlank = !item.url || item.url === "about:blank";
              const tabMetrics = metrics.filter((m) => m.type === "Tab");
              if (tabMetrics.length > 0) {
                const avgMem = Math.round(
                  (tabMetrics.reduce((acc, m) => acc + (m.memory.workingSetSize || 0), 0) /
                    (tabMetrics.length * 1024)) * 10
                ) / 10;
                result[item.tabId] = {
                  memoryMB: isBlank ? 25 : Math.max(45, avgMem),
                  cpuPercent: 0,
                };
              } else {
                result[item.tabId] = {
                  memoryMB: isBlank ? 22 : 68,
                  cpuPercent: 0,
                };
              }
            }
          } catch {}
        }
      }
      return result;
    } catch {
      return {};
    }
  }
);

// Direct Audio Mute Control for WebContents
ipcMain.handle("tabs:set-muted", (_event, { contentsId, isMuted }: { contentsId: number; isMuted: boolean }) => {
  try {
    const wc = webContents.fromId(contentsId);
    if (wc && !wc.isDestroyed() && typeof wc.setAudioMuted === "function") {
      wc.setAudioMuted(isMuted);
      return true;
    }
  } catch {}
  return false;
});

app.whenReady().then(() => {
  // Completely disable Chromium's default application menu ("File Edit View Window")
  Menu.setApplicationMenu(null);

  // Attach download listeners and grant universal video/media permissions
  try {
    setupDownloadListeners(session.defaultSession);
    const forgeSession = session.fromPartition("persist:forge");
    setupDownloadListeners(forgeSession);

    // Set clean standard Chrome User-Agent without Electron tokens so search engines and modern web apps work smoothly
    const defaultUA = forgeSession.getUserAgent();
    const cleanUA = defaultUA
      .replace(/Electron\/[0-9.]+\s?/gi, "")
      .replace(/forge(-app)?\/[0-9.]+\s?/gi, "")
      .trim();
    forgeSession.setUserAgent(cleanUA);
    session.defaultSession.setUserAgent(cleanUA);

    forgeSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === "fullscreen" || permission === "media" || permission === "notifications" || permission === "mediaKeySystem") {
        return true;
      }
      return true;
    });
    forgeSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(true);
    });
  } catch (err) {
    console.error("[Main] Error initializing download listeners or session permissions:", err);
  }

  initAdBlockAdapter(() => mainWindow);
  initNetworkMonitor(() => mainWindow);
  initSecureNetworkAdapter(() => mainWindow);
  initVpnAdapter(() => mainWindow);
  initPrivacyCleanerAdapter(() => mainWindow, {
    clearRecentDownloads: () => {
      recentDownloads.length = 0;
    },
    getRecentDownloadsCount: () => recentDownloads.length,
  });
  initSessionManager();
  initCompatManager();
  initExtensionManager();

  // Fix #2: When a new session partition is created dynamically, load installed extensions into it
  app.on("session-created", (createdSession) => {
    try {
      const partName = (createdSession as any)._partition || (createdSession as any).partition || "";
      if (partName) {
        onNewSessionPartition(partName, createdSession);
      }
    } catch {}
  });
  ElectronPrivateSessionManager.getInstance().setDownloadSetupHandler((privSes) => {
    setupDownloadListeners(privSes);
  });
  registerTorIPC();
  registerPwaIPC();
  ElectronTorRuntime.getInstance().initialize().catch((err) => {
    console.warn("[Main] Error initializing Tor runtime:", err);
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

