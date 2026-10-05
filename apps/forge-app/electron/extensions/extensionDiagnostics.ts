/**
 * Extension Diagnostics
 *
 * The test harness that determines what Electron 44 actually does
 * when we load an extension — not what we assume it does.
 *
 * Runs after every loadExtension() call and produces a real,
 * measured compatibility report per extension.
 *
 * Strategy:
 *   Level 1 (Native)   → Check if Electron loaded the extension and registered its APIs
 *   Level 2 (Adapter)  → Identify APIs that need Forge bridging (e.g. chrome.tabs → Forge tabs)
 *   Level 3 (Fallback) → Flag APIs that require executeJavaScript polyfills
 */

import { session, type Session as ElectronSession } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  type SupportLevel,
  CAPABILITY_MAP,
  calculateCompatibilityScore,
  extractUsedApisFromManifest,
} from "./extensionCapabilityMap.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentScriptDiagnostic {
  declaredInManifest: number;
  patterns: string[];
  runAtTimings: string[];
  cssFiles: number;
  jsFiles: number;
  /** Whether Electron registered content scripts natively (via getAllExtensions()) */
  electronHandlesNatively: boolean;
  /** Whether Forge fallback injection is needed */
  needsForgeFallback: boolean;
}

export interface ApiCapabilityDiagnostic {
  api: string;
  usedByExtension: boolean;
  electronSupport: SupportLevel;
  status: "native" | "adapter" | "fallback" | "unsupported";
  notes: string;
}

export interface ExtensionDiagnosticReport {
  extensionId: string;
  extensionName: string;
  extensionVersion: string;
  manifestVersion: 2 | 3;
  diagnosticTimestamp: number;

  // Level 1: Did Electron load it?
  electronLoaded: boolean;
  electronLoadError?: string;

  // Level 1: What does Electron report via getAllExtensions()?
  electronReportsExtension: boolean;
  electronExtensionData?: {
    id: string;
    name: string;
    version: string;
    path: string;
  };

  // Content scripts
  contentScripts: ContentScriptDiagnostic;

  // API capabilities
  capabilities: ApiCapabilityDiagnostic[];

  // Background
  background: {
    type: "service_worker" | "scripts" | "none";
    declared: boolean;
    /** Files declared in manifest */
    files: string[];
  };

  // Action / popup
  action: {
    hasAction: boolean;
    hasPopup: boolean;
    popupFile?: string;
    hasIcon: boolean;
  };

  // Overall compatibility
  compatibilityScore: number;
  compatibilityTier: "full-native" | "partial-native" | "adapter-required" | "unsupported";

  // Session info
  loadedIntoSessions: string[];
  failedSessions: { partition: string; error: string }[];
}

// ---------------------------------------------------------------------------
// In-memory store of diagnostic reports
// ---------------------------------------------------------------------------
const diagnosticReports = new Map<string, ExtensionDiagnosticReport>();

// ---------------------------------------------------------------------------
// Core diagnostic function
// ---------------------------------------------------------------------------

/**
 * Run diagnostics on a loaded extension.
 * Call this AFTER session.loadExtension() has been attempted.
 *
 * @param extDir - The directory path of the extension
 * @param manifest - The parsed manifest.json
 * @param extId - The extension ID (directory name or chrome web store ID)
 * @param loadResults - Map of partition → success/error from the session bridge
 */
export function diagnoseExtension(
  extDir: string,
  manifest: any,
  extId: string,
  loadResults: Map<string, { success: boolean; error?: string }>
): ExtensionDiagnosticReport {
  const manifestVersion = (manifest.manifest_version || 2) as 2 | 3;
  const extName = manifest.name || "Unknown Extension";
  const extVersion = manifest.version || "0.0.0";

  // ── Check if Electron actually loaded it ──
  let electronLoaded = false;
  let electronReportsExtension = false;
  let electronExtensionData: ExtensionDiagnosticReport["electronExtensionData"];
  let electronLoadError: string | undefined;

  // Check against default session first
  try {
    const allExts = session.defaultSession.getAllExtensions();
    const found = allExts.find(
      (e) => e.id === extId || e.path === extDir || e.name === extName
    );
    if (found) {
      electronLoaded = true;
      electronReportsExtension = true;
      electronExtensionData = {
        id: found.id,
        name: found.name,
        version: found.version,
        path: found.path,
      };
    }
  } catch {}

  // If not found in default, check persist:forge
  if (!electronReportsExtension) {
    try {
      const forgeSes = session.fromPartition("persist:forge");
      const allExts = forgeSes.getAllExtensions();
      const found = allExts.find(
        (e) => e.id === extId || e.path === extDir || e.name === extName
      );
      if (found) {
        electronLoaded = true;
        electronReportsExtension = true;
        electronExtensionData = {
          id: found.id,
          name: found.name,
          version: found.version,
          path: found.path,
        };
      }
    } catch {}
  }

  // Collect load errors from session bridge results
  const loadedIntoSessions: string[] = [];
  const failedSessions: { partition: string; error: string }[] = [];
  for (const [partition, result] of loadResults) {
    if (result.success) {
      loadedIntoSessions.push(partition);
      electronLoaded = true;
    } else {
      failedSessions.push({ partition, error: result.error || "Unknown error" });
      if (!electronLoadError) {
        electronLoadError = result.error;
      }
    }
  }

  // ── Content Scripts Diagnostic ──
  const manifestContentScripts: any[] = manifest.content_scripts || [];
  const csPatterns: string[] = [];
  const csRunAt: string[] = [];
  let csCssFiles = 0;
  let csJsFiles = 0;

  for (const cs of manifestContentScripts) {
    for (const match of cs.matches || []) {
      csPatterns.push(match);
    }
    csRunAt.push(cs.run_at || "document_idle");
    csCssFiles += (cs.css || []).length;
    csJsFiles += (cs.js || []).length;
  }

  // The key question: does Electron handle content scripts natively?
  // If the extension loaded successfully AND has content_scripts in manifest,
  // Electron's extension system should register them automatically.
  // We verify by checking if getAllExtensions() returns the extension,
  // which means Electron parsed and registered its manifest including content scripts.
  const electronHandlesContentScripts =
    electronReportsExtension && manifestContentScripts.length > 0;

  const contentScripts: ContentScriptDiagnostic = {
    declaredInManifest: manifestContentScripts.length,
    patterns: csPatterns,
    runAtTimings: [...new Set(csRunAt)],
    cssFiles: csCssFiles,
    jsFiles: csJsFiles,
    electronHandlesNatively: electronHandlesContentScripts,
    needsForgeFallback: !electronHandlesContentScripts && manifestContentScripts.length > 0,
  };

  // ── API Capabilities ──
  const usedApis = extractUsedApisFromManifest(manifest);
  const { score, breakdown } = calculateCompatibilityScore(usedApis);

  const capabilities: ApiCapabilityDiagnostic[] = breakdown.map((b) => {
    const cap = CAPABILITY_MAP.find((c) => c.api === b.api);
    let status: "native" | "adapter" | "fallback" | "unsupported";
    switch (b.level) {
      case "native":
        status = "native";
        break;
      case "partial":
        status = "native"; // Electron handles core, Forge may augment
        break;
      case "adapter":
        status = "adapter";
        break;
      case "fallback":
        status = "fallback";
        break;
      default:
        status = "unsupported";
    }

    return {
      api: b.api,
      usedByExtension: true,
      electronSupport: b.level,
      status,
      notes: cap?.notes || "Unknown API",
    };
  });

  // Also include APIs not used by this extension but in the capability map
  for (const cap of CAPABILITY_MAP) {
    if (!capabilities.some((c) => c.api === cap.api)) {
      capabilities.push({
        api: cap.api,
        usedByExtension: false,
        electronSupport: cap.electronSupport,
        status: cap.electronSupport === "native" || cap.electronSupport === "partial"
          ? "native"
          : cap.electronSupport === "adapter"
            ? "adapter"
            : cap.electronSupport === "fallback"
              ? "fallback"
              : "unsupported",
        notes: cap.notes,
      });
    }
  }

  // ── Background ──
  const background: ExtensionDiagnosticReport["background"] = {
    type: "none",
    declared: false,
    files: [],
  };

  if (manifest.background) {
    background.declared = true;
    if (manifest.background.service_worker) {
      background.type = "service_worker";
      background.files = [manifest.background.service_worker];
    } else if (manifest.background.scripts) {
      background.type = "scripts";
      background.files = manifest.background.scripts;
    }
  }

  // ── Action / Popup ──
  const actionManifest = manifest.action || manifest.browser_action;
  const action: ExtensionDiagnosticReport["action"] = {
    hasAction: Boolean(actionManifest),
    hasPopup: Boolean(actionManifest?.default_popup),
    popupFile: actionManifest?.default_popup,
    hasIcon: Boolean(
      actionManifest?.default_icon || manifest.icons
    ),
  };

  // ── Compatibility Tier ──
  let compatibilityTier: ExtensionDiagnosticReport["compatibilityTier"];
  if (score >= 90) {
    compatibilityTier = "full-native";
  } else if (score >= 65) {
    compatibilityTier = "partial-native";
  } else if (score >= 35) {
    compatibilityTier = "adapter-required";
  } else {
    compatibilityTier = "unsupported";
  }

  const report: ExtensionDiagnosticReport = {
    extensionId: extId,
    extensionName: extName,
    extensionVersion: extVersion,
    manifestVersion,
    diagnosticTimestamp: Date.now(),
    electronLoaded,
    electronLoadError,
    electronReportsExtension,
    electronExtensionData,
    contentScripts,
    capabilities,
    background,
    action,
    compatibilityScore: score,
    compatibilityTier,
    loadedIntoSessions,
    failedSessions,
  };

  // Store for later querying
  diagnosticReports.set(extId, report);

  // Log summary to console
  logDiagnosticSummary(report);

  return report;
}

// ---------------------------------------------------------------------------
// Console logging (developer-facing)
// ---------------------------------------------------------------------------

function logDiagnosticSummary(report: ExtensionDiagnosticReport): void {
  const used = report.capabilities.filter((c) => c.usedByExtension);
  const native = used.filter((c) => c.status === "native").length;
  const adapter = used.filter((c) => c.status === "adapter").length;
  const fallback = used.filter((c) => c.status === "fallback").length;
  const unsupported = used.filter((c) => c.status === "unsupported").length;

  console.log(`\n[ExtensionDiagnostics] ═══════════════════════════════════`);
  console.log(`  ${report.extensionName} v${report.extensionVersion}`);
  console.log(`  Manifest: MV${report.manifestVersion}`);
  console.log(`  Electron loaded: ${report.electronLoaded ? "✓" : "✗"} ${report.electronLoadError ? `(${report.electronLoadError})` : ""}`);
  console.log(`  Content scripts: ${report.contentScripts.declaredInManifest} declared, native=${report.contentScripts.electronHandlesNatively}`);
  console.log(`  Background: ${report.background.type}`);
  console.log(`  APIs: ${native} native, ${adapter} adapter, ${fallback} fallback, ${unsupported} unsupported`);
  console.log(`  Compatibility: ${report.compatibilityScore}% (${report.compatibilityTier})`);
  console.log(`  Sessions: loaded into ${report.loadedIntoSessions.length}, failed in ${report.failedSessions.length}`);

  if (report.failedSessions.length > 0) {
    for (const f of report.failedSessions) {
      console.log(`    ✗ ${f.partition}: ${f.error}`);
    }
  }

  console.log(`═══════════════════════════════════════════════════════\n`);
}

// ---------------------------------------------------------------------------
// Public API for IPC / querying
// ---------------------------------------------------------------------------

/**
 * Get diagnostic report for a specific extension.
 */
export function getDiagnosticReport(extId: string): ExtensionDiagnosticReport | undefined {
  return diagnosticReports.get(extId);
}

/**
 * Get diagnostic reports for all extensions.
 */
export function getAllDiagnosticReports(): ExtensionDiagnosticReport[] {
  return Array.from(diagnosticReports.values());
}

/**
 * Get a compact summary suitable for the renderer's compatibility matrix UI.
 */
export function getDiagnosticSummary(): {
  extensionId: string;
  name: string;
  version: string;
  manifestVersion: number;
  electronLoaded: boolean;
  contentScriptsNative: boolean;
  score: number;
  tier: string;
  usedApis: { api: string; status: string }[];
}[] {
  return Array.from(diagnosticReports.values()).map((r) => ({
    extensionId: r.extensionId,
    name: r.extensionName,
    version: r.extensionVersion,
    manifestVersion: r.manifestVersion,
    electronLoaded: r.electronLoaded,
    contentScriptsNative: r.contentScripts.electronHandlesNatively,
    score: r.compatibilityScore,
    tier: r.compatibilityTier,
    usedApis: r.capabilities
      .filter((c) => c.usedByExtension)
      .map((c) => ({ api: c.api, status: c.status })),
  }));
}

/**
 * Clear all diagnostic data (e.g. after extension uninstall).
 */
export function clearDiagnosticReport(extId: string): void {
  diagnosticReports.delete(extId);
}
