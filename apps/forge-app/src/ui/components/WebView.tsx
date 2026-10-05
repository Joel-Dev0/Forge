import { useEffect, useRef, useState } from "react";
import { RotateCw, Smartphone, Tablet, Monitor, Watch, ZoomIn } from "lucide-react";
import { useTabsStore, getCleanFallbackTitle } from "../../core/tabs/useTabsStore";
import { useNavigationStore, normalizeUrl } from "../../core/navigation/useNavigationStore";
import { useHistoryStore } from "../../core/history/useHistoryStore";
import { useConsoleStore } from "../../core/console/useConsoleStore";
import { useFullscreenStore } from "../../core/fullscreen/useFullscreenStore";
import { useInspectorStore } from "../../core/inspector/useInspectorStore";
import { DEVICE_PRESETS, getPresetById } from "../../core/inspector/devicePresets.ts";
import { useCompatStore } from "../../core/compat/useCompatStore";
import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";
import { NewTabHome } from "./NewTabHome";

const getInitialGuestPreload = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as any).forge?.adblock?.guestPreloadPath;
};

let globalGuestPreloadPath: string | undefined = getInitialGuestPreload();

interface Props {
  tabId: string;
  url: string;
  isActive: boolean;
  isLazy?: boolean;
  isSleeping?: boolean;
  onRef: (tabId: string, el: WebviewElement | null) => void;
  style?: React.CSSProperties;
}

export function WebView({ tabId, url, isActive, isLazy, isSleeping, onRef, style }: Props) {
  const ref = useRef<WebviewElement | null>(null);
  const [hasActivated, setHasActivated] = useState<boolean>(() => isActive || (!isLazy && !isSleeping));
  const [guestPreload, setGuestPreload] = useState<string | undefined>(
    () => globalGuestPreloadPath || getInitialGuestPreload()
  );
  const [isDragging, setIsDragging] = useState<"right" | "bottom" | "corner" | null>(null);

  useEffect(() => {
    if (!guestPreload) {
      const syncPath = getInitialGuestPreload();
      if (syncPath) {
        globalGuestPreloadPath = syncPath;
        setGuestPreload(syncPath);
      } else if ((window as any).forge?.adblock?.getGuestPreloadPath) {
        (window as any).forge.adblock.getGuestPreloadPath().then((p: string) => {
          if (p) {
            globalGuestPreloadPath = p;
            setGuestPreload(p);
          }
        }).catch(() => {});
      }
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
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const sessionId = tab?.sessionId || "default";
  const currentSession = useSessionsStore((s) => s.getSession(sessionId));
  const partition =
    currentSession?.partition ||
    (sessionId === "private" || sessionId.startsWith("private_")
      ? "private_session_default"
      : sessionId === "tor" || sessionId.startsWith("tor_")
      ? "tor_session_default"
      : sessionId !== "default"
      ? `persist:session_${sessionId}`
      : "persist:forge");

  // Synchronize mount URL if tab goes to sleep so when waking up it loads the latest URL
  useEffect(() => {
    if (isSleeping) {
      initialUrl.current = lastNavigatedUrl.current || url || "about:blank";
    }
  }, [isSleeping, url]);

  // When a lazy/dormant/sleeping tab is activated by the user, mark it as activated and mount the webview
  useEffect(() => {
    if (isActive) {
      if (!hasActivated) {
        setHasActivated(true);
      }
      if (isLazy || isSleeping) {
        useTabsStore.getState().wakeTab(tabId);
      }
    }
  }, [isActive, hasActivated, isLazy, isSleeping, tabId]);
  const setUrlBarValue = useNavigationStore((s) => s.setUrlBarValue);
  const addEntry = useHistoryStore((s) => s.addEntry);
  const viewportMode = useInspectorStore((s) => s.viewportMode);
  const viewportOrientation = useInspectorStore((s) => s.viewportOrientation);
  const selectedDeviceId = useInspectorStore((s) => s.selectedDeviceId);
  const viewportWidth = useInspectorStore((s) => s.viewportWidth);
  const viewportHeight = useInspectorStore((s) => s.viewportHeight);
  const deviceScale = useInspectorStore((s) => s.deviceScale);
  const setViewportMode = useInspectorStore((s) => s.setViewportMode);
  const selectDevicePreset = useInspectorStore((s) => s.selectDevicePreset);
  const setViewportDimensions = useInspectorStore((s) => s.setViewportDimensions);
  const toggleViewportOrientation = useInspectorStore((s) => s.toggleViewportOrientation);
  const setDeviceScale = useInspectorStore((s) => s.setDeviceScale);

  // Synchronize simulated device User-Agent when active and viewportMode/device changes
  useEffect(() => {
    if (!isActive || !ref.current) return;
    const el = ref.current;
    try {
      if (typeof (el as any).setUserAgent === "function") {
        const preset = getPresetById(selectedDeviceId);
        if (preset?.userAgent) {
          (el as any).setUserAgent(preset.userAgent);
        } else if (viewportMode === "watch") {
          (el as any).setUserAgent(
            "Mozilla/5.0 (Apple-Watch; CPU WatchOS 10_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
          );
        } else if (viewportMode === "mobile") {
          (el as any).setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
          );
        } else if (viewportMode === "tablet") {
          (el as any).setUserAgent(
            "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
          );
        } else {
          (el as any).setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
          );
        }
      }
    } catch {}
  }, [isActive, viewportMode, selectedDeviceId]);

  useEffect(() => {
    if (hasActivated && !isSleeping) {
      onRef(tabId, ref.current);
    } else {
      onRef(tabId, null);
    }
    return () => onRef(tabId, null);
  }, [tabId, onRef, hasActivated, isSleeping]);

  // Handle external navigation requests (e.g. user typed a new URL in address bar or clicked bookmark)
  useEffect(() => {
    const el = ref.current;
    if (!el || !url || url === "about:blank") return;

    if (lastNavigatedUrl.current === url) return;
    lastNavigatedUrl.current = url;

    // Skip if already at the requested URL
    try {
      if (typeof el.getURL === "function" && el.getURL() === url) {
        return;
      }
    } catch {}

    const navigate = () => {
      try {
        if (typeof el.loadURL === "function") {
          el.loadURL(url);
        } else {
          el.setAttribute("src", url);
        }
      } catch {
        const onReady = () => {
          el.removeEventListener("dom-ready", onReady);
          try {
            if (el.getURL() !== url) {
              el.loadURL(url);
            }
          } catch {
            try { el.setAttribute("src", url); } catch {}
          }
        };
        el.addEventListener("dom-ready", onReady);
      }
    };

    navigate();
  }, [url]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const syncTitleAndFavicon = () => {
      try {
        const currentUrl = el.getURL?.() || url;
        const rawTitle = el.getTitle?.()?.trim();

        if (rawTitle && rawTitle !== "about:blank" && rawTitle !== "New Tab" && !rawTitle.startsWith("http://") && !rawTitle.startsWith("https://")) {
          updateTab(tabId, { title: rawTitle });
          if (isActiveRef.current) {
            (window as any).forge?.setTitle?.(rawTitle);
            document.title = `${rawTitle} — Forge Browser`;
          }
          if (currentUrl && currentUrl !== "about:blank") {
            addEntry(rawTitle, currentUrl);
          }
        } else {
          // Check DOM document.title directly via guest execution
          el.executeJavaScript?.("document.title")
            .then((docTitle: string) => {
              const dt = typeof docTitle === "string" ? docTitle.trim() : "";
              if (dt && dt !== "about:blank" && !dt.startsWith("http://") && !dt.startsWith("https://")) {
                updateTab(tabId, { title: dt });
                if (isActiveRef.current) {
                  (window as any).forge?.setTitle?.(dt);
                  document.title = `${dt} — Forge Browser`;
                }
                if (currentUrl && currentUrl !== "about:blank") {
                  addEntry(dt, currentUrl);
                }
              } else if (currentUrl && currentUrl !== "about:blank") {
                const fallback = getCleanFallbackTitle(currentUrl);
                if (fallback && fallback !== "New Tab") {
                  updateTab(tabId, { title: fallback });
                }
              }
            })
            .catch(() => {
              if (currentUrl && currentUrl !== "about:blank") {
                const fallback = getCleanFallbackTitle(currentUrl);
                if (fallback && fallback !== "New Tab") {
                  updateTab(tabId, { title: fallback });
                }
              }
            });
        }

        // Auto-extract favicon if missing
        if (currentUrl && currentUrl !== "about:blank") {
          const currentTab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
          if (!currentTab?.favicon) {
            try {
              const host = new URL(currentUrl).hostname;
              if (host) {
                updateTab(tabId, { favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=32` });
              }
            } catch {}
          }
        }
      } catch {}
    };

    const onStart = () => updateTab(tabId, { isLoading: true });

    const onStop = () => {
      updateTab(tabId, {
        isLoading: false,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      syncTitleAndFavicon();
    };

    const syncCwsExtensions = () => {
      try {
        const currentUrl = (el.getURL ? el.getURL() : "").toLowerCase();
        if (currentUrl.includes("chromewebstore.google.com") || currentUrl.includes("chrome.google.com")) {
          const exts = useExtensionsStore.getState().extensions;
          const extIds = exts.map((e) => e.id.toLowerCase());
          if (typeof el.executeJavaScript === "function") {
            el.executeJavaScript(`
              if (typeof window.__forge_sync_installed_extensions === "function") {
                window.__forge_sync_installed_extensions(${JSON.stringify(extIds)});
              }
            `).catch(() => {});
          }
        }
      } catch {}
    };

    const onDomReady = () => {
      syncTitleAndFavicon();
      syncCwsExtensions();
      try {
        const currentTab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
        if (currentTab?.isMuted && typeof (el as any).setAudioMuted === "function") {
          (el as any).setAudioMuted(true);
        }
      } catch {}
    };

    const onFinishLoad = () => {
      syncTitleAndFavicon();
      syncCwsExtensions();
    };

    const onNavigate = (e: any) => {
      const targetUrl = e.url;
      if (!targetUrl) return;

      // Record this URL so the external sync effect doesn't re-trigger loadURL
      lastNavigatedUrl.current = targetUrl;

      const fallbackTitle = getCleanFallbackTitle(targetUrl);
      updateTab(tabId, {
        url: targetUrl,
        title: fallbackTitle,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });

      if (isActiveRef.current) {
        setUrlBarValue(targetUrl);
      }

      syncTitleAndFavicon();
      syncCwsExtensions();
    };

    const onTitle = (e: any) => {
      const rawTitle = e.title?.trim();
      if (rawTitle && rawTitle !== "about:blank" && !rawTitle.startsWith("http://") && !rawTitle.startsWith("https://")) {
        updateTab(tabId, { title: rawTitle });
        if (isActiveRef.current) {
          (window as any).forge?.setTitle?.(rawTitle);
          document.title = `${rawTitle} — Forge Browser`;
        }
        try {
          const currentUrl = el.getURL();
          if (currentUrl && currentUrl !== "about:blank") {
            addEntry(rawTitle, currentUrl);
          }
        } catch {}
      } else {
        syncTitleAndFavicon();
      }
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
      const reason = e.details?.reason || "crashed";
      const exitCode = e.details?.exitCode;
      console.warn(`[WebView ${tabId}] Guest render process gone: ${reason} (${exitCode})`);
      useCompatStore.getState().recordCrash(tabId, url || "about:blank", reason, exitCode);
      const isAutoRestore = useCompatStore.getState().crashGuardMode === "auto-restore";
      if (isAutoRestore && (reason === "crashed" || reason === "killed" || reason === "oom")) {
        try {
          setTimeout(() => {
            if (ref.current) {
              ref.current.reload();
            }
          }, 3500);
        } catch {}
      }
    };

    const onNewWindow = async (e: any) => {
      e.preventDefault();
      const targetUrl = e.url;
      if (!targetUrl || targetUrl === "about:blank" || targetUrl.startsWith("javascript:") || targetUrl.startsWith("data:")) {
        console.warn("[Forge Shield] Dropped blank/script tab request:", targetUrl);
        return;
      }

      const urlLower = targetUrl.toLowerCase();
      const currentUrl = (typeof (ref.current as any)?.getURL === "function" ? (ref.current as any).getURL() : url) || "";

      // Quick filter for known ad networks & popunder patterns
      const isKnownAd = [
        "doubleclick", "googlesyndication", "adservice", "popads", "popcash",
        "adcash", "adroll", "trafficjunky", "trafficfactory", "exoclick", "adnxs",
        "criteo", "taboola", "outbrain", "adsterra", "propellerads", "monetag",
        "hilltopads", "richads", "clickadu", "trafficstars", "onclickprediction",
        "onclickalgo", "onclickbright", "onclickperformance", "ad2up", "ero-advertising",
        "juicyads", "yllix", "bidvertiser", "bet365", "1xbet", "redirect", "click.php",
        "track/click", "serving/ad", "adserver", "clksite", "revenuehits", "rotator",
        "popunder", "fastclick", "go.ad2up", "ad-maven", "directrev", "clkmon",
        "bestadbid", "adclicker", "runative", "syndicate", "casino", "casinon",
        "spelpaus", "zilla-networks", "zeroad", "pushsdk", "redirect-ad",
        "profitablecpmrate", "profitablegatetocontent", "highperformancegate", "highcpmgate",
        "effectivecpmgate", "realsrv", "magsrv", "xlviirdr", "pukegoocha", "whomeeno",
        "voomau", "oortous", "whounsoo", "dooloust", "shoumou", "deloplen", "grootso",
        "shukriya", "slytherin", "short.ink", "direct-link", "shrinkme", "linkvertise",
        "videobin", "clicknupload", "streamwish", "filemoon", "mixdrop", "streamvid", "mp4upload"
      ].some((k) => urlLower.includes(k));

      if (isKnownAd) {
        console.warn(`[Forge Shield] Dropped popup ad tab: ${targetUrl}`);
        return;
      }

      // Check for suspicious ad redirect paths
      const isSuspiciousPath = [
        "/click.php", "/out.php", "/track.php", "/redirect.php", "/goto.php",
        "/jump.php", "/redir.php", "/traffic/", "/rotator/", "/adclick",
        "/ad_click", "/ad-click", "/pop/click", "/clk/", "/zone/", "/dispatcher.php",
        "/serving/ad", "/track/click", "/delivery/", "/go.php", "/ad.php", "/adv.php",
        "/link.php", "/count.php", "/click/"
      ].some((p) => urlLower.includes(p));

      if (isSuspiciousPath) {
        console.warn(`[Forge Shield] Dropped suspicious ad redirect tab: ${targetUrl}`);
        return;
      }

      // Check for suspicious tracking parameters on third-party links
      try {
        const parsed = new URL(targetUrl);
        const hasTracking = [
          "click_id", "clickid", "aff_id", "affid", "subid", "sub_id",
          "zoneid", "zone_id", "banner_id", "campaign_id", "popunder"
        ].some((key) => parsed.searchParams.has(key));
        if (hasTracking && currentUrl) {
          const parsedCurrent = new URL(currentUrl);
          if (parsedCurrent.hostname !== parsed.hostname) {
            console.warn(`[Forge Shield] Dropped third-party ad click tracking tab: ${targetUrl}`);
            return;
          }
        }
      } catch {}

      // Check against AdBlock Engine with current page as referrer
      try {
        const forgeAdblock = (window as any).forge?.adblock;
        if (forgeAdblock?.evaluateRequest) {
          const result = await forgeAdblock.evaluateRequest(targetUrl, currentUrl);
          if (result?.cancel) {
            console.warn(`[Forge Shield] Dropped blocked ad tab: ${targetUrl}`);
            return;
          }
        }
      } catch {}

      // Only treat as popup if specifically requesting miniature window dimensions or disabled chrome
      const isMiniPopupWindow = Boolean(
        e.options &&
        ((e.options.width && e.options.width < 700) ||
         (e.options.height && e.options.height < 500) ||
         e.options.menubar === false ||
         e.options.toolbar === false ||
         e.options.location === false)
      );

      const isLegitimateAuth = [
        "accounts.google.com",
        "appleid.apple.com",
        "github.com/login",
        "github.com/sessions",
        "login.microsoftonline.com",
        "facebook.com/dialog",
        "facebook.com/v",
        "twitter.com/i/oauth2",
        "x.com/i/oauth2",
        "discord.com/oauth2",
        "paypal.com",
        "auth0.com",
        "okta.com",
        "checkout.stripe.com"
      ].some((domain) => urlLower.includes(domain));

      if (isMiniPopupWindow && !isLegitimateAuth) {
        console.warn(`[Forge Shield] Dropped suspicious miniature popup window: ${targetUrl}`);
        return;
      }

      useTabsStore.getState().openTab(targetUrl);
    };

    // Pipe guest page console logs to Forge Console IA & handle PiP return to page
    const onConsoleMessage = (e: any) => {
      const msg = e.message || "";
      if (typeof msg === "string" && msg.includes("__FORGE_PIP_RETURN_TO_PAGE__")) {
        useTabsStore.getState().setActiveTab(tabId);
        useFullscreenStore.getState().setFullscreen(false);
        const bridge = (window as any).forge || (window as any).electron;
        bridge?.restoreAndFocus?.();
        try {
          ref.current?.focus();
          ref.current?.executeJavaScript(`
            (function() {
              window.focus();
              function focusAndScroll(root) {
                const doc = root || document;
                const v = doc.pictureInPictureElement || doc.querySelector('video');
                if (v) {
                  v.focus?.();
                  v.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                  return true;
                }
                const iframes = doc.querySelectorAll('iframe');
                for (let i = 0; i < iframes.length; i++) {
                  try {
                    if (iframes[i].contentDocument && focusAndScroll(iframes[i].contentDocument)) return true;
                  } catch(e) {}
                  try {
                    if (iframes[i].contentWindow) {
                      iframes[i].contentWindow.postMessage({ type: '__FORGE_FOCUS_VIDEO__' }, '*');
                    }
                  } catch(e) {}
                }
                return false;
              }
              focusAndScroll();
            })()
          `).catch(() => {});
        } catch {}
        return;
      }
      if (typeof msg === "string" && (msg.includes("__FORGE_PIP_ENTER__") || msg.includes("__FORGE_PIP_LEAVE__"))) {
        return;
      }

      if (typeof msg === "string" && msg.includes("__FORGE_REQUEST_INSTALLED_EXTENSIONS__")) {
        try {
          const exts = useExtensionsStore.getState().extensions;
          const extIds = exts.map((e) => e.id.toLowerCase());
          if (typeof el.executeJavaScript === "function") {
            el.executeJavaScript(`
              if (typeof window.__forge_sync_installed_extensions === "function") {
                window.__forge_sync_installed_extensions(${JSON.stringify(extIds)});
              }
            `).catch(() => {});
          }
        } catch {}
        return;
      }

      if (typeof msg === "string" && msg.includes("__FORGE_EXT_INSTALL__:")) {
        try {
          const raw = msg.split("__FORGE_EXT_INSTALL__:")[1]?.trim();
          if (raw) {
            const extData = JSON.parse(raw);
            if (extData?.id) {
              useExtensionsStore.getState().installFromWebStoreUrl(extData.url || extData.id, {
                name: extData.name,
                iconUrl: extData.iconUrl,
              }).then((res: { success: boolean; message: string }) => {
                if (res.success) {
                  if (typeof el.executeJavaScript === "function") {
                    el.executeJavaScript(`
                      if (typeof window.__forge_mark_extension_installed === "function") {
                        window.__forge_mark_extension_installed(${JSON.stringify(extData.id.toLowerCase())}, true);
                      }
                    `).catch(() => {});
                  }
                  window.dispatchEvent(
                    new CustomEvent("forge:toast", {
                      detail: res.message || `✓ Installed extension into Forge!`,
                    })
                  );
                } else {
                  if (typeof el.executeJavaScript === "function") {
                    el.executeJavaScript(`
                      if (typeof window.__forge_mark_extension_installed === "function") {
                        window.__forge_mark_extension_installed(${JSON.stringify(extData.id.toLowerCase())}, false);
                      }
                    `).catch(() => {});
                  }
                  window.dispatchEvent(
                    new CustomEvent("forge:toast", {
                      detail: `Failed to install extension: ${res.message}`,
                    })
                  );
                }
              }).catch((err: any) => {
                if (typeof el.executeJavaScript === "function") {
                  el.executeJavaScript(`
                    if (typeof window.__forge_mark_extension_installed === "function") {
                      window.__forge_mark_extension_installed(${JSON.stringify(extData.id.toLowerCase())}, false);
                    }
                  `).catch(() => {});
                }
                window.dispatchEvent(
                  new CustomEvent("forge:toast", {
                    detail: `Failed to install extension: ${err?.message || err}`,
                  })
                );
              });
            }
          }
        } catch (err) {
          console.warn("[Forge Extension Install Error]", err);
        }
        return;
      }

      if (typeof msg === "string" && msg.includes("__FORGE_EXT_UNINSTALL__:")) {
        try {
          const raw = msg.split("__FORGE_EXT_UNINSTALL__:")[1]?.trim();
          if (raw) {
            const extData = JSON.parse(raw);
            if (extData?.id) {
              useExtensionsStore.getState().uninstallExtension(extData.id.toLowerCase());
              if (typeof el.executeJavaScript === "function") {
                el.executeJavaScript(`
                  if (typeof window.__forge_mark_extension_installed === "function") {
                    window.__forge_mark_extension_installed(${JSON.stringify(extData.id.toLowerCase())}, false);
                  }
                `).catch(() => {});
              }
              window.dispatchEvent(
                new CustomEvent("forge:toast", {
                  detail: `✓ Uninstalled extension "${extData.name || extData.id}"`,
                })
              );
            }
          }
        } catch (err) {
          console.warn("[Forge Extension Uninstall Error]", err);
        }
        return;
      }

      if (typeof msg === "string" && msg.includes("__FORGE_MEDIA_STATUS__:")) {
        try {
          const raw = msg.split("__FORGE_MEDIA_STATUS__:")[1]?.trim();
          if (raw) {
            const data = JSON.parse(raw);
            useTabsStore.getState().setTabAudio(
              tabId,
              Boolean(data.isPlaying),
              Boolean(data.isMuted)
            );
          }
        } catch {}
        return;
      }

      if (typeof msg === "string") {
        if (
          msg.includes("was preloaded using link preload but not used within a few seconds") ||
          msg.includes("ResizeObserver loop completed with undelivered notifications") ||
          msg.includes("ResizeObserver loop limit exceeded")
        ) {
          return;
        }
      }

      let level: "log" | "info" | "warn" | "error" = "log";
      if (e.level === 3) level = "error";
      else if (e.level === 2) level = "warn";
      else if (e.level === 1) level = "info";
      else level = "log";

      useConsoleStore.getState().addLog({
        level,
        message: msg,
        source: e.sourceId || "page",
        line: e.line || 1,
      });
    };

    const onEnterHtmlFullScreen = () => {
      useFullscreenStore.getState().setFullscreen(true, tabId);
    };

    const onLeaveHtmlFullScreen = () => {
      useFullscreenStore.getState().setFullscreen(false);
    };

    let mediaPauseTimer: any = null;

    const onMediaStarted = () => {
      try {
        if (mediaPauseTimer) {
          clearTimeout(mediaPauseTimer);
          mediaPauseTimer = null;
        }
        const isMuted = typeof (el as any).isAudioMuted === "function" ? (el as any).isAudioMuted() : false;
        useTabsStore.getState().setTabAudio(tabId, true, isMuted);
      } catch {}
    };

    const onMediaPaused = () => {
      try {
        if (mediaPauseTimer) clearTimeout(mediaPauseTimer);
        const isMuted = typeof (el as any).isAudioMuted === "function" ? (el as any).isAudioMuted() : false;
        useTabsStore.getState().setTabAudio(tabId, false, isMuted);
      } catch {}
    };

    el.addEventListener("did-start-loading", onStart);
    el.addEventListener("did-stop-loading", onStop);
    el.addEventListener("dom-ready", onDomReady);
    el.addEventListener("did-finish-load", onFinishLoad);
    el.addEventListener("did-navigate", onNavigate);
    el.addEventListener("did-navigate-in-page", onNavigate);
    el.addEventListener("page-title-updated", onTitle);
    el.addEventListener("page-favicon-updated", onFavicon);
    el.addEventListener("did-fail-load", onFailLoad);
    el.addEventListener("render-process-gone", onRenderProcessGone);
    el.addEventListener("new-window", onNewWindow);
    el.addEventListener("console-message", onConsoleMessage);
    el.addEventListener("enter-html-full-screen", onEnterHtmlFullScreen);
    el.addEventListener("leave-html-full-screen", onLeaveHtmlFullScreen);
    el.addEventListener("media-started-playing", onMediaStarted);
    el.addEventListener("media-paused", onMediaPaused);

    let inactiveSilenceCount = 0;
    const audibleInterval = setInterval(() => {
      try {
        const isMuted = typeof (el as any).isAudioMuted === "function" ? (el as any).isAudioMuted() : false;
        const currentTab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
        if (currentTab?.isPlayingAudio) {
          const isAudible = typeof (el as any).isCurrentlyAudible === "function" ? (el as any).isCurrentlyAudible() : false;
          if (isAudible) {
            inactiveSilenceCount = 0;
            return;
          }
          if (typeof el.executeJavaScript === "function") {
            el.executeJavaScript(
              "Boolean(Array.from(document.querySelectorAll('video, audio')).some(m => !m.paused && !m.ended))"
            )
              .then((stillPlaying: boolean) => {
                if (stillPlaying) {
                  inactiveSilenceCount = 0;
                } else {
                  inactiveSilenceCount++;
                  if (inactiveSilenceCount >= 2) {
                    useTabsStore.getState().setTabAudio(tabId, false, isMuted);
                  }
                }
              })
              .catch(() => {});
          }
        } else {
          inactiveSilenceCount = 0;
        }
      } catch {}
    }, 1500);

    return () => {
      if (mediaPauseTimer) clearTimeout(mediaPauseTimer);
      clearInterval(audibleInterval);
      el.removeEventListener("did-start-loading", onStart);
      el.removeEventListener("did-stop-loading", onStop);
      el.removeEventListener("dom-ready", onDomReady);
      el.removeEventListener("did-finish-load", onFinishLoad);
      el.removeEventListener("did-navigate", onNavigate);
      el.removeEventListener("did-navigate-in-page", onNavigate);
      el.removeEventListener("page-title-updated", onTitle);
      el.removeEventListener("page-favicon-updated", onFavicon);
      el.removeEventListener("did-fail-load", onFailLoad);
      el.removeEventListener("render-process-gone", onRenderProcessGone);
      el.removeEventListener("new-window", onNewWindow);
      el.removeEventListener("console-message", onConsoleMessage);
      el.removeEventListener("enter-html-full-screen", onEnterHtmlFullScreen);
      el.removeEventListener("leave-html-full-screen", onLeaveHtmlFullScreen);
      el.removeEventListener("media-started-playing", onMediaStarted);
      el.removeEventListener("media-paused", onMediaPaused);
    };
  }, [tabId, updateTab, setUrlBarValue, addEntry]);

  // Listen for audio mute toggle requests from TabBar
  useEffect(() => {
    const handleToggleMute = (e: Event) => {
      const customEv = e as CustomEvent<{ tabId: string; isMuted: boolean }>;
      if (customEv.detail?.tabId === tabId && ref.current) {
        const isMuted = customEv.detail.isMuted;
        try {
          if (typeof (ref.current as any).setAudioMuted === "function") {
            (ref.current as any).setAudioMuted(isMuted);
          }
        } catch {}

        try {
          if (typeof (ref.current as any).getWebContentsId === "function") {
            const wcid = (ref.current as any).getWebContentsId();
            (window as any).forge?.tabs?.setMuted?.(wcid, isMuted);
          }
        } catch {}

        try {
          ref.current
            .executeJavaScript(`
              (function() {
                try {
                  Array.from(document.querySelectorAll('video, audio')).forEach(m => {
                    m.muted = ${isMuted};
                  });
                } catch(e) {}
              })()
            `)
            .catch(() => {});
        } catch {}
      }
    };
    window.addEventListener("forge:toggle-tab-mute", handleToggleMute);
    return () => window.removeEventListener("forge:toggle-tab-mute", handleToggleMute);
  }, [tabId]);

  // Sync address bar and window title when switching tabs
  useEffect(() => {
    if (isActive) {
      try {
        const el = ref.current;
        const currentUrl = el?.getURL?.() || url;
        if (currentUrl && currentUrl !== "about:blank") {
          setUrlBarValue(currentUrl);
        } else {
          setUrlBarValue("");
        }

        const rawTitle = el?.getTitle?.()?.trim();
        if (rawTitle && rawTitle !== "about:blank" && rawTitle !== "New Tab" && !rawTitle.startsWith("http://") && !rawTitle.startsWith("https://")) {
          updateTab(tabId, { title: rawTitle });
          (window as any).forge?.setTitle?.(rawTitle);
          document.title = `${rawTitle} — Forge Browser`;
        } else if (el && typeof el.executeJavaScript === "function") {
          el.executeJavaScript("document.title")
            .then((docTitle: string) => {
              const dt = typeof docTitle === "string" ? docTitle.trim() : "";
              if (dt && dt !== "about:blank" && !dt.startsWith("http://") && !dt.startsWith("https://")) {
                updateTab(tabId, { title: dt });
                (window as any).forge?.setTitle?.(dt);
                document.title = `${dt} — Forge Browser`;
              } else if (currentUrl && currentUrl !== "about:blank") {
                const fallback = getCleanFallbackTitle(currentUrl);
                if (fallback && fallback !== "New Tab") {
                  updateTab(tabId, { title: fallback });
                  (window as any).forge?.setTitle?.(fallback);
                  document.title = `${fallback} — Forge Browser`;
                }
              }
            })
            .catch(() => {});
        } else if (currentUrl && currentUrl !== "about:blank") {
          const fallback = getCleanFallbackTitle(currentUrl);
          if (fallback && fallback !== "New Tab") {
            updateTab(tabId, { title: fallback });
            (window as any).forge?.setTitle?.(fallback);
            document.title = `${fallback} — Forge Browser`;
          }
        }
      } catch {
        if (url && url !== "about:blank") setUrlBarValue(url);
        else setUrlBarValue("");
      }
    }
  }, [isActive, url, setUrlBarValue, tabId, updateTab]);

  const handleDragStart = (e: React.PointerEvent, type: "right" | "bottom" | "corner") => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = viewportWidth;
    const startH = viewportHeight;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;
      let nextW = startW;
      let nextH = startH;

      if (type === "right" || type === "corner") {
        nextW = Math.max(180, Math.min(3840, startW + Math.round(deltaX)));
      }
      if (type === "bottom" || type === "corner") {
        nextH = Math.max(180, Math.min(2160, startH + Math.round(deltaY)));
      }
      setViewportDimensions(nextW, nextH);
    };

    const onPointerUp = () => {
      setIsDragging(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const isBlank = !url || url === "about:blank";
  const isSimulatedDevice = isActive && viewportMode !== "desktop";

  const currentPreset = getPresetById(selectedDeviceId);
  const isWatch = viewportMode === "watch";
  const isCircularWatch = isWatch && (currentPreset?.isCircular || selectedDeviceId === "galaxy-watch-6");
  const isMobile = viewportMode === "mobile";
  const isTablet = viewportMode === "tablet";
  const scaleVal = typeof deviceScale === "number" ? deviceScale : 1;

  // If this tab is sleeping / dormant and not active, do NOT mount the heavy <webview> tag into the DOM.
  // This completely unloads the renderer process and frees up system RAM to 0 MB!
  if ((isSleeping || isLazy || !hasActivated) && !isActive) {
    return (
      <div
        className="w-full h-full relative"
        style={{ display: "none" }}
      />
    );
  }

  // If active tab is waking up / activating for the first time
  if (!hasActivated) {
    return (
      <div
        className="w-full h-full relative flex items-center justify-center bg-[var(--forge-bg)] text-[var(--forge-text-muted)] select-none"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Restoring tab...</span>
        </div>
      </div>
    );
  }

  if (isSimulatedDevice) {
    return (
      <div
        className="w-full h-full relative flex flex-col items-center bg-[#07080c] overflow-hidden select-none"
        style={{ display: isActive ? "flex" : "none", ...(style || {}) }}
      >
        {/* Top Floating Simulator Control Bar */}
        <div className="w-full h-8 bg-[#0d0f17] border-b border-[var(--forge-border)] px-4 flex items-center justify-between text-[10px] text-[var(--forge-text-muted)] shrink-0 z-20">
          {/* Left: Category Icons & Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />

            {/* Quick Category Switcher */}
            <div className="flex items-center gap-0.5 bg-[var(--forge-surface)] p-0.5 rounded border border-[var(--forge-border)]">
              <button
                type="button"
                onClick={() => setViewportMode("desktop")}
                title="Desktop"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  (viewportMode as string) === "desktop" ? "bg-[var(--forge-input)] text-[#FF6B00]" : "text-[var(--forge-text-muted)] hover:text-white"
                }`}
              >
                <Monitor size={11} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("tablet")}
                title="Tablet"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewportMode === "tablet" ? "bg-[var(--forge-input)] text-[#FF6B00]" : "text-[var(--forge-text-muted)] hover:text-white"
                }`}
              >
                <Tablet size={11} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("mobile")}
                title="Mobile"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewportMode === "mobile" ? "bg-[var(--forge-input)] text-[#FF6B00]" : "text-[var(--forge-text-muted)] hover:text-white"
                }`}
              >
                <Smartphone size={11} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("watch")}
                title="Smart Watch"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewportMode === "watch" ? "bg-[var(--forge-input)] text-[#FF6B00]" : "text-[var(--forge-text-muted)] hover:text-white"
                }`}
              >
                <Watch size={11} />
              </button>
            </div>

            {/* Device Presets Dropdown */}
            <select
              value={selectedDeviceId}
              onChange={(e) => selectDevicePreset(e.target.value)}
              className="bg-[var(--forge-surface)] text-[var(--forge-text)] border border-[var(--forge-border)] rounded px-2 py-0.5 text-[10px] cursor-pointer outline-none max-w-[170px] font-sans hover:border-[#FF6B00]/60 transition-colors"
              title="Select a popular device preset"
            >
              <optgroup label="⌚ Smart Watches">
                {DEVICE_PRESETS.filter((p) => p.category === "watch").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="📱 Mobile Phones">
                {DEVICE_PRESETS.filter((p) => p.category === "mobile").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="💻 Tablets">
                {DEVICE_PRESETS.filter((p) => p.category === "tablet").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="🖥️ Laptops / Desktops">
                {DEVICE_PRESETS.filter((p) => p.category === "desktop").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </optgroup>
              {selectedDeviceId === "custom" && (
                <option value="custom">✏️ Custom ({viewportWidth}×{viewportHeight})</option>
              )}
            </select>
          </div>

          {/* Center: Manual Pixel Inputs (W × H) */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] bg-[var(--forge-surface)] px-2 py-0.5 rounded border border-[var(--forge-border)]">
            <span className="text-[var(--forge-text-muted)] font-semibold">W:</span>
            <input
              type="number"
              min={180}
              max={3840}
              value={viewportWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setViewportDimensions(val, viewportHeight);
              }}
              className="w-12 bg-transparent text-center text-[10px] text-[#FF6B00] font-bold outline-none"
              title="Manual Width in pixels"
            />
            <span className="text-[var(--forge-text-muted)]">×</span>
            <span className="text-[var(--forge-text-muted)] font-semibold">H:</span>
            <input
              type="number"
              min={180}
              max={2160}
              value={viewportHeight}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setViewportDimensions(viewportWidth, val);
              }}
              className="w-12 bg-transparent text-center text-[10px] text-[#FF6B00] font-bold outline-none"
              title="Manual Height in pixels"
            />
            <span className="text-[var(--forge-text-muted)]">px</span>
          </div>

          {/* Right: Scale Selector, Rotate, and Exit */}
          <div className="flex items-center gap-2">
            {/* Scale Selector */}
            <div className="flex items-center gap-1 bg-[var(--forge-surface)] px-1.5 py-0.5 rounded border border-[var(--forge-border)]">
              <ZoomIn size={10} className="text-[var(--forge-text-muted)]" />
              <select
                value={scaleVal}
                onChange={(e) => setDeviceScale(parseFloat(e.target.value))}
                className="bg-transparent text-[var(--forge-text)] text-[10px] outline-none cursor-pointer"
                title="Display Zoom / Scale factor"
              >
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
            </div>

            <button
              type="button"
              onClick={toggleViewportOrientation}
              title={`Rotate Orientation (currently ${viewportOrientation})`}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-white text-[10px] transition-colors cursor-pointer"
            >
              <RotateCw size={10} />
              <span>Rotate</span>
            </button>

            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              title="Exit Device Mode & return to full Desktop viewport"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] text-[10px] font-semibold transition-colors cursor-pointer"
            >
              <Monitor size={10} />
              <span>Exit Device Mode</span>
            </button>
          </div>
        </div>

        {/* Centered Device Chassis Frame Container */}
        <div className="flex-1 w-full overflow-auto flex items-center justify-center p-4 sm:p-8 bg-[#07080c]">
          <div
            className="transition-transform duration-150 origin-center"
            style={{
              transform: `scale(${scaleVal})`,
            }}
          >
            {/* Device Frame Body */}
            <div
              className={`relative flex flex-col transition-all duration-200 shadow-[0_25px_60px_rgba(0,0,0,0.9)] ${
                isCircularWatch
                  ? "rounded-full p-4 bg-gradient-to-b from-[#2e3343] via-[#1c1f2b] to-[#13151f] border-2 border-[#434b60]"
                  : isWatch
                  ? "rounded-[46px] p-3.5 bg-gradient-to-b from-[#2e3343] via-[#1c1f2b] to-[#13151f] border-2 border-[#434b60]"
                  : isMobile
                  ? "rounded-[38px] p-2.5 bg-gradient-to-b from-[#1f2330] to-[#12141c] border-2 border-[#313749]"
                  : isTablet
                  ? "rounded-[22px] p-3 bg-[#161823] border-2 border-[#2c3244]"
                  : "rounded-[14px] p-2 bg-[#161823] border border-[#2c3244]"
              }`}
              style={{
                width: `${viewportWidth + (isCircularWatch ? 32 : isWatch ? 28 : isMobile ? 20 : isTablet ? 24 : 16)}px`,
                height: `${viewportHeight + (isCircularWatch ? 32 : isWatch ? 28 : isMobile ? 20 : isTablet ? 24 : 16)}px`,
              }}
            >
              {/* ================= SMART WATCH DETAILS ================= */}
              {isWatch && (
                <>
                  {/* Top Strap Lug */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-3 bg-[#161822] rounded-t-md border-t border-[#343b4f] z-10 pointer-events-none" />
                  {/* Bottom Strap Lug */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-3 bg-[#161822] rounded-b-md border-b border-[#343b4f] z-10 pointer-events-none" />
                  {/* Digital Crown on upper right */}
                  <div className="absolute -right-3 top-10 w-2.5 h-9 bg-gradient-to-b from-[#4b536c] via-[#757f9e] to-[#4b536c] rounded-r-xs border border-[#596381] shadow-md z-10 pointer-events-none flex flex-col justify-between py-1">
                    <div className="h-0.5 bg-[#2a2e3d]" />
                    <div className="h-0.5 bg-[#2a2e3d]" />
                    <div className="h-0.5 bg-[#2a2e3d]" />
                  </div>
                  {/* Flush Action Button on lower right */}
                  <div className="absolute -right-2 top-24 w-1.5 h-7 bg-[#343949] rounded-r-xs border border-[#485066] z-10 pointer-events-none" />
                </>
              )}

              {/* ================= PHONE DETAILS ================= */}
              {isMobile && viewportOrientation === "portrait" && (
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 pointer-events-none flex items-center justify-between px-3">
                  <div className="w-2 h-2 rounded-full bg-[#14161f]" />
                  <div className="w-8 h-1 rounded-full bg-[#14161f]" />
                </div>
              )}

              {/* ================= TABLET DETAILS ================= */}
              {isTablet && (
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#262b3b] rounded-full z-30 pointer-events-none" />
              )}

              {/* Inner Screen Container */}
              <div
                className={`w-full h-full overflow-hidden relative flex-1 ${
                  isCircularWatch
                    ? "rounded-full bg-black"
                    : isWatch
                    ? "rounded-[34px] bg-black"
                    : isMobile
                    ? "rounded-[28px] bg-white"
                    : isTablet
                    ? "rounded-[14px] bg-white"
                    : "rounded-[8px] bg-white"
                }`}
              >
                {isBlank && (
                  <div className="absolute inset-0 z-10 bg-[var(--forge-bg)]">
                    <NewTabHome
                      onNavigate={(targetUrl) => {
                        const currentEngine = useNavigationStore.getState().searchEngine;
                        const cleanUrl = normalizeUrl(targetUrl, currentEngine);
                        const fallbackTitle = getCleanFallbackTitle(cleanUrl);
                        updateTab(tabId, { url: cleanUrl, title: fallbackTitle });
                        setUrlBarValue(cleanUrl);
                      }}
                    />
                  </div>
                )}
                <webview
                  ref={ref as any}
                  src={initialUrl.current}
                  className="w-full h-full"
                  style={{
                    width: `${viewportWidth}px`,
                    height: `${viewportHeight}px`,
                    visibility: isBlank ? "hidden" : "visible",
                    position: isBlank ? "absolute" : "relative",
                    pointerEvents: isBlank ? "none" : "auto",
                  }}
                  partition={partition}
                  key={`${tabId}_${sessionId}_sim`}
                  data-tab-id={tabId}
                  allowpopups={"true" as any}
                  allowFullScreen={true}
                  nodeintegrationinsubframes={"true" as any}
                  preload={guestPreload || globalGuestPreloadPath}
                />
              </div>

              {/* ================= INTERACTIVE RESIZE HANDLES ================= */}
              {/* Right edge: width resize */}
              <div
                onPointerDown={(e) => handleDragStart(e, "right")}
                title="Drag to resize width"
                className="absolute right-0 top-1/4 bottom-1/4 w-4 cursor-ew-resize flex items-center justify-center -mr-2 z-40 group"
              >
                <div className="w-1.5 h-12 rounded-full bg-[var(--forge-border)] group-hover:bg-[#FF6B00] group-hover:scale-y-125 transition-all shadow-md" />
              </div>

              {/* Bottom edge: height resize */}
              <div
                onPointerDown={(e) => handleDragStart(e, "bottom")}
                title="Drag to resize height"
                className="absolute bottom-0 left-1/4 right-1/4 h-4 cursor-ns-resize flex items-center justify-center -mb-2 z-40 group"
              >
                <div className="h-1.5 w-12 rounded-full bg-[var(--forge-border)] group-hover:bg-[#FF6B00] group-hover:scale-x-125 transition-all shadow-md" />
              </div>

              {/* Corner: both width & height */}
              <div
                onPointerDown={(e) => handleDragStart(e, "corner")}
                title="Drag to resize width and height"
                className="absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize flex items-center justify-center z-40 group"
              >
                <div className="w-3.5 h-3.5 rounded-br-md border-r-2 border-b-2 border-[var(--forge-border)] group-hover:border-[#FF6B00] group-hover:scale-125 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Drag Dimensions Floating Badge */}
        {isDragging && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-white px-3.5 py-1 rounded-full text-xs font-mono font-bold shadow-2xl z-50 animate-pulse flex items-center gap-1.5 pointer-events-none">
            <span>{viewportWidth}px</span>
            <span>×</span>
            <span>{viewportHeight}px</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative"
      style={{
        display: isActive ? "flex" : "none",
        ...(style || {}),
      }}
    >
      {isBlank && (
        <div className="absolute inset-0 z-10 bg-[var(--forge-bg)]">
          <NewTabHome
            onNavigate={(targetUrl) => {
              const currentEngine = useNavigationStore.getState().searchEngine;
              const cleanUrl = normalizeUrl(targetUrl, currentEngine);
              const fallbackTitle = getCleanFallbackTitle(cleanUrl);
              updateTab(tabId, { url: cleanUrl, title: fallbackTitle });
              setUrlBarValue(cleanUrl);
            }}
          />
        </div>
      )}
      <webview
        ref={ref as any}
        src={initialUrl.current}
        className="w-full h-full"
        style={{
          visibility: isBlank ? "hidden" : "visible",
          position: isBlank ? "absolute" : "relative",
          pointerEvents: isBlank ? "none" : "auto",
        }}
        partition={partition}
        key={`${tabId}_${sessionId}`}
        data-tab-id={tabId}
        allowpopups={"true" as any}
        allowFullScreen={true}
        nodeintegrationinsubframes={"true" as any}
        preload={guestPreload || globalGuestPreloadPath}
      />
    </div>
  );
}