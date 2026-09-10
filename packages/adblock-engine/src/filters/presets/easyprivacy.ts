export const EASYPRIVACY_PRESET_RULES = `
! Title: EasyPrivacy Core (Trackers & Analytics)
! Description: Tracking scripts, analytics beacons, telemetry endpoints, and user profiling
! Homepage: https://easylist.to/

! --- Major Web Analytics & User Tracking ---
||google-analytics.com^
||analytics.google.com^
||googletagmanager.com^
||hotjar.com^
||clarity.ms^
||mixpanel.com^
||segment.io^
||segment.com^
||fullstory.com^
||optimizely.com^
||sentry.io/api/*/envelope^
||pixel.facebook.com^
||connect.facebook.net^$script
||analytics.tiktok.com^
||mc.yandex.ru^
||scorecardresearch.com^
||statcounter.com^
||clicky.com^
||crazyegg.com^
||mouseflow.com^
||luckyorange.com^
||inspectlet.com^
||smartlook.com^
||logrocket.com^
||amplitude.com^
||heap.io^
||heapanalytics.com^
||posthog.com^
||kissmetrics.com^
||woopra.com^
||nr-data.net^
||bam.nr-data.net^
||datadoghq-browser-agent.com^
||browser-intake-datadoghq.com^
||branch.io^
||appsflyer.com^
||adjust.com^
||kochava.com^
||singular.net^
||tr.snapchat.com^
||sc-static.net^
||ct.pinterest.com^
||snap.licdn.com^
||ads-twitter.com^
||static.ads-twitter.com^
||analytics.twitter.com^
||q.quora.com^
||chartbeat.com^
||chartbeat.net^
||parsely.com^
||matomo.org^
||piwik.pro^
||snowplowanalytics.com^
||omtrdc.net^
||demdex.net^
||everesttech.net^
||bluekai.com^
||crwdcntrl.net^
||rlcdn.com^
||agkn.com^
||exelator.com^
||tapad.com^
||liveramp.com^
||id5-sync.com^

! --- Telemetry & Tracker Patterns ---
||telemetry.*^
||tracker.*^
||beacon.*^
/analytics.js
/gtag/js
/fbevents.js
`;
