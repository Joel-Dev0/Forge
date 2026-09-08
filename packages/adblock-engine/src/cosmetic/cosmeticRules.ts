/**
 * Returns cosmetic element-hiding CSS for a given URL.
 */
export function getCosmeticCSS(urlStr?: string): string {
  let css = `
    /* Generic ad banners & sponsor placeholders */
    .ad-container,
    .ad-banner,
    .ad-placeholder,
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    .adsbygoogle {
      display: none !important;
    }
  `;

  if (!urlStr) return css;

  const isYouTube = urlStr.includes("youtube.com") || urlStr.includes("youtu.be");

  if (isYouTube) {
    css += `
      /* YouTube Home & Feed Ad Banners */
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
      .ytd-rich-item-renderer:has(ytd-display-ad-renderer),
      .ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
      tp-yt-paper-dialog:has(#feedback.ytd-ad-feedback-renderer),
      tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) {
        display: none !important;
      }
    `;
  }

  return css;
}
