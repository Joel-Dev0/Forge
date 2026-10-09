import type { PwaDisplayMode, PwaIcon, PwaManifest } from "../types.ts";

export class ManifestParser {
  public static parse(rawJson: unknown, baseUrl: string, manifestUrl?: string): PwaManifest {
    let data: Record<string, any>;
    if (typeof rawJson === "string") {
      try {
        data = JSON.parse(rawJson);
      } catch {
        throw new Error("Invalid manifest JSON");
      }
    } else if (rawJson && typeof rawJson === "object") {
      data = rawJson as Record<string, any>;
    } else {
      throw new Error("Manifest payload is empty or invalid");
    }

    const resolveUrl = (rel: string, base: string): string => {
      try {
        return new URL(rel, base).href;
      } catch {
        return rel;
      }
    };

    const docOrigin = new URL(baseUrl).origin;
    const manifestBase = manifestUrl || baseUrl;

    const name = String(data.name || data.short_name || "").trim();
    const shortName = data.short_name ? String(data.short_name).trim() : undefined;
    const description = data.description ? String(data.description).trim() : undefined;

    // start_url defaults to document URL or "/" on origin
    const rawStartUrl = data.start_url || "/";
    const startUrl = resolveUrl(rawStartUrl, manifestBase);

    // scope defaults to start_url directory
    let scope: string;
    if (data.scope) {
      scope = resolveUrl(data.scope, manifestBase);
    } else {
      try {
        const startParsed = new URL(startUrl);
        const lastSlash = startParsed.pathname.lastIndexOf("/");
        const dirPath = lastSlash >= 0 ? startParsed.pathname.slice(0, lastSlash + 1) : "/";
        scope = `${startParsed.origin}${dirPath}`;
      } catch {
        scope = docOrigin;
      }
    }

    // display mode
    let display: PwaDisplayMode = "standalone";
    const rawDisplay = String(data.display || "").toLowerCase();
    if (rawDisplay === "fullscreen" || rawDisplay === "standalone" || rawDisplay === "minimal-ui" || rawDisplay === "browser") {
      display = rawDisplay;
    }

    // icons parsing
    const icons: PwaIcon[] = [];
    if (Array.isArray(data.icons)) {
      for (const item of data.icons) {
        if (!item || !item.src) continue;
        const src = resolveUrl(item.src, manifestBase);
        const sizes = item.sizes ? String(item.sizes) : undefined;
        const type = item.type ? String(item.type) : undefined;
        const purpose = item.purpose ? String(item.purpose) : undefined;

        let width: number | undefined;
        let height: number | undefined;
        if (sizes) {
          const match = sizes.match(/(\d+)\s*x\s*(\d+)/i);
          if (match) {
            width = parseInt(match[1], 10);
            height = parseInt(match[2], 10);
          }
        }

        icons.push({
          src,
          sizes,
          type,
          purpose,
          width,
          height,
        });
      }
    }

    return {
      name,
      shortName,
      description,
      startUrl,
      scope,
      display,
      themeColor: data.theme_color ? String(data.theme_color) : undefined,
      backgroundColor: data.background_color ? String(data.background_color) : undefined,
      icons,
      rawManifestUrl: manifestUrl,
    };
  }
}
