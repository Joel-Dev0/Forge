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
||connect.facebook.net/en_US/fbevents.js
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
||datadoghq-browser-agent.com^
||branch.io^
||appsflyer.com^
||adjust.com^
||kochava.com^
||singular.net^

! --- Telemetry & Tracker Patterns ---
||telemetry.*^
||tracker.*^
||beacon.*^
`;
