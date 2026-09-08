import type { BlockRule, BlockDecision, RequestDetails, RuleCategory } from "./rules/rule.ts";
import { parseRule, parseFilterListText } from "./rules/parser.ts";
import { DomainIndex } from "./matcher/domainTrie.ts";
import { matchRule, extractHostname, stripTrackingParameters, COMMON_TRACKING_QUERY_PARAMS } from "./matcher/urlMatcher.ts";
import { FilterList, type FilterListMetadata } from "./filters/filterList.ts";
import { EASYLIST_PRESET_RULES } from "./filters/presets/easylist.ts";
import { EASYPRIVACY_PRESET_RULES } from "./filters/presets/easyprivacy.ts";
import { QUICKFIXES_PRESET_RULES } from "./filters/presets/quickfixes.ts";
import { MALVERTISING_PRESET_RULES } from "./filters/presets/malvertising.ts";

import { getCosmeticCSS, getScriptlet } from "./cosmetic/index.ts";

export * from "./rules/index.ts";
export * from "./matcher/index.ts";
export * from "./filters/index.ts";
export * from "./cosmetic/index.ts";
export { stripTrackingParameters, COMMON_TRACKING_QUERY_PARAMS };

export interface ShieldFeatures {
  adBlock: boolean;
  trackerProtection: boolean;
  malvertisingProtection: boolean;
  customRules: boolean;
}

export interface AdBlockStats {
  enabled: boolean;
  totalLists: number;
  totalRules: number;
  blockedCount: number;
  allowedCount: number;
  lists: FilterListMetadata[];
}

export interface DetailedBlockStats {
  enabled: boolean;
  features: ShieldFeatures;
  totalLists: number;
  totalRules: number;
  blockedCount: number;
  allowedCount: number;
  byCategory: {
    ad: number;
    tracker: number;
    malvertising: number;
    custom: number;
  };
  topDomains: { domain: string; count: number; category: RuleCategory }[];
  estimatedBandwidthSavedBytes: number;
  estimatedTimeSavedMs: number;
  lists: FilterListMetadata[];
}

export class AdBlockEngine {
  private enabled: boolean = true;
  private features: ShieldFeatures = {
    adBlock: true,
    trackerProtection: true,
    malvertisingProtection: true,
    customRules: true,
  };

  private lists = new Map<string, FilterList>();
  private domainIndex = new DomainIndex();
  private generalBlockRules: { rule: BlockRule; listId: string }[] = [];
  private domainExceptionIndex = new DomainIndex();
  private generalExceptionRules: { rule: BlockRule; listId: string }[] = [];

  // Statistics
  private blockedCount: number = 0;
  private allowedCount: number = 0;
  private categoryCounts: { ad: number; tracker: number; malvertising: number; custom: number } = {
    ad: 0,
    tracker: 0,
    malvertising: 0,
    custom: 0,
  };
  private domainHits = new Map<string, { count: number; category: RuleCategory }>();

  constructor(autoLoadPresets: boolean = true) {
    if (autoLoadPresets) {
      this.initPresets();
    }
  }

  private initPresets(): void {
    // 1. EasyList Core (Advertising)
    const easyList = new FilterList(
      "easylist",
      "EasyList Core",
      "ad",
      "Blocks popular advertising networks, banners, and video ads",
      true,
      "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt"
    );
    easyList.loadFromText(EASYLIST_PRESET_RULES);
    this.addFilterListInstance(easyList);

    // 2. EasyPrivacy (Trackers & Analytics)
    const privacyList = new FilterList(
      "easyprivacy",
      "EasyPrivacy",
      "tracker",
      "Blocks tracking scripts, web analytics, and telemetry endpoints",
      true,
      "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easyprivacy_general_block.txt"
    );
    privacyList.loadFromText(EASYPRIVACY_PRESET_RULES);
    this.addFilterListInstance(privacyList);

    // 3. uBlock Quick Fixes (YouTube & Anti-Adblock Live Fixes)
    const quickFixesList = new FilterList(
      "quickfixes",
      "uBlock Quick Fixes",
      "ad",
      "Rapid-response fixes for YouTube video ads and anti-adblock countermeasures",
      true,
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt"
    );
    quickFixesList.loadFromText(QUICKFIXES_PRESET_RULES);
    this.addFilterListInstance(quickFixesList);

    // 4. Malvertising & Threat Shield (Cryptominers, Phishing Ads & Scam Redirects)
    const malvertisingList = new FilterList(
      "malvertising",
      "Malvertising & Threats",
      "malvertising",
      "Blocks in-browser cryptominers, malicious ad redirectors, phishing and scam domains",
      true,
      "https://raw.githubusercontent.com/Joel-Dev0/Forge/master/filters/malvertising.txt"
    );
    malvertisingList.loadFromText(MALVERTISING_PRESET_RULES);
    this.addFilterListInstance(malvertisingList);

    // 5. User Custom Rules
    const userList = new FilterList(
      "user",
      "User Rules",
      "custom",
      "Custom user-defined blocking and allowlist rules",
      true
    );
    this.addFilterListInstance(userList);
  }

  /**
   * Rebuilds search indices across all currently enabled filter lists.
   */
  public rebuildIndices(): void {
    this.domainIndex.clear();
    this.generalBlockRules = [];
    this.domainExceptionIndex.clear();
    this.generalExceptionRules = [];

    for (const list of this.lists.values()) {
      if (!list.enabled) continue;

      for (const rule of list.rules) {
        if (rule.enabled === false) continue;

        if (rule.type === "exception") {
          if (rule.domain) {
            this.domainExceptionIndex.addRule(rule);
          } else {
            this.generalExceptionRules.push({ rule, listId: list.id });
          }
        } else {
          if (rule.domain) {
            this.domainIndex.addRule(rule);
          } else {
            this.generalBlockRules.push({ rule, listId: list.id });
          }
        }
      }
    }
  }

  public addFilterListInstance(list: FilterList): void {
    this.lists.set(list.id, list);
    this.rebuildIndices();
  }

  public addList(
    id: string,
    name: string,
    category: RuleCategory = "ad",
    description?: string,
    rawContent: string = "",
    enabled: boolean = true,
    url?: string
  ): FilterList {
    const list = new FilterList(id, name, category, description, enabled, url);
    if (rawContent) {
      list.loadFromText(rawContent);
    }
    this.addFilterListInstance(list);
    return list;
  }

  public updateListContent(id: string, rawContent: string): boolean {
    const list = this.lists.get(id);
    if (list) {
      list.loadFromText(rawContent);
      this.rebuildIndices();
      return true;
    }
    return false;
  }

  public removeList(id: string): boolean {
    const deleted = this.lists.delete(id);
    if (deleted) {
      this.rebuildIndices();
    }
    return deleted;
  }

  public toggleList(id: string, enabled?: boolean): boolean {
    const list = this.lists.get(id);
    if (!list) return false;
    list.enabled = enabled !== undefined ? enabled : !list.enabled;
    this.rebuildIndices();
    return list.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // --- Feature Toggles (Ad Blocker, Tracker Protection, Malvertising, Custom Rules) ---

  public setFeature(feature: keyof ShieldFeatures, enabled: boolean): void {
    this.features[feature] = enabled;
  }

  public setFeatureEnabled(feature: keyof ShieldFeatures, enabled: boolean): void {
    this.setFeature(feature, enabled);
  }

  public isFeatureEnabled(feature: keyof ShieldFeatures): boolean {
    return this.features[feature];
  }

  public getFeatures(): ShieldFeatures {
    return { ...this.features };
  }

  private isCategoryEnabled(category: RuleCategory): boolean {
    switch (category) {
      case "ad":
        return this.features.adBlock;
      case "tracker":
        return this.features.trackerProtection;
      case "malvertising":
        return this.features.malvertisingProtection;
      case "custom":
        return this.features.customRules;
      default:
        return true;
    }
  }

  // --- Custom Rules Management ---

  public getCustomRules(): BlockRule[] {
    const userList = this.lists.get("user");
    return userList ? [...userList.rules] : [];
  }

  public addUserRule(rawRule: string): BlockRule | null {
    let userList = this.lists.get("user");
    if (!userList) {
      userList = new FilterList("user", "User Rules", "custom", "User custom rules", true);
      this.lists.set("user", userList);
    }

    const rule = parseRule(rawRule);
    if (!rule) return null;

    rule.category = "custom";
    rule.enabled = true;
    userList.addRule(rule);
    this.rebuildIndices();
    return rule;
  }

  public toggleCustomRule(ruleId: string, enabled?: boolean): boolean {
    const userList = this.lists.get("user");
    if (!userList) return false;

    const rule = userList.rules.find((r) => r.id === ruleId);
    if (!rule) return false;

    rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
    this.rebuildIndices();
    return rule.enabled;
  }

  public removeUserRule(ruleId: string): boolean {
    const userList = this.lists.get("user");
    if (!userList) return false;
    const removed = userList.removeRule(ruleId);
    if (removed) {
      this.rebuildIndices();
    }
    return removed;
  }

  public importRules(rawContent: string): { imported: number; errors: string[] } {
    let userList = this.lists.get("user");
    if (!userList) {
      userList = new FilterList("user", "User Rules", "custom", "User custom rules", true);
      this.lists.set("user", userList);
    }

    const parsed = parseFilterListText(rawContent);
    let imported = 0;
    const errors: string[] = [];

    for (const rule of parsed) {
      rule.category = "custom";
      rule.enabled = true;
      userList.addRule(rule);
      imported++;
    }

    this.rebuildIndices();
    return { imported, errors };
  }

  public exportRules(): string {
    const rules = this.getCustomRules();
    return rules.map((r) => r.raw).join("\n");
  }

  /**
   * Evaluates an incoming network request and decides whether to block or allow.
   */
  public match(request: RequestDetails): BlockDecision {
    if (!this.enabled) {
      return { blocked: false };
    }

    const hostname = extractHostname(request.url);

    // 1. Check Domain Exception Rules (@@)
    if (hostname) {
      const candidates = this.domainExceptionIndex.getCandidateRules(hostname);
      for (const rule of candidates) {
        if (rule.enabled !== false && matchRule(rule, request)) {
          this.allowedCount++;
          return {
            blocked: false,
            rule,
            category: rule.category || "ad",
            reason: `Allowed by domain exception: ${rule.raw}`,
          };
        }
      }
    }

    // 2. Check General Exception Rules (@@)
    for (const { rule } of this.generalExceptionRules) {
      if (rule.enabled !== false && matchRule(rule, request)) {
        this.allowedCount++;
        return {
          blocked: false,
          rule,
          category: rule.category || "ad",
          reason: `Allowed by exception: ${rule.raw}`,
        };
      }
    }

    // 3. Check Domain-Anchored Block Rules
    if (hostname) {
      const candidates = this.domainIndex.getCandidateRules(hostname);
      for (const rule of candidates) {
        if (rule.enabled === false) continue;

        const list = this.findListForRule(rule.id);
        const category = rule.category || list?.category || "ad";

        // Check if this functional module is active
        if (!this.isCategoryEnabled(category)) {
          continue;
        }

        if (matchRule(rule, request)) {
          this.blockedCount++;
          this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;

          // Track domain hit count
          const currentDomainHit = this.domainHits.get(hostname) || { count: 0, category };
          this.domainHits.set(hostname, { count: currentDomainHit.count + 1, category });

          if (list) list.incrementHits();

          return {
            blocked: true,
            rule,
            category,
            listId: list?.id,
            reason: `Blocked by ${category} rule: ${rule.raw}`,
          };
        }
      }
    }

    // 4. Check General Block Rules (Path & Pattern based)
    for (const { rule, listId } of this.generalBlockRules) {
      if (rule.enabled === false) continue;

      const list = this.lists.get(listId);
      const category = rule.category || list?.category || "ad";

      // Check if this functional module is active
      if (!this.isCategoryEnabled(category)) {
        continue;
      }

      if (matchRule(rule, request)) {
        this.blockedCount++;
        this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;

        if (hostname) {
          const currentDomainHit = this.domainHits.get(hostname) || { count: 0, category };
          this.domainHits.set(hostname, { count: currentDomainHit.count + 1, category });
        }

        if (list) list.incrementHits();

        return {
          blocked: true,
          rule,
          category,
          listId,
          reason: `Blocked by ${category} pattern: ${rule.raw}`,
        };
      }
    }

    this.allowedCount++;
    return { blocked: false };
  }

  private findListForRule(ruleId: string): FilterList | undefined {
    for (const list of this.lists.values()) {
      if (list.rules.some((r) => r.id === ruleId)) {
        return list;
      }
    }
    return undefined;
  }

  public getLists(): FilterListMetadata[] {
    return Array.from(this.lists.values()).map((l) => l.getMetadata());
  }

  public getStats(): AdBlockStats {
    let totalRules = 0;
    for (const l of this.lists.values()) {
      totalRules += l.rules.length;
    }

    return {
      enabled: this.enabled,
      totalLists: this.lists.size,
      totalRules,
      blockedCount: this.blockedCount,
      allowedCount: this.allowedCount,
      lists: this.getLists(),
    };
  }

  public getDetailedStats(): DetailedBlockStats {
    let totalRules = 0;
    for (const l of this.lists.values()) {
      totalRules += l.rules.length;
    }

    // Sort top 10 blocked domains
    const topDomains = Array.from(this.domainHits.entries())
      .map(([domain, data]) => ({ domain, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Estimate saved metrics:
    // Avg ~200KB per ad, ~25KB per tracker, ~150KB per malvertising script, ~50KB per custom
    const estimatedBandwidthSavedBytes =
      this.categoryCounts.ad * 200_000 +
      this.categoryCounts.tracker * 25_000 +
      this.categoryCounts.malvertising * 150_000 +
      this.categoryCounts.custom * 50_000;

    // Avg ~45ms per saved network roundtrip
    const estimatedTimeSavedMs = this.blockedCount * 45;

    return {
      enabled: this.enabled,
      features: { ...this.features },
      totalLists: this.lists.size,
      totalRules,
      blockedCount: this.blockedCount,
      allowedCount: this.allowedCount,
      byCategory: { ...this.categoryCounts },
      topDomains,
      estimatedBandwidthSavedBytes,
      estimatedTimeSavedMs,
      lists: this.getLists(),
    };
  }

  public resetStats(): void {
    this.blockedCount = 0;
    this.allowedCount = 0;
    this.categoryCounts = { ad: 0, tracker: 0, malvertising: 0, custom: 0 };
    this.domainHits.clear();
    for (const l of this.lists.values()) {
      l.hitsCount = 0;
    }
  }

  public getCosmeticCSS(url?: string): string {
    if (!this.enabled || !this.features.adBlock) return "";
    return getCosmeticCSS(url);
  }

  public getScriptlet(url?: string): string {
    if (!this.enabled || !this.features.adBlock) return "";
    return getScriptlet(url);
  }
}
