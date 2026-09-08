import { useEffect, useRef, useState } from "react";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useNavigationStore } from "../../core/navigation/useNavigationStore";
import { useHistoryStore } from "../../core/history/useHistoryStore";
import { useConsoleStore } from "../../core/console/useConsoleStore";
import { useFullscreenStore } from "../../core/fullscreen/useFullscreenStore";
import { NewTabHome } from "./NewTabHome";

let globalGuestPreloadPath: string | undefined = undefined;
if (typeof window !== "undefined" && (window as any).forge?.adblock?.getGuestPreloadPath) {
  (window as any).forge.adblock.getGuestPreloadPath().then((p: string) => {
    globalGuestPreloadPath = p;
  }).catch(() => {});
}

interface Props {
  tabId: string;
  url: string;
  isActive: boolean;
  onRef: (tabId: string, el: WebviewElement | null) => void;
}

export function WebView({ tabId, url, isActive, onRef }: Props) {
  const ref = useRef<WebviewElement | null>(null);
  const [guestPreload, setGuestPreload] = useState<string | undefined>(globalGuestPreloadPath);

  useEffect(() => {
    if (!guestPreload && (window as any).forge?.adblock?.getGuestPreloadPath) {
      (window as any).forge.adblock.getGuestPreloadPath().then((p: string) => {
        if (p) {
          globalGuestPreloadPath = p;
          setGuestPreload(p);
        }
      }).catch(() => {});
    }
  }, [guestPreload]);
  // Persist initial URL: NEVER allow React to mutate the DOM `src` attribute on re-render.
  // Mutating `src` causes Electron to invoke GUEST_VIEW_MANAGER_CALL loadURL(),
  // which aborts in-flight SPA / video transitions (ERR_ABORTED -3) and creates an infinite reload loop.
  const initialUrl = useRef(url || "about:blank");
  const lastNavigatedUrl = useRef(url);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const updateTab = useTabsStore((s) => s.updateTab);
  const setUrlBarValue = useNavigationStore((s) => s.setUrlBarValue);
  const addEntry = useHistoryStore((s) => s.addEntry);

  useEffect(() => {
    onRef(tabId, ref.current);
    return () => onRef(tabId, null);
  }, [tabId, onRef]);

  // Handle external navigation requests (e.g. user typed a new URL in address bar or clicked bookmark)
  useEffect(() => {
    const el = ref.current;
    if (!el || !url || url === "about:blank") return;

    // Skip if the webview already navigated to this URL internally
    if (url === lastNavigatedUrl.current) return;

    try {
      const currentUrl = el.getURL();
      if (currentUrl !== url) {
        lastNavigatedUrl.current = url;
        el.loadURL(url);
      }
    } catch {
      // Element might not be attached yet
    }
  }, [url]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = () => updateTab(tabId, { isLoading: true });

    const onStop = () => {
      updateTab(tabId, {
        isLoading: false,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
    };

    const onNavigate = (e: any) => {
      const targetUrl = e.url;
      if (!targetUrl) return;

      // Record this URL so the external sync effect doesn't re-trigger loadURL
      lastNavigatedUrl.current = targetUrl;

      updateTab(tabId, {
        url: targetUrl,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });

      if (isActiveRef.current) {
        setUrlBarValue(targetUrl);
        try {
          const t = el.getTitle();
          if (t && t !== "about:blank") {
            (window as any).forge?.setTitle?.(t);
            document.title = `${t} — Forge Browser`;
          }
        } catch {}
      }

      if (targetUrl && targetUrl !== "about:blank") {
        try {
          const t = el.getTitle();
          addEntry(t || "New Tab", targetUrl);
        } catch {}
      }
    };

    const onTitle = (e: any) => {
      const title = e.title || "New Tab";
      updateTab(tabId, { title });
      if (isActiveRef.current) {
        (window as any).forge?.setTitle?.(title);
        document.title = title ? `${title} — Forge Browser` : "Forge Browser";
      }
      try {
        const currentUrl = el.getURL();
        if (currentUrl && currentUrl !== "about:blank") {
          addEntry(title, currentUrl);
        }
      } catch {}
    };

    const onFavicon = (e: any) => {
      const icon = e.favicons?.[0];
      if (icon) {
        updateTab(tabId, { favicon: icon });
        try {
          const currentUrl = el.getURL();
          if (currentUrl && currentUrl !== "about:blank") {
            addEntry(el.getTitle() || "New Tab", currentUrl, icon);
          }
        } catch {}
      }
    };

    const onFailLoad = (e: any) => {
      // Ignore ERR_ABORTED (-3) as it naturally happens when media streams redirect,
      // video segments buffer, or previous requests are superseded by the page.
      if (e.errorCode === -3) return;
      // When waking up from sleep, network adapters take 1-3 seconds to reconnect.
      // Auto-retry if disconnected during wake-up
      if (e.errorCode === -106 || e.errorCode === -105 || e.errorCode === -21) {
        setTimeout(() => {
          try {
            if (ref.current && navigator.onLine) {
              ref.current.reload();
            }
          } catch {}
        }, 2000);
      }
      console.warn(`[WebView] Failed to load ${e.validatedURL}: ${e.errorDescription} (${e.errorCode})`);
      updateTab(tabId, { isLoading: false });
    };

    const onRenderProcessGone = (e: any) => {
      console.warn(`[WebView ${tabId}] Guest render process gone: ${e.details?.reason} (${e.details?.exitCode})`);
      // When waking up from hibernation/sleep or GPU reset, auto-reload to bring the webview back to life!
      if (e.details?.reason === "crashed" || e.details?.reason === "killed" || e.details?.reason === "oom") {
        try {
          setTimeout(() => {
            if (ref.current) {
              ref.current.reload();
            }
          }, 400);
        } catch {}
      }
    };

    const onNewWindow = (e: any) => {
      e.preventDefault();
      if (!e.url) return;

      // Filter out popup ad windows
      const urlLower = e.url.toLowerCase();
      if (
        urlLower.includes("doubleclick") ||
        urlLower.includes("googlesyndication") ||
        urlLower.includes("adservice") ||
        urlLower.includes("popads") ||
        urlLower.includes("adroll") ||
        urlLower.includes("trafficjunky") ||
        urlLower.includes("exoclick") ||
        urlLower.includes("adnxs") ||
        urlLower.includes("criteo") ||
        urlLower.includes("taboola") ||
        urlLower.includes("outbrain") ||
        urlLower.includes("adsterra")
      ) {
        return;
      }

      useTabsStore.getState().openTab(e.url);
    };

    // Pipe guest page console logs to Forge Console IA & handle PiP return to page
    const onConsoleMessage = (e: any) => {
      const msg = e.message || "";
      if (typeof msg === "string" && msg.includes("__FORGE_PIP_RETURN_TO_PAGE__")) {
        useTabsStore.getState().setActiveTab(tabId);
        (window as any).forge?.restoreAndFocus?.();
        return;
      }
      if (typeof msg === "string" && (msg.includes("__FORGE_PIP_ENTER__") || msg.includes("__FORGE_PIP_LEAVE__"))) {
        return;
      }

      let level: "log" | "info" | "warn" | "error" = "log";
      if (e.level === 1) level = "warn";
      else if (e.level === 2) level = "error";
      else if (e.level === 0) level = "info";

      useConsoleStore.getState().addLog({
        level,
        message: msg,
        source: e.sourceId || "page",
        line: e.line || 1,
      });
    };

    // Inject cosmetic CSS and YouTube ad-skipper scriptlets
    const injectAdBlockProtection = async () => {
      try {
        const currentUrl = el.getURL();
        if (!currentUrl || currentUrl === "about:blank") return;

        const forgeAdblock = (window as any).forge?.adblock;
        if (!forgeAdblock) return;

        const [css, scriptlet] = await Promise.all([
          forgeAdblock.getCosmeticCSS ? forgeAdblock.getCosmeticCSS(currentUrl) : Promise.resolve(""),
          forgeAdblock.getScriptlet ? forgeAdblock.getScriptlet(currentUrl) : Promise.resolve(""),
        ]);

        if (css) {
          await el.insertCSS(css);
        }
        if (scriptlet) {
          await el.executeJavaScript(scriptlet);
        }
      } catch {}
    };

    const onEnterHtmlFullScreen = () => {
      useFullscreenStore.getState().setFullscreen(true, tabId);
    };

    const onLeaveHtmlFullScreen = () => {
      useFullscreenStore.getState().setFullscreen(false);
    };

    el.addEventListener("did-start-loading", onStart);
    el.addEventListener("did-stop-loading", onStop);
    el.addEventListener("dom-ready", injectAdBlockProtection);
    el.addEventListener("did-navigate", onNavigate);
    el.addEventListener("did-navigate-in-page", onNavigate);
    el.addEventListener("did-navigate-in-page", injectAdBlockProtection);
    el.addEventListener("page-title-updated", onTitle);
    el.addEventListener("page-favicon-updated", onFavicon);
    el.addEventListener("did-fail-load", onFailLoad);
    el.addEventListener("render-process-gone", onRenderProcessGone);
    el.addEventListener("new-window", onNewWindow);
    el.addEventListener("console-message", onConsoleMessage);
    el.addEventListener("enter-html-full-screen", onEnterHtmlFullScreen);
    el.addEventListener("leave-html-full-screen", onLeaveHtmlFullScreen);

    return () => {
      el.removeEventListener("did-start-loading", onStart);
      el.removeEventListener("did-stop-loading", onStop);
      el.removeEventListener("dom-ready", injectAdBlockProtection);
      el.removeEventListener("did-navigate", onNavigate);
      el.removeEventListener("did-navigate-in-page", onNavigate);
      el.removeEventListener("did-navigate-in-page", injectAdBlockProtection);
      el.removeEventListener("page-title-updated", onTitle);
      el.removeEventListener("page-favicon-updated", onFavicon);
      el.removeEventListener("did-fail-load", onFailLoad);
      el.removeEventListener("render-process-gone", onRenderProcessGone);
      el.removeEventListener("new-window", onNewWindow);
      el.removeEventListener("console-message", onConsoleMessage);
      el.removeEventListener("enter-html-full-screen", onEnterHtmlFullScreen);
      el.removeEventListener("leave-html-full-screen", onLeaveHtmlFullScreen);
    };
  }, [tabId, updateTab, setUrlBarValue, addEntry]);

  // Sync address bar and window title when switching tabs
  useEffect(() => {
    if (isActive) {
      try {
        const currentUrl = ref.current?.getURL();
        if (currentUrl && currentUrl !== "about:blank") {
          setUrlBarValue(currentUrl);
        } else if (url && url !== "about:blank") {
          setUrlBarValue(url);
        }
        const currentTitle = ref.current?.getTitle();
        if (currentTitle && currentTitle !== "about:blank") {
          (window as any).forge?.setTitle?.(currentTitle);
          document.title = `${currentTitle} — Forge Browser`;
        } else {
          (window as any).forge?.setTitle?.("Forge Browser");
          document.title = "Forge Browser";
        }
      } catch {
        if (url) setUrlBarValue(url);
      }
    }
  }, [isActive, url, setUrlBarValue]);

  const isBlank = !url || url === "about:blank";

  return (
    <div
      className="w-full h-full relative"
      style={{ display: isActive ? "flex" : "none" }}
    >
      {isBlank && (
        <div className="absolute inset-0 z-10">
          <NewTabHome
            onNavigate={(targetUrl) => {
              lastNavigatedUrl.current = targetUrl;
              ref.current?.loadURL(targetUrl);
              updateTab(tabId, { url: targetUrl });
              setUrlBarValue(targetUrl);
            }}
          />
        </div>
      )}
      <webview
        ref={ref as any}
        src={initialUrl.current}
        className="w-full h-full"
        style={{ display: isBlank ? "none" : "flex" }}
        partition="persist:forge"
        allowpopups={true}
        allowFullScreen={true}
        preload={guestPreload || globalGuestPreloadPath}
      />
    </div>
  );
}