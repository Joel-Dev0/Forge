import type { PwaIcon, PwaManifest } from "../types.ts";
import { ManifestValidator } from "../manifest/ManifestValidator.ts";

export interface TechnicalCriteriaResult {
  installable: boolean;
  bestIcon?: PwaIcon;
  issues: string[];
}

export class TechnicalCriteria {
  public static selectBestIcon(icons: PwaIcon[]): PwaIcon | undefined {
    if (!icons || icons.length === 0) return undefined;

    // Prefer icon closest to 512 or 192
    const sorted = [...icons].sort((a, b) => {
      const aSize = a.width || 0;
      const bSize = b.width || 0;

      // Prioritize 192 to 512
      const aIdeal = aSize >= 192 && aSize <= 512 ? 1000 + aSize : aSize;
      const bIdeal = bSize >= 192 && bSize <= 512 ? 1000 + bSize : bSize;

      return bIdeal - aIdeal;
    });

    return sorted[0];
  }

  public static evaluate(
    manifest: PwaManifest,
    options: { hasServiceWorker?: boolean } = {}
  ): TechnicalCriteriaResult {
    const issues: string[] = [];

    // 1. Manifest structure validation
    const val = ManifestValidator.validate(manifest);
    if (!val.isValid) {
      issues.push(...val.issues);
    }

    // 2. Display mode check
    if (manifest.display === "browser") {
      issues.push("Display mode 'browser' does not qualify for standalone installation");
    }

    // 3. Icon sizing check
    const bestIcon = TechnicalCriteria.selectBestIcon(manifest.icons);
    if (!bestIcon) {
      issues.push("No valid icons found in web application manifest");
    } else {
      // Must be at least 144px if size is known
      if (bestIcon.width && bestIcon.width < 144) {
        issues.push(`Largest icon resolution (${bestIcon.width}px) is below minimum recommended 144x144`);
      }
    }

    // ServiceWorker (warning or policy check)
    if (options.hasServiceWorker === false) {
      // Not strictly blocking in modern Chromium/desktop PWA standards, but noted
    }

    const installable = issues.length === 0;

    return {
      installable,
      bestIcon,
      issues,
    };
  }
}
