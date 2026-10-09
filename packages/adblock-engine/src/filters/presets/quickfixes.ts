export const QUICKFIXES_PRESET_RULES = `
! Title: uBlock Origin Quick Fixes & YouTube AdShield
! Description: Rapid-response community rules targeting YouTube video ads, anti-adblock scripts, and bypass attempts.
! Homepage: https://github.com/uBlockOrigin/uAssets

! --- YouTube In-Stream Video Ad & Telemetry Endpoints ---
||youtube.com/api/stats/ads
||youtube.com/pagead/
||youtube.com/ptracking
||youtube.com/get_midroll_info
||youtube.com/api/stats/qoe?*adformat=
||youtube.com/api/stats/watchtime?*adformat=
||youtube.com/pcs/activeview
||play.google.com/log
||imasdk.googleapis.com
||googleads.g.doubleclick.net
||static.doubleclick.net
||s0.2mdn.net
||securepubads.g.doubleclick.net
||adclick.g.doubleclick.net
||pagead2.googleadservices.com
||www.google.com/pagead/
||fundingchoicesmessages.google.com

! --- Video Streaming & Adult VAST Networks (ExoClick / TrafficJunky) ---
||pemsrv.com^
||trafficjunky.com^
||trafficjunky.net^
||trafficfactory.biz^
||exoclick.com^
||tsyndicate.com^
||realsrv.com^
||magsrv.com^
||adxad.com^
||juicyads.com^

! --- Anti-Adblock Script Bypasses ---
||detectadblock.com^
||adblock-analytics.com^
||blockadblock.com^
||adinserter.pro^
||admiral.com^
||antiadblocksystems.com^

! --- Explicit Exceptions for Legitimate Video Playback Streams ---
@@||googlevideo.com/videoplayback
@@||youtube.com/videoplayback
`;
