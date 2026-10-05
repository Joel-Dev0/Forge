/**
 * Forge Guest Preload Script
 * Executes at document-start inside all webviews on session "persist:forge".
 * Completely neutralizes YouTube video ads, Google IMA SDKs, and in-stream video ads.
 */

(function() {
  // Safe Trusted Types fallback policy for strict CSP pages (e.g. Chrome Web Store)
  try {
    if (typeof (window as any).trustedTypes !== "undefined" && typeof (window as any).trustedTypes.createPolicy === "function") {
      if (!(window as any).trustedTypes.defaultPolicy) {
        (window as any).trustedTypes.createPolicy("default", {
          createHTML: (s: string) => s,
          createScript: (s: string) => s,
          createScriptURL: (s: string) => s,
        });
      }
    }
  } catch {}

  const currentUrl = window.location.href || "";
  const isYouTube = currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be");
  const hostname = (window.location.hostname || "").toLowerCase();
  const isSearchEngine =
    hostname.includes("google.") ||
    hostname.includes("bing.com") ||
    hostname.includes("duckduckgo.com") ||
    hostname.includes("ecosia.org") ||
    hostname.includes("brave.com") ||
    hostname.includes("yahoo.com") ||
    hostname.includes("yandex.") ||
    hostname.includes("baidu.com") ||
    hostname.includes("startpage.com");

  // 1. YouTube-specific DOM & scriptlet injection at document-start
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

  // 2. Universal video ad killer, popunder defuser, anti-adblock stubs & click-trap cleaner
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

  // 3. Forge Universal Lossless Video Fullscreen & Picture-in-Picture Engine
  // Runs directly inside the guest preload context (immune to site CSP restrictions, covers 100% of web pages)
  function initUniversalMediaControls() {
    if ((window as any).__forge_media_controls_initialized) return;
    (window as any).__forge_media_controls_initialized = true;

    // 1. Bypass disablePictureInPicture attribute & property on all HTML5 video elements
    try {
      Object.defineProperty(HTMLVideoElement.prototype, 'disablePictureInPicture', {
        get: function() { return false; },
        set: function() { /* ignored */ },
        configurable: true,
        enumerable: true
      });
    } catch(e) {}

    // 2. Recursive Shadow DOM & Iframe video discovery across arbitrary web components and custom players
    function getAllVideosInDocument(root?: any): HTMLVideoElement[] {
      const currentRoot = root || document;
      let list: HTMLVideoElement[] = [];
      try {
        const found = currentRoot.querySelectorAll('video');
        for (let i = 0; i < found.length; i++) {
          list.push(found[i]);
        }
      } catch(e) {}

      try {
        const treeRoot = currentRoot === document ? (document.body || document.documentElement) : currentRoot;
        if (treeRoot) {
          const allEls = treeRoot.querySelectorAll('*');
          for (let i = 0; i < allEls.length; i++) {
            const el = allEls[i];
            if (el.shadowRoot) {
              const shadowVideos = getAllVideosInDocument(el.shadowRoot);
              list = list.concat(shadowVideos);
            }
          }
        }
      } catch(e) {}

      try {
        const iframes = currentRoot.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          try {
            if (iframes[i].contentDocument) {
              list = list.concat(getAllVideosInDocument(iframes[i].contentDocument));
            }
          } catch(e) {}
        }
      } catch(e) {}

      return list;
    }

    // 3. Auto-grant fullscreen & picture-in-picture permissions to all iframes
    function patchIframesAndVideos() {
      try {
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          const iframe = iframes[i];
          const hasLegacyFullscreen = iframe.hasAttribute('allowfullscreen');
          let allow = iframe.getAttribute('allow') || '';
          let allowUpdated = false;

          // Only add fullscreen to 'allow' if iframe doesn't already have allowfullscreen or fullscreen in allow
          if (!hasLegacyFullscreen && !allow.includes('fullscreen')) {
            allow = allow ? allow + '; fullscreen *' : 'fullscreen *';
            allowUpdated = true;
          }
          if (!allow.includes('picture-in-picture')) {
            allow = allow ? allow + '; picture-in-picture *' : 'picture-in-picture *';
            allowUpdated = true;
          }

          if (allowUpdated) {
            iframe.setAttribute('allow', allow);
          }
        }

        const videos = getAllVideosInDocument();
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          if (v.hasAttribute('disablepictureinpicture')) {
            v.removeAttribute('disablepictureinpicture');
          }
          if (v.hasAttribute('controlslist')) {
            const cl = v.getAttribute('controlslist') || '';
            if (/nopictureinpicture/i.test(cl)) {
              v.setAttribute('controlslist', cl.replace(/nopictureinpicture/gi, '').trim());
            }
          }
        }
      } catch(e) {}
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
    } catch(e) {}

    // 4. PiP State Tracking for Return to Page / Back to Tab
    let isPiPActive = false;
    let activePiPVideo: HTMLVideoElement | null = null;

    function handlePiPExit() {
      if (!isPiPActive && !activePiPVideo) return;
      isPiPActive = false;
      activePiPVideo = null;
      console.log('__FORGE_PIP_RETURN_TO_PAGE__');
      console.log('__FORGE_PIP_LEAVE__');
    }

    // Intercept native requestPictureInPicture directly on video prototype
    try {
      const origReqPiP = HTMLVideoElement.prototype.requestPictureInPicture;
      if (origReqPiP) {
        HTMLVideoElement.prototype.requestPictureInPicture = async function(...args: any[]) {
          isPiPActive = true;
          activePiPVideo = this;
          console.log('__FORGE_PIP_ENTER__');

          const onElemLeave = () => {
            this.removeEventListener('leavepictureinpicture', onElemLeave, true);
            handlePiPExit();
          };
          this.addEventListener('leavepictureinpicture', onElemLeave, true);

          return origReqPiP.apply(this, args);
        };
      }
    } catch(e) {}

    // Global capture listeners
    document.addEventListener('enterpictureinpicture', function(e) {
      isPiPActive = true;
      activePiPVideo = e.target as HTMLVideoElement;
      console.log('__FORGE_PIP_ENTER__');
      if (e.target && typeof (e.target as any).addEventListener === 'function') {
        const onTargetLeave = () => {
          (e.target as any).removeEventListener('leavepictureinpicture', onTargetLeave, true);
          handlePiPExit();
        };
        (e.target as any).addEventListener('leavepictureinpicture', onTargetLeave, true);
      }
    }, true);

    window.addEventListener('focus', function() {
      if (isPiPActive) {
        console.log('__FORGE_PIP_RETURN_TO_PAGE__');
      }
    });

    document.addEventListener('leavepictureinpicture', function() {
      handlePiPExit();
    }, true);

    // Periodic safety check in case events were stopped from propagating by site scripts
    let lastKnownPiPEl: Element | null = null;
    setInterval(() => {
      const current = document.pictureInPictureElement;
      if (current && !lastKnownPiPEl) {
        lastKnownPiPEl = current;
        isPiPActive = true;
        console.log('__FORGE_PIP_ENTER__');
      } else if (!current && lastKnownPiPEl) {
        lastKnownPiPEl = null;
        handlePiPExit();
      }
    }, 350);

    // 5. Cross-frame PiP & Fullscreen communication (works across all nested iframes)
    window.addEventListener('message', function(e) {
      if (!e.data || typeof e.data !== 'object') return;
      // Only accept messages from the same origin or from trusted Forge internal frames.
      // This prevents third-party pages from spoofing __FORGE_* commands.
      const allowedOrigin = window.location.origin;
      if (e.origin !== allowedOrigin && e.source !== window) return;
      if (e.data.type === '__FORGE_TOGGLE_PIP__') {
        const allV = getAllVideosInDocument();
        if (allV.length > 0) {
          togglePiP();
        } else {
          try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              if (iframes[i].contentWindow) {
                iframes[i].contentWindow!.postMessage({ type: '__FORGE_TOGGLE_PIP__' }, '*');
              }
            }
          } catch(err) {}
        }
      } else if (e.data.type === '__FORGE_TOGGLE_FULLSCREEN__') {
        const allV = getAllVideosInDocument();
        if (allV.length > 0) {
          toggleVideoFullscreen();
        } else {
          try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              if (iframes[i].contentWindow) {
                iframes[i].contentWindow!.postMessage({ type: '__FORGE_TOGGLE_FULLSCREEN__' }, '*');
              }
            }
          } catch(err) {}
        }
      } else if (e.data.type === '__FORGE_FOCUS_VIDEO__') {
        const v = activeVideo || (getAllVideosInDocument())[0];
        if (v) {
          try {
            window.focus();
            v.focus?.();
            v.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
          } catch(err) {}
        }
      }
    });

    // 6. State
    let activeVideo: HTMLVideoElement | null = null;
    let hideTimer: any = null;
    let theaterModeVideo: HTMLVideoElement | null = null;
    let theaterPrevStyles: any = null;

    // Track any video that starts playing anywhere on the page
    document.addEventListener('play', function(e) {
      if (e.target && (e.target as HTMLElement).tagName === 'VIDEO') {
        activeVideo = e.target as HTMLVideoElement;
      }
    }, true);

    // 7. Floating Control Pill
    const ctrlPill = document.createElement('div');
    ctrlPill.id = '__forge_video_fullscreen_pill';

    const btnFs = document.createElement('button');
    btnFs.id = '__forge_btn_fullscreen';
    btnFs.title = 'Pantalla Completa (F / Doble Click)';
    const svgFs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFs.setAttribute('width', '12');
    svgFs.setAttribute('height', '12');
    svgFs.setAttribute('viewBox', '0 0 24 24');
    svgFs.setAttribute('fill', 'none');
    svgFs.setAttribute('stroke', 'currentColor');
    svgFs.setAttribute('stroke-width', '2.5');
    svgFs.setAttribute('stroke-linecap', 'round');
    svgFs.setAttribute('stroke-linejoin', 'round');
    const pathFs = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathFs.setAttribute('d', 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3');
    svgFs.appendChild(pathFs);
    const spanFs = document.createElement('span');
    spanFs.textContent = 'Fullscreen';
    btnFs.appendChild(svgFs);
    btnFs.appendChild(spanFs);

    const btnPip = document.createElement('button');
    btnPip.id = '__forge_btn_pip';
    btnPip.title = 'Picture-in-Picture (PiP)';
    const svgPip = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgPip.setAttribute('width', '11');
    svgPip.setAttribute('height', '11');
    svgPip.setAttribute('viewBox', '0 0 24 24');
    svgPip.setAttribute('fill', 'none');
    svgPip.setAttribute('stroke', 'currentColor');
    svgPip.setAttribute('stroke-width', '2.5');
    svgPip.setAttribute('stroke-linecap', 'round');
    svgPip.setAttribute('stroke-linejoin', 'round');
    const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r1.setAttribute('x', '2'); r1.setAttribute('y', '3'); r1.setAttribute('width', '20'); r1.setAttribute('height', '14'); r1.setAttribute('rx', '2'); r1.setAttribute('ry', '2');
    const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r2.setAttribute('x', '12'); r2.setAttribute('y', '9'); r2.setAttribute('width', '8'); r2.setAttribute('height', '6'); r2.setAttribute('rx', '1');
    svgPip.appendChild(r1);
    svgPip.appendChild(r2);
    const spanPip = document.createElement('span');
    spanPip.textContent = 'PiP';
    btnPip.appendChild(svgPip);
    btnPip.appendChild(spanPip);

    ctrlPill.appendChild(btnFs);
    ctrlPill.appendChild(btnPip);

    // Floating Exit Theater Button
    const exitTheaterBtn = document.createElement('button');
    exitTheaterBtn.id = '__forge_btn_exit_theater';
    const svgExit = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgExit.setAttribute('width', '13');
    svgExit.setAttribute('height', '13');
    svgExit.setAttribute('viewBox', '0 0 24 24');
    svgExit.setAttribute('fill', 'none');
    svgExit.setAttribute('stroke', 'currentColor');
    svgExit.setAttribute('stroke-width', '2.5');
    svgExit.setAttribute('stroke-linecap', 'round');
    svgExit.setAttribute('stroke-linejoin', 'round');
    const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
    const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6'); l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
    svgExit.appendChild(l1);
    svgExit.appendChild(l2);
    const spanExit = document.createElement('span');
    spanExit.textContent = 'Exit Fullscreen';
    exitTheaterBtn.appendChild(svgExit);
    exitTheaterBtn.appendChild(spanExit);

    // CSS for controls & theater mode
    const ctrlStyle = document.createElement('style');
    ctrlStyle.id = '__forge_video_ctrl_css';
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
      if (!document.getElementById('__forge_video_fullscreen_pill')) {
        container.appendChild(ctrlPill);
        container.appendChild(exitTheaterBtn);
      }
      if (!document.getElementById('__forge_video_ctrl_css')) {
        (document.head || container).appendChild(ctrlStyle);
      }
    }

    function enterTheaterMode(video: HTMLVideoElement) {
      theaterModeVideo = video;
      theaterPrevStyles = {
        position: video.style.position,
        top: video.style.top,
        left: video.style.left,
        width: video.style.width,
        height: video.style.height,
        zIndex: video.style.zIndex,
        objectFit: video.style.objectFit,
        background: video.style.background,
      };

      const backdrop = document.createElement('div');
      backdrop.id = '__forge_theater_backdrop';
      backdrop.className = '__forge_lossless_fullscreen_backdrop';
      (document.body || document.documentElement).appendChild(backdrop);

      video.classList.add('__forge_lossless_fullscreen_video');
      exitTheaterBtn.style.display = 'flex';
      ctrlPill.classList.remove('forge-visible');
      hideControls();
    }

    function exitTheaterMode() {
      if (!theaterModeVideo) return;
      theaterModeVideo.classList.remove('__forge_lossless_fullscreen_video');
      if (theaterPrevStyles) {
        theaterModeVideo.style.position = theaterPrevStyles.position || '';
        theaterModeVideo.style.top = theaterPrevStyles.top || '';
        theaterModeVideo.style.left = theaterPrevStyles.left || '';
        theaterModeVideo.style.width = theaterPrevStyles.width || '';
        theaterModeVideo.style.height = theaterPrevStyles.height || '';
        theaterModeVideo.style.zIndex = theaterPrevStyles.zIndex || '';
        theaterModeVideo.style.objectFit = theaterPrevStyles.objectFit || '';
        theaterModeVideo.style.background = theaterPrevStyles.background || '';
      }
      theaterModeVideo = null;
      theaterPrevStyles = null;

      const backdrop = document.getElementById('__forge_theater_backdrop');
      if (backdrop) backdrop.remove();
      exitTheaterBtn.style.display = 'none';
    }

    exitTheaterBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      exitTheaterMode();
    });

    async function toggleVideoFullscreen(video?: HTMLVideoElement | null) {
      let v = video || activeVideo;
      if (!v) {
        const allV = getAllVideosInDocument();
        v = allV.find(vid => !vid.paused && vid.currentTime > 0) || allV.find(vid => !vid.paused) || allV[0];
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
        } catch(e) {}
      }

      const ytBtn = document.querySelector('.ytp-fullscreen-button') as HTMLElement;
      if (ytBtn && typeof ytBtn.click === 'function' && v.closest && v.closest('.html5-video-player')) {
        ytBtn.click();
        return;
      }

      const targetToFullscreen = (v.closest && (v.closest('#movie_player') || v.closest('.html5-video-player') || v.closest('[data-player]'))) || v;
      try {
        if ((targetToFullscreen as any).requestFullscreen) {
          await (targetToFullscreen as any).requestFullscreen({ navigationUI: 'hide' });
          return;
        } else if ((targetToFullscreen as any).webkitRequestFullscreen) {
          (targetToFullscreen as any).webkitRequestFullscreen();
          return;
        }
      } catch(err) {}

      enterTheaterMode(v);
    }

    async function togglePiP(video?: HTMLVideoElement | null) {
      let v = video || activeVideo;
      if (!v) {
        const allV = getAllVideosInDocument();
        v = allV.find(vid => !vid.paused && vid.currentTime > 0 && !vid.ended) ||
            allV.find(vid => !vid.paused) ||
            allV.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      }

      if (document.pictureInPictureElement) {
        try {
          await document.exitPictureInPicture();
          return;
        } catch(e) {}
      }

      if (v && (v as any).requestPictureInPicture) {
        try {
          v.removeAttribute('disablepictureinpicture');
          await (v as any).requestPictureInPicture();
          return;
        } catch(e) {
          console.warn('[Forge PiP] Failed to enter PiP on video:', e);
        }
      }

      // If no video was found directly, broadcast to child iframes
      try {
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          if (iframes[i].contentWindow) {
            iframes[i].contentWindow!.postMessage({ type: '__FORGE_TOGGLE_PIP__' }, '*');
          }
        }
      } catch(e) {}
    }

    function positionControlPill(video: HTMLVideoElement) {
      if (!video || theaterModeVideo) return;
      let rect: DOMRect;
      try {
        rect = video.getBoundingClientRect();
      } catch(e) { return; }

      // Skip tiny video elements or tracking pixels
      if (rect.width < 60 || rect.height < 40) {
        hideControls();
        return;
      }

      // Hide options if video is scrolled out of visible viewport
      if (rect.bottom <= 10 || rect.top >= window.innerHeight - 10 ||
          rect.right <= 10 || rect.left >= window.innerWidth - 10) {
        hideControls();
        return;
      }

      const top = Math.max(8, rect.top + 8);
      const right = Math.max(8, window.innerWidth - rect.right + 8);

      ctrlPill.style.top = top + 'px';
      ctrlPill.style.right = right + 'px';
      ctrlPill.classList.add('forge-visible');

      resetHideTimer();
    }

    function hideControls() {
      ctrlPill.classList.remove('forge-visible');
      if (hideTimer) clearTimeout(hideTimer);
    }

    function resetHideTimer() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        if (!ctrlPill.matches(':hover')) {
          hideControls();
        }
      }, 2500);
    }

    // Scroll & Wheel handling: immediately hide options on scroll, and restore when cursor is over video
    let lastMouseX = -1;
    let lastMouseY = -1;
    let scrollHideTimer: any = null;

    function handleScrollOrWheel() {
      hideControls();

      if (scrollHideTimer) clearTimeout(scrollHideTimer);
      scrollHideTimer = setTimeout(function() {
        // When scrolling stops, if cursor is resting over a video, re-show options at the video's new position
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

    window.addEventListener('scroll', handleScrollOrWheel, { passive: true, capture: true });
    document.addEventListener('scroll', handleScrollOrWheel, { passive: true, capture: true });
    window.addEventListener('wheel', handleScrollOrWheel, { passive: true, capture: true });

    ctrlPill.addEventListener('mouseenter', function() {
      if (hideTimer) clearTimeout(hideTimer);
    });
    ctrlPill.addEventListener('mouseleave', function() {
      resetHideTimer();
    });

    ctrlPill.querySelector('#__forge_btn_fullscreen')!.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      toggleVideoFullscreen(activeVideo);
    });

    ctrlPill.querySelector('#__forge_btn_pip')!.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      togglePiP(activeVideo);
    });

    // Find video with geometric bounding box check (resilient to transparent overlays)
    function findVideoAtCoordinates(clientX: number, clientY: number): HTMLVideoElement | null {
      const videos = getAllVideosInDocument();
      for (let i = videos.length - 1; i >= 0; i--) {
        const v = videos[i];
        try {
          const rect = v.getBoundingClientRect();
          if (rect.width >= 60 && rect.height >= 40) {
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
              return v;
            }
          }
        } catch(e) {}
      }
      return null;
    }

    function findVideoFromTarget(target: any, clientX?: number, clientY?: number): HTMLVideoElement | null {
      if (!target) return null;
      if (target.tagName === 'VIDEO') return target as HTMLVideoElement;
      if (target.querySelector && target.querySelector('video')) {
        return target.querySelector('video');
      }
      if (target.shadowRoot && target.shadowRoot.querySelector('video')) {
        return target.shadowRoot.querySelector('video');
      }
      if (target.closest) {
        const container = target.closest(
          '.video-player, .html5-video-player, #movie_player, [class*="player"], [class*="video"], [data-player], media-player, video-player, div[data-testid*="video"]'
        );
        if (container) {
          const v = container.querySelector('video') || (container.shadowRoot && container.shadowRoot.querySelector('video'));
          if (v) return v;
        }
      }
      if (target.parentElement) {
        const v = target.parentElement.querySelector('video');
        if (v) return v;
      }
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        return findVideoAtCoordinates(clientX, clientY);
      }
      return null;
    }

    let mouseMovePending = false;
    document.addEventListener('mousemove', function(e) {
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
        } else if (ctrlPill.classList.contains('forge-visible') && !ctrlPill.contains(target as Node)) {
          resetHideTimer();
        }
      });
    }, { passive: true, capture: true });

    document.addEventListener('fullscreenchange', function() {
      if (document.fullscreenElement && theaterModeVideo) {
        exitTheaterMode();
      }
    });

    // Expose on window for easy triggering from navigation bar and shortcuts
    (window as any).__forge_toggle_pip = togglePiP;
    (window as any).__forge_toggle_fullscreen = toggleVideoFullscreen;

    // Attach controls once DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initControls);
    } else {
      initControls();
    }
  }

  // 4. Cosmetic element-hiding CSS
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

  // Inject CSS directly into DOM
  const injectStyle = () => {
    try {
      if ((window as any).__forge_adblock_enabled === false) return;
      const style = document.createElement("style");
      style.id = "__forge_adblock_css";
      style.textContent = cosmeticCss;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      }
    } catch {}
  };

  // Inject JavaScript into main world (for YouTube & adblock scriptlets)
  const injectScript = () => {
    try {
      if (isSearchEngine) return;
      const script = document.createElement("script");
      const code = isYouTube ? youtubeCode : universalVideoCode;
      let safeScript: any = code;
      try {
        if ((window as any).trustedTypes?.defaultPolicy) {
          safeScript = (window as any).trustedTypes.defaultPolicy.createScript(code);
        }
      } catch {}
      script.textContent = safeScript;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(script);
        script.remove();
      }
    } catch {}
  };

  // 5. Universal media reproduction detector (video & audio) on any website
  let mediaDetectorInitialized = false;
  const setupMediaDetector = () => {
    if (mediaDetectorInitialized) return;
    mediaDetectorInitialized = true;

    const activeAudibleMedia = new Set<HTMLMediaElement>();

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
      } catch {}
    }

    function isMediaTarget(target: any): target is HTMLMediaElement {
      if (!target) return false;
      const tag = (target.tagName || "").toUpperCase();
      return tag === "VIDEO" || tag === "AUDIO";
    }

    function onMediaStart(target: any) {
      if (isMediaTarget(target)) {
        activeAudibleMedia.add(target);
        reportStatus();
      }
    }

    function onMediaStop(target: any) {
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

    // Periodic scan for truly playing media
    setInterval(() => {
      try {
        const all = Array.from(document.querySelectorAll("video, audio")) as HTMLMediaElement[];
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
      } catch {}
    }, 1000);
  };

  // 6. Focus Mode distraction-free cosmetic engine (only active when explicitly enabled via message)
  const setupFocusDistractionCleaner = () => {
    try {
      const host = (window.location.hostname || "").toLowerCase();
      let selectors: string[] = [];

      if (host.includes("youtube.com") || host.includes("youtu.be")) {
        selectors = [
          "ytd-reel-shelf-renderer",
          "ytd-rich-shelf-renderer:has(a[href*='/shorts'])",
          "#shorts-container",
          "ytd-guide-entry-renderer:has(a[title='Shorts'])",
          "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
        ];
      } else if (host.includes("twitter.com") || host.includes("x.com")) {
        selectors = [
          "[aria-label='Timeline: Trending now']",
          "[data-testid='trend']",
          "aside[role='complementary']",
        ];
      } else if (host.includes("instagram.com")) {
        selectors = [
          "a[href='/reels/']",
          "a[href='/explore/']",
          "div:has(> a[href*='/reels/'])",
        ];
      } else if (host.includes("tiktok.com")) {
        selectors = [
          "[data-e2e='feed-live']",
        ];
      } else if (host.includes("reddit.com")) {
        selectors = [
          "#right-sidebar-container",
        ];
      } else if (host.includes("linkedin.com")) {
        selectors = [
          "#news-module",
        ];
      } else if (host.includes("facebook.com")) {
        selectors = [
          "[data-pagelet='RightRail']",
        ];
      }

      const applyCosmetics = (active: boolean) => {
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

      // Listen for runtime Focus Mode toggles from the host
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "__FORGE_SET_FOCUS_MODE__") {
          applyCosmetics(!!e.data.active);
        }
      });
    } catch {}
  };

  // Run universal media controls and detector directly in preload
  initUniversalMediaControls();
  setupMediaDetector();
  setupFocusDistractionCleaner();

  // ================= CHROME WEB STORE COMPATIBILITY & EXTENSION INSTALLER =================
  let cwsCompatibilityInitialized = false;
  const installedExtIds = new Set<string>();
  const installingExtIds = new Set<string>();
  const uninstallingExtIds = new Set<string>();

  const isChromeWebStoreUrl = () => {
    try {
      const h = (window.location.hostname || "").toLowerCase();
      const u = (window.location.href || "").toLowerCase();
      return (
        h.includes("chromewebstore.google.com") ||
        h.includes("chrome.google.com") ||
        u.includes("chromewebstore.google.com")
      );
    } catch {
      return false;
    }
  };

  // Expose global bridge functions for Forge / WebView synchronization
  (window as any).__forge_sync_installed_extensions = (extIds: string[]) => {
    if (Array.isArray(extIds)) {
      installedExtIds.clear();
      extIds.forEach((id) => {
        if (typeof id === "string") installedExtIds.add(id.toLowerCase());
      });
      (window as any).__forge_installed_ids = Array.from(installedExtIds);
      renderNativeCwsButton();
    }
  };

  (window as any).__forge_mark_extension_installed = (extId: string, isInstalled: boolean) => {
    if (typeof extId === "string") {
      const idClean = extId.toLowerCase();
      installingExtIds.delete(idClean);
      uninstallingExtIds.delete(idClean);
      if (isInstalled) {
        installedExtIds.add(idClean);
        try {
          (window as any).__forge_dispatch_install_stage?.("install_complete");
        } catch {}
      } else {
        installedExtIds.delete(idClean);
        try {
          (window as any).__forge_dispatch_install_stage?.("install_failed");
        } catch {}
      }
      (window as any).__forge_installed_ids = Array.from(installedExtIds);
      renderNativeCwsButton();
    }
  };

  const getExtensionDetailsFromPage = () => {
    const href = window.location.href;
    const path = window.location.pathname;
    const pathMatch =
      path.match(/\/detail\/(?:([^/]+)\/)?([a-z]{32})/i) ||
      href.match(/\/detail\/([a-z]{32})/i) ||
      href.match(/\b([a-z]{32})\b/i);
    let extId = "";
    if (pathMatch) {
      if (pathMatch[2] && pathMatch[2].length === 32) extId = pathMatch[2];
      else if (pathMatch[1] && pathMatch[1].length === 32) extId = pathMatch[1];
      else if (pathMatch[0] && pathMatch[0].length === 32) extId = pathMatch[0];
    }
    extId = extId.toLowerCase();
    const extSlug = pathMatch && pathMatch[1] && pathMatch[1].length !== 32 ? pathMatch[1] : "";

    let friendlyName = "";
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent && h1.textContent.trim()) {
      friendlyName = h1.textContent.trim();
    } else if (extSlug) {
      friendlyName = extSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } else {
      friendlyName =
        document.title.split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
    }

    let iconUrl = "";
    const img = document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']");
    if (img) {
      iconUrl = (img as HTMLImageElement).src || "";
    }

    return { extId, friendlyName, iconUrl };
  };

  const removeSwitchToChromeBanner = () => {
    try {
      // 1. Dedicated custom element and attribute
      document.querySelectorAll('cws-install-banner, [data-banner="install-chrome"]').forEach((el) => {
        const html = el as HTMLElement;
        if (html.style.display !== "none") {
          html.style.setProperty("display", "none", "important");
          html.style.setProperty("height", "0", "important");
        }
      });

      // 2. Specific alert elements containing "Switch to Chrome", guarded strictly against content sections
      const alerts = document.querySelectorAll('[role="alert"], aside');
      alerts.forEach((el) => {
        const html = el as HTMLElement;
        if (html.style.display === "none") return;
        // Strict guard: NEVER hide anything containing headers, main, article, or buttons
        if (
          el.querySelector("h1") ||
          el.querySelector("cws-install-button") ||
          el.querySelector("main") ||
          el.querySelector("article") ||
          html.offsetHeight > 180
        ) {
          return;
        }

        const text = (el.textContent || "").trim().toLowerCase();
        if (
          text.includes("switch to chrome") ||
          text.includes("cambiar a chrome") ||
          text.includes("passer à chrome") ||
          text.includes("zu chrome wechseln") ||
          text.includes("install chrome to add") ||
          text.includes("para añadir una extensión o un tema a chrome") ||
          text.includes("to add an extension or theme to chrome")
        ) {
          html.style.setProperty("display", "none", "important");
          html.style.setProperty("height", "0", "important");
        }
      });
    } catch {}
  };

  let cwsStylesInjected = false;
  const injectCwsStyles = () => {
    if (cwsStylesInjected || document.getElementById("forge-cws-styles")) return;
    try {
      const style = document.createElement("style");
      style.id = "forge-cws-styles";
      style.textContent = `
        @keyframes forge_cws_spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        /* Eliminate only dedicated Switch to Chrome banners, never content wrappers */
        cws-install-banner,
        [data-banner="install-chrome"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        /* Ensure circular progress inside install button is cleanly hidden without touching buttons */
        cws-install-button md-circular-progress,
        cws-install-button [role="progressbar"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      const target = document.head || document.documentElement || document.body;
      if (target) {
        target.appendChild(style);
        cwsStylesInjected = true;
      }
    } catch {}
  };

  let cwsPolyfillInjected = false;
  const injectWebstorePrivatePolyfill = () => {
    if (cwsPolyfillInjected) return;
    try {
      const polyfillCode = `
        (function() {
          if (window.__forge_webstore_polyfilled) return;
          window.__forge_webstore_polyfilled = true;
          window.chrome = window.chrome || {};

          function makeEvent() {
            var list = new Set();
            return {
              addListener: function(fn) { if (typeof fn === 'function') list.add(fn); },
              removeListener: function(fn) { list.delete(fn); },
              hasListener: function(fn) { return list.has(fn); },
              hasListeners: function() { return list.size > 0; },
              dispatch: function() {
                var args = Array.prototype.slice.call(arguments);
                for (var fn of list) {
                  try { fn.apply(null, args); } catch (e) {}
                }
              }
            };
          }

          var onInstallStageChanged = makeEvent();
          var onDownloadProgress = makeEvent();

          var webstoreMock = {
            onInstallStageChanged: onInstallStageChanged,
            onDownloadProgress: onDownloadProgress,
            getExtensionStatus: function(id, manifest, callback) {
              var cb = typeof manifest === 'function' ? manifest : callback;
              var list = window.__forge_installed_ids || [];
              var isInstalled = list.indexOf(String(id || '').toLowerCase()) !== -1;
              var status = isInstalled ? 'enabled' : 'installable';
              if (typeof cb === 'function') {
                try { cb(status); } catch (e) {}
              }
              return Promise.resolve(status);
            },
            beginInstallWithManifest3: function(details, callback) {
              var extId = (details && typeof details === 'string' ? details : (details && details.id ? details.id : '')).toLowerCase();
              if (!extId) {
                var m = window.location.pathname.match(/\\/detail\\/(?:[^/]+\\/)?([a-z]{32})/i) ||
                        window.location.href.match(/\\/detail\\/([a-z]{32})/i) ||
                        window.location.href.match(/\\b([a-z]{32})\\b/i);
                if (m) extId = (m[2] || m[1] || m[0]).toLowerCase();
              }
              var extName = (details && details.localizedName ? details.localizedName : (document.querySelector('h1')?.textContent || '')).trim();
              var iconUrl = details && details.iconUrl ? details.iconUrl : (document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']")?.src || '');
              
              if (extId) {
                console.log('__FORGE_EXT_INSTALL__:' + JSON.stringify({
                  id: extId,
                  name: extName,
                  iconUrl: iconUrl,
                  url: window.location.href
                }));
              }
              try { onInstallStageChanged.dispatch('installing'); } catch (e) {}
              if (typeof callback === 'function') {
                setTimeout(function() { try { callback(''); } catch (e) {} }, 10);
              }
              return Promise.resolve('');
            },
            completeInstall: function(id, callback) {
              try { onInstallStageChanged.dispatch('install_complete'); } catch (e) {}
              if (typeof callback === 'function') {
                setTimeout(function() { try { callback(); } catch (e) {} }, 10);
              }
              return Promise.resolve();
            },
            install: function(id, callback) {
              var targetId = String(id || '').toLowerCase();
              if (targetId) {
                console.log('__FORGE_EXT_INSTALL__:' + JSON.stringify({
                  id: targetId,
                  url: window.location.href
                }));
              }
              if (typeof callback === 'function') {
                setTimeout(function() { try { callback(''); } catch (e) {} }, 10);
              }
              return Promise.resolve('');
            },
            getBrowserLogin: function(cb) { if (cb) cb({ login: '' }); return Promise.resolve({ login: '' }); },
            getStoreLogin: function(cb) { if (cb) cb(''); return Promise.resolve(''); },
            setStoreLogin: function(login, cb) { if (cb) cb(); return Promise.resolve(); },
            getWebGLStatus: function(cb) { if (cb) cb('webgl_allowed'); return Promise.resolve('webgl_allowed'); },
            getIsLauncherEnabled: function(cb) { if (cb) cb(false); return Promise.resolve(false); },
            isInIncognitoMode: function(cb) { if (cb) cb(false); return Promise.resolve(false); },
            isPendingCustodianApproval: function(id, cb) { if (cb) cb(false); return Promise.resolve(false); },
            getReferrerChain: function(cb) { if (cb) cb(''); return Promise.resolve(''); },
            getFullChromeVersion: function(cb) { if (cb) cb({ version_number: '134.0.6998.88' }); return Promise.resolve({ version_number: '134.0.6998.88' }); },
            getMV2DeprecationStatus: function(cb) { if (cb) cb('inactive'); return Promise.resolve('inactive'); },
            shouldShowEnterprisePromotionBanner: function(cb) { if (cb) cb('PROMOTION_TYPE_UNSPECIFIED'); return Promise.resolve('PROMOTION_TYPE_UNSPECIFIED'); }
          };

          window.__forge_dispatch_install_stage = function(stage) {
            try {
              onInstallStageChanged.dispatch(stage);
              if (stage === 'install_complete' && typeof webstoreMock.completeInstall === 'function') {
                try { webstoreMock.completeInstall(); } catch(e) {}
              }
            } catch(e) {}
          };

          try {
            Object.defineProperty(window.chrome, 'webstorePrivate', {
              value: webstoreMock,
              writable: true,
              configurable: true
            });
          } catch (e) {
            window.chrome.webstorePrivate = webstoreMock;
          }
        })();
      `;
      const s = document.createElement("script");
      let safePolyfill: any = polyfillCode;
      try {
        if ((window as any).trustedTypes?.defaultPolicy) {
          safePolyfill = (window as any).trustedTypes.defaultPolicy.createScript(polyfillCode);
        }
      } catch {}
      s.textContent = safePolyfill;
      const target = document.head || document.documentElement || document.body;
      if (target) {
        target.appendChild(s);
        s.remove();
        cwsPolyfillInjected = true;
      }
    } catch {}
  };

  const renderNativeCwsButton = () => {
    if (!isChromeWebStoreUrl()) return;
    removeSwitchToChromeBanner();
    injectCwsStyles();
    injectWebstorePrivatePolyfill();

    const { extId, friendlyName, iconUrl } = getExtensionDetailsFromPage();
    if (!extId) return;

    const isInstalled = installedExtIds.has(extId.toLowerCase());
    const isInstalling = installingExtIds.has(extId.toLowerCase());
    const isUninstalling = uninstallingExtIds.has(extId.toLowerCase());

    const desiredState = isInstalling
      ? "installing"
      : isUninstalling
      ? "uninstalling"
      : isInstalled
      ? "installed"
      : "not_installed";

    const isSpanish =
      (navigator.language || "").toLowerCase().startsWith("es") ||
      (document.documentElement.lang || "").toLowerCase().startsWith("es") ||
      window.location.href.includes("hl=es");

    const installButtonContainers = document.querySelectorAll("cws-install-button");
    if (!installButtonContainers.length) return;

    installButtonContainers.forEach((container) => {
      const shadow = (container as any).shadowRoot as ShadowRoot | null;
      const targetParent = shadow || container;

      // 1. Cleanly hide any infinite progressbar inside shadow root and container
      if (shadow) {
        if (!shadow.getElementById("forge-shadow-style")) {
          try {
            const sStyle = document.createElement("style");
            sStyle.id = "forge-shadow-style";
            sStyle.textContent = `
              md-circular-progress, [role="progressbar"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
              }
            `;
            shadow.appendChild(sStyle);
          } catch {}
        }
        shadow.querySelectorAll("md-circular-progress, [role='progressbar']").forEach((s) => {
          const el = s as HTMLElement;
          if (el.style.display !== "none") {
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("opacity", "0", "important");
            el.style.setProperty("width", "0", "important");
            el.style.setProperty("height", "0", "important");
          }
        });
      }

      container.querySelectorAll("md-circular-progress, [role='progressbar']").forEach((s) => {
        const el = s as HTMLElement;
        if (el.style.display !== "none") {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("width", "0", "important");
          el.style.setProperty("height", "0", "important");
        }
      });

      // 2. Identify and control the single button element in the container/shadow
      let actionBtn = targetParent.querySelector("button") as HTMLButtonElement | null;
      if (!actionBtn) {
        const mdBtn = targetParent.querySelector("md-filled-button, md-outlined-button");
        if (mdBtn) {
          actionBtn = (mdBtn.shadowRoot?.querySelector("button") || mdBtn) as HTMLButtonElement;
        }
      }
      if (!actionBtn) {
        actionBtn = targetParent.querySelector("[role='button']") as HTMLButtonElement | null;
      }
      if (!actionBtn) {
        actionBtn = document.createElement("button");
        actionBtn.id = "forge-native-cws-btn";
        actionBtn.type = "button";
        targetParent.appendChild(actionBtn);
      }

      // Check if button is already configured in the desired state to prevent DOM thrashing
      if (actionBtn.dataset.forgeState === desiredState) {
        return;
      }
      actionBtn.dataset.forgeState = desiredState;

      // Remove any circular progress that Google may have injected inside the button itself
      actionBtn.querySelectorAll("md-circular-progress, [role='progressbar']").forEach((p) => p.remove());
      if (isInstalled) {
        targetParent.querySelectorAll("md-circular-progress, [role='progressbar']").forEach((p) => p.remove());
      }

      // Enable the button
      actionBtn.removeAttribute("disabled");
      actionBtn.removeAttribute("aria-disabled");
      actionBtn.removeAttribute("aria-busy");
      actionBtn.style.setProperty("pointer-events", "auto", "important");

      // Bind onclick handler
      actionBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentlyInstalled = installedExtIds.has(extId.toLowerCase());
        if (currentlyInstalled) {
          // Uninstall flow
          uninstallingExtIds.add(extId.toLowerCase());
          actionBtn!.dataset.forgeState = "";
          renderNativeCwsButton();
          console.log(
            "__FORGE_EXT_UNINSTALL__:" +
              JSON.stringify({
                id: extId.toLowerCase(),
                name: friendlyName,
              })
          );
        } else {
          // Install flow
          installingExtIds.add(extId.toLowerCase());
          actionBtn!.dataset.forgeState = "";
          renderNativeCwsButton();
          console.log(
            "__FORGE_EXT_INSTALL__:" +
              JSON.stringify({
                id: extId.toLowerCase(),
                name: friendlyName,
                iconUrl: iconUrl,
                url: window.location.href,
              })
          );
        }
      };

      // 3. Render state
      if (isInstalling) {
        // INSTALLING STATE: Clean progress spinner with "Instalando..." / "Installing..."
        const installingLabel = isSpanish ? "Instalando..." : "Installing...";
        actionBtn.textContent = "";
        const spin = document.createElement("span");
        spin.setAttribute(
          "style",
          "display:inline-block;width:14px;height:14px;border:2px solid #ffffff;border-top-color:transparent;border-radius:50%;animation:forge_cws_spin 0.8s linear infinite;margin-right:8px;flex-shrink:0;"
        );
        const text = document.createElement("span");
        text.textContent = installingLabel;
        actionBtn.appendChild(spin);
        actionBtn.appendChild(text);
        actionBtn.setAttribute(
          "style",
          `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background-color: #0b57d0 !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 9999px !important;
          padding: 0 24px !important;
          min-width: 140px !important;
          height: 40px !important;
          font-family: 'Google Sans', Roboto, -apple-system, sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          letter-spacing: 0.1px !important;
          cursor: wait !important;
          user-select: none !important;
          outline: none !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          pointer-events: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          `
        );
      } else if (isUninstalling) {
        // UNINSTALLING STATE: Clean red progress spinner with "Eliminando..." / "Removing..."
        const removingLabel = isSpanish ? "Eliminando..." : "Removing...";
        actionBtn.textContent = "";
        const spin = document.createElement("span");
        spin.setAttribute(
          "style",
          "display:inline-block;width:14px;height:14px;border:2px solid #b3261e;border-top-color:transparent;border-radius:50%;animation:forge_cws_spin 0.8s linear infinite;margin-right:8px;flex-shrink:0;"
        );
        const text = document.createElement("span");
        text.textContent = removingLabel;
        actionBtn.appendChild(spin);
        actionBtn.appendChild(text);
        actionBtn.setAttribute(
          "style",
          `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background-color: transparent !important;
          color: #b3261e !important;
          border: 1px solid #b3261e !important;
          border-radius: 9999px !important;
          padding: 0 24px !important;
          min-width: 140px !important;
          height: 40px !important;
          font-family: 'Google Sans', Roboto, -apple-system, sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          letter-spacing: 0.1px !important;
          cursor: wait !important;
          user-select: none !important;
          outline: none !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          pointer-events: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          `
        );
      } else if (isInstalled) {
        // INSTALLED: Material 3 Outlined button ("Eliminar de Chrome" / "Remove from Chrome")
        const removeLabel = isSpanish ? "Eliminar de Chrome" : "Remove from Chrome";
        actionBtn.textContent = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("style", "width:16px;height:16px;fill:currentColor;flex-shrink:0;");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z");
        svg.appendChild(path);
        const text = document.createElement("span");
        text.textContent = removeLabel;
        actionBtn.appendChild(svg);
        actionBtn.appendChild(text);
        actionBtn.setAttribute(
          "style",
          `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background-color: transparent !important;
          color: #0b57d0 !important;
          border: 1px solid #747775 !important;
          border-radius: 9999px !important;
          padding: 0 24px !important;
          min-width: 140px !important;
          height: 40px !important;
          font-family: 'Google Sans', Roboto, -apple-system, sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          letter-spacing: 0.1px !important;
          cursor: pointer !important;
          user-select: none !important;
          outline: none !important;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1) !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          pointer-events: auto !important;
          opacity: 1 !important;
          visibility: visible !important;
          `
        );

        actionBtn.onmouseenter = () => {
          actionBtn!.style.borderColor = "#b3261e";
          actionBtn!.style.color = "#b3261e";
          actionBtn!.style.backgroundColor = "rgba(179, 38, 30, 0.08)";
        };
        actionBtn.onmouseleave = () => {
          actionBtn!.style.borderColor = "#747775";
          actionBtn!.style.color = "#0b57d0";
          actionBtn!.style.backgroundColor = "transparent";
        };
      } else {
        // NOT INSTALLED: Material 3 Filled button ("Añadir a Chrome" / "Add to Chrome")
        const addLabel = isSpanish ? "Añadir a Chrome" : "Add to Chrome";
        actionBtn.textContent = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("style", "width:16px;height:16px;fill:currentColor;flex-shrink:0;");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z");
        svg.appendChild(path);
        const text = document.createElement("span");
        text.textContent = addLabel;
        actionBtn.appendChild(svg);
        actionBtn.appendChild(text);
        actionBtn.setAttribute(
          "style",
          `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background-color: #0b57d0 !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 9999px !important;
          padding: 0 24px !important;
          min-width: 140px !important;
          height: 40px !important;
          font-family: 'Google Sans', Roboto, -apple-system, sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          letter-spacing: 0.1px !important;
          cursor: pointer !important;
          user-select: none !important;
          outline: none !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1) !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          pointer-events: auto !important;
          opacity: 1 !important;
          visibility: visible !important;
          `
        );

        actionBtn.onmouseenter = () => {
          actionBtn!.style.backgroundColor = "#0842a0";
          actionBtn!.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        };
        actionBtn.onmouseleave = () => {
          actionBtn!.style.backgroundColor = "#0b57d0";
          actionBtn!.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        };
      }
    });
  };

  const setupChromeWebStoreCompatibility = () => {
    if (!isChromeWebStoreUrl()) return;

    try {
      // Request initial list of installed extensions from Forge
      try {
        console.log("__FORGE_REQUEST_INSTALLED_EXTENSIONS__");
      } catch {}

      // Initial render and banner removal
      renderNativeCwsButton();
      removeSwitchToChromeBanner();

      // Setup MutationObserver to continuously catch dynamically mounted components and remove banners
      if (!cwsCompatibilityInitialized) {
        let debounceTimer: any = null;
        const scheduleUpdate = () => {
          if (debounceTimer) return;
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            renderNativeCwsButton();
            removeSwitchToChromeBanner();
          }, 250);
        };

        const observer = new MutationObserver((mutations) => {
          let hasRelevant = false;
          for (const m of mutations) {
            const t = m.target as HTMLElement | null;
            if (!t) continue;
            if (t.id === "forge-cws-styles" || t.id === "forge-native-cws-btn" || t.id === "forge-shadow-style") continue;
            if (t.closest && t.closest("#forge-native-cws-btn")) continue;
            if (t.tagName === "STYLE" || t.tagName === "SCRIPT") continue;
            hasRelevant = true;
            break;
          }
          if (hasRelevant) {
            scheduleUpdate();
          }
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });

        // SPA Navigation watchers
        let lastUrl = window.location.href;
        const checkUrl = () => {
          try {
            if (window.location.href !== lastUrl) {
              lastUrl = window.location.href;
              console.log("__FORGE_REQUEST_INSTALLED_EXTENSIONS__");
              scheduleUpdate();
            }
          } catch {}
        };

        window.addEventListener("popstate", checkUrl);
        window.addEventListener("hashchange", checkUrl);
        try {
          const origPushState = history.pushState;
          if (typeof origPushState === "function") {
            history.pushState = function (...args: any[]) {
              const res = origPushState.apply(this, args);
              setTimeout(checkUrl, 100);
              return res;
            };
          }
          const origReplaceState = history.replaceState;
          if (typeof origReplaceState === "function") {
            history.replaceState = function (...args: any[]) {
              const res = origReplaceState.apply(this, args);
              setTimeout(checkUrl, 100);
              return res;
            };
          }
        } catch {}

        cwsCompatibilityInitialized = true;
      }
    } catch (err) {
      console.warn("[Forge CWS Compatibility Error]", err);
    }
  };

  // Run CWS setup immediately, on DOM ready, and on load
  setupChromeWebStoreCompatibility();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupChromeWebStoreCompatibility);
  }
  window.addEventListener("load", setupChromeWebStoreCompatibility);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initUniversalMediaControls();
    });
  } else {
    initUniversalMediaControls();
  }

  // ── Extension Inter-Context Messaging Flag for Webview Guests ─────────────
  try {
    (window as any).__forge_extension_env = { active: true, chromium152: true };
  } catch {}
})();
