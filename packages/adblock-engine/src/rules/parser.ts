import type { BlockRule, RuleOptions, RuleType } from "./rule.ts";

/**
 * Converts standard Adblock Plus / EasyList pattern into a RegExp.
 */
export function patternToRegex(pattern: string, isDomainAnchor: boolean, isExactStart: boolean, isExactEnd: boolean): RegExp {
  // If already a raw regex in /pattern/ format
  if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length > 2) {
    try {
      return new RegExp(pattern.slice(1, -1), "i");
    } catch {
      // Fallback to escaped string if invalid regex
    }
  }

  let regexStr = "";

  if (isDomainAnchor) {
    // Matches http://, https://, ws://, etc. followed by domain or subdomain
    regexStr += "^(?:https?|wss?|ftp):\\/\\/(?:[a-zA-Z0-9-]+\\.)*";
  } else if (isExactStart) {
    regexStr += "^";
  }

  // Escape special regex chars except * and ^
  let i = 0;
  while (i < pattern.length) {
    const char = pattern[i];

    if (char === "*") {
      regexStr += ".*";
    } else if (char === "^") {
      // Separator character: anything other than letters, digits, _, ., %, - or end of string
      regexStr += "(?:[^a-zA-Z0-9_.%\\-]|$)";
    } else if (["\\", ".", "+", "?", "{", "}", "(", ")", "[", "]", "|"].includes(char)) {
      regexStr += "\\" + char;
    } else {
      regexStr += char;
    }
    i++;
  }

  if (isExactEnd) {
    regexStr += "$";
  }

  return new RegExp(regexStr, "i");
}

/**
 * Parses options string (e.g. "$script,third-party,~image,domain=example.com|~bad.com")
 */
export function parseOptions(optionsStr: string): RuleOptions {
  const options: RuleOptions = {};
  const parts = optionsStr.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part === "third-party" || part === "3p") {
      options.thirdParty = true;
    } else if (part === "~third-party" || part === "~3p") {
      options.thirdParty = false;
    } else if (part.startsWith("domain=")) {
      const domains = part.slice(7).split("|");
      for (const d of domains) {
        if (d.startsWith("~")) {
          if (!options.invertedDomains) options.invertedDomains = [];
          options.invertedDomains.push(d.slice(1).toLowerCase());
        } else {
          if (!options.domains) options.domains = [];
          options.domains.push(d.toLowerCase());
        }
      }
    } else if (part.startsWith("~")) {
      const type = part.slice(1).toLowerCase();
      if (!options.invertedResourceTypes) options.invertedResourceTypes = [];
      options.invertedResourceTypes.push(normalizeResourceType(type));
    } else {
      const type = part.toLowerCase();
      if (!options.resourceTypes) options.resourceTypes = [];
      options.resourceTypes.push(normalizeResourceType(type));
    }
  }

  return options;
}

function normalizeResourceType(type: string): string {
  if (type === "xhr" || type === "xmlhttprequest") return "xhr";
  if (type === "subdocument") return "subdocument";
  return type;
}

let ruleSeq = 0;

/**
 * Parses a single Adblock Plus / EasyList format rule.
 * Returns null if the line is a comment, empty, or cosmetic rule.
 */
export function parseRule(rawLine: string): BlockRule | null {
  const line = rawLine.trim();

  // 1. Comments and empty lines
  if (!line || line.startsWith("!") || line.startsWith("[")) {
    return null;
  }

  // 2. Cosmetic element hiding rules (##, #@#, #?#)
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#")) {
    return null;
  }

  let type: RuleType = "block";
  let content = line;

  // 3. Exception rule (@@)
  if (content.startsWith("@@")) {
    type = "exception";
    content = content.slice(2);
  }

  // 4. Options ($...)
  let options: RuleOptions | undefined;
  const dollarIndex = content.lastIndexOf("$");
  if (dollarIndex !== -1 && !content.slice(dollarIndex).includes("/")) {
    const optionsStr = content.slice(dollarIndex + 1);
    content = content.slice(0, dollarIndex);
    options = parseOptions(optionsStr);
  }

  // 5. Anchors
  let isDomainAnchor = false;
  let isExactStart = false;
  let isExactEnd = false;
  let domain: string | undefined;

  if (content.startsWith("||")) {
    isDomainAnchor = true;
    content = content.slice(2);

    // Extract base domain anchor if present
    const match = content.match(/^([a-zA-Z0-9.-]+)(?:\^|\/|\*|$)/);
    if (match && match[1]) {
      domain = match[1].toLowerCase();
    }
  } else if (content.startsWith("|")) {
    isExactStart = true;
    content = content.slice(1);
  }

  if (content.endsWith("|") && !content.endsWith("||")) {
    isExactEnd = true;
    content = content.slice(0, -1);
  }

  const id = `rule_${++ruleSeq}_${Math.random().toString(36).slice(2, 7)}`;
  const regex = patternToRegex(content, isDomainAnchor, isExactStart, isExactEnd);

  return {
    id,
    raw: line,
    type,
    pattern: content,
    domain,
    regex,
    isDomainAnchor,
    isExactStart,
    isExactEnd,
    options,
  };
}

/**
 * Parses multiple lines from raw filter list text into BlockRules.
 */
export function parseFilterListText(text: string): BlockRule[] {
  const lines = text.split(/\r?\n/);
  const rules: BlockRule[] = [];

  for (const line of lines) {
    const rule = parseRule(line);
    if (rule) {
      rules.push(rule);
    }
  }

  return rules;
}
