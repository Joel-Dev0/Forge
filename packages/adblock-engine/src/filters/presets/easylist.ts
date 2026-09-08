export const EASYLIST_PRESET_RULES = `
! Title: EasyList Core (Ad Blocking)
! Description: Popular advertising networks, ad servers, banners, and video ad trackers
! Homepage: https://easylist.to/

! --- Major Advertising Networks ---
||doubleclick.net^
||googlesyndication.com^
||adservice.google.com^
||pagead2.googlesyndication.com^
||adnxs.com^
||criteo.com^
||criteo.net^
||amazon-adsystem.com^
||rubiconproject.com^
||taboola.com^
||outbrain.com^
||pubmatic.com^
||openx.net^
||smartadserver.com^
||moatads.com^
||casalemedia.com^
||adform.net^
||zedo.com^
||popads.net^
||buysellads.com^
||adroll.com^
||media.net^
||sovrn.com^
||inmobi.com^
||revcontent.com^
||adskeeper.co.uk^
||mgid.com^
||bidswitch.net^
||yieldmo.com^
||sharethrough.com^
||triplelift.com^
||indexexchange.com^
||teads.tv^
||connatix.com^
||aniview.com^
||spotxchange.com^
||adtech.de^
||advertising.com^
||quantserve.com^
||propellerads.com^
||adcolony.com^
||admob.com^
||unityads.unity3d.com^
||applovin.com^
||ironsrc.com^
||vungle.com^
||chartboost.com^
||adpushup.com^
||exponential.com^
||adblade.com^
||adbutler.com^
||carbonads.net^
||adtrue.com^
||adsterra.com^
||exoclick.com^
||trafficjunky.com^
||trafficfactory.biz^

! --- Ad Paths and Generic Banner Patterns ---
/pagead/
/ads/banner/*
/adserver/*
/adframe.
/prebid.js
*ad_banner*
*banner_ad*
*ads.min.js
/dfp_ads.js
||ads.*^$script
||adserver.*^
||advert.*^
||banners.*^

! --- YouTube Ad & Tracking Endpoints ---
||googleads.g.doubleclick.net^
||static.doubleclick.net^
||youtube.com/api/stats/ads^
||youtube.com/pagead/*
||youtube.com/ptracking*
||youtube.com/youtubei/v1/player/ad_break*
||youtube.com/get_midroll_info*
||youtube.com/api/stats/qoe?*&adformat=
||youtube.com/api/stats/atr?*
||youtube.com/get_video_info?*&adformat=
||googlevideo.com/videoplayback*&adformat=
||googlevideo.com/videoplayback*&ad_type=

! --- Universal Video Ad Networks & IMA/VAST/VPAID SDKs ---
||imasdk.googleapis.com^
||pubads.g.doubleclick.net^
||securepubads.g.doubleclick.net^
||aniview.com^
||springserve.com^
||connatix.com^
||spotxchange.com^
||spotx.tv^
||tremorhub.com^
||innovid.com^
||vdo.ai^
||playwire.com^
||interactivedsp.com^
||jwpsrv.com^
||serving-sys.com^
||vidazoo.com^
||kargo.com^
`;
