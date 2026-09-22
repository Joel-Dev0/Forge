import { SOCIAL_PLATFORMS, getSocialPlatformByDomain, type FocusActionTier } from "../../src/core/focus/socialRulesets.js";

export interface FocusStatePayload {
  isActive: boolean;
  profile: {
    id: string;
    name: string;
    tiers: Record<string, FocusActionTier>;
  };
}

let currentFocusState: FocusStatePayload = {
  isActive: false,
  profile: {
    id: "deep_work",
    name: "Deep Work",
    tiers: {},
  },
};

export function updateFocusState(state: FocusStatePayload) {
  currentFocusState = state;
}

export function isFocusModeActive(): boolean {
  return currentFocusState.isActive;
}

export function evaluateFocusRequest(urlStr: string): {
  blocked: boolean;
  action: "allow" | "limit_block" | "block";
  platformName?: string;
  reason?: string;
} {
  if (!currentFocusState.isActive) {
    return { blocked: false, action: "allow" };
  }

  try {
    const parsed = new URL(urlStr);
    const domain = parsed.hostname;
    const platform = getSocialPlatformByDomain(domain);
    if (!platform) {
      return { blocked: false, action: "allow" };
    }

    const tier =
      currentFocusState.profile?.tiers?.[platform.id] ||
      platform.defaultTier ||
      "ALLOW";

    if (tier === "BLOCK") {
      return {
        blocked: true,
        action: "block",
        platformName: platform.name,
        reason: `${platform.name} is completely blocked during Focus Mode.`,
      };
    }

    if (tier === "LIMIT") {
      if (platform.isBlockedUnderLimit(parsed.pathname)) {
        return {
          blocked: true,
          action: "limit_block",
          platformName: platform.name,
          reason: `Shorts, reels, and feeds on ${platform.name} are restricted in Focus Mode.`,
        };
      }
    }

    return { blocked: false, action: "allow" };
  } catch {
    return { blocked: false, action: "allow" };
  }
}

export function getFocusShieldHtml(platformName: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Focus Mode — Forge Browser</title>
  <style>
    :root {
      --bg: #090A0F;
      --card: #13151F;
      --border: #232736;
      --primary: #FF6B00;
      --purple: #8B5CF6;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: radial-gradient(ellipse at 50% 30%, #171026 0%, var(--bg) 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.7), 0 0 40px rgba(139, 92, 246, 0.15);
      animation: popIn 0.25s ease-out;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #A78BFA;
      font-size: 28px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .platform {
      color: var(--primary);
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .quote {
      background: rgba(0,0,0,0.3);
      border-left: 3px solid #8B5CF6;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      font-size: 13px;
      color: #DDD6FE;
      margin-bottom: 28px;
      text-align: left;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    button {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-back {
      background: var(--primary);
      color: #FFF;
      border: none;
    }
    .btn-back:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">🎯</div>
    <h1>Focus Mode Active</h1>
    <p><strong class="platform">${platformName}</strong> is restricted during your active focus session.<br>${reason}</p>
    <div class="quote">
      "Concentration is the secret of strength in politics, in war, in trade, in short in all management of human affairs."
    </div>
    <div class="actions">
      <button class="btn-back" onclick="history.back()">← Return to Safety</button>
    </div>
  </div>
</body>
</html>`;
}
