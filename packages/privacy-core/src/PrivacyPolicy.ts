export type BrowsingMode = "normal" | "private" | "tor";

export interface PrivacyPolicy {
  mode: BrowsingMode;
  allowPersistentStorage: boolean;
  allowPersistentCookies: boolean;
  allowPersistentCache: boolean;
  allowHistoryRecording: boolean;
  allowDownloadHistory: boolean;
  allowExtensions: boolean;
  allowWebRTC: boolean;
  webRtcIPHandlingPolicy: "default" | "default_public_interface_only" | "disable_non_proxied_udp" | "disable_all";
  shieldsEnabled: boolean;
  adblockStrict: boolean;
  trackerProtectionStrict: boolean;
  socialFilterEnabled: boolean;
  forceHttps: boolean;
  blockFingerprinting: boolean;
}

export const NORMAL_PRIVACY_POLICY: PrivacyPolicy = {
  mode: "normal",
  allowPersistentStorage: true,
  allowPersistentCookies: true,
  allowPersistentCache: true,
  allowHistoryRecording: true,
  allowDownloadHistory: true,
  allowExtensions: true,
  allowWebRTC: true,
  webRtcIPHandlingPolicy: "default",
  shieldsEnabled: true,
  adblockStrict: false,
  trackerProtectionStrict: false,
  socialFilterEnabled: true,
  forceHttps: false,
  blockFingerprinting: false,
};

export const PRIVATE_PRIVACY_POLICY: PrivacyPolicy = {
  mode: "private",
  allowPersistentStorage: false,
  allowPersistentCookies: false,
  allowPersistentCache: false,
  allowHistoryRecording: false,
  allowDownloadHistory: false, // files remain on disk, but history is not persisted
  allowExtensions: false, // disabled by default to avoid leaks
  allowWebRTC: true,
  webRtcIPHandlingPolicy: "default_public_interface_only",
  shieldsEnabled: true,
  adblockStrict: true,
  trackerProtectionStrict: true,
  socialFilterEnabled: true,
  forceHttps: true,
  blockFingerprinting: true,
};

export const TOR_PRIVACY_POLICY: PrivacyPolicy = {
  mode: "tor",
  allowPersistentStorage: false,
  allowPersistentCookies: false,
  allowPersistentCache: false,
  allowHistoryRecording: false,
  allowDownloadHistory: false,
  allowExtensions: false, // strictly disabled in Tor to prevent deanonymization
  allowWebRTC: false, // WebRTC completely isolated / restricted
  webRtcIPHandlingPolicy: "disable_non_proxied_udp", // standard Tor Browser defense
  shieldsEnabled: true,
  adblockStrict: true,
  trackerProtectionStrict: true,
  socialFilterEnabled: true,
  forceHttps: true,
  blockFingerprinting: true,
};

export function getPrivacyPolicyForMode(mode: BrowsingMode): PrivacyPolicy {
  switch (mode) {
    case "tor":
      return TOR_PRIVACY_POLICY;
    case "private":
      return PRIVATE_PRIVACY_POLICY;
    case "normal":
    default:
      return NORMAL_PRIVACY_POLICY;
  }
}
