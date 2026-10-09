import type { PwaManifest } from "../types.ts";
import { OriginValidator } from "@forge/web-security";

export interface PolicyEvaluationResult {
  passed: boolean;
  issues: string[];
}

export class InstallationPolicy {
  public static validatePolicy(documentUrl: string, manifest: PwaManifest): PolicyEvaluationResult {
    const issues: string[] = [];

    // 1. Validate effective document origin
    const docOriginAnalysis = OriginValidator.validate(documentUrl);
    if (!docOriginAnalysis.isValid) {
      issues.push(`Document URL origin is invalid: ${docOriginAnalysis.issues.join(", ")}`);
    }

    // 2. Validate start_url is same origin as document URL
    if (!OriginValidator.isSameOrigin(documentUrl, manifest.startUrl)) {
      issues.push(
        `Manifest start_url origin "${new URL(manifest.startUrl).origin}" does not match document origin "${docOriginAnalysis.origin}"`
      );
    }

    // 3. Validate scope matches start_url origin
    if (!OriginValidator.isSameOrigin(manifest.startUrl, manifest.scope)) {
      issues.push("Manifest scope must be on the same origin as start_url");
    }

    // 4. Validate that start_url is within scope
    if (!OriginValidator.isWithinScope(manifest.startUrl, manifest.scope)) {
      issues.push(`Manifest start_url "${manifest.startUrl}" is outside declared scope "${manifest.scope}"`);
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
    };
  }
}
