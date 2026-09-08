import type { BlockRule, RuleCategory } from "../rules/rule.ts";
import { parseFilterListText } from "../rules/parser.ts";

export interface FilterListMetadata {
  id: string;
  name: string;
  category: RuleCategory;
  description?: string;
  enabled: boolean;
  rulesCount: number;
  hitsCount: number;
  lastUpdated?: number;
  url?: string;
  version?: string;
}

export class FilterList {
  public readonly id: string;
  public name: string;
  public category: RuleCategory;
  public description?: string;
  public enabled: boolean;
  public url?: string;
  public version?: string;
  public rules: BlockRule[] = [];
  public hitsCount: number = 0;
  public lastUpdated?: number;

  constructor(
    id: string,
    name: string,
    category: RuleCategory = "ad",
    description?: string,
    enabled: boolean = true,
    url?: string
  ) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.description = description;
    this.enabled = enabled;
    this.url = url;
  }

  public loadFromText(rawText: string): void {
    this.rules = parseFilterListText(rawText);
    for (const r of this.rules) {
      r.category = this.category;
      if (r.enabled === undefined) r.enabled = true;
    }
    this.lastUpdated = Date.now();
  }

  public addRule(rule: BlockRule): void {
    if (!rule.category) rule.category = this.category;
    if (rule.enabled === undefined) rule.enabled = true;
    this.rules.push(rule);
    this.lastUpdated = Date.now();
  }

  public removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      this.rules.splice(idx, 1);
      this.lastUpdated = Date.now();
      return true;
    }
    return false;
  }

  public incrementHits(): void {
    this.hitsCount++;
  }

  public getMetadata(): FilterListMetadata {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
      enabled: this.enabled,
      rulesCount: this.rules.length,
      hitsCount: this.hitsCount,
      lastUpdated: this.lastUpdated,
      url: this.url,
      version: this.version,
    };
  }
}
