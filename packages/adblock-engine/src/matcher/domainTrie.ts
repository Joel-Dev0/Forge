import type { BlockRule } from "../rules/rule.ts";

/**
 * High-performance domain index for domain-anchored rules (||domain^).
 * Uses reverse domain matching:
 * For hostname "ad.doubleclick.net", looks up:
 * 1. "ad.doubleclick.net"
 * 2. "doubleclick.net"
 * 3. "net"
 */
export class DomainIndex {
  private domainMap = new Map<string, BlockRule[]>();

  public clear(): void {
    this.domainMap.clear();
  }

  public addRule(rule: BlockRule): void {
    if (!rule.domain) return;
    const domain = rule.domain.toLowerCase();

    let list = this.domainMap.get(domain);
    if (!list) {
      list = [];
      this.domainMap.set(domain, list);
    }
    list.push(rule);
  }

  public removeRule(ruleId: string): void {
    for (const [domain, rules] of this.domainMap.entries()) {
      const filtered = rules.filter((r) => r.id !== ruleId);
      if (filtered.length === 0) {
        this.domainMap.delete(domain);
      } else if (filtered.length !== rules.length) {
        this.domainMap.set(domain, filtered);
      }
    }
  }

  /**
   * Finds all rules matching the given hostname (checking exact and parent domains).
   */
  public getCandidateRules(hostname: string): BlockRule[] {
    const cleanHost = hostname.toLowerCase();
    const parts = cleanHost.split(".");
    const candidates: BlockRule[] = [];

    // Check every domain suffix: e.g. "sub.ads.example.com", "ads.example.com", "example.com"
    for (let i = 0; i < parts.length - 1; i++) {
      const subDomain = parts.slice(i).join(".");
      const rules = this.domainMap.get(subDomain);
      if (rules) {
        candidates.push(...rules);
      }
    }

    return candidates;
  }

  public get size(): number {
    return this.domainMap.size;
  }
}
