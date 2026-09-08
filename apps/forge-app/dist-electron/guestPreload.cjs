(() => {
  // electron/guestPreload.ts
  (function() {
    const currentUrl = window.location.href || "";
    const isYouTube = currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be");
    const youtubeCode = `
    (function() {
      if (window.__forge_yt_blocker_active) return;
      window.__forge_yt_blocker_active = true;

      function sanitizeAdObject(obj) {
        if (window.__forge_adblock_enabled === false) return obj;
        if (!obj || typeof obj !== 'object') return obj;
        try {
          delete obj.adPlacements;
          delete obj.adSlots;
          delete obj.playerAds;
          delete obj.adBreakHeartbeatParams;
          if (Array.isArray(obj.adPlacements)) obj.adPlacements = [];
          if (Array.isArray(obj.adSlots)) obj.adSlots = [];
          if (Array.isArray(obj.playerAds)) obj.playerAds = [];
        } catch {}
        return obj;
      }

      // 1. Intercept ytInitialPlayerResponse at document-start before player renders
      try {
        let _ytInitialPlayerResponse = sanitizeAdObject(window.ytInitialPlayerResponse);
        Object.defineProperty(window, 'ytInitialPlayerResponse', {
          get() {
            return _ytInitialPlayerResponse;
          },
          set(val) {
            _ytInitialPlayerResponse = sanitizeAdObject(val);
          },
          configurable: true
        });
      } catch {}

      // 2. Intercept ytInitialData to remove promoted items from home & search feed
      try {
        let _ytInitialData = window.ytInitialData;
        Object.defineProperty(window, 'ytInitialData', {
          get() {
            return _ytInitialData;
          },
          set(val) {
            _ytInitialData = sanitizeAdObject(val);
          },
          configurable: true
        });
      } catch {}

      // 3. Disable YouTube Ad Experiments in ytcfg
      try {
        const patchYtcfg = () => {
          if (window.ytcfg && typeof window.ytcfg.get === 'function') {
            const exp = window.ytcfg.get('EXPERIMENT_FLAGS') || {};
            exp.web_enable_ab_in_ad_frequency_capping = false;
            exp.html5_enable_ad_timeout = false;
            exp.html5_skip_ad_delay = 0;
            if (typeof window.ytcfg.set === 'function') {
              window.ytcfg.set('EXPERIMENT_FLAGS', exp);
            }
          }
        };
        patchYtcfg();
        setInterval(patchYtcfg, 1000);
      } catch {}

      // 4. Intercept JSON.parse to remove ad placements from all dynamic responses
      try {
        const originalParse = JSON.parse;
        JSON.parse = function(...args) {
          const result = originalParse.apply(this, args);
          if (result && typeof result === 'object') {
            sanitizeAdObject(result);
          }
          return result;
        };
      } catch {}

      // 5. Intercept window.fetch for /youtubei/v1/player and /youtubei/v1/next
      try {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch.apply(this, args);
          try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
              const clone = response.clone();
              const data = await clone.json();
              if (data && typeof data === 'object') {
                sanitizeAdObject(data);
                return new Response(JSON.stringify(data), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
              }
            }
          } catch {}
          return response;
        };
      } catch {}

      // 6. Intercept XMLHttpRequest for /youtubei/v1/player
      try {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this.__forge_url = String(url || '');
          return originalOpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function(...args) {
          if (this.__forge_url && (this.__forge_url.includes('/youtubei/v1/player') || this.__forge_url.includes('/youtubei/v1/next'))) {
            this.addEventListener('readystatechange', function() {
              if (this.readyState === 4 && this.status === 200) {
                try {
                  const data = JSON.parse(this.responseText);
                  sanitizeAdObject(data);
                  Object.defineProperty(this, 'responseText', {
                    value: JSON.stringify(data),
                    configurable: true
                  });
                  Object.defineProperty(this, 'response', {
                    value: JSON.stringify(data),
                    configurable: true
                  });
                } catch {}
              }
            });
          }
          return originalSend.apply(this, args);
        };
      } catch {}

      // 7. Real-Time Video Ad Detection, Instant Muting & Skipper
      let wasAdShowing = false;
      let originalMute = false;

      function checkAndSkipAds() {
        if (window.__forge_adblock_enabled === false) {
          if (wasAdShowing) {
            wasAdShowing = false;
            const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
            if (v) {
              v.playbackRate = 1;
              v.muted = originalMute;
              v.volume = 1;
            }
          }
          return;
        }

        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

        const isAd = player && (
          player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting') ||
          player.classList.contains('ad-created') ||
          (typeof player.getAdState === 'function' && player.getAdState() === 1) ||
          (typeof player.isAd === 'function' && player.isAd()) ||
          document.querySelector('.ytp-ad-player-overlay') !== null ||
          document.querySelector('.ytp-ad-module')?.childElementCount > 0
        );

        if (isAd && video) {
          if (!wasAdShowing) {
            wasAdShowing = true;
            originalMute = video.muted;
          }

          // Instant mute to ensure 0 sound leaks
          video.muted = true;
          video.volume = 0;

          // Call built-in player skip methods if exposed
          try {
            if (typeof player.cancelPlayback === 'function') player.cancelPlayback();
            if (typeof player.skipAd === 'function') player.skipAd();
          } catch {}

          // Fast forward to end
          if (isFinite(video.duration) && video.duration > 0) {
            video.currentTime = video.duration;
          } else {
            video.currentTime = 999999;
          }
          video.playbackRate = 16;
        } else if (!isAd && wasAdShowing) {
          wasAdShowing = false;
          if (video) {
            video.playbackRate = 1;
            video.muted = originalMute;
            video.volume = 1;
          }
        }

        // Auto-click any skip button variants
        const skipSelectors = [
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          '.ytp-skip-ad-button',
          '.ytp-ad-skip-button-slot button',
          'button.ytp-ad-skip-button',
          '.ytp-ad-overlay-close-button',
          '.ytp-ad-overlay-close-container',
          'button[id^="skip-button"]'
        ];

        for (const selector of skipSelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const btn of buttons) {
            if (btn && typeof btn.click === 'function') {
              btn.click();
            }
          }
        }

        // Auto-dismiss anti-adblock enforcement modal
        const enforcementDialogs = document.querySelectorAll('tp-yt-paper-dialog:has(ytd-enforcement-message-view-model), ytd-enforcement-message-view-model');
        for (const dlg of enforcementDialogs) {
          const closeBtn = dlg.querySelector('button, [role="button"]') || dlg.closest('tp-yt-paper-dialog')?.querySelector('#close-button');
          if (closeBtn && typeof closeBtn.click === 'function') {
            closeBtn.click();
          } else {
            dlg.remove();
          }
          if (video && video.paused) {
            video.play().catch(() => {});
          }
        }
      }

      // Fast check intervals
      setInterval(checkAndSkipAds, 100);

      // Microsecond video hardware event interception
      const hookVideoEvents = () => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.__forge_hooked) {
            v.__forge_hooked = true;
            v.addEventListener('timeupdate', checkAndSkipAds);
            v.addEventListener('play', checkAndSkipAds);
            v.addEventListener('playing', checkAndSkipAds);
            v.addEventListener('loadedmetadata', checkAndSkipAds);
          }
        }
      };

      hookVideoEvents();
      setInterval(hookVideoEvents, 1000);

      try {
        const observer = new MutationObserver(() => {
          checkAndSkipAds();
          hookVideoEvents();
        });
        observer.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'src']
        });
      } catch {}
    })();
  `;
    const universalVideoCode = `
    (function() {
      if (window.__forge_universal_adblock_active) return;
      window.__forge_universal_adblock_active = true;

      // Neutralize Google IMA SDK
      try {
        window.google = window.google || {};
        window.google.ima = window.google.ima || {
          AdDisplayContainer: function() { return { initialize: function() {}, destroy: function() {} }; },
          AdsLoader: function() {
            return {
              contentComplete: function() {},
              requestAds: function() {},
              destroy: function() {},
              addEventListener: function(evt, handler) {
                if (evt === 'adsManagerLoaded') {
                  setTimeout(function() {
                    handler({
                      getAdsManager: function() {
                        return {
                          init: function() {},
                          start: function() {},
                          stop: function() {},
                          destroy: function() {},
                          addEventListener: function(e, cb) {
                            if (e === 'allAdsCompleted' || e === 'complete') setTimeout(cb, 10);
                          }
                        };
                      }
                    });
                  }, 10);
                }
              }
            };
          },
          AdsRequest: function() {},
          ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' }
        };
      } catch {}

      // Fast-forward generic HTML5 video ads
      function skipGenericVideoAds() {
        if (window.__forge_adblock_enabled === false) return;
        const adSelectors = [
          '.vjs-ad-playing video',
          '.jw-flag-ads video',
          '.ad-container video',
          '.video-ad video',
          'video[src*="ad"]',
          'video[src*="doubleclick"]'
        ];

        for (const selector of adSelectors) {
          const adVideos = document.querySelectorAll(selector);
          for (const v of adVideos) {
            if (v instanceof HTMLVideoElement) {
              v.muted = true;
              if (isFinite(v.duration) && v.duration > 0) {
                v.currentTime = v.duration;
              }
              v.playbackRate = 16;
            }
          }
        }

        const skipButtons = document.querySelectorAll([
          '.videoAdUiSkipButton',
          '.skip-button',
          '.skip-ad',
          '[class*="skip-button" i]',
          '[class*="skipButton" i]',
          '[id*="skip-button" i]',
          'button[aria-label*="skip" i]'
        ].join(','));

        for (const btn of skipButtons) {
          if (btn && typeof btn.click === 'function') {
            btn.click();
          }
        }
      }

      setInterval(skipGenericVideoAds, 250);
    })();
  `;
    function initUniversalMediaControls() {
      if (window.__forge_media_controls_initialized) return;
      window.__forge_media_controls_initialized = true;
      try {
        Object.defineProperty(HTMLVideoElement.prototype, "disablePictureInPicture", {
          get: function() {
            return false;
          },
          set: function() {
          },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
      }
      function getAllVideosInDocument(root) {
        const currentRoot = root || document;
        let list = [];
        try {
          const found = currentRoot.querySelectorAll("video");
          for (let i = 0; i < found.length; i++) {
            list.push(found[i]);
          }
        } catch (e) {
        }
        try {
          const treeRoot = currentRoot === document ? document.body || document.documentElement : currentRoot;
          if (treeRoot) {
            const allEls = treeRoot.querySelectorAll("*");
            for (let i = 0; i < allEls.length; i++) {
              const el = allEls[i];
              if (el.shadowRoot) {
                const shadowVideos = getAllVideosInDocument(el.shadowRoot);
                list = list.concat(shadowVideos);
              }
            }
          }
        } catch (e) {
        }
        return list;
      }
      function patchIframesAndVideos() {
        try {
          const iframes = document.querySelectorAll("iframe");
          for (let i = 0; i < iframes.length; i++) {
            const iframe = iframes[i];
            if (!iframe.hasAttribute("allowfullscreen")) {
              iframe.setAttribute("allowfullscreen", "true");
            }
            let allow = iframe.getAttribute("allow") || "";
            if (!allow.includes("fullscreen")) {
              allow = allow ? allow + "; fullscreen *" : "fullscreen *";
            }
            if (!allow.includes("picture-in-picture")) {
              allow = allow ? allow + "; picture-in-picture *" : "picture-in-picture *";
            }
            iframe.setAttribute("allow", allow);
          }
          const videos = getAllVideosInDocument();
          for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (v.hasAttribute("disablepictureinpicture")) {
              v.removeAttribute("disablepictureinpicture");
            }
          }
        } catch (e) {
        }
      }
      patchIframesAndVideos();
      setInterval(patchIframesAndVideos, 2500);
      let isPiPActive = false;
      let activePiPVideo = null;
      document.addEventListener("enterpictureinpicture", function(e) {
        isPiPActive = true;
        activePiPVideo = e.target;
        console.log("__FORGE_PIP_ENTER__");
      }, true);
      window.addEventListener("focus", function() {
        if (isPiPActive) {
          console.log("__FORGE_PIP_RETURN_TO_PAGE__");
        }
      });
      document.addEventListener("leavepictureinpicture", function(e) {
        if (document.hasFocus()) {
          console.log("__FORGE_PIP_RETURN_TO_PAGE__");
        }
        isPiPActive = false;
        activePiPVideo = null;
        console.log("__FORGE_PIP_LEAVE__");
      }, true);
      window.addEventListener("message", function(e) {
        if (e.data && e.data.type === "__FORGE_TOGGLE_PIP__") {
          togglePiP();
        }
      });
      let activeVideo = null;
      let hideTimer = null;
      let theaterModeVideo = null;
      let theaterPrevStyles = null;
      document.addEventListener("play", function(e) {
        if (e.target && e.target.tagName === "VIDEO") {
          activeVideo = e.target;
        }
      }, true);
      const ctrlPill = document.createElement("div");
      ctrlPill.id = "__forge_video_fullscreen_pill";
      ctrlPill.innerHTML = `
      <button id="__forge_btn_fullscreen" title="Pantalla Completa (F / Doble Click)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
        <span>Fullscreen</span>
      </button>
      <button id="__forge_btn_pip" title="Picture-in-Picture (PiP)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <rect x="12" y="9" width="8" height="6" rx="1"></rect>
        </svg>
        <span>PiP</span>
      </button>
    `;
      const exitTheaterBtn = document.createElement("button");
      exitTheaterBtn.id = "__forge_btn_exit_theater";
      exitTheaterBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      <span>Exit Fullscreen</span>
    `;
      const ctrlStyle = document.createElement("style");
      ctrlStyle.id = "__forge_video_ctrl_css";
      ctrlStyle.textContent = `
      #__forge_video_fullscreen_pill {
        position: fixed;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 6px;
        background: rgba(15, 17, 23, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 107, 0, 0.4);
        border-radius: 9999px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 107, 0, 0.2);
        opacity: 0;
        transform: translateY(-4px) scale(0.96);
        pointer-events: none;
        transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        user-select: none;
      }
      #__forge_video_fullscreen_pill.forge-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #__forge_video_fullscreen_pill button {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f3f4f6;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.15s ease;
        line-height: 1;
      }
      #__forge_video_fullscreen_pill button:hover {
        background: #FF6B00;
        border-color: #FF6B00;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(255, 107, 0, 0.4);
      }
      #__forge_btn_exit_theater {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        display: none;
        align-items: center;
        gap: 6px;
        background: rgba(15, 17, 23, 0.88);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 107, 0, 0.5);
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 6px 14px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.7);
        user-select: none;
      }
      #__forge_btn_exit_theater:hover {
        background: #e05e00;
      }
      video:fullscreen,
      video:-webkit-full-screen {
        object-fit: contain !important;
        background: #000000 !important;
        filter: none !important;
        transform: none !important;
        opacity: 1 !important;
      }
      .__forge_lossless_fullscreen_video {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        z-index: 2147483646 !important;
        background: #000000 !important;
        object-fit: contain !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        filter: none !important;
        transform: none !important;
        opacity: 1 !important;
        box-sizing: border-box !important;
      }
      .__forge_lossless_fullscreen_backdrop {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: #000000 !important;
        z-index: 2147483645 !important;
      }
    `;
      function initControls() {
        const container = document.body || document.documentElement;
        if (!container) return;
        if (!document.getElementById("__forge_video_fullscreen_pill")) {
          container.appendChild(ctrlPill);
          container.appendChild(exitTheaterBtn);
        }
        if (!document.getElementById("__forge_video_ctrl_css")) {
          (document.head || container).appendChild(ctrlStyle);
        }
      }
      function enterTheaterMode(video) {
        theaterModeVideo = video;
        theaterPrevStyles = {
          position: video.style.position,
          top: video.style.top,
          left: video.style.left,
          width: video.style.width,
          height: video.style.height,
          zIndex: video.style.zIndex,
          objectFit: video.style.objectFit,
          background: video.style.background
        };
        const backdrop = document.createElement("div");
        backdrop.id = "__forge_theater_backdrop";
        backdrop.className = "__forge_lossless_fullscreen_backdrop";
        (document.body || document.documentElement).appendChild(backdrop);
        video.classList.add("__forge_lossless_fullscreen_video");
        exitTheaterBtn.style.display = "flex";
        ctrlPill.classList.remove("forge-visible");
        hideControls();
      }
      function exitTheaterMode() {
        if (!theaterModeVideo) return;
        theaterModeVideo.classList.remove("__forge_lossless_fullscreen_video");
        if (theaterPrevStyles) {
          theaterModeVideo.style.position = theaterPrevStyles.position || "";
          theaterModeVideo.style.top = theaterPrevStyles.top || "";
          theaterModeVideo.style.left = theaterPrevStyles.left || "";
          theaterModeVideo.style.width = theaterPrevStyles.width || "";
          theaterModeVideo.style.height = theaterPrevStyles.height || "";
          theaterModeVideo.style.zIndex = theaterPrevStyles.zIndex || "";
          theaterModeVideo.style.objectFit = theaterPrevStyles.objectFit || "";
          theaterModeVideo.style.background = theaterPrevStyles.background || "";
        }
        theaterModeVideo = null;
        theaterPrevStyles = null;
        const backdrop = document.getElementById("__forge_theater_backdrop");
        if (backdrop) backdrop.remove();
        exitTheaterBtn.style.display = "none";
      }
      exitTheaterBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        exitTheaterMode();
      });
      async function toggleVideoFullscreen(video) {
        let v = video || activeVideo;
        if (!v) {
          const allV = getAllVideosInDocument();
          v = allV.find((vid) => !vid.paused && vid.currentTime > 0) || allV.find((vid) => !vid.paused) || allV[0];
        }
        if (!v) return;
        if (theaterModeVideo === v) {
          exitTheaterMode();
          return;
        }
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
            return;
          } catch (e) {
          }
        }
        const ytBtn = document.querySelector(".ytp-fullscreen-button");
        if (ytBtn && typeof ytBtn.click === "function" && v.closest && v.closest(".html5-video-player")) {
          ytBtn.click();
          return;
        }
        const targetToFullscreen = v.closest && (v.closest("#movie_player") || v.closest(".html5-video-player") || v.closest("[data-player]")) || v;
        try {
          if (targetToFullscreen.requestFullscreen) {
            await targetToFullscreen.requestFullscreen({ navigationUI: "hide" });
            return;
          } else if (targetToFullscreen.webkitRequestFullscreen) {
            targetToFullscreen.webkitRequestFullscreen();
            return;
          }
        } catch (err) {
        }
        enterTheaterMode(v);
      }
      async function togglePiP(video) {
        let v = video || activeVideo;
        if (!v) {
          const allV = getAllVideosInDocument();
          v = allV.find((vid) => !vid.paused && vid.currentTime > 0 && !vid.ended) || allV.find((vid) => !vid.paused) || allV.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
        }
        if (document.pictureInPictureElement) {
          try {
            await document.exitPictureInPicture();
            return;
          } catch (e) {
          }
        }
        if (v && v.requestPictureInPicture) {
          try {
            v.removeAttribute("disablepictureinpicture");
            await v.requestPictureInPicture();
            return;
          } catch (e) {
            console.warn("[Forge PiP] Failed to enter PiP on video:", e);
          }
        }
        try {
          const iframes = document.querySelectorAll("iframe");
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow) {
              iframes[i].contentWindow.postMessage({ type: "__FORGE_TOGGLE_PIP__" }, "*");
            }
          }
        } catch (e) {
        }
      }
      function positionControlPill(video) {
        if (!video || theaterModeVideo) return;
        let rect;
        try {
          rect = video.getBoundingClientRect();
        } catch (e) {
          return;
        }
        if (rect.width < 60 || rect.height < 40) {
          hideControls();
          return;
        }
        if (rect.bottom <= 10 || rect.top >= window.innerHeight - 10 || rect.right <= 10 || rect.left >= window.innerWidth - 10) {
          hideControls();
          return;
        }
        const top = Math.max(8, rect.top + 8);
        const right = Math.max(8, window.innerWidth - rect.right + 8);
        ctrlPill.style.top = top + "px";
        ctrlPill.style.right = right + "px";
        ctrlPill.classList.add("forge-visible");
        resetHideTimer();
      }
      function hideControls() {
        ctrlPill.classList.remove("forge-visible");
        if (hideTimer) clearTimeout(hideTimer);
      }
      function resetHideTimer() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function() {
          if (!ctrlPill.matches(":hover")) {
            hideControls();
          }
        }, 2500);
      }
      let lastMouseX = -1;
      let lastMouseY = -1;
      let scrollHideTimer = null;
      function handleScrollOrWheel() {
        hideControls();
        if (scrollHideTimer) clearTimeout(scrollHideTimer);
        scrollHideTimer = setTimeout(function() {
          if (lastMouseX >= 0 && lastMouseY >= 0) {
            const video = findVideoAtCoordinates(lastMouseX, lastMouseY);
            if (video) {
              activeVideo = video;
              initControls();
              positionControlPill(video);
            }
          }
        }, 180);
      }
      window.addEventListener("scroll", handleScrollOrWheel, { passive: true, capture: true });
      document.addEventListener("scroll", handleScrollOrWheel, { passive: true, capture: true });
      window.addEventListener("wheel", handleScrollOrWheel, { passive: true, capture: true });
      ctrlPill.addEventListener("mouseenter", function() {
        if (hideTimer) clearTimeout(hideTimer);
      });
      ctrlPill.addEventListener("mouseleave", function() {
        resetHideTimer();
      });
      ctrlPill.querySelector("#__forge_btn_fullscreen").addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        toggleVideoFullscreen(activeVideo);
      });
      ctrlPill.querySelector("#__forge_btn_pip").addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        togglePiP(activeVideo);
      });
      function findVideoAtCoordinates(clientX, clientY) {
        const videos = getAllVideosInDocument();
        for (let i = videos.length - 1; i >= 0; i--) {
          const v = videos[i];
          try {
            const rect = v.getBoundingClientRect();
            if (rect.width >= 60 && rect.height >= 40) {
              if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return v;
              }
            }
          } catch (e) {
          }
        }
        return null;
      }
      function findVideoFromTarget(target, clientX, clientY) {
        if (!target) return null;
        if (target.tagName === "VIDEO") return target;
        if (target.querySelector && target.querySelector("video")) {
          return target.querySelector("video");
        }
        if (target.shadowRoot && target.shadowRoot.querySelector("video")) {
          return target.shadowRoot.querySelector("video");
        }
        if (target.closest) {
          const container = target.closest(
            '.video-player, .html5-video-player, #movie_player, [class*="player"], [class*="video"], [data-player], media-player, video-player, div[data-testid*="video"]'
          );
          if (container) {
            const v = container.querySelector("video") || container.shadowRoot && container.shadowRoot.querySelector("video");
            if (v) return v;
          }
        }
        if (target.parentElement) {
          const v = target.parentElement.querySelector("video");
          if (v) return v;
        }
        if (typeof clientX === "number" && typeof clientY === "number") {
          return findVideoAtCoordinates(clientX, clientY);
        }
        return null;
      }
      let mouseMovePending = false;
      document.addEventListener("mousemove", function(e) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (theaterModeVideo) return;
        if (mouseMovePending) return;
        mouseMovePending = true;
        requestAnimationFrame(function() {
          mouseMovePending = false;
          const target = e.target;
          if (!target) return;
          const video = findVideoFromTarget(target, e.clientX, e.clientY);
          if (video) {
            activeVideo = video;
            initControls();
            positionControlPill(video);
          } else if (ctrlPill.classList.contains("forge-visible") && !ctrlPill.contains(target)) {
            resetHideTimer();
          }
        });
      }, { passive: true, capture: true });
      document.addEventListener("fullscreenchange", function() {
        if (document.fullscreenElement && theaterModeVideo) {
          exitTheaterMode();
        }
      });
      window.__forge_toggle_pip = togglePiP;
      window.__forge_toggle_fullscreen = toggleVideoFullscreen;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initControls);
      } else {
        initControls();
      }
    }
    const cosmeticCss = isYouTube ? `
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-display-ad-renderer,
    ytd-statement-banner-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-banner-promo-renderer,
    ytd-banner-promo-renderer-background,
    ytd-ad-slot-renderer,
    #masthead-ad,
    ytd-video-masthead-ad-v3-renderer,
    ytd-primetime-promo-renderer,
    ytd-merch-shelf-renderer,
    #player-ads,
    .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytp-ad-message-container,
    .ytp-ad-text,
    .ytp-ad-preview-container,
    .ytp-ad-image-overlay,
    .ytp-ad-overlay-image,
    #panels ytd-ads-engagement-panel-content-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    ytd-action-companion-ad-renderer,
    ytd-compact-promoted-video-renderer,
    .ytd-rich-item-renderer:has(ytd-display-ad-renderer),
    .ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    tp-yt-paper-dialog:has(#feedback.ytd-ad-feedback-renderer),
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) {
      display: none !important;
      height: 0 !important;
      max-height: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  ` : `
    .ad-container,
    .ad-banner,
    .ad-placeholder,
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    .adsbygoogle,
    .video-ad-overlay,
    .vast-ad-container {
      display: none !important;
      height: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
    const injectStyle = () => {
      try {
        if (window.__forge_adblock_enabled === false) return;
        const style = document.createElement("style");
        style.id = "__forge_adblock_css";
        style.textContent = cosmeticCss;
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(style);
        }
      } catch {
      }
    };
    const injectScript = () => {
      try {
        const script = document.createElement("script");
        script.textContent = isYouTube ? youtubeCode : universalVideoCode;
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(script);
          script.remove();
        }
      } catch {
      }
    };
    initUniversalMediaControls();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        injectStyle();
        injectScript();
        initUniversalMediaControls();
      });
    } else {
      injectStyle();
      injectScript();
      initUniversalMediaControls();
    }
    injectStyle();
    injectScript();
  })();
})();
