/// <reference types="vite/client" />

declare global {
  type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH" | "OPTIONS";

  interface HttpRequestOptions {
    url: string;
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
    timeout?: number;
  }

  interface HttpTiming {
    dns: number;
    tcp: number;
    tls: number;
    ttfb: number;
    download: number;
    total: number;
  }

  interface HttpSecurity {
    authorized: boolean;
    protocol?: string;
    cipher?: string;
    serverName?: string;
    certSubject?: string;
    certIssuer?: string;
    certValidTo?: string;
  }

  interface HttpResponse {
    url: string;
    status: number;
    statusText: string;
    httpVersion: string;
    headers: Record<string, string>;
    body: string;
    contentLength: number;
    timing: HttpTiming;
    security?: HttpSecurity;
    rawRequest: string;
    rawResponseHeaders: string;
    redirectCount: number;
  }

  type NetworkResourceType =
    | "document"
    | "stylesheet"
    | "image"
    | "media"
    | "font"
    | "script"
    | "texttrack"
    | "xhr"
    | "fetch"
    | "prefetch"
    | "eventsource"
    | "websocket"
    | "manifest"
    | "signedexchange"
    | "ping"
    | "cspviolationreport"
    | "preflight"
    | "other";

  interface NetworkEntry {
    id: string;
    url: string;
    name: string;
    method: string;
    resourceType: NetworkResourceType;
    status: number;
    statusText: string;
    mimeType?: string;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    postData?: string;
    responseBody?: string;
    hasResponseBody?: boolean;
    size: number;
    startTime: number;
    duration: number;
    state: "pending" | "completed" | "failed";
    error?: string;
    initiator?: string;
  }

  interface WebviewElement extends HTMLElement {
    loadURL: (url: string) => Promise<void> | void;
    getURL: () => string;
    getTitle: () => string;
    isLoading: () => boolean;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stop: () => void;
    executeJavaScript: (code: string, userGesture?: boolean) => Promise<any>;
    insertCSS: (css: string) => Promise<string>;
    removeInsertedCSS: (key: string) => Promise<void>;
    send: (channel: string, ...args: any[]) => void;
    openDevTools: () => void;
    closeDevTools: () => void;
    isDevToolsOpened: () => boolean;
    getWebContentsId?: () => number;
    isAudioMuted?: () => boolean;
    setAudioMuted?: (muted: boolean) => void;
    isCurrentlyAudible?: () => boolean;
    findInPage?: (text: string, options?: { forward?: boolean; findNext?: boolean; matchCase?: boolean }) => number;
    stopFindInPage?: (action: "clearSelection" | "keepSelection" | "activateSelection") => void;
    getZoomFactor?: (callback: (factor: number) => void) => void;
    setZoomFactor?: (factor: number) => void;
    addEventListener: (event: string, listener: (...args: any[]) => void) => void;
    removeEventListener: (event: string, listener: (...args: any[]) => void) => void;
  }

  interface Window {
    electron?: {
      minimize: () => void;
      maximize: () => void;
      restoreAndFocus?: () => void;
      close: () => void;
      openPrivate?: () => void;
      isMaximized?: () => Promise<boolean>;
      setFullScreen?: (flag: boolean) => void;
      isFullScreen?: () => Promise<boolean>;
      setTheme: (mode: string) => void;
    };
    forge?: {
      platform: string;
      minimize?: () => void;
      maximize?: () => void;
      restoreAndFocus?: () => void;
      close?: () => void;
      openPrivate?: () => void;
      isMaximized?: () => Promise<boolean>;
      setFullScreen?: (flag: boolean) => void;
      isFullScreen?: () => Promise<boolean>;
      setTheme?: (mode: string) => void;
      setTitle?: (title: string) => void;
      shortcuts?: {
        onTrigger: (callback: (action: string) => void) => () => void;
      };
      tabs?: {
        onOpenTab: (callback: (data: { url: string }) => void) => () => void;
        onAudioChanged?: (
          callback: (data: { contentsId: number; isPlayingAudio: boolean; isMuted: boolean }) => void
        ) => () => void;
        getTabsMemory?: (
          items: { tabId: string; contentsId?: number; webContentsId?: number }[]
        ) => Promise<Record<string, { memoryMB: number; cpuPercent: number }>>;
        setMuted?: (contentsId: number, isMuted: boolean) => Promise<boolean>;
      };
      downloads?: {
        getRecent: () => Promise<any[]>;
        clearHistory: () => Promise<boolean>;
        openFolder: () => Promise<boolean>;
        openFile: (filePath: string) => Promise<boolean>;
        showInFolder: (filePath: string) => Promise<boolean>;
        onDownloadCreated: (callback: (item: any) => void) => () => void;
        onDownloadUpdated: (callback: (item: any) => void) => () => void;
        onDownloadDone: (callback: (item: any) => void) => () => void;
      };
      pip?: {
        onActivateTabByContentsId: (callback: (contentsId: number) => void) => () => void;
      };
      power?: {
        onPowerResume: (callback: () => void) => () => void;
        onPowerSuspend: (callback: () => void) => () => void;
      };
      fullscreen?: {
        setFullScreen: (flag: boolean) => void;
        isFullScreen: () => Promise<boolean>;
        onHtmlFullScreenChange: (callback: (data: { isFullscreen: boolean; contentsId?: number }) => void) => () => void;
      };
      media?: {
        updateStatus: (data: { isPlaying: boolean }) => void;
        onTaskbarMediaPrev: (callback: () => void) => () => void;
        onTaskbarMediaTogglePlay: (callback: () => void) => () => void;
        onTaskbarMediaNext: (callback: () => void) => () => void;
      };
      http?: {
        request: (options: HttpRequestOptions) => Promise<{ ok: boolean; data?: HttpResponse; error?: string }>;
      };
      network?: {
        onEntry: (callback: (entry: NetworkEntry) => void) => () => void;
        onClear: (callback: () => void) => () => void;
        clear: () => void;
        getResponseBody: (requestId: string) => Promise<string | null>;
      };
      terminal?: {
        exec: (command: string, shell?: "powershell" | "cmd") => Promise<{ stdout: string; stderr: string; cwd: string; exitCode: number }>;
        getCwd: () => Promise<string>;
        setCwd: (path: string) => Promise<{ ok: boolean; cwd: string; error?: string }>;
      };
      adblock?: {
        getState: () => Promise<{
          enabled: boolean;
          features?: {
            adBlock: boolean;
            trackerProtection: boolean;
            malvertisingProtection: boolean;
            customRules: boolean;
          };
          stats: {
            enabled: boolean;
            totalLists: number;
            totalRules: number;
            blockedCount: number;
            allowedCount: number;
            lists: {
              id: string;
              name: string;
              category?: string;
              description?: string;
              enabled: boolean;
              rulesCount: number;
              hitsCount: number;
              lastUpdated?: number;
              url?: string;
              version?: string;
            }[];
          };
          detailedStats?: {
            enabled: boolean;
            features: {
              adBlock: boolean;
              trackerProtection: boolean;
              malvertisingProtection: boolean;
              customRules: boolean;
            };
            totalLists: number;
            totalRules: number;
            blockedCount: number;
            allowedCount: number;
            byCategory: {
              ad: number;
              tracker: number;
              malvertising: number;
              custom: number;
            };
            topDomains: { domain: string; count: number; category: string }[];
            estimatedBandwidthSavedBytes: number;
            estimatedTimeSavedMs: number;
            lists: any[];
          };
          customRules?: any[];
          recentLogs: any[];
          updaterStatus?: {
            isUpdating: boolean;
            lastUpdated?: number;
            lastError?: string;
            updatedLists: string[];
          };
        }>;
        setEnabled: (enabled: boolean) => Promise<boolean>;
        setFeature: (feature: string, enabled: boolean) => Promise<{
          adBlock: boolean;
          trackerProtection: boolean;
          malvertisingProtection: boolean;
          customRules: boolean;
        }>;
        getDetailedStats: () => Promise<any>;
        getCustomRules: () => Promise<any[]>;
        toggleCustomRule: (ruleId: string, enabled?: boolean) => Promise<boolean>;
        importRules: (rawContent: string) => Promise<{ imported: number; errors: string[] }>;
        exportRules: () => Promise<string>;
        toggleList: (listId: string, enabled?: boolean) => Promise<boolean>;
        addUserRule: (rawRule: string) => Promise<{ ok: boolean; rule?: any; error?: string }>;
        removeUserRule: (ruleId: string) => Promise<boolean>;
        clearLogs: () => Promise<boolean>;
        getCosmeticCSS: (url: string) => Promise<string>;
        getScriptlet: (url: string) => Promise<string>;
        updateLists: () => Promise<{ isUpdating: boolean; lastUpdated?: number; lastError?: string; updatedLists: string[] }>;
        getGuestPreloadPath: () => Promise<string>;
        onRequestEntry: (callback: (entry: any) => void) => () => void;
        onStateChanged: (callback: (state: any) => void) => () => void;
        onListsUpdated: (callback: (status: any) => void) => () => void;
        onLogsCleared: () => () => void;
      };
      secureNetwork?: {
        getStatus: () => Promise<any>;
        connect: (payload: { mode: "direct" | "proxy" | "wireguard"; config?: any }) => Promise<{ ok: boolean; status?: any; error?: string }>;
        disconnect: () => Promise<{ ok: boolean; status?: any; error?: string }>;
        refreshIp: () => Promise<{ ok: boolean; location?: any; error?: string }>;
        testConnection: (targetUrl?: string) => Promise<{ ok: boolean; result: { success: boolean; latencyMs: number; statusCode?: number; error?: string } }>;
        onStatusChanged: (callback: (status: any) => void) => () => void;
      };
      vpn?: {
        getStatus: () => Promise<any>;
        connect: (profileIdOrConfig?: any) => Promise<{ ok: boolean; status?: any; error?: string }>;
        disconnect: () => Promise<{ ok: boolean; status?: any; error?: string }>;
        setKillSwitch: (enabled: boolean) => Promise<{ ok: boolean; status?: any; error?: string }>;
        getLocations: () => Promise<any[]>;
        selectLocation: (locationId: string) => Promise<{ ok: boolean; status?: any; error?: string }>;
        getProfiles: () => Promise<any[]>;
        saveProfile: (profile: any) => Promise<{ ok: boolean; profile?: any; error?: string }>;
        deleteProfile: (profileId: string) => Promise<{ ok: boolean; error?: string }>;
        importConfig: (rawText: string, name?: string) => Promise<{ ok: boolean; profile?: any; error?: string }>;
        exportConfig: (profileId?: string) => Promise<{ ok: boolean; conf?: string; error?: string }>;
        testLatency: (locationId: string) => Promise<{ ok: boolean; pingMs: number; error?: string }>;
        onStatusChanged: (callback: (status: any) => void) => () => void;
      };
      privacy?: {
        getStats: (historyCount?: number) => Promise<any>;
        getPolicy: () => Promise<any>;
        updatePolicy: (partial: any) => Promise<any>;
        cleanNow: (overrideTargets?: any, overrideCookieRule?: any) => Promise<any>;
        cleanTrackersOnly: () => Promise<{ removed: number }>;
        addProtectedDomain: (domain: string) => Promise<any>;
        removeProtectedDomain: (domain: string) => Promise<any>;
        onStatsUpdated: (callback: () => void) => () => void;
        onCleanupCompleted: (callback: (result: any) => void) => () => void;
        onPolicyChanged: (callback: (policy: any) => void) => () => void;
        onClearHistoryRequested: (callback: () => void) => () => void;
        onClearDownloadsRequested: (callback: () => void) => () => void;
        createSession?: (mode: "private" | "tor", name?: string) => Promise<{ id: string; mode: "private" | "tor"; name: string; partition: string; createdAt: number }>;
        destroySession?: (sessionId: string) => Promise<{ success: boolean }>;
        registerTab?: (sessionId: string) => Promise<{ success: boolean }>;
        unregisterTab?: (sessionId: string) => Promise<{ destroyed: boolean }>;
        getSessions?: () => Promise<any[]>;
      };
      tor?: {
        getStatus: () => Promise<any>;
        connect: () => Promise<any>;
        disconnect: () => Promise<any>;
        newCircuit: () => Promise<any>;
        testLeak: () => Promise<any>;
        onStatusChanged: (callback: (status: any) => void) => () => void;
        onCircuitChanged: (callback: (circuit: any) => void) => () => void;
      };
      session?: {
        saveBackup: (data: any) => Promise<boolean>;
        getBackup: () => Promise<any>;
      };
      sessions?: {
        clearData: (partition: string, types?: string[]) => Promise<{ success: boolean; error?: string }>;
      };
      focus?: {
        syncState: (payload: any) => Promise<boolean>;
      };
      compat?: {
        setCORSBypass: (active: boolean) => Promise<{ success: boolean; isCorsBypassActive: boolean }>;
        getCORSBypass: () => Promise<boolean>;
        getVersions: () => Promise<{ chromium: string; v8: string; node: string; electron: string }>;
        getLocalIp: () => Promise<string>;
        setEmulation: (targetContentsId: number | undefined, options: any) => Promise<{ success: boolean }>;
        collectGarbage: (targetContentsId?: number) => Promise<{ success: boolean; count: number }>;
        onTabCrashed: (callback: (data: { contentsId: number; reason: string; exitCode: number }) => void) => () => void;
        onDeprecationLogged: (callback: (data: { contentsId: number; level: number; message: string; line: number; source: string }) => void) => () => void;
      };
      extensions?: {
        installFromWebStore: (extId: string, url?: string) => Promise<{ success: boolean; message: string; extension?: any }>;
        uninstall: (extId: string) => Promise<boolean>;
        listInstalled: () => Promise<any[]>;
        openPopup?: (extId: string, anchorBounds?: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; message?: string }>;
        getPopupInfo: (extId: string) => Promise<{ hasPopup: boolean; popupFile: string | null }>;
        getDiagnostics: (extId?: string) => Promise<any>;
        getDiagnosticsSummary: () => Promise<any[]>;
        getSessionBridgeSummary: () => Promise<any[]>;
        getTabSummary?: () => Promise<{ totalTabs: number; activeTabId: number | null; tabs: any[] }>;
        syncTabs?: (tabs: any[]) => Promise<{ success: boolean }>;
        setActiveTab?: (webContentsId: number) => Promise<{ success: boolean }>;
        queryTabs?: (filter?: any) => Promise<any[]>;
        sendMessageToTab?: (tabId: number, message: any) => Promise<any>;
        sendMessage?: (extensionId: string, message: any) => Promise<any>;
        broadcastMessage?: (message: any, filter?: any) => Promise<{ success: boolean }>;
        getMessageStats?: () => Promise<{ totalSent: number; totalDelivered: number; totalFailed: number; activeChannels: number; lastMessageAt: number | null }>;
        getAllBadges?: (tabId?: number) => Promise<Record<string, { text: string; textColor?: string; backgroundColor?: string; title?: string }>>;
        getBadge?: (extensionId: string, tabId?: number) => Promise<{ text: string; textColor?: string; backgroundColor?: string; title?: string }>;
        onBadgeUpdated?: (callback: (data: { extensionId: string; badge: any }) => void) => () => void;
        getServiceWorkerStatuses?: () => Promise<Record<string, any>>;
        wakeServiceWorker?: (extensionId: string) => Promise<{ success: boolean; message: string }>;
      };
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: boolean | string;
        allowFullScreen?: boolean | string;
        allowfullscreen?: boolean | string;
        nodeintegrationinsubframes?: boolean | string;
        preload?: string;
      };
    }
  }
}

declare module "react" {
  interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
    nodeintegrationinsubframes?: boolean | string;
  }
}

export {};