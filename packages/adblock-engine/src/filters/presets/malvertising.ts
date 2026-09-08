export const MALVERTISING_PRESET_RULES = `
! Title: Forge Malvertising & Threat Shield
! Description: Blocks malicious advertising networks, in-browser cryptominers, scam popunders, and exploit scripts
! Homepage: https://github.com/Joel-Dev0/Forge

! --- In-Browser Cryptocurrency Mining Scripts ---
||coinhive.com^
||coin-hive.com^
||cryptoloot.pro^
||crypto-loot.com^
||jsecoin.com^
||webminepool.com^
||authedmine.com^
||monerominer.rocks^
||minr.pw^
||coinhave.com^
||coinblind.com^
||cloudcoins.co^
||papoto.com^
||miner.pr0gramm.com^
||gridcash.net^
||webassembly.stream^
||browsermine.com^
||webminer.pro^
||deepminer.org^
||moneroocean.stream^

! --- Malicious Ad Redirectors, Popunders & Exploit Delivery ---
||ad-maven.com^
||popcash.net^
||popads.net^
||trafficstars.com^
||exoclick.com^
||ero-advertising.com^
||adsterra.com^
||propellerads.com^
||hilltopads.net^
||clickadu.com^
||juicyads.com^
||yllix.com^
||bidvertiser.com^
||ad-rotator.net^
||traffic-media.co^
||directrev.com^
||zeroad.net^
||clkmon.com^
||bestadbid.com^
||adclicker.info^
||redirect-ad.com^

! --- Phishing Ads, Fake Antivirus & Tech Support Scams ---
||*-update-alert.com^
||tech-support-alert.*^
||fake-antivirus-*^
||critical-security-alert.*^
||system-cleaner-alert.*^
||windows-defender-alert.*^
||apple-support-warning.*^
||device-infected-alert.*^
||virus-scan-report.*^
||trojan-detection-alert.*^
||chrome-security-center.*^
||firefox-patch-update.*^
||win-safety-warning.*^
||pc-health-scan.*^
`;
