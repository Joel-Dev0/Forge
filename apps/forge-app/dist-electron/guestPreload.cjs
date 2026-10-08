(() => {
  // electron/guestPreload.ts
  (function() {
    try {
      if (typeof window.trustedTypes !== "undefined" && typeof window.trustedTypes.createPolicy === "function") {
        if (!window.trustedTypes.defaultPolicy) {
          window.trustedTypes.createPolicy("default", {
            createHTML: (s) => s,
            createScript: (s) => s,
            createScriptURL: (s) => s
          });
        }
      }
    } catch {
    }
    const currentUrl = window.location.href || "";
    const isYouTube = currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be");
    const hostname = (window.location.hostname || "").toLowerCase();
    const isSearchEngine = hostname.includes("google.") || hostname.includes("bing.com") || hostname.includes("duckduckgo.com") || hostname.includes("ecosia.org") || hostname.includes("brave.com") || hostname.includes("yahoo.com") || hostname.includes("yandex.") || hostname.includes("baidu.com") || hostname.includes("startpage.com");
    const youtubeCode = `
    (function() {
      if (window.__forge_yt_blocker_active) return;
      window.__forge_yt_blocker_active = true;

      function isAdItem(item) {
        if (!item || typeof item !== 'object') return false;
        if (item.adSlotRenderer || item.inFeedAdLayoutRenderer || item.statementBannerRenderer ||
            item.bannerPromoRenderer || item.displayAdRenderer || item.promotedVideoRenderer ||
            item.promotedSparklesWebRenderer || item.primetimePromoRenderer ||
            item.brandVideoSingletonRenderer || item.brandVideoShelfRenderer || item.mastheadAd) {
          return true;
        }
        const richItem = item.richItemRenderer;
        if (richItem && typeof richItem === 'object') {
          const c = richItem.content;
          if (c && (c.adSlotRenderer || c.inFeedAdLayoutRenderer || c.displayAdRenderer ||
                    c.promotedVideoRenderer || c.promotedSparklesWebRenderer || c.bannerPromoRenderer ||
                    c.statementBannerRenderer || c.primetimePromoRenderer || c.brandVideoSingletonRenderer)) {
            return true;
          }
        return false;
      }

      function filterAdArrays(root, depth = 0) {
        if (!root || typeof root !== 'object' || depth > 8) return;
        if (Array.isArray(root)) {
          for (let i = root.length - 1; i >= 0; i--) {
            if (isAdItem(root[i])) {
              root.splice(i, 1);
            } else if (typeof root[i] === 'object') {
              filterAdArrays(root[i], depth + 1);
            }
          }
          return;
        }
        for (const key of Object.keys(root)) {
          const val = root[key];
          if (Array.isArray(val)) {
            for (let i = val.length - 1; i >= 0; i--) {
              if (isAdItem(val[i])) {
                val.splice(i, 1);
              } else if (typeof val[i] === 'object') {
                filterAdArrays(val[i], depth + 1);
              }
            }
          } else if (val && typeof val === 'object') {
            filterAdArrays(val, depth + 1);
          }
        }
      }

      function sanitizeAdObject(obj) {
        if (window.__forge_adblock_enabled === false) return obj;
        if (!obj || typeof obj !== 'object') return obj;
        try {
          if ('adPlacements' in obj) obj.adPlacements = [];
          if ('adSlots' in obj) obj.adSlots = [];
          if ('playerAds' in obj) obj.playerAds = [];
          delete obj.adBreakHeartbeatParams;
          delete obj.mastheadAd;
          filterAdArrays(obj);
        } catch {}
        return obj;
      }

      // Intercept client-side SPA player requests to neutralize ad placements
      try {
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await origFetch.apply(this, args);
          try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (url && url.includes('/youtubei/v1/player')) {
              const clone = response.clone();
              const data = await clone.json();
              if (data && typeof data === 'object') {
                if ('adPlacements' in data) data.adPlacements = [];
                if ('adSlots' in data) data.adSlots = [];
                if ('playerAds' in data) data.playerAds = [];
                delete data.adBreakHeartbeatParams;
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

      // 4. Active DOM Cleaner for Ad Banners, Ghost Hover Cards & Placeholders
      function cleanYouTubeAdBannersAndHovers() {
        if (window.__forge_adblock_enabled === false) return;
        try {
          const adSelectors = [
            'ytd-ad-slot-renderer',
            'ytd-in-feed-ad-layout-renderer',
            'ytd-banner-promo-renderer',
            'ytd-statement-banner-renderer',
            'ytd-display-ad-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-promoted-video-renderer',
            'ytd-brand-video-singleton-renderer',
            '#masthead-ad',
            'ytd-video-masthead-ad-v3-renderer',
            'ytd-video-masthead-ad-primary-v3-renderer',
            'ytd-action-companion-ad-renderer',
            'ytd-compact-promoted-video-renderer'
          ];

          for (const selector of adSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const parentCard = el.closest('ytd-rich-item-renderer');
              if (parentCard) {
                parentCard.style.display = 'none';
                parentCard.style.pointerEvents = 'none';
              } else {
                el.style.display = 'none';
                el.style.pointerEvents = 'none';
              }
            }
          }

          const sponsoredItems = document.querySelectorAll(
            'ytd-rich-item-renderer:has(.badge-style-type-ad), ' +
            'ytd-rich-item-renderer:has([aria-label*="Sponsored" i]), ' +
            'ytd-rich-item-renderer:has([aria-label*="Promoted" i]), ' +
            'ytd-rich-item-renderer:has([aria-label="Ad" i]), ' +
            'ytd-rich-item-renderer:has(#sparkles-container)'
          );
          for (const item of sponsoredItems) {
            item.style.display = 'none';
            item.style.pointerEvents = 'none';
          }

          const hoverOverlays = document.querySelectorAll('#hover-overlays');
          for (const h of hoverOverlays) {
            if (h.closest('ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer')) {
              h.style.display = 'none';
              h.style.pointerEvents = 'none';
            }
          }
        } catch {}
      }

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

        cleanYouTubeAdBannersAndHovers();

        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

        const isAd = player && (
          player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting')
        );

        if (isAd && video) {
          if (!wasAdShowing) {
            wasAdShowing = true;
            originalMute = video.muted;
          }

          // Speed up and mute the ad silently without seeking video.currentTime
          video.muted = true;
          video.volume = 0;
          video.playbackRate = 16;

          // Call built-in player skip method if exposed
          try {
            if (typeof player.skipAd === 'function') player.skipAd();
          } catch {}
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
            dlg.style.display = 'none';
            dlg.style.pointerEvents = 'none';
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

      // Universal Ad / Popunder Keywords & Networks
      const adUrlKeywords = [
        // Popunder & Pop-up Ad Networks
        'popads', 'popcash', 'adcash', 'propellerads', 'monetag', 'hilltopads',
        'adsterra', 'richads', 'clickadu', 'trafficstars', 'trafficjunky', 'trafficfactory',
        'runative', 'ad2up', 'juicyads', 'yllix', 'bidvertiser', 'exoclick', 'zeropark',
        'plugrush', 'adxad', 'clickaine', 'ad-maven', 'active8', 'daftads', 'twinred',
        'adkernel', 'galaksion', 'ezmob', 'clickadilla', 'rollerads', 'pushground', 'evadav',
        'coinhive', 'cryptoloot', 'crypto-loot',

        // Video Streaming Ad Networks & Redirect Gates
        'profitablecpmrate', 'profitablegatetocontent', 'highperformancegate', 'highcpmgate',
        'effectivecpmgate', 'realsrv', 'magsrv', 'xlviirdr', 'pukegoocha', 'whomeeno',
        'voomau', 'oortous', 'whounsoo', 'dooloust', 'shoumou', 'deloplen', 'grootso',
        'shukriya', 'slytherin', 'fastclick', 'short.ink', 'direct-link', 'shrinkme',
        'linkvertise', 'alwingulla', 'eastsour', 'cloutho', 'agacelebir', 'wheretheissomething',
        'onclick', 'adcontent', 'syndication', 'videobin', 'clicknupload',
        'streamwish', 'filemoon', 'mixdrop', 'streamvid', 'mp4upload',

        // Major Ad Servers & Exchanges
        'doubleclick', 'googlesyndication', 'adservice', 'adnxs', 'criteo', 'taboola',
        'outbrain', 'revenuehits', 'fastclick', 'directrev', 'clkmon', 'bestadbid',
        'adclicker', 'clksite', 'rotator', 'popunder', 'syndicate', 'realsrv',
        'tsyndicate', 'adtrue', 'adthrive', 'mediavine', 'infolinks', 'conversant',
        'rubiconproject', 'pubmatic', 'openx', 'casalemedia', 'yieldmo', 'smartadserver',
        'sovrn', 'revcontent', 'mgid', 'media.net', 'bidswitch', 'adroll', 'rubicon',
        'adform', 'zedo', 'aniview', 'springserve', 'connatix', 'spotxchange', 'spotx.tv',
        'adtech', 'quantserve', 'adcolony', 'admob', 'unityads', 'applovin', 'ironsrc',
        'vungle', 'chartboost', 'adpushup', 'adblade', 'adbutler', 'carbonads', 'zergnet',
        'raptive', 'yieldlove', 'snigelweb', 'shemedia', 'playwire', 'ezoic', 'a-ads',
        'coinzilla', 'bitmedia', 'cointraffic', 'popmyads', 'clicksor', 'buysellads',
        'zilla-networks', 'onclickprediction', 'onclickalgo', 'onclickbright', 'onclickperformance',
        'ad-rotator', 'traffic-media', 'zeroad', 'redirect-ad', 'pushsdk', 'push-notification',

        // Gambling / Betting Popups
        'bet365', '1xbet', 'betway', 'parimatch', 'mostbet', 'pin-up', 'vulkan',
        'casino', 'casinon', 'spelpaus', 'jackpotcity', 'spinpalace', 'betwinner',
        'megapari', 'melbet'
      ];

      const adRedirectPaths = [
        '/click.php', '/out.php', '/track.php', '/redirect.php', '/goto.php',
        '/jump.php', '/redir.php', '/traffic/', '/rotator/', '/adclick',
        '/ad_click', '/ad-click', '/pop/click', '/clk/', '/zone/', '/dispatcher.php',
        '/serving/ad', '/track/click', '/delivery/', '/go.php', '/ad.php', '/adv.php',
        '/link.php', '/count.php', '/click/'
      ];

      const adTrackingParams = [
        'click_id=', 'clickid=', 'aff_id=', 'affid=', 'subid=', 'sub_id=',
        'zoneid=', 'zone_id=', 'banner_id=', 'campaign_id=', 'pub_id=',
        'ref_id=', 'track_id=', 'popunder=', 'target_url=', 'redirect_url=',
        'ad_id=', 'adid='
      ];

      const legitimateAuthDomains = [
        'accounts.google.com', 'appleid.apple.com', 'github.com/login',
        'login.microsoftonline.com', 'facebook.com/dialog', 'facebook.com/v',
        'twitter.com/i/oauth2', 'x.com/i/oauth2', 'discord.com/oauth2',
        'paypal.com', 'auth0.com', 'okta.com', 'checkout.stripe.com', 'shopify.com'
      ];

      const isAdUrlString = function(url) {
        try {
          if (!url || typeof url !== 'string') return false;
          const str = url.toLowerCase();
          if (adUrlKeywords.some(k => str.includes(k))) return true;
          if (adRedirectPaths.some(p => str.includes(p))) return true;
          if (adTrackingParams.some(q => str.includes(q))) return true;
          return false;
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

          // Block if matches known ad/popunder keywords, paths or tracking params
          if (isAdUrlString(urlStr)) {
            console.warn('[Forge Shield] Blocked ad popunder URL:', url);
            return createDummyWindow();
          }

          // Check if third-party to current window
          let isThirdParty = false;
          try {
            if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
              const parsedTarget = new URL(url);
              isThirdParty = parsedTarget.hostname !== window.location.hostname;
            }
          } catch {}

          const isAuth = legitimateAuthDomains.some(d => urlStr.includes(d));

          // Block unprompted / programmatic window.open without genuine user gesture
          if (!isUserInitiated) {
            console.warn('[Forge Shield] Blocked unsolicited background popup:', url);
            return createDummyWindow();
          }

          // Block suspicious third-party popup windows with dimensions that are not OAuth
          const featStr = String(features || '').toLowerCase();
          const isMiniPopup = featStr.includes('width=') || featStr.includes('height=') || featStr.includes('location=0');
          if (isThirdParty && isMiniPopup && !isAuth) {
            console.warn('[Forge Shield] Blocked suspicious third-party miniature popup:', url);
            return createDummyWindow();
          }

          // Block rapid-fire popunder spam (max 1 window open per 2.0 seconds)
          if (now - lastOpenTime < 2000) {
            console.warn('[Forge Shield] Blocked rapid-fire popup spam:', url);
            return createDummyWindow();
          }

          lastOpenTime = now;
          return originalOpen.apply(this, arguments);
        };
      } catch {}

      // Helper to detect transparent/invisible click-trap overlays positioned over video players or iframes
      function isOverlayOverPlayerOrVideo(el) {
        if (!el || !(el instanceof HTMLElement)) return false;
        if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') return false;
        if (el.id && el.id.startsWith('__forge_')) return false;

        const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (!style) return false;
        const isPos = style.position === 'absolute' || style.position === 'fixed';
        if (!isPos) return false;

        const z = parseInt(style.zIndex || '0', 10);
        const isTransparent =
          parseFloat(style.opacity || '1') < 0.15 ||
          style.backgroundColor === 'transparent' ||
          style.backgroundColor === 'rgba(0, 0, 0, 0)';

        // If not transparent and not elevated z-index, not a click-trap overlay
        if (!isTransparent && z < 10) return false;

        // Check text content: click traps are invisible click catchers with no text or trivial text
        const text = (el.innerText || el.textContent || '').trim();
        if (text.length > 20) return false;

        // Check if inside a player or covering a video or iframe
        const parentPlayer = el.closest ? el.closest('.player, #player, .jwplayer, .video-js, [class*="player" i], [id*="player" i]') : null;
        if (parentPlayer && parentPlayer !== el) {
          if (!el.querySelector('video')) {
            return true;
          }
        }

        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!rect || rect.width < 40 || rect.height < 40) return false;

        // Full-screen or large overlay
        if (rect.width >= window.innerWidth * 0.65 && rect.height >= window.innerHeight * 0.65) {
          return true;
        }

        // Overlap with any <video> element
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          const vr = v.getBoundingClientRect();
          if (vr.width >= 80 && vr.height >= 80) {
            const xOverlap = Math.max(0, Math.min(rect.right, vr.right) - Math.max(rect.left, vr.left));
            const yOverlap = Math.max(0, Math.min(rect.bottom, vr.bottom) - Math.max(rect.top, vr.top));
            const overlap = xOverlap * yOverlap;
            const vArea = vr.width * vr.height;
            if (overlap / vArea > 0.4) {
              return true;
            }
          }
        }

        // Overlap with any embedded iframe
        const iframes = document.querySelectorAll('iframe');
        for (const f of iframes) {
          const fr = f.getBoundingClientRect();
          if (fr.width >= 120 && fr.height >= 120) {
            const xOverlap = Math.max(0, Math.min(rect.right, fr.right) - Math.max(rect.left, fr.left));
            const yOverlap = Math.max(0, Math.min(rect.bottom, fr.bottom) - Math.max(rect.top, fr.top));
            const overlap = xOverlap * yOverlap;
            const fArea = fr.width * fr.height;
            if (overlap / fArea > 0.4) {
              return true;
            }
          }
        }

        return false;
      }

      function attemptPlayVideo() {
        try {
          const video = document.querySelector('video');
          if (video && video.paused) {
            video.play().catch(() => {});
          }
        } catch {}
      }

      // 3. Synthetic Link Click, Form Submit & Event Dispatch Interceptor
      try {
        const interceptClickTrap = function(e) {
          if (window.__forge_adblock_enabled === false) return;

          // 1. Defuse video click-traps & overlays
          try {
            const el = e.target;
            if (el && el instanceof HTMLElement && isOverlayOverPlayerOrVideo(el)) {
              console.warn('[Forge Shield] Neutralized click-trap overlay over video player:', el);
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              try { el.remove(); } catch {}
              attemptPlayVideo();
              return;
            }
          } catch {}

          // 2. Block untrusted synthetic clicks generated by scripts on new-tab links
          if (!e.isTrusted) {
            try {
              const anchor = e.target && e.target.closest ? e.target.closest('a') : null;
              if (anchor && (anchor.target === '_blank' || isAdUrlString(anchor.href))) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.warn('[Forge Shield] Blocked untrusted synthetic click on link:', anchor.href);
                return;
              }
            } catch {}
          }

          // 3. Prevent clicks on identified ad links & ad redirectors
          try {
            const target = e.target && e.target.closest ? e.target.closest('a') : null;
            if (target && target.href && isAdUrlString(target.href)) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              console.warn('[Forge Shield] Prevented click on ad link:', target.href);
              attemptPlayVideo();
              return;
            }
          } catch {}
        };

        window.addEventListener('click', interceptClickTrap, true);
        window.addEventListener('pointerdown', interceptClickTrap, true);

        // Guard programmatic navigation methods
        try {
          const origAssign = window.location.assign;
          if (typeof origAssign === 'function') {
            window.location.assign = function(url) {
              if (window.__forge_adblock_enabled !== false && isAdUrlString(url)) {
                console.warn('[Forge Shield] Blocked location.assign to ad:', url);
                return;
              }
              return origAssign.apply(this, arguments);
            };
          }
          const origReplace = window.location.replace;
          if (typeof origReplace === 'function') {
            window.location.replace = function(url) {
              if (window.__forge_adblock_enabled !== false && isAdUrlString(url)) {
                console.warn('[Forge Shield] Blocked location.replace to ad:', url);
                return;
              }
              return origReplace.apply(this, arguments);
            };
          }
        } catch {}

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
          for (const el of allDivs) {
            if (isOverlayOverPlayerOrVideo(el)) {
              el.style.pointerEvents = 'none';
              el.remove();
            }
          }
        } catch {}
      }
      setInterval(removeClickTraps, 600);

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
          '.ad-container video:not(.html5-main-video)',
          '.video-ad video',
          'video[src*="doubleclick"]'
        ];

        for (const selector of adSelectors) {
          const adVideos = document.querySelectorAll(selector);
          for (const v of adVideos) {
            if (v instanceof HTMLVideoElement && !v.classList.contains('html5-main-video')) {
              v.muted = true;
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

      // 8. Generic Ad Banner, Placeholder & Hover Defuser
      function cleanGenericAdBannersAndHovers() {
        if (window.__forge_adblock_enabled === false) return;
        try {
          const adPlaceholders = document.querySelectorAll([
            '.ad-container', '.ad-banner', '.ad-placeholder', '.ad-slot',
            '.ad-box', '.ad-wrapper', '.banner-ad', '[class*="banner-ad" i]',
            '[class*="sticky-ad" i]', '[class*="floating-ad" i]', '[id^="google_ads_iframe"]',
            '[id^="div-gpt-ad"]', '.adsbygoogle'
          ].join(','));

          for (const el of adPlaceholders) {
            const hasContent = el.innerText && el.innerText.trim().length > 0;
            const hasVideo = el.querySelector('video');
            if (!hasVideo && (!hasContent || el.clientHeight < 20 || el.clientWidth < 20)) {
              el.style.display = 'none';
              el.style.pointerEvents = 'none';
              el.style.visibility = 'hidden';
              el.style.height = '0';
              el.style.maxHeight = '0';
              el.style.minHeight = '0';
              el.style.opacity = '0';
            }
          }
        } catch {}
      }

      setInterval(skipGenericVideoAds, 250);
      setInterval(cleanGenericAdBannersAndHovers, 500);
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
            const hasLegacyFullscreen = iframe.hasAttribute("allowfullscreen");
            let allow = iframe.getAttribute("allow") || "";
            let allowUpdated = false;
            if (!hasLegacyFullscreen && !allow.includes("fullscreen")) {
              allow = allow ? allow + "; fullscreen *" : "fullscreen *";
              allowUpdated = true;
            }
            if (!allow.includes("picture-in-picture")) {
              allow = allow ? allow + "; picture-in-picture *" : "picture-in-picture *";
              allowUpdated = true;
            }
            if (allowUpdated) {
              iframe.setAttribute("allow", allow);
            }
          }
          const videos = getAllVideosInDocument();
          for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (v.hasAttribute("disablepictureinpicture")) {
              v.removeAttribute("disablepictureinpicture");
            }
            if (v.hasAttribute("controlslist")) {
              const cl = v.getAttribute("controlslist") || "";
              if (/nopictureinpicture/i.test(cl)) {
                v.setAttribute("controlslist", cl.replace(/nopictureinpicture/gi, "").trim());
              }
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
        const allowedOrigin = window.location.origin;
        if (e.origin !== allowedOrigin && e.source !== window) return;
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
      const btnFs = document.createElement("button");
      btnFs.id = "__forge_btn_fullscreen";
      btnFs.title = "Pantalla Completa (F / Doble Click)";
      const svgFs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgFs.setAttribute("width", "12");
      svgFs.setAttribute("height", "12");
      svgFs.setAttribute("viewBox", "0 0 24 24");
      svgFs.setAttribute("fill", "none");
      svgFs.setAttribute("stroke", "currentColor");
      svgFs.setAttribute("stroke-width", "2.5");
      svgFs.setAttribute("stroke-linecap", "round");
      svgFs.setAttribute("stroke-linejoin", "round");
      const pathFs = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathFs.setAttribute("d", "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3");
      svgFs.appendChild(pathFs);
      const spanFs = document.createElement("span");
      spanFs.textContent = "Fullscreen";
      btnFs.appendChild(svgFs);
      btnFs.appendChild(spanFs);
      const btnPip = document.createElement("button");
      btnPip.id = "__forge_btn_pip";
      btnPip.title = "Picture-in-Picture (PiP)";
      const svgPip = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgPip.setAttribute("width", "11");
      svgPip.setAttribute("height", "11");
      svgPip.setAttribute("viewBox", "0 0 24 24");
      svgPip.setAttribute("fill", "none");
      svgPip.setAttribute("stroke", "currentColor");
      svgPip.setAttribute("stroke-width", "2.5");
      svgPip.setAttribute("stroke-linecap", "round");
      svgPip.setAttribute("stroke-linejoin", "round");
      const r1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r1.setAttribute("x", "2");
      r1.setAttribute("y", "3");
      r1.setAttribute("width", "20");
      r1.setAttribute("height", "14");
      r1.setAttribute("rx", "2");
      r1.setAttribute("ry", "2");
      const r2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r2.setAttribute("x", "12");
      r2.setAttribute("y", "9");
      r2.setAttribute("width", "8");
      r2.setAttribute("height", "6");
      r2.setAttribute("rx", "1");
      svgPip.appendChild(r1);
      svgPip.appendChild(r2);
      const spanPip = document.createElement("span");
      spanPip.textContent = "PiP";
      btnPip.appendChild(svgPip);
      btnPip.appendChild(spanPip);
      ctrlPill.appendChild(btnFs);
      ctrlPill.appendChild(btnPip);
      const exitTheaterBtn = document.createElement("button");
      exitTheaterBtn.id = "__forge_btn_exit_theater";
      const svgExit = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgExit.setAttribute("width", "13");
      svgExit.setAttribute("height", "13");
      svgExit.setAttribute("viewBox", "0 0 24 24");
      svgExit.setAttribute("fill", "none");
      svgExit.setAttribute("stroke", "currentColor");
      svgExit.setAttribute("stroke-width", "2.5");
      svgExit.setAttribute("stroke-linecap", "round");
      svgExit.setAttribute("stroke-linejoin", "round");
      const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l1.setAttribute("x1", "18");
      l1.setAttribute("y1", "6");
      l1.setAttribute("x2", "6");
      l1.setAttribute("y2", "18");
      const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l2.setAttribute("x1", "6");
      l2.setAttribute("y1", "6");
      l2.setAttribute("x2", "18");
      l2.setAttribute("y2", "18");
      svgExit.appendChild(l1);
      svgExit.appendChild(l2);
      const spanExit = document.createElement("span");
      spanExit.textContent = "Exit Fullscreen";
      exitTheaterBtn.appendChild(svgExit);
      exitTheaterBtn.appendChild(spanExit);
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
    /* YouTube Home & Feed Ad Banners, Promos, Sparkles & Sponsors */
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
    ytd-video-masthead-ad-primary-v3-renderer,
    ytd-primetime-promo-renderer,
    ytd-merch-shelf-renderer,
    ytd-brand-video-singleton-renderer,
    ytd-brand-video-shelf-renderer,

    /* YouTube Rich Grid Ad Items, Sections & Ghost Card Wrappers */
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    .ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
    .ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
    ytd-rich-item-renderer:has(ytd-banner-promo-renderer),
    .ytd-rich-item-renderer:has(ytd-banner-promo-renderer),
    ytd-rich-item-renderer:has(ytd-statement-banner-renderer),
    .ytd-rich-item-renderer:has(ytd-statement-banner-renderer),
    ytd-rich-item-renderer:has(ytd-display-ad-renderer),
    .ytd-rich-item-renderer:has(ytd-display-ad-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
    .ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-video-renderer),
    .ytd-rich-item-renderer:has(ytd-promoted-video-renderer),
    ytd-rich-item-renderer:has(ytd-brand-video-singleton-renderer),
    .ytd-rich-item-renderer:has(ytd-brand-video-singleton-renderer),
    ytd-rich-item-renderer:has(ytd-primetime-promo-renderer),
    .ytd-rich-item-renderer:has(ytd-primetime-promo-renderer),
    ytd-rich-item-renderer:has(#sparkles-container),
    .ytd-rich-item-renderer:has(#sparkles-container),
    ytd-rich-item-renderer:has([class*="badge-style-type-ad" i]),
    .ytd-rich-item-renderer:has([class*="badge-style-type-ad" i]),
    ytd-rich-item-renderer:has([aria-label*="Sponsored" i]),
    .ytd-rich-item-renderer:has([aria-label*="Sponsored" i]),
    ytd-rich-item-renderer:has([aria-label*="Promoted" i]),
    .ytd-rich-item-renderer:has([aria-label*="Promoted" i]),
    ytd-rich-item-renderer:has([aria-label="Ad" i]),
    .ytd-rich-item-renderer:has([aria-label="Ad" i]),

    /* Ad Hover Overlays & Previews */
    ytd-ad-slot-renderer #hover-overlays,
    ytd-banner-promo-renderer #hover-overlays,
    ytd-in-feed-ad-layout-renderer #hover-overlays,
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer) #hover-overlays,
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer) #hover-overlays,
    ytd-rich-item-renderer:has(ytd-banner-promo-renderer) #hover-overlays,
    ytd-rich-item-renderer:has([class*="badge-style-type-ad" i]) #hover-overlays,
    ytd-rich-item-renderer:has([aria-label*="Sponsored" i]) #hover-overlays,

    /* YouTube Video Player Ad Elements */
    #player-ads,
    .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytp-ad-message-container,
    .ytp-ad-text,
    .ytp-ad-preview-container,
    .ytp-ad-image-overlay,
    .ytp-ad-overlay-image,

    /* Search & Watch Page Side Ad Blocks */
    #panels ytd-ads-engagement-panel-content-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    ytd-action-companion-ad-renderer,
    ytd-compact-promoted-video-renderer,
    tp-yt-paper-dialog:has(#feedback.ytd-ad-feedback-renderer),
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) {
      display: none !important;
      height: 0 !important;
      max-height: 0 !important;
      min-height: 0 !important;
      width: 0 !important;
      max-width: 0 !important;
      min-width: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 0 !important;
      cursor: default !important;
    }

    /* Completely neutralize hover states and pointer interaction on ad elements and their wrappers */
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer):hover,
    .ytd-rich-item-renderer:has(ytd-ad-slot-renderer):hover,
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer):hover,
    .ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer):hover,
    ytd-rich-item-renderer:has(ytd-banner-promo-renderer):hover,
    .ytd-rich-item-renderer:has(ytd-banner-promo-renderer):hover,
    ytd-rich-item-renderer:has(ytd-statement-banner-renderer):hover,
    .ytd-rich-item-renderer:has(ytd-statement-banner-renderer):hover,
    ytd-rich-item-renderer:has(ytd-display-ad-renderer):hover,
    .ytd-rich-item-renderer:has(ytd-display-ad-renderer):hover,
    ytd-rich-item-renderer:has([class*="badge-style-type-ad" i]):hover,
    .ytd-rich-item-renderer:has([class*="badge-style-type-ad" i]):hover,
    ytd-rich-item-renderer:has([aria-label*="Sponsored" i]):hover,
    .ytd-rich-item-renderer:has([aria-label*="Sponsored" i]):hover,
    ytd-banner-promo-renderer:hover,
    ytd-statement-banner-renderer:hover,
    ytd-ad-slot-renderer:hover,
    #masthead-ad:hover {
      display: none !important;
      pointer-events: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      cursor: default !important;
      transform: none !important;
      box-shadow: none !important;
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
      min-height: 0 !important;
      width: 0 !important;
      max-width: 0 !important;
      min-width: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 0 !important;
      cursor: default !important;
    }

    /* Neutralize hover styles and pointer interaction on generic ad wrappers */
    .ad-container:hover,
    .ad-banner:hover,
    .ad-placeholder:hover,
    .ad-slot:hover,
    .ad-box:hover,
    .ad-wrapper:hover,
    .banner-ad:hover,
    [class*="banner-ad" i]:hover,
    [class*="sticky-ad" i]:hover,
    [class*="ad-slot" i]:hover,
    [class*="ad-wrapper" i]:hover {
      display: none !important;
      pointer-events: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      cursor: default !important;
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
        const code = isYouTube ? youtubeCode : universalVideoCode;
        let safeScript = code;
        try {
          if (window.trustedTypes?.defaultPolicy) {
            safeScript = window.trustedTypes.defaultPolicy.createScript(code);
          }
        } catch {
        }
        script.textContent = safeScript;
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
    const installingExtIds = /* @__PURE__ */ new Set();
    const uninstallingExtIds = /* @__PURE__ */ new Set();
    function queryDeepAll(selector, root = document) {
      const results = [];
      try {
        if (root instanceof Element && root.matches(selector)) {
          results.push(root);
        }
        const matching = root.querySelectorAll(selector);
        for (let i = 0; i < matching.length; i++) {
          results.push(matching[i]);
        }
        const all = root.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const child = all[i];
          if (child.shadowRoot) {
            const shadowMatches = queryDeepAll(selector, child.shadowRoot);
            for (let j = 0; j < shadowMatches.length; j++) {
              results.push(shadowMatches[j]);
            }
          }
        }
      } catch {
      }
      return results;
    }
    const isChromeWebStoreUrl = () => {
      try {
        const h = (window.location.hostname || "").toLowerCase();
        const u = (window.location.href || "").toLowerCase();
        return h.includes("chromewebstore.google.com") || h.includes("chrome.google.com") || u.includes("chromewebstore.google.com");
      } catch {
        return false;
      }
    };
    const syncInstalledList = (extIds) => {
      if (Array.isArray(extIds)) {
        installedExtIds.clear();
        extIds.forEach((id) => {
          if (typeof id === "string") installedExtIds.add(id.toLowerCase());
        });
        window.__forge_installed_ids = Array.from(installedExtIds);
        renderNativeCwsButton();
      }
    };
    window.__forge_sync_installed_extensions = syncInstalledList;
    window.addEventListener("forge:sync_installed_extensions", (e) => {
      syncInstalledList(e?.detail);
    });
    const markInstalledStatus = (extId, isInstalled) => {
      if (typeof extId === "string") {
        const idClean = extId.toLowerCase();
        installingExtIds.delete(idClean);
        uninstallingExtIds.delete(idClean);
        if (isInstalled) {
          installedExtIds.add(idClean);
          try {
            window.__forge_dispatch_install_stage?.("install_complete");
          } catch {
          }
        } else {
          installedExtIds.delete(idClean);
          try {
            window.__forge_dispatch_install_stage?.("install_failed");
          } catch {
          }
        }
        window.__forge_installed_ids = Array.from(installedExtIds);
        renderNativeCwsButton();
      }
    };
    window.__forge_mark_extension_installed = markInstalledStatus;
    window.addEventListener("forge:mark_extension_installed", (e) => {
      markInstalledStatus(e?.detail?.extId, Boolean(e?.detail?.isInstalled));
    });
    const getExtensionDetailsFromPage = () => {
      const href = window.location.href;
      const path = window.location.pathname;
      const pathMatch = path.match(/\/detail\/(?:([^/]+)\/)?([a-z]{32})/i) || href.match(/\/detail\/([a-z]{32})/i) || href.match(/\b([a-z]{32})\b/i);
      let extId = "";
      if (pathMatch) {
        if (pathMatch[2] && pathMatch[2].length === 32) extId = pathMatch[2];
        else if (pathMatch[1] && pathMatch[1].length === 32) extId = pathMatch[1];
        else if (pathMatch[0] && pathMatch[0].length === 32) extId = pathMatch[0];
      }
      extId = extId.toLowerCase();
      const extSlug = pathMatch && pathMatch[1] && pathMatch[1].length !== 32 ? pathMatch[1] : "";
      let friendlyName = "";
      const h1List = queryDeepAll("h1");
      if (h1List.length > 0 && h1List[0].textContent && h1List[0].textContent.trim()) {
        friendlyName = h1List[0].textContent.trim();
      } else if (extSlug) {
        friendlyName = extSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      } else {
        friendlyName = document.title.split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
      }
      let iconUrl = "";
      const imgList = queryDeepAll("img[src*='googleusercontent.com'], img[src*='extension']");
      if (imgList.length > 0 && imgList[0].src) {
        iconUrl = imgList[0].src;
      }
      return { extId, friendlyName, iconUrl };
    };
    const removeSwitchToChromeBanner = () => {
      try {
        const banners = queryDeepAll('cws-install-banner, [data-banner="install-chrome"]');
        banners.forEach((el) => {
          const html = el;
          if (html.style.display !== "none") {
            html.style.setProperty("display", "none", "important");
            html.style.setProperty("height", "0", "important");
          }
        });
        const alerts = queryDeepAll('[role="alert"], aside');
        alerts.forEach((el) => {
          const html = el;
          if (html.style.display === "none") return;
          if (el.querySelector("h1") || el.querySelector("cws-install-button") || el.querySelector("main") || el.querySelector("article") || html.offsetHeight > 180) {
            return;
          }
          const text = (el.textContent || "").trim().toLowerCase();
          if (text.includes("switch to chrome") || text.includes("cambiar a chrome") || text.includes("passer \xE0 chrome") || text.includes("zu chrome wechseln") || text.includes("install chrome to add") || text.includes("para a\xF1adir una extensi\xF3n o un tema a chrome") || text.includes("to add an extension or theme to chrome")) {
            html.style.setProperty("display", "none", "important");
            html.style.setProperty("height", "0", "important");
          }
        });
      } catch {
      }
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
      } catch {
      }
    };
    let cwsPolyfillInjected = false;
    const injectWebstorePrivatePolyfill = () => {
      if (cwsPolyfillInjected) return;
      try {
        const polyfillCode = `
        (function() {
          if (window.__forge_webstore_polyfilled || window.__forge_cws_mock_injected) return;
          window.__forge_webstore_polyfilled = true;
          window.__forge_cws_mock_injected = true;
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
        let safePolyfill = polyfillCode;
        try {
          if (window.trustedTypes?.defaultPolicy) {
            safePolyfill = window.trustedTypes.defaultPolicy.createScript(polyfillCode);
          }
        } catch {
        }
        s.textContent = safePolyfill;
        const target = document.head || document.documentElement || document.body;
        if (target) {
          target.appendChild(s);
          s.remove();
          cwsPolyfillInjected = true;
        }
      } catch {
      }
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
      const desiredState = isInstalling ? "installing" : isUninstalling ? "uninstalling" : isInstalled ? "installed" : "not_installed";
      const isSpanish = (navigator.language || "").toLowerCase().startsWith("es") || (document.documentElement.lang || "").toLowerCase().startsWith("es") || window.location.href.includes("hl=es");
      let installButtonContainers = queryDeepAll(
        "cws-install-button, cws-install-button-header, [data-is-install-button], [data-install-button]"
      );
      if (!installButtonContainers.length) {
        const progressElements = queryDeepAll("md-circular-progress, [role='progressbar']");
        const candidateParents = /* @__PURE__ */ new Set();
        progressElements.forEach((p) => {
          const parent = p.parentElement || p.getRootNode()?.host;
          if (parent && parent instanceof Element) {
            candidateParents.add(parent);
          }
        });
        installButtonContainers = Array.from(candidateParents);
      }
      if (!installButtonContainers.length) return;
      installButtonContainers.forEach((container) => {
        const shadow = container.shadowRoot;
        const targetParent = shadow || container;
        if (shadow) {
          if (!shadow.getElementById("forge-shadow-style")) {
            try {
              const sStyle = document.createElement("style");
              sStyle.id = "forge-shadow-style";
              sStyle.textContent = `
              md-circular-progress, [role="progressbar"], .loading-spinner {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                pointer-events: none !important;
              }
            `;
              shadow.appendChild(sStyle);
            } catch {
            }
          }
          shadow.querySelectorAll("md-circular-progress, [role='progressbar'], .loading-spinner").forEach((s) => {
            const el = s;
            if (el.style.display !== "none") {
              el.style.setProperty("display", "none", "important");
              el.style.setProperty("visibility", "hidden", "important");
              el.style.setProperty("opacity", "0", "important");
              el.style.setProperty("width", "0", "important");
              el.style.setProperty("height", "0", "important");
              el.style.setProperty("pointer-events", "none", "important");
            }
          });
        }
        container.querySelectorAll("md-circular-progress, [role='progressbar'], .loading-spinner").forEach((s) => {
          const el = s;
          if (el.style.display !== "none") {
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("opacity", "0", "important");
            el.style.setProperty("width", "0", "important");
            el.style.setProperty("height", "0", "important");
            el.style.setProperty("pointer-events", "none", "important");
          }
        });
        if (container instanceof HTMLElement) {
          container.style.setProperty("display", "inline-flex", "important");
          container.style.setProperty("visibility", "visible", "important");
          container.style.setProperty("opacity", "1", "important");
        }
        targetParent.querySelectorAll("md-filled-button, md-outlined-button").forEach((btn) => {
          btn.style.setProperty("display", "none", "important");
        });
        let actionBtn = targetParent.querySelector("#forge-native-cws-btn");
        if (!actionBtn) {
          actionBtn = document.createElement("button");
          actionBtn.id = "forge-native-cws-btn";
          actionBtn.type = "button";
          targetParent.appendChild(actionBtn);
        }
        if (actionBtn.dataset.forgeState === desiredState) {
          actionBtn.style.setProperty("display", "inline-flex", "important");
          actionBtn.style.setProperty("visibility", "visible", "important");
          return;
        }
        actionBtn.dataset.forgeState = desiredState;
        actionBtn.removeAttribute("disabled");
        actionBtn.removeAttribute("aria-disabled");
        actionBtn.removeAttribute("aria-busy");
        actionBtn.style.setProperty("pointer-events", "auto", "important");
        actionBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const currentlyInstalled = installedExtIds.has(extId.toLowerCase());
          if (currentlyInstalled) {
            uninstallingExtIds.add(extId.toLowerCase());
            actionBtn.dataset.forgeState = "";
            renderNativeCwsButton();
            console.log(
              "__FORGE_EXT_UNINSTALL__:" + JSON.stringify({
                id: extId.toLowerCase(),
                name: friendlyName
              })
            );
          } else {
            installingExtIds.add(extId.toLowerCase());
            actionBtn.dataset.forgeState = "";
            renderNativeCwsButton();
            console.log(
              "__FORGE_EXT_INSTALL__:" + JSON.stringify({
                id: extId.toLowerCase(),
                name: friendlyName,
                iconUrl,
                url: window.location.href
              })
            );
          }
        };
        if (isInstalling) {
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
            actionBtn.style.borderColor = "#b3261e";
            actionBtn.style.color = "#b3261e";
            actionBtn.style.backgroundColor = "rgba(179, 38, 30, 0.08)";
          };
          actionBtn.onmouseleave = () => {
            actionBtn.style.borderColor = "#747775";
            actionBtn.style.color = "#0b57d0";
            actionBtn.style.backgroundColor = "transparent";
          };
        } else {
          const addLabel = isSpanish ? "A\xF1adir a Chrome" : "Add to Chrome";
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
            actionBtn.style.backgroundColor = "#0842a0";
            actionBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
          };
          actionBtn.onmouseleave = () => {
            actionBtn.style.backgroundColor = "#0b57d0";
            actionBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
          };
        }
      });
    };
    const setupChromeWebStoreCompatibility = () => {
      if (!isChromeWebStoreUrl()) return;
      try {
        try {
          console.log("__FORGE_REQUEST_INSTALLED_EXTENSIONS__");
        } catch {
        }
        renderNativeCwsButton();
        removeSwitchToChromeBanner();
        if (!cwsCompatibilityInitialized) {
          let debounceTimer = null;
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
              const t = m.target;
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
            subtree: true
          });
          let lastUrl = window.location.href;
          const checkUrl = () => {
            try {
              if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log("__FORGE_REQUEST_INSTALLED_EXTENSIONS__");
                scheduleUpdate();
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
          cwsCompatibilityInitialized = true;
        }
      } catch (err) {
        console.warn("[Forge CWS Compatibility Error]", err);
      }
    };
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
    try {
      window.__forge_extension_env = { active: true, chromium152: true };
    } catch {
    }
  })();
})();
