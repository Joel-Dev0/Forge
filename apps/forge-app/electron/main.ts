import { app, BrowserWindow, ipcMain, nativeTheme, nativeImage, powerMonitor, session, shell, Menu } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { executeHttpRequest } from "./engine/http/index.js";
import type { HttpRequestOptions } from "./engine/http/types.js";
import { initNetworkMonitor } from "./network/networkMonitor.js";
import { initAdBlockAdapter } from "./adblock/adblockAdapter.js";
import { initSecureNetworkAdapter } from "./network/secureNetworkAdapter.js";
import { initVpnAdapter } from "./network/vpnAdapter.js";

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
    if (!webContents.isDestroyed()) {
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
}

const recentDownloads: DownloadRecord[] = [];

function setupDownloadListeners(sess: Electron.Session) {
  sess.on("will-download", (_event, item, webContents) => {
    const filename = item.getFilename();
    const savePath = path.join(app.getPath("downloads"), filename);
    item.setSavePath(savePath);

    const record: DownloadRecord = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      path: savePath,
      size: item.getTotalBytes(),
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
      url: item.getURL(),
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
    } else if (ctrl && !shift && !alt && (key === "tab" || code === "Tab" || key === "pagedown" || code === "PageDown")) {
      action = "tab:next";
    } else if (ctrl && shift && !alt && (key === "tab" || code === "Tab" || key === "pageup" || code === "PageUp")) {
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
    } else if (!ctrl && !shift && !alt && (key === "f1" || code === "F1")) {
      action = "help:hotkeys";
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

  win.webContents.on("will-attach-webview", (_event, webPreferences) => {
    webPreferences.nodeIntegrationInSubFrames = true;
  });

  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
    if (!isIncognito) {
      updateTaskbarMediaButtons(win, false);
    }
  });

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

app.on("web-contents-created", (_event, contents) => {
  try {
    contents.setMaxListeners(50);
  } catch {}

  // Intercept hotkeys across all webviews and main windows
  registerShortcutInterception(contents);

  // CRITICAL: NEVER allow any WebContents in Forge to spawn a native OS BrowserWindow popup!
  contents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  if (contents.getType() !== "webview") return;

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

  // Filter out noisy third-party tracker subresource/iframe failures from terminal
  contents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) { // -3 is ERR_ABORTED
      console.log(`[WebView] Main frame failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    }
  });

  // Track PiP lifecycle and handle "Return to page" / "Back to tab"
  contents.on("console-message", (_event, _level, message) => {
    if (typeof message !== "string") return;

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
ipcMain.on("window:open-private", () => {
  createWindow(true);
});

ipcMain.handle("downloads:get-recent", () => recentDownloads);
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

app.whenReady().then(() => {
  // Completely disable Chromium's default application menu ("File Edit View Window")
  Menu.setApplicationMenu(null);

  // Attach download listeners and grant universal video/media permissions
  try {
    setupDownloadListeners(session.defaultSession);
    const forgeSession = session.fromPartition("persist:forge");
    setupDownloadListeners(forgeSession);
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
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
