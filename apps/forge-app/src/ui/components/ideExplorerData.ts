// Auto-generated comprehensive file manifest of the Forge project
export type FileType = "ts" | "tsx" | "json" | "css" | "html" | "md" | "yaml" | "js" | "ps1" | "img" | "other";

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  type?: FileType;
  specialIcon?: "github" | "src" | "node";
  isModified?: boolean;
  children?: TreeNode[];
}

export function getFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["ts"].includes(ext)) return "ts";
  if (["tsx"].includes(ext)) return "tsx";
  if (["json"].includes(ext)) return "json";
  if (["css"].includes(ext)) return "css";
  if (["html"].includes(ext)) return "html";
  if (["md"].includes(ext)) return "md";
  if (["yaml", "yml"].includes(ext)) return "yaml";
  if (["js", "cjs", "mjs"].includes(ext)) return "js";
  if (["ps1"].includes(ext)) return "ps1";
  if (["svg", "png", "ico", "jpg", "jpeg", "webp"].includes(ext)) return "img";
  return "other";
}

export const ALL_FORGE_FILES: string[] = [
  ".github/copilot-instructions.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".gitignore",
  "README.md",
  "apps/forge-app/.gitignore",
  "apps/forge-app/README.md",
  "apps/forge-app/dist-electron/assets/media-next.png",
  "apps/forge-app/dist-electron/assets/media-pause.png",
  "apps/forge-app/dist-electron/assets/media-play.png",
  "apps/forge-app/dist-electron/assets/media-prev.png",
  "apps/forge-app/dist-electron/guestPreload.cjs",
  "apps/forge-app/dist-electron/main.js",
  "apps/forge-app/dist-electron/preload.cjs",
  "apps/forge-app/dist-electron/preload.js",
  "apps/forge-app/dist-electron/setPipIcon.ps1",
  "apps/forge-app/dist/assets/index-BdkpFXM5.js",
  "apps/forge-app/dist/assets/index-BvfSUYk2.css",
  "apps/forge-app/dist/favicon.svg",
  "apps/forge-app/dist/icon.ico",
  "apps/forge-app/dist/icons.svg",
  "apps/forge-app/dist/index.html",
  "apps/forge-app/dist/logo.ico",
  "apps/forge-app/dist/logo.png",
  "apps/forge-app/electron/adblock/adblockAdapter.ts",
  "apps/forge-app/electron/adblock/listUpdater.ts",
  "apps/forge-app/electron/assets/media-next.png",
  "apps/forge-app/electron/assets/media-pause.png",
  "apps/forge-app/electron/assets/media-play.png",
  "apps/forge-app/electron/assets/media-prev.png",
  "apps/forge-app/electron/compat/compatManager.ts",
  "apps/forge-app/electron/engine/http/client.ts",
  "apps/forge-app/electron/engine/http/index.ts",
  "apps/forge-app/electron/engine/http/responseParser.ts",
  "apps/forge-app/electron/engine/http/types.ts",
  "apps/forge-app/electron/engine/http/url.ts",
  "apps/forge-app/electron/focus/socialFilterEngine.ts",
  "apps/forge-app/electron/guestPreload.ts",
  "apps/forge-app/electron/main.ts",
  "apps/forge-app/electron/network/networkMonitor.ts",
  "apps/forge-app/electron/network/secureNetworkAdapter.ts",
  "apps/forge-app/electron/network/types.ts",
  "apps/forge-app/electron/network/vpnAdapter.ts",
  "apps/forge-app/electron/preload.ts",
  "apps/forge-app/electron/privacy/privacyCleanerAdapter.ts",
  "apps/forge-app/electron/privacy/privacyManager.ts",
  "apps/forge-app/electron/privacy/privacyScheduler.ts",
  "apps/forge-app/electron/privacy/types.ts",
  "apps/forge-app/electron/sessions/sessionManager.ts",
  "apps/forge-app/electron/setPipIcon.ps1",
  "apps/forge-app/eslint.config.js",
  "apps/forge-app/index.html",
  "apps/forge-app/package.json",
  "apps/forge-app/pnpm-lock.yaml",
  "apps/forge-app/public/favicon.svg",
  "apps/forge-app/public/icon.ico",
  "apps/forge-app/public/icons.svg",
  "apps/forge-app/public/logo.ico",
  "apps/forge-app/public/logo.png",
  "apps/forge-app/scratch/test_privacy_cleaner.cjs",
  "apps/forge-app/src/App.css",
  "apps/forge-app/src/App.tsx",
  "apps/forge-app/src/assets/hero.png",
  "apps/forge-app/src/assets/react.svg",
  "apps/forge-app/src/assets/vite.svg",
  "apps/forge-app/src/core/adblock/useAdBlockStore.ts",
  "apps/forge-app/src/core/api-monitor/useApiMonitorStore.ts",
  "apps/forge-app/src/core/bookmarks/useBookmarksStore.ts",
  "apps/forge-app/src/core/compat/crossEngineRules.ts",
  "apps/forge-app/src/core/compat/qrCodeHelper.ts",
  "apps/forge-app/src/core/compat/useCompatStore.ts",
  "apps/forge-app/src/core/console/useConsoleStore.ts",
  "apps/forge-app/src/core/downloads/useDownloadsStore.ts",
  "apps/forge-app/src/core/engine/useHttpEngineStore.ts",
  "apps/forge-app/src/core/extensions/extensionTypes.ts",
  "apps/forge-app/src/core/extensions/useExtensionsStore.ts",
  "apps/forge-app/src/core/extensions/useIdeExtensionsStore.ts",
  "apps/forge-app/src/core/favorites/useFavoritesStore.ts",
  "apps/forge-app/src/core/focus/focusAlarm.ts",
  "apps/forge-app/src/core/focus/focusPlayerTypes.ts",
  "apps/forge-app/src/core/focus/focusPresets.ts",
  "apps/forge-app/src/core/focus/onlineMusicParser.ts",
  "apps/forge-app/src/core/focus/socialRulesets.ts",
  "apps/forge-app/src/core/focus/useFocusPlayerStore.ts",
  "apps/forge-app/src/core/focus/useFocusStore.ts",
  "apps/forge-app/src/core/fullscreen/useFullscreenStore.ts",
  "apps/forge-app/src/core/history/useHistoryStore.ts",
  "apps/forge-app/src/core/inspector/devicePresets.ts",
  "apps/forge-app/src/core/inspector/inspectorScript.ts",
  "apps/forge-app/src/core/inspector/useInspectorStore.ts",
  "apps/forge-app/src/core/localhost/useLocalhostAliasesStore.ts",
  "apps/forge-app/src/core/navigation/useNavigationStore.ts",
  "apps/forge-app/src/core/network/useNetworkStore.ts",
  "apps/forge-app/src/core/network/useSecureNetworkStore.ts",
  "apps/forge-app/src/core/news/useDevNewsStore.ts",
  "apps/forge-app/src/core/performance/usePerformanceStore.ts",
  "apps/forge-app/src/core/privacy/usePrivacyStore.ts",
  "apps/forge-app/src/core/projects/projectScanner.ts",
  "apps/forge-app/src/core/projects/useProjectsStore.ts",
  "apps/forge-app/src/core/sessions/useSessionsStore.ts",
  "apps/forge-app/src/core/tabs/useTabsStore.ts",
  "apps/forge-app/src/core/terminal/useTerminalStore.ts",
  "apps/forge-app/src/core/theme/useThemeStore.ts",
  "apps/forge-app/src/core/vpn/useVpnStore.ts",
  "apps/forge-app/src/core/wallpaper/useWallpaperStore.ts",
  "apps/forge-app/src/core/workspaces/useWorkspacesStore.ts",
  "apps/forge-app/src/index.css",
  "apps/forge-app/src/main.tsx",
  "apps/forge-app/src/ui/components/ApiMonitor.tsx",
  "apps/forge-app/src/ui/components/BlockedRequestsInspector.tsx",
  "apps/forge-app/src/ui/components/ConsoleIA.tsx",
  "apps/forge-app/src/ui/components/CrashGuardBanner.tsx",
  "apps/forge-app/src/ui/components/DevToolsBar.tsx",
  "apps/forge-app/src/ui/components/DownloadsModal.tsx",
  "apps/forge-app/src/ui/components/ExtensionsManagerModal.tsx",
  "apps/forge-app/src/ui/components/FavoritesView.tsx",
  "apps/forge-app/src/ui/components/FindInPageBar.tsx",
  "apps/forge-app/src/ui/components/FocusModeButton.tsx",
  "apps/forge-app/src/ui/components/FocusModeModal.tsx",
  "apps/forge-app/src/ui/components/FocusPlayerMiniWidget.tsx",
  "apps/forge-app/src/ui/components/FocusPlayerModal.tsx",
  "apps/forge-app/src/ui/components/HotkeysModal.tsx",
  "apps/forge-app/src/ui/components/HttpEngineInspector.tsx",
  "apps/forge-app/src/ui/components/IdeExplorerSidebarView.tsx",
  "apps/forge-app/src/ui/components/IdeExtensionsModal.tsx",
  "apps/forge-app/src/ui/components/IdeExtensionsSidebarView.tsx",
  "apps/forge-app/src/ui/components/NavigationBar.tsx",
  "apps/forge-app/src/ui/components/NetworkInspector.tsx",
  "apps/forge-app/src/ui/components/NewTabHome.tsx",
  "apps/forge-app/src/ui/components/PerformanceAnalyzer.tsx",
  "apps/forge-app/src/ui/components/PrivacyCleanerModal.tsx",
  "apps/forge-app/src/ui/components/ProjectDashboardModal.tsx",
  "apps/forge-app/src/ui/components/SearchEngineDropdown.tsx",
  "apps/forge-app/src/ui/components/SecureNetworkButton.tsx",
  "apps/forge-app/src/ui/components/SessionBadgeButton.tsx",
  "apps/forge-app/src/ui/components/SessionModal.tsx",
  "apps/forge-app/src/ui/components/ShieldsButton.tsx",
  "apps/forge-app/src/ui/components/Sidebar.tsx",
  "apps/forge-app/src/ui/components/SplitViewButton.tsx",
  "apps/forge-app/src/ui/components/TabBar.tsx",
  "apps/forge-app/src/ui/components/TabContextMenu.tsx",
  "apps/forge-app/src/ui/components/TabHoverCard.tsx",
  "apps/forge-app/src/ui/components/ThemeToggle.tsx",
  "apps/forge-app/src/ui/components/TitleBar.tsx",
  "apps/forge-app/src/ui/components/VisualInspector.tsx",
  "apps/forge-app/src/ui/components/WebEngineCompatibilityInspector.tsx",
  "apps/forge-app/src/ui/components/WebStoreExtensionsButton.tsx",
  "apps/forge-app/src/ui/components/WebView.tsx",
  "apps/forge-app/src/ui/components/WorkspaceSelector.tsx",
  "apps/forge-app/src/ui/components/newtab/DevIdeExtensionsFeed.tsx",
  "apps/forge-app/src/ui/components/newtab/DevNewsFeed.tsx",
  "apps/forge-app/src/ui/components/newtab/WallpaperModal.tsx",
  "apps/forge-app/src/ui/layouts/BrowserLayout.tsx",
  "apps/forge-app/src/vite-env.d.ts",
  "apps/forge-app/tsconfig.app.json",
  "apps/forge-app/tsconfig.json",
  "apps/forge-app/tsconfig.node.json",
  "apps/forge-app/vite.config.ts",
  "apps/forge-site/.gitignore",
  "apps/forge-site/AGENTS.md",
  "apps/forge-site/CLAUDE.md",
  "apps/forge-site/README.md",
  "apps/forge-site/app/components/Footer.tsx",
  "apps/forge-site/app/components/Navbar.tsx",
  "apps/forge-site/app/components/ThemeProvider.tsx",
  "apps/forge-site/app/docs/page.tsx",
  "apps/forge-site/app/downloads/page.tsx",
  "apps/forge-site/app/favicon.ico",
  "apps/forge-site/app/globals.css",
  "apps/forge-site/app/layout.tsx",
  "apps/forge-site/app/page.tsx",
  "apps/forge-site/app/products/page.tsx",
  "apps/forge-site/app/roadmap/page.tsx",
  "apps/forge-site/eslint.config.mjs",
  "apps/forge-site/next.config.ts",
  "apps/forge-site/package.json",
  "apps/forge-site/postcss.config.mjs",
  "apps/forge-site/public/apple-black-logo-svgrepo-com.svg",
  "apps/forge-site/public/file.svg",
  "apps/forge-site/public/globe.svg",
  "apps/forge-site/public/linux-svgrepo-com.svg",
  "apps/forge-site/public/logo.png",
  "apps/forge-site/public/next.svg",
  "apps/forge-site/public/vercel.svg",
  "apps/forge-site/public/window.svg",
  "apps/forge-site/public/windows-174-svgrepo-com.svg",
  "apps/forge-site/tsconfig.json",
  "docs/architecture/overview.md",
  "docs/flowcharts/pipeline.md",
  "docs/roadmap/features.md",
  "docs/ux/design-specs.md",
  "package.json",
  "packages/adblock-engine/package.json",
  "packages/adblock-engine/src/cosmetic/cosmeticRules.ts",
  "packages/adblock-engine/src/cosmetic/index.ts",
  "packages/adblock-engine/src/cosmetic/scriptlets.ts",
  "packages/adblock-engine/src/filters/filterList.ts",
  "packages/adblock-engine/src/filters/index.ts",
  "packages/adblock-engine/src/filters/presets/easylist.ts",
  "packages/adblock-engine/src/filters/presets/easyprivacy.ts",
  "packages/adblock-engine/src/filters/presets/index.ts",
  "packages/adblock-engine/src/filters/presets/malvertising.ts",
  "packages/adblock-engine/src/filters/presets/quickfixes.ts",
  "packages/adblock-engine/src/index.ts",
  "packages/adblock-engine/src/matcher/domainTrie.ts",
  "packages/adblock-engine/src/matcher/index.ts",
  "packages/adblock-engine/src/matcher/urlMatcher.ts",
  "packages/adblock-engine/src/rules/index.ts",
  "packages/adblock-engine/src/rules/parser.ts",
  "packages/adblock-engine/src/rules/rule.ts",
  "packages/adblock-engine/test/engine.test.ts",
  "packages/adblock-engine/test/shield-features.test.ts",
  "packages/adblock-engine/tsconfig.json",
  "packages/network-core/package.json",
  "packages/network-core/src/index.ts",
  "packages/network-core/src/manager/NetworkManager.ts",
  "packages/network-core/src/providers/DirectProvider.ts",
  "packages/network-core/src/providers/NetworkProvider.ts",
  "packages/network-core/src/providers/ProxyProvider.ts",
  "packages/network-core/src/providers/WireGuardProvider.ts",
  "packages/network-core/src/types/NetworkConfig.ts",
  "packages/network-core/src/vpn/VpnLocationRegistry.ts",
  "packages/network-core/src/vpn/VpnManager.ts",
  "packages/network-core/src/vpn/WireGuardConfigParser.ts",
  "packages/network-core/test/networkCore.test.ts",
  "packages/network-core/test/vpnCore.test.ts",
  "packages/network-core/tsconfig.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
];

export function isValidFilePath(p: string): boolean {
  if (!p || typeof p !== "string") return false;
  const clean = p.trim();
  if (clean.length === 0 || clean.length > 260) return false;
  // Exclude ASCII table borders, banner art, or terminal box drawing characters
  if (/^[|+\-?~*=–—#]/.test(clean)) return false;
  if (clean.includes("|") || clean.includes("+") || clean.includes("---")) return false;
  if (
    clean.includes("User:") ||
    clean.includes("Machine:") ||
    clean.includes("PowerShell:") ||
    clean.includes("Session") ||
    clean.includes("RAM:") ||
    clean.includes("Obsidian:")
  ) {
    return false;
  }
  // Must only contain characters valid for repo relative paths
  if (!/^[a-zA-Z0-9_@.\-/\\\s]+$/.test(clean)) return false;
  // Must have a dot (file with extension) or be one of the top root folders
  const lastPart = clean.split(/[/\\]/).pop() || "";
  if (!lastPart.includes(".") && !["apps", "packages", "docs", ".github"].includes(clean)) {
    return false;
  }
  return true;
}

export function buildRepositoryTree(
  paths: string[] = ALL_FORGE_FILES,
  modifiedPaths: string[] = ["apps/forge-app/src/ui/components/IdeExplorerSidebarView.tsx"]
): TreeNode {
  const root: TreeNode = {
    id: "root-forge",
    name: "Forge",
    path: "C:\\Users\\josed\\Documents\\Rerpositories\\Forge",
    isFolder: true,
    children: [],
  };

  const modSet = new Set(
    modifiedPaths
      .filter(isValidFilePath)
      .map((p) => p.replace(/\\/g, "/"))
  );

  const cleanPaths = paths.filter(isValidFilePath);

  for (const raw of cleanPaths) {
    const norm = raw.replace(/\\/g, "/");
    const segments = norm.split("/").filter(Boolean);
    let curr = root;
    let accRel = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accRel = accRel ? `${accRel}/${seg}` : seg;
      const isFile = i === segments.length - 1;
      const fullPath = `C:\\Users\\josed\\Documents\\Rerpositories\\Forge\\${accRel.replace(/\//g, "\\")}`;

      if (isFile) {
        curr.children = curr.children || [];
        curr.children.push({
          id: `file-${accRel}`,
          name: seg,
          path: fullPath,
          isFolder: false,
          type: getFileType(seg),
          isModified: modSet.has(norm),
        });
      } else {
        curr.children = curr.children || [];
        let existing = curr.children.find((c) => c.isFolder && c.name === seg);
        if (!existing) {
          let specialIcon: "github" | "src" | "node" | undefined;
          if (seg === ".github") specialIcon = "github";
          else if (seg === "src") specialIcon = "src";
          else if (seg === "node_modules") specialIcon = "node";

          existing = {
            id: `folder-${accRel}`,
            name: seg,
            path: fullPath,
            isFolder: true,
            specialIcon,
            children: [],
          };
          curr.children.push(existing);
        }
        curr = existing;
      }
    }
  }

  function sortAndPropagate(node: TreeNode) {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      let childMod = false;
      for (const child of node.children) {
        sortAndPropagate(child);
        if (child.isModified) childMod = true;
      }
      if (childMod) node.isModified = true;
    }
  }

  sortAndPropagate(root);
  return root;
}
