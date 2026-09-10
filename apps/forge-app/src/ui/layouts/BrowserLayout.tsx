import { useCallback, useEffect, useRef, useState } from "react";
import { TitleBar } from "../components/TitleBar";
import { NavigationBar } from "../components/NavigationBar";
import { TabBar } from "../components/TabBar";
import { WebView } from "../components/WebView";
import { Sidebar } from "../components/Sidebar";
import { DevToolsBar } from "../components/DevToolsBar";
import { FindInPageBar } from "../components/FindInPageBar";
import { DownloadsModal } from "../components/DownloadsModal";
import { HotkeysModal } from "../components/HotkeysModal";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useThemeStore } from "../../core/theme/useThemeStore";
import { useFullscreenStore } from "../../core/fullscreen/useFullscreenStore";
import { useDownloadsStore } from "../../core/downloads/useDownloadsStore";
import { useBookmarksStore } from "../../core/bookmarks/useBookmarksStore";
import { Minimize2 } from "lucide-react";

export function BrowserLayout() {
  const { tabs, activeTabId, updateTab } = useTabsStore();
  const initTheme = useThemeStore((s) => s.initTheme);
  const isFullscreen = useFullscreenStore((s) => s.isFullscreen);
  const setFullscreen = useFullscreenStore((s) => s.setFullscreen);
  const webviewRefs = useRef<Map<string, WebviewElement>>(new Map());
  const [showExitHint, setShowExitHint] = useState(false);
  const exitHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [zoomBadge, setZoomBadge] = useState<number | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShortcutRef = useRef<{ action: string; time: number }>({ action: "", time: 0 });

  const triggerZoomBadge = useCallback((level: number) => {
    setZoomBadge(level);
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setZoomBadge(null), 1500);
  }, []);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const activeWebview = useCallback(() => webviewRefs.current.get(activeTabId) ?? null, [activeTabId]);

  // Cleanly exit fullscreen both in the Forge shell and in the guest webview
  const handleExitFullscreen = useCallback(() => {
    setFullscreen(false);
    const wv = activeWebview();
    if (!wv) return;

    wv.executeJavaScript(
      `
      (function() {
        // 1. YouTube specific: if YouTube player is in fullscreen mode, click button to restore
        const ytPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (ytPlayer && (ytPlayer.classList.contains('ytp-fullscreen') || document.fullscreenElement)) {
          const ytBtn = document.querySelector('.ytp-fullscreen-button');
          if (ytBtn && typeof ytBtn.click === 'function') {
            ytBtn.click();
            return;
          }
        }

        // 2. Viewport theater mode fallback
        const exitBtn = document.getElementById('__forge_btn_exit_theater');
        if (exitBtn && typeof exitBtn.click === 'function') {
          exitBtn.click();
        }

        // 3. Native document HTML5 fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      })()
    `,
      true
    ).catch(() => {});
  }, [setFullscreen, activeWebview]);

  // Toggle fullscreen mode on active webview (video or page) with userGesture=true
  const handleToggleFullscreen = useCallback(() => {
    if (useFullscreenStore.getState().isFullscreen) {
      handleExitFullscreen();
      return;
    }

    const wv = activeWebview();
    if (!wv) {
      setFullscreen(true);
      return;
    }

    wv.executeJavaScript(
      `
      (function() {
        // 1. YouTube: click native player fullscreen button with full controls & native resolution
        const ytBtn = document.querySelector('.ytp-fullscreen-button');
        if (ytBtn && typeof ytBtn.click === 'function' && document.querySelector('.html5-video-player')) {
          ytBtn.click();
          return 'youtube';
        }

        // 2. Recursive video finder across Shadow DOM and accessible iframes
        function getVideos(root) {
          const currentRoot = root || document;
          let list = [];
          try {
            const found = currentRoot.querySelectorAll('video');
            for (let i = 0; i < found.length; i++) list.push(found[i]);
          } catch(e) {}
          try {
            const treeRoot = currentRoot === document ? (document.body || document.documentElement) : currentRoot;
            if (treeRoot) {
              const allEls = treeRoot.querySelectorAll('*');
              for (let i = 0; i < allEls.length; i++) {
                if (allEls[i].shadowRoot) {
                  list = list.concat(getVideos(allEls[i].shadowRoot));
                }
              }
            }
          } catch(e) {}
          try {
            const iframes = currentRoot.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              try {
                if (iframes[i].contentDocument) {
                  list = list.concat(getVideos(iframes[i].contentDocument));
                }
              } catch(e) {}
            }
          } catch(e) {}
          return list;
        }

        const videos = getVideos();
        const targetVideo = videos.find(v => !v.paused && v.currentTime > 0) ||
                            videos.find(v => !v.paused) ||
                            videos[0];

        if (targetVideo) {
          const container = targetVideo.closest('#movie_player, .html5-video-player, [data-player], .video-js, .jwplayer, [class*="player"]') || targetVideo;
          if (container && container.requestFullscreen) {
            container.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
              targetVideo.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
            });
            return 'video_container';
          } else if (targetVideo.requestFullscreen) {
            targetVideo.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
            return 'video';
          }
        }

        // Cross-frame broadcast to child iframes
        try {
          const iframes = document.querySelectorAll('iframe');
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow) {
              iframes[i].contentWindow.postMessage({ type: '__FORGE_TOGGLE_FULLSCREEN__' }, '*');
            }
          }
        } catch(e) {}

        // 3. Fallback: Fullscreen the entire page document
        if (document.documentElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
          return 'page';
        }
        return 'none';
      })()
    `,
      true // IMPORTANT: userGesture MUST be true for Chromium to allow requestFullscreen()!
    )
      .then(() => {
        setFullscreen(true);
      })
      .catch(() => {
        setFullscreen(true);
      });
  }, [handleExitFullscreen, activeWebview, setFullscreen]);

  // Toggle Picture-in-Picture on active webview with userGesture=true
  const handleTogglePiP = useCallback(() => {
    const wv = activeWebview();
    if (!wv) return;

    wv.executeJavaScript(
      `
      (async function() {
        if (typeof window.__forge_toggle_pip === 'function') {
          try {
            await window.__forge_toggle_pip();
            return 'toggled';
          } catch(e) {}
        }

        if (document.pictureInPictureElement) {
          try {
            await document.exitPictureInPicture();
            return 'exited';
          } catch(e) {}
        }

        // Recursive video finder across Shadow DOM and accessible iframes
        function getVideos(root) {
          const currentRoot = root || document;
          let list = [];
          try {
            const found = currentRoot.querySelectorAll('video');
            for (let i = 0; i < found.length; i++) list.push(found[i]);
          } catch(e) {}
          try {
            const treeRoot = currentRoot === document ? (document.body || document.documentElement) : currentRoot;
            if (treeRoot) {
              const allEls = treeRoot.querySelectorAll('*');
              for (let i = 0; i < allEls.length; i++) {
                if (allEls[i].shadowRoot) {
                  list = list.concat(getVideos(allEls[i].shadowRoot));
                }
              }
            }
          } catch(e) {}
          try {
            const iframes = currentRoot.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              try {
                if (iframes[i].contentDocument) {
                  list = list.concat(getVideos(iframes[i].contentDocument));
                }
              } catch(e) {}
            }
          } catch(e) {}
          return list;
        }

        const allV = getVideos();
        // Prioritize playing video, then video with current progress, then largest visible video
        const target = allV.find(v => !v.paused && v.currentTime > 0 && !v.ended) ||
                       allV.find(v => !v.paused) ||
                       allV.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];

        if (target && target.requestPictureInPicture) {
          try {
            target.removeAttribute('disablepictureinpicture');
            await target.requestPictureInPicture();
            return 'entered';
          } catch(err) {
            console.warn('[Forge PiP] requestPictureInPicture error:', err);
          }
        }

        // Cross-frame broadcast to child iframes
        try {
          const iframes = document.querySelectorAll('iframe');
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow) {
              iframes[i].contentWindow.postMessage({ type: '__FORGE_TOGGLE_PIP__' }, '*');
            }
          }
        } catch(e) {}

        return 'no_video';
      })()
    `,
      true // IMPORTANT: userGesture MUST be true for Chromium to allow requestPictureInPicture()!
    ).catch(() => {});
  }, [activeWebview]);

  // Initialize theme system & system listener
  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, [initTheme]);

  // Listen for Electron IPC fullscreen sync
  useEffect(() => {
    const forge = (window as any).forge;
    if (forge?.fullscreen?.onHtmlFullScreenChange) {
      const unsub = forge.fullscreen.onHtmlFullScreenChange((data: { isFullscreen: boolean }) => {
        setFullscreen(data.isFullscreen);
      });
      return unsub;
    }
  }, [setFullscreen]);

  // Listen for PiP Return-to-Page tab activation by webContents ID from Electron main process
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.pip?.onActivateTabByContentsId) return;

    const unsub = forge.pip.onActivateTabByContentsId((contentsId: number) => {
      for (const [tabId, wv] of webviewRefs.current.entries()) {
        try {
          if (wv && typeof wv.getWebContentsId === "function" && wv.getWebContentsId() === contentsId) {
            useTabsStore.getState().setActiveTab(tabId);
            useFullscreenStore.getState().setFullscreen(false);
            try {
              wv.focus();
              wv.executeJavaScript(`
                (function() {
                  window.focus();
                  const v = document.pictureInPictureElement || document.querySelector('video');
                  if (v) {
                    v.focus?.();
                    v.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                  }
                })()
              `).catch(() => {});
            } catch {}
            forge.restoreAndFocus?.();
            break;
          }
        } catch {}
      }
    });

    return unsub;
  }, []);

  // Centralized action dispatcher for all hotkeys with deduplication to prevent double-firing
  const handleShortcutAction = useCallback(
    (action: string) => {
      const now = Date.now();
      // Debounce identical shortcuts triggered within 180ms (prevents double execution from IPC + DOM keydown)
      if (lastShortcutRef.current.action === action && now - lastShortcutRef.current.time < 180) {
        return;
      }
      lastShortcutRef.current = { action, time: now };

      const wv = activeWebview();
      switch (action) {
        // Managing Tabs
        case "tab:new":
          useTabsStore.getState().openTab();
          window.dispatchEvent(new CustomEvent("forge:focus-address-bar"));
          break;
        case "tab:close": {
          const { tabs: currentTabs, activeTabId: currentActiveId, closeTab } = useTabsStore.getState();
          if (currentTabs.length > 1) {
            closeTab(currentActiveId);
          } else {
            (window as any).forge?.close?.();
          }
          break;
        }
        case "tab:reopen":
          useTabsStore.getState().reopenClosedTab();
          break;
        case "tab:next":
          useTabsStore.getState().nextTab();
          break;
        case "tab:prev":
          useTabsStore.getState().prevTab();
          break;

        // Navigation and Windows
        case "nav:focus-address":
          window.dispatchEvent(new CustomEvent("forge:focus-address-bar"));
          break;
        case "win:private":
          (window as any).forge?.openPrivate?.();
          break;
        case "nav:back":
          if (wv && typeof wv.canGoBack === "function" && wv.canGoBack()) {
            wv.goBack();
          }
          break;
        case "nav:forward":
          if (wv && typeof wv.canGoForward === "function" && wv.canGoForward()) {
            wv.goForward();
          }
          break;
        case "nav:reload":
          if (wv && typeof wv.reload === "function") {
            wv.reload();
          }
          break;
        case "win:toggle-fullscreen":
          handleToggleFullscreen();
          break;

        // Page Controls
        case "page:find":
          setIsFindOpen((prev) => !prev);
          break;
        case "page:zoom-in":
          if (wv && typeof wv.getZoomFactor === "function") {
            wv.getZoomFactor((factor) => {
              const current = typeof factor === "number" ? factor : 1.0;
              const next = Math.min(3.0, Math.round((current + 0.1) * 10) / 10);
              wv.setZoomFactor?.(next);
              triggerZoomBadge(Math.round(next * 100));
            });
          }
          break;
        case "page:zoom-out":
          if (wv && typeof wv.getZoomFactor === "function") {
            wv.getZoomFactor((factor) => {
              const current = typeof factor === "number" ? factor : 1.0;
              const next = Math.max(0.3, Math.round((current - 0.1) * 10) / 10);
              wv.setZoomFactor?.(next);
              triggerZoomBadge(Math.round(next * 100));
            });
          }
          break;
        case "page:zoom-reset":
          if (wv && typeof wv.setZoomFactor === "function") {
            wv.setZoomFactor(1.0);
            triggerZoomBadge(100);
          }
          break;
        case "page:bookmark": {
          const active = tabs.find((t) => t.id === activeTabId);
          if (active && active.url && active.url !== "about:blank") {
            const { isBookmarked, addBookmark, removeBookmark } = useBookmarksStore.getState();
            if (isBookmarked(active.url)) {
              removeBookmark(active.url);
              triggerToast("☆ Removed from bookmarks");
            } else {
              addBookmark(active.title || active.url, active.url);
              triggerToast("★ Saved to bookmarks");
            }
          }
          break;
        }
        case "page:history":
          window.dispatchEvent(new CustomEvent("forge:open-history"));
          break;
        case "page:downloads":
          useDownloadsStore.getState().toggleOpen();
          break;
        case "help:hotkeys":
          setIsHotkeysOpen((prev) => !prev);
          break;

        default:
          if (action.startsWith("tab:select-")) {
            const num = parseInt(action.replace("tab:select-", ""), 10);
            const currentTabs = useTabsStore.getState().tabs;
            if (num === 9 && currentTabs.length > 0) {
              useTabsStore.getState().setActiveTab(currentTabs[currentTabs.length - 1].id);
            } else if (num >= 1 && num <= currentTabs.length) {
              useTabsStore.getState().setActiveTab(currentTabs[num - 1].id);
            }
          }
          break;
      }
    },
    [activeWebview, handleToggleFullscreen, tabs, activeTabId, triggerZoomBadge, triggerToast]
  );

  // Listen for shortcuts from Electron IPC (intercepted from webviews or main window)
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.shortcuts?.onTrigger) return;

    const unsub = forge.shortcuts.onTrigger((action: string) => {
      handleShortcutAction(action);
    });
    return unsub;
  }, [handleShortcutAction]);

  // Listen for open-tab events from Electron main process (e.g. legitimate target="_blank" links)
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.tabs?.onOpenTab) return;

    const unsub = forge.tabs.onOpenTab((data: { url: string }) => {
      if (data?.url) {
        useTabsStore.getState().openTab(data.url);
      }
    });
    return unsub;
  }, []);

  // Listen for custom event from TitleBar button
  useEffect(() => {
    const handler = () => setIsHotkeysOpen((prev) => !prev);
    window.addEventListener("forge:toggle-hotkeys", handler);
    return () => window.removeEventListener("forge:toggle-hotkeys", handler);
  }, []);

  // Global DOM keyboard shortcuts listener (for renderer / web fallback)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (useFullscreenStore.getState().isFullscreen) {
          handleExitFullscreen();
          return;
        }
        if (isFindOpen) {
          setIsFindOpen(false);
          return;
        }
        if (isHotkeysOpen) {
          setIsHotkeysOpen(false);
          return;
        }
      }

      // Alt+P: PiP
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handleTogglePiP();
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      let action: string | null = null;

      // Managing Tabs
      if (ctrl && !shift && !alt && key === "t") action = "tab:new";
      else if (ctrl && !shift && !alt && key === "w") action = "tab:close";
      else if (ctrl && shift && !alt && key === "t") action = "tab:reopen";
      else if (ctrl && !shift && !alt && (key === "tab" || code === "Tab" || key === "pagedown" || code === "PageDown")) action = "tab:next";
      else if (ctrl && shift && !alt && (key === "tab" || code === "Tab" || key === "pageup" || code === "PageUp")) action = "tab:prev";
      else if (ctrl && !shift && !alt && (key === "pageup" || code === "PageUp")) action = "tab:prev";
      else if (ctrl && !shift && !alt && /^[1-9]$/.test(key)) action = `tab:select-${key}`;
      // Navigation and Windows
      else if ((ctrl && !shift && !alt && key === "l") || (alt && !ctrl && !shift && key === "d")) action = "nav:focus-address";
      else if (ctrl && shift && !alt && key === "n") action = "win:private";
      else if (alt && !ctrl && !shift && (key === "arrowleft" || code === "ArrowLeft")) action = "nav:back";
      else if (alt && !ctrl && !shift && (key === "arrowright" || code === "ArrowRight")) action = "nav:forward";
      else if (!ctrl && !shift && !alt && (key === "f5" || code === "F5")) action = "nav:reload";
      else if (ctrl && !shift && !alt && key === "r") action = "nav:reload";
      else if (!ctrl && !shift && !alt && (key === "f11" || code === "F11")) action = "win:toggle-fullscreen";
      // Page Controls
      else if (ctrl && !shift && !alt && key === "f") action = "page:find";
      else if (ctrl && !alt && (key === "+" || key === "=" || code === "Equal" || code === "NumpadAdd")) action = "page:zoom-in";
      else if (ctrl && !alt && (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract")) action = "page:zoom-out";
      else if (ctrl && !shift && !alt && (key === "0" || code === "Digit0" || code === "Numpad0")) action = "page:zoom-reset";
      else if (ctrl && !shift && !alt && key === "d") action = "page:bookmark";
      else if (ctrl && !shift && !alt && key === "h") action = "page:history";
      else if (ctrl && !shift && !alt && key === "j") action = "page:downloads";
      else if (!ctrl && !shift && !alt && (key === "f1" || code === "F1")) action = "help:hotkeys";

      if (action) {
        e.preventDefault();
        handleShortcutAction(action);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExitFullscreen, handleTogglePiP, handleShortcutAction, isFindOpen, isHotkeysOpen]);

  // Sync download events from Electron
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.downloads) return;

    const unsubs: Array<() => void> = [];

    if (forge.downloads.onDownloadCreated) {
      unsubs.push(
        forge.downloads.onDownloadCreated((item: any) => {
          useDownloadsStore.getState().addItem(item);
          triggerToast(`⬇ Download started: ${item.filename}`);
        })
      );
    }
    if (forge.downloads.onDownloadUpdated) {
      unsubs.push(
        forge.downloads.onDownloadUpdated((item: any) => {
          useDownloadsStore.getState().updateItem(item);
        })
      );
    }
    if (forge.downloads.onDownloadDone) {
      unsubs.push(
        forge.downloads.onDownloadDone((item: any) => {
          useDownloadsStore.getState().updateItem(item);
          if (item.state === "completed") {
            triggerToast(`✓ Download completed: ${item.filename}`);
          }
        })
      );
    }
    if (forge.downloads.getRecent) {
      forge.downloads
        .getRecent()
        .then((recent: any[]) => {
          if (Array.isArray(recent) && recent.length > 0) {
            recent.forEach((item: any) => useDownloadsStore.getState().addItem(item));
          }
        })
        .catch(() => {});
    }

    return () => unsubs.forEach((u) => u());
  }, [triggerToast]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Synchronize window title with active page title so the Windows Taskbar Thumbnail Preview header shows the page name
  useEffect(() => {
    const forge = (window as any).forge;
    const title = activeTab?.title?.trim();
    if (title && title !== "New Tab" && title !== "about:blank") {
      forge?.setTitle?.(title);
      document.title = `${title} — Forge Browser`;
    } else {
      forge?.setTitle?.("Forge Browser");
      document.title = "Forge Browser";
    }
  }, [activeTab?.title, activeTabId]);

  // Find the webview that is actively playing media, prioritizing active tab then background tabs
  const getMediaTargetWebview = useCallback(async (): Promise<WebviewElement | null> => {
    const activeWv = activeWebview();
    if (activeWv) {
      try {
        const hasMedia = await activeWv.executeJavaScript(`
          Boolean(
            document.getElementById('movie_player') ||
            document.querySelector('[data-testid="control-button-playpause"], .playControl, .button-nfplayerPlay, .button-nfplayerPause, [data-testid="play_button_play"]') ||
            Array.from(document.querySelectorAll('video, audio')).some(m => !m.paused && m.currentTime > 0 && !m.ended) ||
            (navigator.mediaSession && navigator.mediaSession.playbackState === 'playing')
          )
        `);
        if (hasMedia) return activeWv;
      } catch {}
    }

    for (const [_, wv] of webviewRefs.current.entries()) {
      if (wv === activeWv) continue;
      try {
        const isPlaying = await wv.executeJavaScript(`
          Boolean(
            (function() {
              const yt = document.getElementById('movie_player');
              if (yt && typeof yt.getPlayerState === 'function') return yt.getPlayerState() === 1;
              if (navigator.mediaSession && navigator.mediaSession.playbackState === 'playing') return true;
              const sp = document.querySelector('[data-testid="control-button-playpause"]');
              if (sp && (sp.getAttribute('aria-label') || '').toLowerCase().includes('pause')) return true;
              return Array.from(document.querySelectorAll('video, audio')).some(m => !m.paused && m.currentTime > 0 && !m.ended);
            })()
          )
        `);
        if (isPlaying) return wv;
      } catch {}
    }

    return activeWv;
  }, [activeWebview]);

  // Hook up native Windows Taskbar thumbnail media controls (Prev, Play/Pause, Next) for ANY platform
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.media) return;

    const unsubs: (() => void)[] = [];

    // Previous track / Rewind 10s (Universal: YouTube, Spotify, SoundCloud, Deezer, HTML5 video/audio)
    unsubs.push(
      forge.media.onTaskbarMediaPrev(async () => {
        const wv = await getMediaTargetWebview();
        if (!wv) return;
        wv.executeJavaScript(`
          (function() {
            // 1. YouTube
            const yt = document.getElementById('movie_player');
            const prevBtn = document.querySelector('.ytp-prev-button');
            if (prevBtn && !prevBtn.hasAttribute('aria-disabled') && prevBtn.style.display !== 'none') {
              prevBtn.click();
              return;
            }
            if (yt && typeof yt.previousVideo === 'function' && yt.getPlaylistIndex && yt.getPlaylistIndex() > 0) {
              yt.previousVideo();
              return;
            }

            // 2. Spotify Web Player
            const spPrev = document.querySelector('[data-testid="control-button-skip-back"], button[aria-label="Previous"], button[aria-label="Anterior"]');
            if (spPrev) {
              spPrev.click();
              return;
            }

            // 3. SoundCloud
            const scPrev = document.querySelector('.skipControl__previous');
            if (scPrev) {
              scPrev.click();
              return;
            }

            // 4. Deezer
            const deezerPrev = document.querySelector('[data-testid="previous_track_button"]');
            if (deezerPrev) {
              deezerPrev.click();
              return;
            }

            // 5. Standard HTML5 <video> / <audio>
            const allMedia = Array.from(document.querySelectorAll('video, audio'));
            const media = allMedia.find(m => !m.paused) || allMedia[0];
            if (media) {
              if (media.currentTime > 3) {
                media.currentTime = Math.max(0, media.currentTime - 10);
              } else {
                media.currentTime = 0;
              }
              return;
            }

            // 6. Synthetic MediaTrackPrevious fallback
            try {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaTrackPrevious', code: 'MediaTrackPrevious', bubbles: true }));
            } catch {}
          })()
        `).catch(() => {});
      })
    );

    // Play / Pause toggle (Universal: YouTube, Spotify, SoundCloud, Netflix, Twitch, Deezer, HTML5)
    unsubs.push(
      forge.media.onTaskbarMediaTogglePlay(async () => {
        const wv = await getMediaTargetWebview();
        if (!wv) return;
        wv.executeJavaScript(`
          (function() {
            // 1. YouTube
            const yt = document.getElementById('movie_player');
            if (yt && typeof yt.getPlayerState === 'function') {
              const state = yt.getPlayerState();
              if (state === 1) {
                yt.pauseVideo();
                return false;
              } else {
                yt.playVideo();
                return true;
              }
            }

            // 2. Spotify Web Player
            const spotifyPlayBtn = document.querySelector(
              '[data-testid="control-button-playpause"], button[aria-label="Play"], button[aria-label="Pause"], button[aria-label="Reproducir"], button[aria-label="Pausa"]'
            );
            if (spotifyPlayBtn) {
              spotifyPlayBtn.click();
              return true;
            }

            // 3. SoundCloud
            const soundcloudBtn = document.querySelector('.playControl, button.playControl');
            if (soundcloudBtn) {
              soundcloudBtn.click();
              return true;
            }

            // 4. Netflix
            const netflixBtn = document.querySelector('.button-nfplayerPlay, .button-nfplayerPause');
            if (netflixBtn) {
              netflixBtn.click();
              return true;
            }

            // 5. Twitch
            const twitchBtn = document.querySelector('button[data-a-target="player-play-pause-button"]');
            if (twitchBtn) {
              twitchBtn.click();
              return true;
            }

            // 6. Deezer
            const deezerBtn = document.querySelector('[data-testid="play_button_play"], [data-testid="play_button_pause"]');
            if (deezerBtn) {
              deezerBtn.click();
              return true;
            }

            // 7. Standard HTML5 <video> / <audio> across ANY platform
            const allMedia = Array.from(document.querySelectorAll('video, audio'));
            const playing = allMedia.find(m => !m.paused && m.currentTime > 0 && !m.ended);
            if (playing) {
              playing.pause();
              return false;
            } else if (allMedia.length > 0) {
              allMedia[0].play().catch(() => {});
              return true;
            }

            // 8. Synthetic Media key fallback
            try {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', code: 'MediaPlayPause', bubbles: true }));
            } catch {}
            return false;
          })()
        `).then((isPlaying: any) => {
          forge.media?.updateStatus({ isPlaying: Boolean(isPlaying) });
        }).catch(() => {});
      })
    );

    // Next track / Skip 10s (Universal: YouTube, Spotify, SoundCloud, Deezer, HTML5 video/audio)
    unsubs.push(
      forge.media.onTaskbarMediaNext(async () => {
        const wv = await getMediaTargetWebview();
        if (!wv) return;
        wv.executeJavaScript(`
          (function() {
            // 1. YouTube
            const yt = document.getElementById('movie_player');
            const nextBtn = document.querySelector('.ytp-next-button');
            if (nextBtn && !nextBtn.hasAttribute('aria-disabled') && nextBtn.style.display !== 'none') {
              nextBtn.click();
              return;
            }
            if (yt && typeof yt.nextVideo === 'function') {
              yt.nextVideo();
              return;
            }

            // 2. Spotify
            const spNext = document.querySelector('[data-testid="control-button-skip-forward"], button[aria-label="Next"], button[aria-label="Siguiente"]');
            if (spNext) {
              spNext.click();
              return;
            }

            // 3. SoundCloud
            const scNext = document.querySelector('.skipControl__next');
            if (scNext) {
              scNext.click();
              return;
            }

            // 4. Deezer
            const deezerNext = document.querySelector('[data-testid="next_track_button"]');
            if (deezerNext) {
              deezerNext.click();
              return;
            }

            // 5. Standard HTML5 <video> / <audio>
            const allMedia = Array.from(document.querySelectorAll('video, audio'));
            const media = allMedia.find(m => !m.paused) || allMedia[0];
            if (media) {
              media.currentTime = Math.min(media.duration || 999999, media.currentTime + 10);
              return;
            }

            // 6. Synthetic MediaTrackNext fallback
            try {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaTrackNext', code: 'MediaTrackNext', bubbles: true }));
            } catch {}
          })()
        `).catch(() => {});
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [getMediaTargetWebview]);

  // Periodic check to sync taskbar Play/Pause icon with active or background media playback state
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.media) return;

    const checkStatus = async () => {
      let isPlaying = false;
      const targetWv = await getMediaTargetWebview();
      if (targetWv) {
        try {
          const res = await targetWv.executeJavaScript(`
            Boolean(
              (function() {
                const yt = document.getElementById('movie_player');
                if (yt && typeof yt.getPlayerState === 'function') return yt.getPlayerState() === 1;
                if (navigator.mediaSession && navigator.mediaSession.playbackState === 'playing') return true;
                const sp = document.querySelector('[data-testid="control-button-playpause"]');
                if (sp && (sp.getAttribute('aria-label') || '').toLowerCase().includes('pause')) return true;
                return Array.from(document.querySelectorAll('video, audio')).some(m => !m.paused && m.currentTime > 0 && !m.ended);
              })()
            )
          `);
          isPlaying = Boolean(res);
        } catch {}
      }
      forge.media.updateStatus({ isPlaying });
    };

    const timer = setInterval(checkStatus, 1500);
    return () => clearInterval(timer);
  }, [getMediaTargetWebview]);

  // Handle system wake-up from sleep / hibernation
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.power?.onPowerResume) return;

    const unsub = forge.power.onPowerResume(() => {
      console.log("[Forge UI] Resumed from sleep/hibernation, re-syncing browser state...");
      // Re-sync media buttons status
      const wv = activeWebview();
      if (wv) {
        try {
          wv.executeJavaScript(`
            Boolean(Array.from(document.querySelectorAll('video, audio')).some(m => !m.paused))
          `).then((playing: boolean) => {
            forge?.media?.updateStatus({ isPlaying: Boolean(playing) });
          }).catch(() => {});
        } catch {}
      }
      // Re-sync window title
      const title = activeTab?.title?.trim();
      if (title && title !== "New Tab") {
        forge?.setTitle?.(title);
        document.title = `${title} — Forge Browser`;
      }
    });

    return unsub;
  }, [activeWebview, activeTab?.title]);

  // Show exit hint when mouse approaches top in fullscreen
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isFullscreen) return;
    if (e.clientY <= 30) {
      setShowExitHint(true);
      if (exitHintTimer.current) clearTimeout(exitHintTimer.current);
      exitHintTimer.current = setTimeout(() => setShowExitHint(false), 2500);
    }
  };

  const handleRef = useCallback((tabId: string, el: WebviewElement | null) => {
    if (el) webviewRefs.current.set(tabId, el);
    else webviewRefs.current.delete(tabId);
  }, []);

  const handleNavigate = (url: string) => {
    activeWebview()?.loadURL(url);
    updateTab(activeTabId, { url });
  };

  const handleBack    = () => activeWebview()?.goBack();
  const handleForward = () => activeWebview()?.goForward();
  const handleReload  = () => activeWebview()?.reload();

  return (
    <div
      onMouseMove={handleMouseMove}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--forge-bg)] text-[var(--forge-text)] transition-colors select-none relative"
    >
      {/* Exit Fullscreen Floating Pill on Top Hover */}
      {isFullscreen && showExitHint && (
        <button
          onClick={handleExitFullscreen}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-[var(--forge-border)] text-white text-[11px] font-semibold shadow-2xl hover:bg-[#FF6B00] hover:border-[#FF6B00] transition-all cursor-pointer animate-fadeIn"
        >
          <Minimize2 size={13} />
          <span>Exit Fullscreen (Esc)</span>
        </button>
      )}

      {/* 1. Header controls: TitleBar, NavigationBar, TabBar (preserved in DOM, hidden in fullscreen) */}
      <div className={isFullscreen ? "hidden" : "w-full flex flex-col shrink-0"}>
        <TitleBar />
        <NavigationBar
          onNavigate={handleNavigate}
          onBack={handleBack}
          onForward={handleForward}
          onReload={handleReload}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
          onTogglePiP={handleTogglePiP}
        />
        <TabBar />
      </div>

      {/* 2. Main content area: expands seamlessly to fixed inset-0 during fullscreen */}
      <div className={`flex flex-1 overflow-hidden w-full ${isFullscreen ? "fixed inset-0 z-[9999] bg-black" : ""}`}>
        {/* Left sidebar: Favorites, Collections & History (preserved in DOM, hidden in fullscreen) */}
        <div className={isFullscreen ? "hidden" : "flex shrink-0 h-full"}>
          <Sidebar onNavigate={handleNavigate} />
        </div>

        {/* WebViews (one per tab, only active is visible) */}
        <div className={`flex-1 overflow-hidden relative ${isFullscreen ? "w-screen h-screen bg-black" : "w-full h-full bg-[var(--forge-surface-elevated)]"}`}>
          {/* Find In Page Floating Bar */}
          <FindInPageBar
            getActiveWebview={activeWebview}
            isOpen={isFindOpen}
            onClose={() => setIsFindOpen(false)}
          />

          {tabs.map((tab) => (
            <WebView
              key={tab.id}
              tabId={tab.id}
              url={tab.url}
              isActive={tab.id === activeTabId}
              onRef={handleRef}
            />
          ))}
        </div>
      </div>

      {/* 3. Dev tools bar with 6 tools (preserved in DOM, hidden in fullscreen) */}
      <div className={isFullscreen ? "hidden" : "w-full shrink-0"}>
        <DevToolsBar getActiveWebview={activeWebview} />
      </div>

      {/* Zoom Indicator Pill */}
      {zoomBadge !== null && (
        <div className="fixed top-12 right-6 z-[10001] bg-black/85 backdrop-blur-md text-white font-mono text-xs px-3 py-1.5 rounded-full border border-white/15 shadow-2xl pointer-events-none animate-in fade-in duration-150 flex items-center gap-1.5">
          <span>Zoom:</span>
          <span className="text-[#FF6B00] font-bold">{zoomBadge}%</span>
        </div>
      )}

      {/* Action / Bookmark Toast Pill */}
      {toastMessage && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10001] bg-black/85 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full border border-white/15 shadow-2xl pointer-events-none animate-in fade-in duration-150 font-medium">
          {toastMessage}
        </div>
      )}

      {/* Downloads Manager Modal (Ctrl + J) */}
      <DownloadsModal />

      {/* Hotkeys Cheatsheet Modal (F1 / Keyboard) */}
      <HotkeysModal isOpen={isHotkeysOpen} onClose={() => setIsHotkeysOpen(false)} />
    </div>
  );
}