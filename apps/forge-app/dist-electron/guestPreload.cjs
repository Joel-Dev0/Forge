(() => {
  // electron/guestPreload.ts
  (function() {
    const currentUrl = window.location.href || "";
    const isYouTube = currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be");
    const hostname = (window.location.hostname || "").toLowerCase();
    const isSearchEngine = hostname.includes("google.") || hostname.includes("bing.com") || hostname.includes("duckduckgo.com") || hostname.includes("ecosia.org") || hostname.includes("brave.com") || hostname.includes("yahoo.com") || hostname.includes("yandex.") || hostname.includes("baidu.com") || hostname.includes("startpage.com");
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

      // EXEMPT SEARCH ENGINES & MAJOR TRUSTED SITES:
      // Search engines (Google, Bing, DuckDuckGo, Yahoo, Brave, etc.) don't have popunders,
      // video ads, or click-traps. Running popunder blockers or DOM-deleting click-trap cleaners
      // or monkey-patching prototypes completely breaks search engines!
      const hostname = (window.location.hostname || '').toLowerCase();
      if (
        hostname.includes('google.') ||
        hostname.includes('bing.com') ||
        hostname.includes('duckduckgo.com') ||
        hostname.includes('ecosia.org') ||
        hostname.includes('brave.com') ||
        hostname.includes('yahoo.com') ||
        hostname.includes('yandex.') ||
        hostname.includes('baidu.com') ||
        hostname.includes('startpage.com')
      ) {
        return;
      }

      // Universal Ad / Popunder Keywords (declared in parent scope so all handlers can access)
      const adUrlKeywords = [
        'popads', 'popcash', 'adcash', 'propellerads', 'monetag', 'hilltopads',
        'adsterra', 'richads', 'clickadu', 'trafficstars', 'onclickprediction',
        'onclickalgo', 'onclickbright', 'onclickperformance', 'ad2up', 'ero-advertising',
        'juicyads', 'yllix', 'bidvertiser', 'doubleclick', 'googlesyndication',
        'adnxs', 'criteo', 'taboola', 'outbrain', 'bet365', '1xbet',
        'click.php', 'track/click', 'serving/ad', 'adserver', 'clksite', 'revenuehits',
        'rotator', 'popunder', 'fastclick', 'adservice', 'runative', 'syndicate',
        'casino', 'casinon', 'spelpaus', 'zilla-networks'
      ];

      const isAdUrlString = function(url) {
        try {
          if (!url || typeof url !== 'string') return false;
          const str = url.toLowerCase();
          return adUrlKeywords.some(k => str.includes(k));
        } catch {
          return false;
        }
      };

      // 1. Anti-Adblock Evasion Stubs
      try {
        window.canRunAds = true;
        window.isAdBlockActive = false;
      } catch {}

      // 2. Universal Popunder & Unsolicited Window.Open Defuser
      try {
        let lastUserActionTime = 0;
        let lastOpenTime = 0;
        const recordUserAction = () => { lastUserActionTime = Date.now(); };
        window.addEventListener('pointerdown', recordUserAction, true);
        window.addEventListener('mousedown', recordUserAction, true);
        window.addEventListener('keydown', recordUserAction, true);

        const originalOpen = window.open;

        // Defuse Runative & Tabup Popunder SDKs
        try {
          Object.defineProperty(window, '__ts', { get: () => ({}), set: () => {} });
          Object.defineProperty(window, 'runative', { get: () => ({}), set: () => {} });
          Object.defineProperty(window, 'RunativeSDK', { get: () => ({}), set: () => {} });
        } catch {}

        function createDummyWindow() {
          return {
            closed: true,
            focus: function() {},
            blur: function() {},
            close: function() {},
            postMessage: function() {},
            document: {},
            location: { href: 'about:blank', replace: function() {}, assign: function() {} }
          };
        }

        window.open = function(url, target, features) {
          if (window.__forge_adblock_enabled === false) {
            return originalOpen.apply(this, arguments);
          }

          const now = Date.now();
          const isUserInitiated = (now - lastUserActionTime) < 1200;
          const urlStr = String(url || '').toLowerCase();

          // Block blank or script window.open calls used by ad networks to pop under
          if (!url || url === '' || url === 'about:blank' || urlStr.startsWith('javascript:') || urlStr.startsWith('data:')) {
            console.warn('[Forge Shield] Blocked blank/script window.open:', url);
            return createDummyWindow();
          }

          // Block if matches known ad/popunder keywords
          if (isAdUrlString(urlStr)) {
            console.warn('[Forge Shield] Blocked ad popunder URL:', url);
            return createDummyWindow();
          }

          // Block unprompted / programmatic window.open without genuine user gesture
          if (!isUserInitiated) {
            console.warn('[Forge Shield] Blocked unsolicited background popup:', url);
            return createDummyWindow();
          }

          // Block rapid-fire popunder spam (max 1 window open per 2.5 seconds)
          if (now - lastOpenTime < 2500) {
            console.warn('[Forge Shield] Blocked rapid-fire popup spam:', url);
            return createDummyWindow();
          }

          lastOpenTime = now;
          return originalOpen.apply(this, arguments);
        };
      } catch {}

      // 3. Synthetic Link Click, Form Submit & Event Dispatch Interceptor
      try {
        // Capture-phase click interceptor to catch ad link clicks before handlers fire
        window.addEventListener('click', function(e) {
          if (window.__forge_adblock_enabled === false) return;
          try {
            const target = e.target && e.target.closest ? e.target.closest('a') : null;
            if (target && target.href && isAdUrlString(target.href)) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              console.warn('[Forge Shield] Prevented click on ad link:', target.href);
            }
          } catch {}
        }, true);

        const originalAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          if (window.__forge_adblock_enabled !== false) {
            try {
              if (this.href && isAdUrlString(this.href)) {
                console.warn('[Forge Shield] Blocked synthetic ad link click:', this.href);
                return;
              }
            } catch {}
          }
          return originalAnchorClick.apply(this, arguments);
        };

        const originalFormSubmit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = function() {
          if (window.__forge_adblock_enabled !== false) {
            try {
              if (this.action && isAdUrlString(this.action)) {
                console.warn('[Forge Shield] Blocked ad form submit:', this.action);
                return;
              }
            } catch {}
          }
          return originalFormSubmit.apply(this, arguments);
        };

        const origDispatch = EventTarget.prototype.dispatchEvent;
        EventTarget.prototype.dispatchEvent = function(evt) {
          if (window.__forge_adblock_enabled !== false && evt && evt.type === 'click') {
            try {
              if (this instanceof HTMLAnchorElement && this.href && isAdUrlString(this.href)) {
                console.warn('[Forge Shield] Blocked synthetic dispatchEvent click on ad:', this.href);
                return false;
              }
            } catch {}
          }
          return origDispatch.apply(this, arguments);
        };
      } catch {}

      // 4. In-Page Interstitial & Overlay Ad Neutralizer
      function neutralizeInterstitialOverlays() {
        if (window.__forge_adblock_enabled === false) return;
        try {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const elements = document.querySelectorAll('div, section, aside, iframe, dialog');

          for (const el of elements) {
            if (el.id && el.id.startsWith('__forge_')) continue;
            if (el.querySelector('video') || el.tagName === 'VIDEO') continue;

            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
              const rect = el.getBoundingClientRect();
              const z = parseInt(style.zIndex, 10) || 0;

              // Full-screen overlay or large popup (> 60% of viewport and high z-index)
              if (rect.width >= vw * 0.6 && rect.height >= vh * 0.6 && z >= 1000) {
                const hasAdContent =
                  el.querySelector('iframe[src*="ad" i], iframe[src*="banner" i], iframe[src*="pop" i], iframe[src*="traffic" i]') !== null ||
                  el.querySelector('a[href*="bet" i], a[href*="casino" i], a[href*="click" i], a[href*="track" i]') !== null ||
                  el.className.toLowerCase().includes('modal-ad') ||
                  el.className.toLowerCase().includes('interstitial') ||
                  el.className.toLowerCase().includes('popunder') ||
                  el.className.toLowerCase().includes('overlay') ||
                  (z >= 2147483640 && !el.textContent?.trim());

                if (hasAdContent) {
                  el.style.display = 'none';
                  el.style.pointerEvents = 'none';
                  el.remove();
                }
              }
            }
          }
        } catch {}
      }
      setInterval(neutralizeInterstitialOverlays, 600);

      // 5. Transparent Overlay Click-Trap Cleaner (Streaming Sites)
      function removeClickTraps() {
        if (window.__forge_adblock_enabled === false) return;
        try {
          const allDivs = document.querySelectorAll('div, a, span');
          const w = window.innerWidth;
          const h = window.innerHeight;
          for (const el of allDivs) {
            if (el.id && el.id.startsWith('__forge_')) continue;
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
              const rect = el.getBoundingClientRect();
              if (rect.width >= w * 0.7 && rect.height >= h * 0.7) {
                const z = parseInt(style.zIndex, 10);
                if (z > 100 && (style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent')) {
                  if (!el.querySelector('video') && !el.textContent?.trim()) {
                    el.style.pointerEvents = 'none';
                    el.remove();
                  }
                }
              }
            }
          }
        } catch {}
      }
      setInterval(removeClickTraps, 800);

      // 6. Neutralize Google IMA SDK on video players
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

      // 7. Fast-forward generic HTML5 video ads
      function skipGenericVideoAds() {
        if (window.__forge_adblock_enabled === false) return;
        const adSelectors = [
          '.vjs-ad-playing video',
          '.jw-flag-ads video',
          '.ad-container video',
          '.video-ad video',
          'video[src*="ad"]',
          'video[src*="doubleclick"]',
          'video[src*="aniview"]',
          'video[src*="springserve"]'
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
        try {
          const iframes = currentRoot.querySelectorAll("iframe");
          for (let i = 0; i < iframes.length; i++) {
            try {
              if (iframes[i].contentDocument) {
                list = list.concat(getAllVideosInDocument(iframes[i].contentDocument));
              }
            } catch (e) {
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
            if (v.hasAttribute("controlslist")) {
              const cl = v.getAttribute("controlslist") || "";
              v.setAttribute("controlslist", cl.replace(/nopictureinpicture/gi, ""));
            }
          }
        } catch (e) {
        }
      }
      patchIframesAndVideos();
      setInterval(patchIframesAndVideos, 1500);
      try {
        const patchObserver = new MutationObserver(() => {
          patchIframesAndVideos();
        });
        if (document.documentElement) {
          patchObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      } catch (e) {
      }
      let isPiPActive = false;
      let activePiPVideo = null;
      function handlePiPExit() {
        if (!isPiPActive && !activePiPVideo) return;
        isPiPActive = false;
        activePiPVideo = null;
        console.log("__FORGE_PIP_RETURN_TO_PAGE__");
        console.log("__FORGE_PIP_LEAVE__");
      }
      try {
        const origReqPiP = HTMLVideoElement.prototype.requestPictureInPicture;
        if (origReqPiP) {
          HTMLVideoElement.prototype.requestPictureInPicture = async function(...args) {
            isPiPActive = true;
            activePiPVideo = this;
            console.log("__FORGE_PIP_ENTER__");
            const onElemLeave = () => {
              this.removeEventListener("leavepictureinpicture", onElemLeave, true);
              handlePiPExit();
            };
            this.addEventListener("leavepictureinpicture", onElemLeave, true);
            return origReqPiP.apply(this, args);
          };
        }
      } catch (e) {
      }
      document.addEventListener("enterpictureinpicture", function(e) {
        isPiPActive = true;
        activePiPVideo = e.target;
        console.log("__FORGE_PIP_ENTER__");
        if (e.target && typeof e.target.addEventListener === "function") {
          const onTargetLeave = () => {
            e.target.removeEventListener("leavepictureinpicture", onTargetLeave, true);
            handlePiPExit();
          };
          e.target.addEventListener("leavepictureinpicture", onTargetLeave, true);
        }
      }, true);
      window.addEventListener("focus", function() {
        if (isPiPActive) {
          console.log("__FORGE_PIP_RETURN_TO_PAGE__");
        }
      });
      document.addEventListener("leavepictureinpicture", function() {
        handlePiPExit();
      }, true);
      let lastKnownPiPEl = null;
      setInterval(() => {
        const current = document.pictureInPictureElement;
        if (current && !lastKnownPiPEl) {
          lastKnownPiPEl = current;
          isPiPActive = true;
          console.log("__FORGE_PIP_ENTER__");
        } else if (!current && lastKnownPiPEl) {
          lastKnownPiPEl = null;
          handlePiPExit();
        }
      }, 350);
      window.addEventListener("message", function(e) {
        if (!e.data || typeof e.data !== "object") return;
        if (e.data.type === "__FORGE_TOGGLE_PIP__") {
          const allV = getAllVideosInDocument();
          if (allV.length > 0) {
            togglePiP();
          } else {
            try {
              const iframes = document.querySelectorAll("iframe");
              for (let i = 0; i < iframes.length; i++) {
                if (iframes[i].contentWindow) {
                  iframes[i].contentWindow.postMessage({ type: "__FORGE_TOGGLE_PIP__" }, "*");
                }
              }
            } catch (err) {
            }
          }
        } else if (e.data.type === "__FORGE_TOGGLE_FULLSCREEN__") {
          const allV = getAllVideosInDocument();
          if (allV.length > 0) {
            toggleVideoFullscreen();
          } else {
            try {
              const iframes = document.querySelectorAll("iframe");
              for (let i = 0; i < iframes.length; i++) {
                if (iframes[i].contentWindow) {
                  iframes[i].contentWindow.postMessage({ type: "__FORGE_TOGGLE_FULLSCREEN__" }, "*");
                }
              }
            } catch (err) {
            }
          }
        } else if (e.data.type === "__FORGE_FOCUS_VIDEO__") {
          const v = activeVideo || getAllVideosInDocument()[0];
          if (v) {
            try {
              window.focus();
              v.focus?.();
              v.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
            } catch (err) {
            }
          }
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
    /* Generic ad banners, wrappers & sponsor placeholders */
    .ad-container,
    .ad-banner,
    .ad-placeholder,
    .ad-slot,
    .ad-box,
    .ad-wrapper,
    .ad-unit,
    .ad-placement,
    .ad-sidebar,
    .ad-header,
    .ad-footer,
    .banner-ad,
    .floating-ad,
    .sticky-ad,
    .bottom-ad,
    .top-ad,
    [class*="banner-ad" i],
    [class*="sticky-ad" i],
    [class*="floating-ad" i],
    [class*="ad-slot" i],
    [class*="ad-wrapper" i],
    [class*="ad-box" i],
    [class*="ad-sense" i],
    [id*="advertisement" i],
    [class*="advertisement" i],
    [aria-label="advertisement" i],
    [aria-label="ad" i],
    [data-ad-unit],
    [data-ad-slot],
    [data-ad-client],
    [data-ad-format],
    [data-google-query-id],
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    .adsbygoogle,

    /* Native content recommendation ad widgets */
    .trc_related_container,
    .trc_rbox_div,
    [id^="taboola-"],
    .tbl-feed-container,
    .OUTBRAIN,
    [class*="ob-widget"],
    [id^="outbrain_widget_"],
    .ob-cards,
    [id^="MarketGid"],
    .mgid-widget,
    [id^="rc-widget-"],
    .rc-ad-item,
    [class*="adsterra" i],
    [class*="exoclick" i],
    [id*="adsterra" i],

    /* Video player ad overlays and VAST/IMA/VPAID containers */
    .video-ads,
    .video-ad,
    .video-ad-overlay,
    .vast-ad-container,
    .vjs-ad-playing,
    .ima-ad-container,
    .ima-container,
    [id*="vdo_ai"],
    .fluid_video_wrapper .vast_ad,
    [class*="preroll" i],
    [class*="midroll" i],

    /* Popunders, interstitials & floating modals */
    [class*="interstitial" i],
    [class*="overlay-ad" i],
    [class*="modal-ad" i],
    [class*="popup-ad" i],
    [class*="popunder" i],
    [id*="interstitial" i],
    [id*="overlay-ad" i],
    [id*="modal-ad" i],
    [id*="popup-ad" i],
    [id*="popunder" i],
    div[style*="z-index: 2147483647"]:not(:has(video)):not(#__forge_theater_backdrop),
    div[style*="z-index: 2147483646"]:not(:has(video)):not(#__forge_video_fullscreen_pill),
    div[style*="z-index: 999999"]:not(:has(video)),
    div[style*="z-index: 99999"]:not(:has(video)),
    iframe[src*="adsterra" i],
    iframe[src*="exoclick" i],
    iframe[src*="monetag" i],
    iframe[src*="propeller" i],
    iframe[src*="popads" i],
    iframe[src*="popcash" i],
    iframe[src*="hilltop" i],
    iframe[src*="richads" i],
    iframe[src*="trafficstars" i],
    iframe[src*="onclick" i],
    iframe[src*="doubleclick" i],

    /* Anti-adblock warning modals, popups and block screens */
    .fc-ab-root,
    [class*="adblock-overlay" i],
    [id*="adblock-notice" i],
    [class*="adblock-warning" i],
    [id*="adblock-modal" i],
    .adblocker-overlay,
    [class*="blocking-warning" i],
    .sp-message-open,
    #sp-message-container {
      display: none !important;
      height: 0 !important;
      max-height: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 0 !important;
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
        if (isSearchEngine) return;
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
    let mediaDetectorInitialized = false;
    const setupMediaDetector = () => {
      if (mediaDetectorInitialized) return;
      mediaDetectorInitialized = true;
      const activeAudibleMedia = /* @__PURE__ */ new Set();
      function reportStatus() {
        try {
          for (const el of activeAudibleMedia) {
            if (el.paused || el.ended) {
              activeAudibleMedia.delete(el);
            }
          }
          const isPlaying = activeAudibleMedia.size > 0;
          const isMuted = isPlaying && Array.from(activeAudibleMedia).every((m) => m.muted || m.volume === 0);
          console.log(
            `__FORGE_MEDIA_STATUS__:${JSON.stringify({ isPlaying, isAudible: isPlaying && !isMuted, isMuted })}`
          );
        } catch {
        }
      }
      function isMediaTarget(target) {
        if (!target) return false;
        const tag = (target.tagName || "").toUpperCase();
        return tag === "VIDEO" || tag === "AUDIO";
      }
      function onMediaStart(target) {
        if (isMediaTarget(target)) {
          activeAudibleMedia.add(target);
          reportStatus();
        }
      }
      function onMediaStop(target) {
        if (isMediaTarget(target)) {
          activeAudibleMedia.delete(target);
          reportStatus();
        }
      }
      window.addEventListener("play", (e) => onMediaStart(e.target), true);
      window.addEventListener("playing", (e) => onMediaStart(e.target), true);
      window.addEventListener("pause", (e) => onMediaStop(e.target), true);
      window.addEventListener("ended", (e) => onMediaStop(e.target), true);
      window.addEventListener("volumechange", () => reportStatus(), true);
      setInterval(() => {
        try {
          const all = Array.from(document.querySelectorAll("video, audio"));
          let changed = false;
          for (const m of all) {
            if (!m.paused && !m.ended) {
              if (!activeAudibleMedia.has(m)) {
                activeAudibleMedia.add(m);
                changed = true;
              }
            } else if (m.paused || m.ended) {
              if (activeAudibleMedia.has(m)) {
                activeAudibleMedia.delete(m);
                changed = true;
              }
            }
          }
          if (changed) {
            reportStatus();
          }
        } catch {
        }
      }, 1e3);
    };
    const setupFocusDistractionCleaner = () => {
      try {
        const host = (window.location.hostname || "").toLowerCase();
        let selectors = [];
        if (host.includes("youtube.com") || host.includes("youtu.be")) {
          selectors = [
            "ytd-reel-shelf-renderer",
            "ytd-rich-shelf-renderer:has(a[href*='/shorts'])",
            "#shorts-container",
            "ytd-guide-entry-renderer:has(a[title='Shorts'])",
            "ytd-mini-guide-entry-renderer[aria-label='Shorts']"
          ];
        } else if (host.includes("twitter.com") || host.includes("x.com")) {
          selectors = [
            "[aria-label='Timeline: Trending now']",
            "[data-testid='trend']",
            "aside[role='complementary']"
          ];
        } else if (host.includes("instagram.com")) {
          selectors = [
            "a[href='/reels/']",
            "a[href='/explore/']",
            "div:has(> a[href*='/reels/'])"
          ];
        } else if (host.includes("tiktok.com")) {
          selectors = [
            "[data-e2e='feed-live']"
          ];
        } else if (host.includes("reddit.com")) {
          selectors = [
            "#right-sidebar-container"
          ];
        } else if (host.includes("linkedin.com")) {
          selectors = [
            "#news-module"
          ];
        } else if (host.includes("facebook.com")) {
          selectors = [
            "[data-pagelet='RightRail']"
          ];
        }
        const applyCosmetics = (active) => {
          const existing = document.getElementById("__forge_focus_cosmetics");
          if (!active) {
            if (existing) existing.remove();
            return;
          }
          if (existing || selectors.length === 0) return;
          const style = document.createElement("style");
          style.id = "__forge_focus_cosmetics";
          style.textContent = `
          ${selectors.join(",\n")} {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            opacity: 0 !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }
        `;
          (document.head || document.documentElement).appendChild(style);
        };
        window.addEventListener("message", (e) => {
          if (e.data && e.data.type === "__FORGE_SET_FOCUS_MODE__") {
            applyCosmetics(!!e.data.active);
          }
        });
      } catch {
      }
    };
    initUniversalMediaControls();
    setupMediaDetector();
    setupFocusDistractionCleaner();
    let cwsCompatibilityInitialized = false;
    const installedExtIds = /* @__PURE__ */ new Set();
    const isChromeWebStoreUrl = () => {
      try {
        const h = (window.location.hostname || "").toLowerCase();
        const u = (window.location.href || "").toLowerCase();
        return h.includes("chromewebstore.google.com") || h.includes("chrome.google.com") || u.includes("chromewebstore.google.com");
      } catch {
        return false;
      }
    };
    const setupChromeWebStoreCompatibility = () => {
      if (!isChromeWebStoreUrl()) return;
      try {
        let createCwsEvent = function() {
          const listeners = /* @__PURE__ */ new Set();
          return {
            addListener: (fn) => {
              if (typeof fn === "function") listeners.add(fn);
            },
            removeListener: (fn) => {
              listeners.delete(fn);
            },
            hasListener: (fn) => listeners.has(fn),
            hasListeners: () => listeners.size > 0,
            dispatch: (...args) => {
              for (const fn of listeners) {
                try {
                  fn(...args);
                } catch {
                }
              }
            }
          };
        };
        const getExtensionDetailsFromPage = () => {
          const href = window.location.href;
          const path = window.location.pathname;
          const pathMatch = path.match(/\/detail\/(?:([^/]+)\/)?([a-z]{32})/i) || href.match(/\/detail\/([a-z]{32})/i) || href.match(/\b([a-z]{32})\b/i);
          const extId = pathMatch ? (pathMatch[2] || pathMatch[1] || pathMatch[0]).toLowerCase() : "";
          const extSlug = pathMatch && pathMatch[1] && pathMatch[1].length !== 32 ? pathMatch[1] : "";
          let friendlyName = "";
          const h1 = document.querySelector("h1");
          if (h1 && h1.textContent && h1.textContent.trim()) {
            friendlyName = h1.textContent.trim();
          } else if (extSlug) {
            friendlyName = extSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          } else {
            friendlyName = document.title.split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
          }
          let iconUrl = "";
          const img = document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']");
          if (img) {
            iconUrl = img.src || "";
          }
          return { extId, friendlyName, iconUrl };
        };
        const stopSpinnersAndMarkAdded = () => {
          let attempts = 0;
          const timer = setInterval(() => {
            attempts++;
            try {
              const elements = document.querySelectorAll(
                "button, [role='button'], cws-install-button, md-circular-progress, [role='progressbar']"
              );
              elements.forEach((el) => {
                const html = el.innerHTML || "";
                const hasSpinner = html.includes("<circle") || html.includes("circular-progress") || el.getAttribute("aria-busy") === "true" || el.classList.contains("loading");
                if (hasSpinner) {
                  const btn = el.closest("button, [role='button'], cws-install-button") || el;
                  btn.removeAttribute("disabled");
                  btn.removeAttribute("aria-busy");
                  btn.style.pointerEvents = "auto";
                  btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;color:#10b981;font-weight:700;font-size:14px;padding:6px 16px;background:rgba(16,185,129,0.12);border-radius:9999px;border:1px solid rgba(16,185,129,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added to Forge</span>';
                }
              });
            } catch {
            }
            if (attempts > 25) clearInterval(timer);
          }, 120);
        };
        const notifyForgeExtensionInstall = (extId, extName, icon) => {
          if (!extId) return;
          installedExtIds.add(extId.toLowerCase());
          console.log(
            "__FORGE_EXT_INSTALL__:" + JSON.stringify({
              id: extId.toLowerCase(),
              name: extName || "Chrome Web Store Extension",
              iconUrl: icon || "",
              url: window.location.href
            })
          );
          stopSpinnersAndMarkAdded();
        };
        const onInstallStageChanged = createCwsEvent();
        const onDownloadProgress = createCwsEvent();
        const mockWebstorePrivate = {
          onInstallStageChanged,
          onDownloadProgress,
          beginInstallWithManifest3: (details, callback) => {
            const detailsObj = getExtensionDetailsFromPage();
            const extId = (details?.id || detailsObj.extId || "").toLowerCase();
            const name = details?.localizedName || detailsObj.friendlyName;
            const icon = details?.iconUrl || detailsObj.iconUrl;
            if (extId) {
              notifyForgeExtensionInstall(extId, name, icon);
            }
            try {
              onInstallStageChanged.dispatch("installing");
              setTimeout(() => {
                onInstallStageChanged.dispatch("install_complete");
              }, 50);
            } catch {
            }
            if (typeof callback === "function") {
              setTimeout(() => {
                try {
                  callback("");
                } catch {
                }
              }, 10);
            }
            return Promise.resolve("");
          },
          completeInstall: (id, callback) => {
            if (id) installedExtIds.add(String(id).toLowerCase());
            stopSpinnersAndMarkAdded();
            if (typeof callback === "function") {
              setTimeout(() => {
                try {
                  callback();
                } catch {
                }
              }, 10);
            }
            return Promise.resolve("");
          },
          install: (id, callback) => {
            const detailsObj = getExtensionDetailsFromPage();
            const extId = (id || detailsObj.extId || "").toLowerCase();
            if (extId) {
              notifyForgeExtensionInstall(extId, detailsObj.friendlyName, detailsObj.iconUrl);
            }
            if (typeof callback === "function") {
              setTimeout(() => {
                try {
                  callback();
                } catch {
                }
              }, 10);
            }
            return Promise.resolve("");
          },
          getExtensionStatus: (id, manifest, callback) => {
            const cb = typeof manifest === "function" ? manifest : callback;
            const detailsObj = getExtensionDetailsFromPage();
            const targetId = (typeof id === "string" ? id : detailsObj.extId || "").toLowerCase();
            const status = targetId && installedExtIds.has(targetId) ? "installed" : "not_installed";
            if (typeof cb === "function") {
              try {
                cb(status);
              } catch {
              }
            }
            return Promise.resolve(status);
          },
          isInIncognitoMode: (callback) => {
            if (typeof callback === "function") {
              try {
                callback(false);
              } catch {
              }
            }
            return Promise.resolve(false);
          },
          getIsLauncherEnabled: (callback) => {
            if (typeof callback === "function") {
              try {
                callback(false);
              } catch {
              }
            }
            return Promise.resolve(false);
          },
          getStoreLogin: (callback) => {
            if (typeof callback === "function") {
              try {
                callback("");
              } catch {
              }
            }
            return Promise.resolve("");
          }
        };
        if (!window.chrome) {
          window.chrome = {};
        }
        try {
          Object.defineProperty(window.chrome, "webstorePrivate", {
            value: mockWebstorePrivate,
            writable: true,
            configurable: true
          });
        } catch {
          window.chrome.webstorePrivate = mockWebstorePrivate;
        }
        const injectScriptIntoPage = () => {
          const parent = document.head || document.documentElement;
          if (!parent) {
            document.addEventListener("DOMContentLoaded", injectScriptIntoPage, { once: true });
            return;
          }
          const script = document.createElement("script");
          script.textContent = `
          (function() {
            if (window.__forge_cws_mock_injected) return;
            window.__forge_cws_mock_injected = true;

            if (!window.chrome) window.chrome = {};
            if (!window.chrome.app) {
              window.chrome.app = {
                isInstalled: false,
                InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
                RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" },
                getDetails: function() { return null; },
                getIsInstalled: function() { return false; },
                runningState: function() { return "cannot_run"; }
              };
            }

            const installedExts = new Set();

            function makeEvent() {
              const list = new Set();
              return {
                addListener: function(fn) { if (typeof fn === "function") list.add(fn); },
                removeListener: function(fn) { list.delete(fn); },
                hasListener: function(fn) { return list.has(fn); },
                hasListeners: function() { return list.size > 0; },
                dispatch: function() {
                  var args = arguments;
                  for (var fn of list) {
                    try { fn.apply(null, args); } catch (e) {}
                  }
                }
              };
            }

            const onInstallStageChanged = makeEvent();
            const onDownloadProgress = makeEvent();

            function parseDetails() {
              const href = window.location.href;
              const path = window.location.pathname;
              const match = path.match(/\\/detail\\/(?:([^/]+)\\/)?([a-z]{32})/i) ||
                            href.match(/\\/detail\\/([a-z]{32})/i) ||
                            href.match(/\\b([a-z]{32})\\b/i);
              const id = match ? (match[2] || match[1] || match[0]).toLowerCase() : "";
              const slug = (match && match[1] && match[1].length !== 32) ? match[1] : "";

              var name = "";
              var h1 = document.querySelector("h1");
              if (h1 && h1.textContent) {
                name = h1.textContent.trim();
              } else if (slug) {
                name = slug.split("-").map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
              } else {
                name = (document.title || "").split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
              }

              var iconUrl = "";
              var img = document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']");
              if (img && img.src) iconUrl = img.src;

              return { id: id, name: name, iconUrl: iconUrl, url: href };
            }

            function triggerInstall(idParam, nameParam, iconParam) {
              const info = parseDetails();
              const id = (idParam || info.id || "").toLowerCase();
              const name = nameParam || info.name || "Chrome Extension";
              const iconUrl = iconParam || info.iconUrl || "";

              if (id) {
                installedExts.add(id);
                console.log("__FORGE_EXT_INSTALL__:" + JSON.stringify({
                  id: id,
                  name: name,
                  iconUrl: iconUrl,
                  url: window.location.href
                }));
              }

              try {
                onInstallStageChanged.dispatch("installing");
                setTimeout(function() {
                  onInstallStageChanged.dispatch("install_complete");
                }, 50);
              } catch (e) {}

              stopSpinners();
            }

            function stopSpinners() {
              var count = 0;
              var iv = setInterval(function() {
                count++;
                try {
                  var els = document.querySelectorAll("button, [role='button'], cws-install-button, md-circular-progress, [role='progressbar']");
                  els.forEach(function(el) {
                    var h = el.innerHTML || "";
                    if (h.includes("<circle") || h.includes("circular-progress") || el.getAttribute("aria-busy") === "true") {
                      var b = el.closest("button, [role='button'], cws-install-button") || el;
                      b.removeAttribute("disabled");
                      b.removeAttribute("aria-busy");
                      b.style.pointerEvents = "auto";
                      b.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;color:#10b981;font-weight:700;font-size:14px;padding:6px 16px;background:rgba(16,185,129,0.12);border-radius:9999px;border:1px solid rgba(16,185,129,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added to Forge</span>';
                    }
                  });
                } catch (err) {}
                if (count > 25) clearInterval(iv);
              }, 120);
            }

            const mock = {
              onInstallStageChanged: onInstallStageChanged,
              onDownloadProgress: onDownloadProgress,

              beginInstallWithManifest3: function(details, callback) {
                var info = parseDetails();
                var id = details?.id || info.id;
                var name = details?.localizedName || info.name;
                var icon = details?.iconUrl || info.iconUrl;
                triggerInstall(id, name, icon);

                if (typeof callback === "function") {
                  setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
                }
                return Promise.resolve("");
              },

              completeInstall: function(id, callback) {
                if (id) installedExts.add(String(id).toLowerCase());
                stopSpinners();
                if (typeof callback === "function") {
                  setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
                }
                return Promise.resolve("");
              },

              install: function(id, callback) {
                triggerInstall(id);
                if (typeof callback === "function") {
                  setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
                }
                return Promise.resolve("");
              },

              getExtensionStatus: function(id, manifest, callback) {
                var cb = typeof manifest === "function" ? manifest : callback;
                var info = parseDetails();
                var targetId = (typeof id === "string" ? id : info.id || "").toLowerCase();
                var status = (targetId && installedExts.has(targetId)) ? "installed" : "not_installed";
                if (typeof cb === "function") {
                  try { cb(status); } catch (e) {}
                }
                return Promise.resolve(status);
              },

              isInIncognitoMode: function(callback) {
                if (typeof callback === "function") try { callback(false); } catch (e) {}
                return Promise.resolve(false);
              },

              getIsLauncherEnabled: function(callback) {
                if (typeof callback === "function") try { callback(false); } catch (e) {}
                return Promise.resolve(false);
              },

              getStoreLogin: function(callback) {
                if (typeof callback === "function") try { callback(""); } catch (e) {}
                return Promise.resolve("");
              }
            };

            try {
              Object.defineProperty(window.chrome, "webstorePrivate", {
                value: mock,
                writable: true,
                configurable: true
              });
            } catch (e) {
              window.chrome.webstorePrivate = mock;
            }

            if (!window.chrome.management) {
              window.chrome.management = {
                get: function(id, cb) {
                  var res = { id: id, name: "Extension", enabled: true, installType: "normal" };
                  if (typeof cb === "function") cb(res);
                  return Promise.resolve(res);
                },
                getAll: function(cb) {
                  if (typeof cb === "function") cb([]);
                  return Promise.resolve([]);
                },
                onInstalled: makeEvent(),
                onUninstalled: makeEvent(),
                onEnabled: makeEvent(),
                onDisabled: makeEvent()
              };
            }
          })();
        `;
          parent.appendChild(script);
          script.remove();
        };
        injectScriptIntoPage();
        const setupForgeInstallBanner = () => {
          const bannerId = "forge-cws-installer-banner";
          const { extId, friendlyName, iconUrl } = getExtensionDetailsFromPage();
          if (!extId) {
            const existing2 = document.getElementById(bannerId);
            if (existing2) existing2.remove();
            return;
          }
          const existing = document.getElementById(bannerId);
          if (existing) {
            if (existing.dataset.extId === extId) return;
            existing.remove();
          }
          const banner = document.createElement("div");
          banner.id = bannerId;
          banner.dataset.extId = extId;
          banner.style.cssText = [
            "position: fixed",
            "bottom: 24px",
            "right: 28px",
            "z-index: 2147483647",
            "display: flex",
            "align-items: center",
            "gap: 12px",
            "background: rgba(18, 19, 22, 0.96)",
            "border: 1px solid rgba(255, 107, 0, 0.6)",
            "border-radius: 9999px",
            "padding: 8px 18px",
            "box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 20px rgba(255, 107, 0, 0.25)",
            "font-family: system-ui, -apple-system, sans-serif",
            "color: #ffffff",
            "cursor: pointer",
            "backdrop-filter: blur(14px)",
            "transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            "user-select: none"
          ].join(";");
          banner.innerHTML = [
            '<div style="width: 9px; height: 9px; border-radius: 50%; background: #FF6B00; box-shadow: 0 0 10px #FF6B00;"></div>',
            `<span style="font-size: 13px; font-weight: 700; color: #ffffff;">Add "${friendlyName}" to Forge</span>`,
            '<span style="background: #FF6B00; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(255,107,0,0.4);">\u26A1 Install</span>'
          ].join("");
          banner.onmouseenter = () => {
            banner.style.transform = "scale(1.04) translateY(-2px)";
            banner.style.borderColor = "#FF6B00";
          };
          banner.onmouseleave = () => {
            banner.style.transform = "scale(1) translateY(0)";
            banner.style.borderColor = "rgba(255, 107, 0, 0.6)";
          };
          banner.onclick = (e) => {
            e.stopPropagation();
            notifyForgeExtensionInstall(extId, friendlyName, iconUrl);
            banner.innerHTML = [
              '<span style="font-size: 13px; font-weight: 700; color: #34D399;">\u2713 Successfully Installed in Forge!</span>'
            ].join("");
            banner.style.borderColor = "#10B981";
            setTimeout(() => {
              banner.style.opacity = "0";
              setTimeout(() => banner.remove(), 400);
            }, 3e3);
          };
          const mountTarget = document.body || document.documentElement;
          if (mountTarget) {
            mountTarget.appendChild(banner);
          }
        };
        if (!cwsCompatibilityInitialized) {
          document.addEventListener(
            "click",
            (e) => {
              const target = e.target;
              if (!target) return;
              const btn = target.closest("button, [role='button'], cws-install-button, div[jsaction], div[aria-label]");
              if (!btn) return;
              const text = ((btn.textContent || "") + " " + (btn.getAttribute("aria-label") || "")).toLowerCase().trim();
              if (text.includes("add to chrome") || text.includes("a\xF1adir a chrome") || text.includes("agregar a chrome") || text.includes("ajouter \xE0 chrome") || text.includes("zu chrome hinzuf\xFCgen") || text.includes("add to brave") || text.includes("add to edge") || text.includes("add to forge")) {
                const { extId, friendlyName, iconUrl } = getExtensionDetailsFromPage();
                if (extId) {
                  notifyForgeExtensionInstall(extId, friendlyName, iconUrl);
                }
              }
            },
            true
          );
        }
        let lastUrl = window.location.href;
        const checkUrl = () => {
          try {
            if (window.location.href !== lastUrl) {
              lastUrl = window.location.href;
              setupForgeInstallBanner();
              injectScriptIntoPage();
            }
          } catch {
          }
        };
        window.addEventListener("popstate", checkUrl);
        window.addEventListener("hashchange", checkUrl);
        try {
          const origPushState = history.pushState;
          if (typeof origPushState === "function") {
            history.pushState = function(...args) {
              const res = origPushState.apply(this, args);
              setTimeout(checkUrl, 100);
              return res;
            };
          }
          const origReplaceState = history.replaceState;
          if (typeof origReplaceState === "function") {
            history.replaceState = function(...args) {
              const res = origReplaceState.apply(this, args);
              setTimeout(checkUrl, 100);
              return res;
            };
          }
        } catch {
        }
        setInterval(checkUrl, 600);
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", setupForgeInstallBanner);
        } else {
          setupForgeInstallBanner();
        }
        cwsCompatibilityInitialized = true;
      } catch (err) {
        console.warn("[Forge CWS Compatibility Error]", err);
      }
    };
    setupChromeWebStoreCompatibility();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupChromeWebStoreCompatibility);
    }
    window.addEventListener("load", setupChromeWebStoreCompatibility);
    setInterval(() => {
      if (isChromeWebStoreUrl() && !cwsCompatibilityInitialized) {
        setupChromeWebStoreCompatibility();
      }
    }, 400);
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
