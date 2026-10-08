/**
 * Returns scriptlet JavaScript code to be injected into web pages (YouTube & Universal Video Ad Blocker).
 */
export function getScriptlet(urlStr?: string): string {
  const isYouTube = urlStr ? (urlStr.includes("youtube.com") || urlStr.includes("youtu.be")) : false;

  return `
    (function() {
      ${isYouTube ? getYouTubeScriptletCode() : getUniversalVideoScriptletCode()}
    })();
  `;
}

function getYouTubeScriptletCode(): string {
  return `
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

    // 1. Intercept ytInitialPlayerResponse before player renders
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
      let _ytInitialData = sanitizeAdObject(window.ytInitialData);
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

    // 3. Active DOM Cleaner for Ad Banners, Ghost Hover Cards & Placeholders
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

    // 7. Continuous Video Ad Fast-Forward & Automatic Skipper
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
      const isAd = player && (
        player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting')
      );

      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

      if (isAd && video) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          originalMute = video.muted;
        }

        // Speed up and mute the ad silently without seeking video.currentTime
        video.muted = true;
        video.volume = 0;
        video.playbackRate = 16;

        // Skip immediately if player method is exposed
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

    setInterval(checkAndSkipAds, 100);

    try {
      const observer = new MutationObserver(() => checkAndSkipAds());
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src']
      });
    } catch {}
  `;
}

function getUniversalVideoScriptletCode(): string {
  return `
    if (window.__forge_universal_adblock_active) return;
    window.__forge_universal_adblock_active = true;

    // 1. Neutralize Google IMA SDK for HTML5 video players (Video.js, JW Player, Plyr)
    try {
      window.google = window.google || {};
      window.google.ima = window.google.ima || {
        AdDisplayContainer: function() {
          return { initialize: function() {}, destroy: function() {} };
        },
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

    // 2. Generic Video Ad Skipper & Fast-Forwarder
    function skipGenericVideoAds() {
      if (window.__forge_adblock_enabled === false) return;

      cleanGenericAdBannersAndHovers();

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

    // 3. Generic Ad Banner, Placeholder & Hover Defuser
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
  `;
}
