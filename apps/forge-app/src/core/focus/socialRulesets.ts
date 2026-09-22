/**
 * Decoupled Platform-Specific Rulesets for Social Media Filtering
 * Provides granular controls across 3 Action Enforcement Tiers:
 * 1. BLOCK: Complete site restriction with Forge Focus Shield
 * 2. LIMIT: Functional boundaries (e.g. video watching allowed, shorts/reels/comments blocked)
 * 3. HIDE_DISTRACTIONS: Cosmetic CSS & DOM removal of feeds, reels, algorithmic recommendations, and infinite scroll
 */

export type FocusActionTier = "ALLOW" | "HIDE_DISTRACTIONS" | "LIMIT" | "BLOCK";

export interface SocialPlatformRuleset {
  id: string;
  name: string;
  domains: string[];
  icon: string;
  color: string;
  description: string;
  defaultTier: FocusActionTier;
  limitDescription: string;
  // Matching for Limit Tier URL request filtering
  isAllowedUnderLimit: (pathname: string) => boolean;
  isBlockedUnderLimit: (pathname: string) => boolean;
  // Cosmetic selectors for HIDE_DISTRACTIONS / LIMIT
  cosmeticSelectors: string[];
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatformRuleset> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    domains: ["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"],
    icon: "Youtube",
    color: "#EF4444",
    description: "World's video platform. High risk of infinite recommendation rabbit-holes and Shorts.",
    defaultTier: "LIMIT",
    limitDescription: "Allow watching specific videos & searching, while blocking Shorts shelves, comments, and home feed.",
    isAllowedUnderLimit: (path) => {
      // Allow watch, embed, results search, and player APIs
      return (
        path.startsWith("/watch") ||
        path.startsWith("/embed") ||
        path.startsWith("/results") ||
        path.startsWith("/api") ||
        path.startsWith("/youtubei")
      );
    },
    isBlockedUnderLimit: (path) => {
      return path.startsWith("/shorts") || path.startsWith("/feed/explore") || path.startsWith("/feed/trending");
    },
    cosmeticSelectors: [
      "#related",
      "#comments",
      "ytd-comments",
      "ytd-reel-shelf-renderer",
      "ytd-rich-shelf-renderer",
      "#shorts-container",
      "ytd-guide-entry-renderer:has(a[title='Shorts'])",
      "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
      "ytd-browse[page-subtype='home'] #contents",
    ],
  },

  twitter: {
    id: "twitter",
    name: "X / Twitter",
    domains: ["twitter.com", "x.com", "mobile.twitter.com", "mobile.x.com"],
    icon: "Twitter",
    color: "#1D9BF0",
    description: "Microblogging & social feed. Algorithmic 'For You' timeline and trending sidebar.",
    defaultTier: "BLOCK",
    limitDescription: "Allow direct messages, status links, and search, but block the infinite 'For You' feed.",
    isAllowedUnderLimit: (path) => {
      return (
        path.startsWith("/messages") ||
        path.startsWith("/search") ||
        path.startsWith("/i/api") ||
        path.includes("/status/")
      );
    },
    isBlockedUnderLimit: (path) => {
      return path === "/" || path === "/home" || path.startsWith("/explore");
    },
    cosmeticSelectors: [
      "[aria-label='Timeline: Your Home Timeline']",
      "[aria-label='Timeline: Trending now']",
      "[data-testid='sidebarColumn']",
      "[data-testid='trend']",
      "aside[role='complementary']",
    ],
  },

  instagram: {
    id: "instagram",
    name: "Instagram",
    domains: ["instagram.com"],
    icon: "Instagram",
    color: "#E1306C",
    description: "Visual social media. High dopamine loops via Reels and Explore grid.",
    defaultTier: "BLOCK",
    limitDescription: "Allow direct messages and profile links, while blocking Reels, Explore, and feed.",
    isAllowedUnderLimit: (path) => {
      return path.startsWith("/direct") || path.startsWith("/accounts") || path.startsWith("/api");
    },
    isBlockedUnderLimit: (path) => {
      return path === "/" || path.startsWith("/reels") || path.startsWith("/explore");
    },
    cosmeticSelectors: [
      "a[href='/reels/']",
      "a[href='/explore/']",
      "article[role='presentation']",
      "main[role='main'] > div > div:first-child",
      "div:has(> a[href*='/reels/'])",
    ],
  },

  tiktok: {
    id: "tiktok",
    name: "TikTok",
    domains: ["tiktok.com"],
    icon: "Film",
    color: "#00F2FE",
    description: "Ultra-fast short-form video feed with algorithmic addiction loops.",
    defaultTier: "BLOCK",
    limitDescription: "Block infinite FYP video stream and live feeds completely.",
    isAllowedUnderLimit: (path) => {
      return path.startsWith("/messages") || path.startsWith("/api");
    },
    isBlockedUnderLimit: (path) => {
      return path === "/" || path.startsWith("/foryou") || path.startsWith("/live");
    },
    cosmeticSelectors: [
      "[data-e2e='recommend-list-item-container']",
      "[data-e2e='feed-live']",
      "div[class*='DivItemContainer']",
    ],
  },

  reddit: {
    id: "reddit",
    name: "Reddit",
    domains: ["reddit.com", "old.reddit.com"],
    icon: "MessageSquare",
    color: "#FF4500",
    description: "Discussion platform. High distraction from r/all, r/popular, and endless scroll.",
    defaultTier: "LIMIT",
    limitDescription: "Allow direct search results and specific informative subreddits, while blocking popular feeds.",
    isAllowedUnderLimit: (path) => {
      return (
        path.startsWith("/search") ||
        path.startsWith("/message") ||
        (path.startsWith("/r/") && !path.startsWith("/r/all") && !path.startsWith("/r/popular"))
      );
    },
    isBlockedUnderLimit: (path) => {
      return path === "/" || path.startsWith("/r/all") || path.startsWith("/r/popular");
    },
    cosmeticSelectors: [
      "shreddit-feed[tab-name='popular']",
      "shreddit-feed[tab-name='all']",
      "#right-sidebar-container",
      "aside:has([data-testid='popular-communities'])",
      "[data-testid='recent-posts']",
    ],
  },

  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    domains: ["linkedin.com"],
    icon: "Linkedin",
    color: "#0A66C2",
    description: "Professional network. Distracting newsfeed, engagement posts, and promotional noise.",
    defaultTier: "HIDE_DISTRACTIONS",
    limitDescription: "Allow messaging and job applications while hiding the social media newsfeed.",
    isAllowedUnderLimit: (path) => {
      return (
        path.startsWith("/messaging") ||
        path.startsWith("/jobs") ||
        path.startsWith("/mynetwork") ||
        path.startsWith("/in/")
      );
    },
    isBlockedUnderLimit: (path) => {
      return path === "/feed" || path.startsWith("/feed/");
    },
    cosmeticSelectors: [
      "main.scaffold-layout__main",
      ".feed-shared-update-v2",
      "aside.scaffold-layout__aside",
      "#news-module",
    ],
  },

  facebook: {
    id: "facebook",
    name: "Facebook",
    domains: ["facebook.com", "m.facebook.com"],
    icon: "Share2",
    color: "#1877F2",
    description: "Social network with algorithmic feed, stories, and watch reels.",
    defaultTier: "BLOCK",
    limitDescription: "Allow Messenger and direct groups, while blocking the newsfeed.",
    isAllowedUnderLimit: (path) => {
      return path.startsWith("/messages") || path.startsWith("/groups") || path.startsWith("/events");
    },
    isBlockedUnderLimit: (path) => {
      return path === "/" || path.startsWith("/watch") || path.startsWith("/reel");
    },
    cosmeticSelectors: [
      "[role='feed']",
      "[data-pagelet='Stories']",
      "[aria-label='Stories']",
      "[data-pagelet='RightRail']",
    ],
  },
};

/**
 * Checks if a given hostname matches any registered social platform
 */
export function getSocialPlatformByDomain(domain: string): SocialPlatformRuleset | null {
  const clean = domain.toLowerCase().replace(/^(www\.|m\.)/, "");
  for (const platform of Object.values(SOCIAL_PLATFORMS)) {
    if (platform.domains.some((d) => clean === d || clean.endsWith("." + d))) {
      return platform;
    }
  }
  return null;
}
