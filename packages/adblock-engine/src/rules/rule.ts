export type RuleType = "block" | "exception" | "cosmetic";
export type RuleCategory = "ad" | "tracker" | "malvertising" | "custom";

export interface RuleOptions {
  resourceTypes?: string[];
  invertedResourceTypes?: string[];
  thirdParty?: boolean;
  domains?: string[];
  invertedDomains?: string[];
}

export interface BlockRule {
  id: string;
  raw: string;
  type: "block" | "exception";
  category?: RuleCategory;
  enabled?: boolean;
  pattern: string;
  domain?: string;
  regex?: RegExp;
  isDomainAnchor: boolean;
  isExactStart: boolean;
  isExactEnd: boolean;
  options?: RuleOptions;
}

export interface RequestDetails {
  url: string;
  method?: string;
  resourceType?: string;
  sourceUrl?: string;
  isThirdParty?: boolean;
}

export interface BlockDecision {
  blocked: boolean;
  rule?: BlockRule;
  category?: RuleCategory;
  listId?: string;
  reason?: string;
}
