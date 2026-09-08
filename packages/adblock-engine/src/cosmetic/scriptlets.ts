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

    // 1. Intercept ytInitialPlayerResponse at document-start before player renders
    try {
      let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return _ytInitialPlayerResponse;
        },
        set(val) {
          if (val && typeof val === 'object') {
            delete val.adPlacements;
            delete val.adSlots;
            delete val.playerAds;
            delete val.adBreakHeartbeatParams;
          }
          _ytInitialPlayerResponse = val;
        },
        configurable: true
      });
    } catch {}

    // 2. Intercept JSON.parse to remove ad placements from all dynamic responses
    try {
      const originalParse = JSON.parse;
      JSON.parse = function(...args) {
        const result = originalParse.apply(this, args);
        try {
          if (result && typeof result === 'object') {
            if (result.adPlacements) result.adPlacements = [];
            if (result.adSlots) result.adSlots = [];
            if (result.playerAds) result.playerAds = [];
            if (result.adBreakHeartbeatParams) delete result.adBreakHeartbeatParams;
          }
        } catch {}
        return result;
      };
    } catch {}

    // 3. Intercept fetch for /youtubei/v1/player
    try {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url.includes('/youtubei/v1/player')) {
            const clone = response.clone();
            const data = await clone.json();
            if (data && typeof data === 'object') {
              data.adPlacements = [];
              data.adSlots = [];
              data.playerAds = [];
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

    // 4. Continuous Video Ad Fast-Forward & Automatic Skipper
    let wasAdShowing = false;
    let originalMute = false;

    function checkAndSkipAds() {
      const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      const isAd = player && (
        player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting') ||
        document.querySelector('.ytp-ad-player-overlay') !== null
      );

      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

      if (isAd && video) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          originalMute = video.muted;
        }

        // Mute ad audio so user never hears it
        video.muted = true;

        // Skip to end of ad video instantly
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }
        video.playbackRate = 16;
      } else if (!isAd && wasAdShowing) {
        wasAdShowing = false;
        if (video) {
          video.playbackRate = 1;
          video.muted = originalMute;
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
        '.ytp-ad-overlay-close-container'
      ];

      for (const selector of skipSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn && typeof btn.click === 'function') {
            btn.click();
          }
        }
      }

      // Auto-dismiss anti-adblock enforcement modal if present
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
                // Return mock manager that signals all ads completed
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

      // Auto-click common skip ad buttons
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
  `;
}
