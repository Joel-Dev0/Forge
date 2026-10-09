import { BrowserWindow, type WebContents } from "electron";
import { ManifestParser, type PwaEligibilityResult, type PwaManifest } from "@forge/pwa-core";
import { type CertificateInput, type RedirectHop } from "@forge/web-security";
import { PwaSecurityGate } from "./PwaSecurityGate.ts";

interface TabNavigationState {
  tabId: string;
  navigationId: number;
  url: string;
  redirectHops: RedirectHop[];
  cert?: CertificateInput;
  manifest?: PwaManifest | null;
  lastResult?: PwaEligibilityResult;
}

export class PwaNavigationObserver {
  private static instance: PwaNavigationObserver;
  private tabStates = new Map<string, TabNavigationState>();
  private webContentsToTabMap = new Map<number, string>();

  public static getInstance(): PwaNavigationObserver {
    if (!PwaNavigationObserver.instance) {
      PwaNavigationObserver.instance = new PwaNavigationObserver();
    }
    return PwaNavigationObserver.instance;
  }

  public registerTabWebContents(tabId: string, contents: WebContents): void {
    this.webContentsToTabMap.set(contents.id, tabId);

    contents.on("destroyed", () => {
      this.webContentsToTabMap.delete(contents.id);
      this.tabStates.delete(tabId);
    });

    contents.on("did-start-navigation", (_event, url, isInPlace, isMainFrame) => {
      if (!isMainFrame) return;
      this.handleNavigationStart(tabId, url);
    });

    contents.on("did-redirect-navigation", (_event, url, _isInPlace, isMainFrame) => {
      if (!isMainFrame) return;
      this.handleRedirectHop(tabId, url);
    });

    contents.on("did-finish-load", () => {
      this.handleNavigationFinished(tabId, contents);
    });
  }

  public handleCertificateError(contentsId: number, url: string, error: string): void {
    const tabId = this.webContentsToTabMap.get(contentsId);
    if (!tabId) return;

    const state = this.getOrCreateState(tabId, url);
    state.cert = { error };

    const result = PwaSecurityGate.evaluate({
      tabId,
      navigationId: String(state.navigationId),
      url: state.url,
      cert: state.cert,
      redirectHops: state.redirectHops,
      manifest: null,
    });

    state.lastResult = result;
    this.broadcastResult(result);
  }

  public getTabEligibility(tabId: string): PwaEligibilityResult | undefined {
    return this.tabStates.get(tabId)?.lastResult;
  }

  private handleNavigationStart(tabId: string, url: string): void {
    const state = this.getOrCreateState(tabId, url);
    state.navigationId += 1;
    state.url = url;
    state.redirectHops = [];
    state.cert = undefined;
    state.manifest = null;

    const navIdStr = String(state.navigationId);

    // Promptly set tab state to "analyzing" so icon is hidden during navigation
    const analyzingResult: PwaEligibilityResult = {
      tabId,
      navigationId: navIdStr,
      status: "analyzing",
      eligible: false,
      url,
      checks: {
        secureConnection: false,
        validCertificate: false,
        safeRedirectChain: false,
        validManifest: false,
        installable: false,
        riskPolicyPassed: false,
      },
      reasons: ["Analyzing page security and web application manifest..."],
    };

    state.lastResult = analyzingResult;
    this.broadcastResult(analyzingResult);
  }

  private handleRedirectHop(tabId: string, url: string): void {
    const state = this.tabStates.get(tabId);
    if (!state) return;

    try {
      const parsed = new URL(url);
      state.redirectHops.push({
        url,
        protocol: parsed.protocol,
        origin: parsed.origin,
      });
    } catch {}
  }

  private async handleNavigationFinished(tabId: string, contents: WebContents): Promise<void> {
    const state = this.tabStates.get(tabId);
    if (!state || contents.isDestroyed()) return;

    const currentNavId = state.navigationId;
    const currentUrl = contents.getURL();
    state.url = currentUrl;

    try {
      // 1. Detect manifest link tag
      const manifestHref: string | null = await contents.executeJavaScript(`
        (() => {
          try {
            const link = document.querySelector('link[rel="manifest"]');
            return link ? link.href : null;
          } catch {
            return null;
          }
        })()
      `, true);

      // Verify race condition (did the tab navigate while we executed JS?)
      if (state.navigationId !== currentNavId) return;

      let parsedManifest: PwaManifest | null = null;

      if (manifestHref) {
        // 2. Fetch manifest JSON within browser page context
        const rawJson: any = await contents.executeJavaScript(`
          (async () => {
            try {
              const res = await fetch(${JSON.stringify(manifestHref)}, { credentials: "omit" });
              if (!res.ok) return null;
              return await res.json();
            } catch {
              return null;
            }
          })()
        `, true);

        if (state.navigationId !== currentNavId) return;

        if (rawJson) {
          try {
            parsedManifest = ManifestParser.parse(rawJson, currentUrl, manifestHref);
          } catch (e: any) {
            console.warn(`[PWA Observer] Manifest parse failed for ${manifestHref}:`, e?.message);
          }
        }
      }

      // 3. Run full PWA Security Gate decision
      const result = PwaSecurityGate.evaluate({
        tabId,
        navigationId: String(currentNavId),
        url: currentUrl,
        cert: state.cert,
        redirectHops: state.redirectHops,
        manifest: parsedManifest,
      });

      if (state.navigationId === currentNavId) {
        state.lastResult = result;
        this.broadcastResult(result);
      }
    } catch (err) {
      if (state.navigationId === currentNavId) {
        const errorResult: PwaEligibilityResult = {
          tabId,
          navigationId: String(currentNavId),
          status: "hidden",
          eligible: false,
          url: currentUrl,
          checks: {
            secureConnection: true,
            validCertificate: true,
            safeRedirectChain: true,
            validManifest: false,
            installable: false,
            riskPolicyPassed: true,
          },
          reasons: ["Evaluation error or non-PWA document"],
        };
        state.lastResult = errorResult;
        this.broadcastResult(errorResult);
      }
    }
  }

  private broadcastResult(result: PwaEligibilityResult): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send("pwa:eligibility-updated", result);
      }
    }
  }

  private getOrCreateState(tabId: string, url: string): TabNavigationState {
    let state = this.tabStates.get(tabId);
    if (!state) {
      state = {
        tabId,
        navigationId: 0,
        url,
        redirectHops: [],
      };
      this.tabStates.set(tabId, state);
    }
    return state;
  }
}
