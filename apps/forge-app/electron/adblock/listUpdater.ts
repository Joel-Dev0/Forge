import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { AdBlockEngine } from "@forge/adblock-engine";

export interface ListSubscription {
  id: string;
  name: string;
  url: string;
  filename: string;
}

export const LIST_SUBSCRIPTIONS: ListSubscription[] = [
  {
    id: "easylist",
    name: "EasyList Core",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt",
    filename: "easylist.txt",
  },
  {
    id: "easyprivacy",
    name: "EasyPrivacy",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easyprivacy_general_block.txt",
    filename: "easyprivacy.txt",
  },
  {
    id: "quickfixes",
    name: "uBlock Quick Fixes",
    url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
    filename: "quickfixes.txt",
  },
  {
    id: "malvertising",
    name: "Malvertising & Threats",
    url: "https://raw.githubusercontent.com/Joel-Dev0/Forge/master/filters/malvertising.txt",
    filename: "malvertising.txt",
  },
];

export interface ListUpdaterStatus {
  isUpdating: boolean;
  lastUpdated?: number;
  lastError?: string;
  updatedLists: string[];
}

let status: ListUpdaterStatus = {
  isUpdating: false,
  updatedLists: [],
};

let updateTimer: NodeJS.Timeout | null = null;
let broadcastStatusFn: ((status: ListUpdaterStatus) => void) | null = null;

function getListsDirectory(): string {
  const dir = path.join(app.getPath("userData"), "adblock_lists");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
}

/**
 * Loads any locally cached filter list files into the engine on startup.
 */
export function loadCachedLists(engine: AdBlockEngine): void {
  const dir = getListsDirectory();

  for (const sub of LIST_SUBSCRIPTIONS) {
    const filePath = path.join(dir, sub.filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content && content.length > 100) {
          engine.updateListContent(sub.id, content);
          console.log(`[AdBlock ListUpdater] Loaded cached list '${sub.name}' (${content.length} bytes)`);
        }
      } catch (err) {
        console.warn(`[AdBlock ListUpdater] Could not read cached list '${sub.name}':`, err);
      }
    }
  }
}

/**
 * Fetches updated filter lists from remote URLs, saves them locally,
 * and compiles them into the active AdBlockEngine without restarting.
 */
export async function updateFilterLists(engine: AdBlockEngine): Promise<ListUpdaterStatus> {
  if (status.isUpdating) {
    return status;
  }

  status.isUpdating = true;
  status.lastError = undefined;
  status.updatedLists = [];
  if (broadcastStatusFn) broadcastStatusFn({ ...status });

  const dir = getListsDirectory();

  for (const sub of LIST_SUBSCRIPTIONS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(sub.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Forge/1.0",
          Accept: "text/plain, */*",
        },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 500) {
          // Write to local cache
          const filePath = path.join(dir, sub.filename);
          fs.writeFileSync(filePath, text, "utf-8");

          // Hot-swap into engine
          engine.updateListContent(sub.id, text);
          status.updatedLists.push(sub.name);
          console.log(`[AdBlock ListUpdater] Successfully updated list '${sub.name}'`);
        }
      }
    } catch (err: any) {
      console.warn(`[AdBlock ListUpdater] Failed to update list '${sub.name}':`, err.message);
      status.lastError = `Failed to update ${sub.name}: ${err.message}`;
    }
  }

  status.isUpdating = false;
  status.lastUpdated = Date.now();
  if (broadcastStatusFn) broadcastStatusFn({ ...status });

  return status;
}

/**
 * Initializes automatic background list updating.
 */
export function initListUpdater(
  engine: AdBlockEngine,
  broadcastStatus: (status: ListUpdaterStatus) => void
): void {
  broadcastStatusFn = broadcastStatus;

  // 1. Load any previously downloaded cached lists
  loadCachedLists(engine);

  // 2. Initial background check 10 seconds after app start
  setTimeout(() => {
    updateFilterLists(engine).catch(() => {});
  }, 10000);

  // 3. Periodic background check every 24 hours
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    updateFilterLists(engine).catch(() => {});
  }, 24 * 60 * 60 * 1000);
}

export function getListUpdaterStatus(): ListUpdaterStatus {
  return { ...status };
}
