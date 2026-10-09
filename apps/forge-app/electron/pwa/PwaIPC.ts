import { ipcMain, webContents } from "electron";
import { PwaNavigationObserver } from "./PwaNavigationObserver.ts";
import { PwaInstallService } from "./PwaInstallService.ts";

export function registerPwaIPC(): void {
  ipcMain.on("pwa:register-tab", (_event, { tabId, contentsId }: { tabId: string; contentsId: number }) => {
    try {
      const wc = webContents.fromId(contentsId);
      if (wc && !wc.isDestroyed()) {
        PwaNavigationObserver.getInstance().registerTabWebContents(tabId, wc);
      }
    } catch (e) {
      console.warn(`[PwaIPC] Failed to register tab ${tabId} with contentsId ${contentsId}:`, e);
    }
  });

  ipcMain.handle("pwa:get-eligibility", (_event, tabId: string) => {
    return PwaNavigationObserver.getInstance().getTabEligibility(tabId);
  });

  ipcMain.handle("pwa:request-install", async (_event, tabId: string) => {
    return await PwaInstallService.getInstance().installPwa(tabId);
  });

  ipcMain.handle("pwa:get-installed", () => {
    return PwaInstallService.getInstance().getInstalledApps();
  });

  ipcMain.handle("pwa:launch-installed", (_event, appId: string) => {
    return PwaInstallService.getInstance().launchApp(appId);
  });

  ipcMain.handle("pwa:uninstall", (_event, appId: string) => {
    return PwaInstallService.getInstance().uninstallApp(appId);
  });
}
