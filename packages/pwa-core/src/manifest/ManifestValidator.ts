import type { PwaManifest } from "../types.ts";

export interface ManifestValidationResult {
  isValid: boolean;
  issues: string[];
}

export class ManifestValidator {
  public static validate(manifest: PwaManifest): ManifestValidationResult {
    const issues: string[] = [];

    if (!manifest.name && !manifest.shortName) {
      issues.push("Manifest must declare a valid 'name' or 'short_name'");
    }

    if (!manifest.startUrl) {
      issues.push("Manifest missing 'start_url'");
    } else {
      try {
        const parsed = new URL(manifest.startUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          issues.push(`'start_url' has invalid protocol "${parsed.protocol}"`);
        }
      } catch {
        issues.push("'start_url' is not a valid absolute URL");
      }
    }

    if (!manifest.icons || manifest.icons.length === 0) {
      issues.push("Manifest must specify at least one icon");
    } else {
      const hasValidIcon = manifest.icons.some((icon) => {
        try {
          new URL(icon.src);
          return true;
        } catch {
          return false;
        }
      });
      if (!hasValidIcon) {
        issues.push("None of the declared manifest icons have a valid URL");
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
