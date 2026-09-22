export type EngineType = "blink" | "gecko" | "webkit";
export type InconsistencySeverity = "breaking" | "visual" | "vendor_feature" | "info";

export interface EngineInconsistency {
  id: string;
  title: string;
  category: "css" | "javascript" | "dom" | "media" | "network";
  severity: InconsistencySeverity;
  affectedEngines: {
    blink: "supported" | "partial" | "unsupported" | "prefixed";
    gecko: "supported" | "partial" | "unsupported" | "prefixed";
    webkit: "supported" | "partial" | "unsupported" | "prefixed";
  };
  summary: string;
  recommendation: string;
  codeSnippet?: string;
}

export interface EngineAuditResult {
  url: string;
  timestamp: number;
  scores: {
    blink: number; // 0-100
    gecko: number;
    webkit: number;
  };
  detectedIssues: Array<EngineInconsistency & { occurrenceCount: number; sampleSelector?: string }>;
  pageFeatures: {
    totalStyleRules: number;
    domNodesCount: number;
    usedVendorPrefixes: string[];
    modernAPIsUsed: string[];
  };
}

export const KNOWN_CROSS_ENGINE_RULES: EngineInconsistency[] = [
  {
    id: "css-backdrop-filter",
    title: "Backdrop Filter Vendor Prefix Requirement",
    category: "css",
    severity: "visual",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "prefixed",
    },
    summary: "WebKit (Safari and iOS Safari) still requires the -webkit-backdrop-filter prefix in many stable releases for frosted glass and blur effects.",
    recommendation: "Always pair `backdrop-filter: blur(...)` with `-webkit-backdrop-filter: blur(...)`.",
    codeSnippet: "-webkit-backdrop-filter: blur(12px);\nbackdrop-filter: blur(12px);",
  },
  {
    id: "css-line-clamp",
    title: "Multi-line Text Truncation (-webkit-line-clamp)",
    category: "css",
    severity: "visual",
    affectedEngines: {
      blink: "prefixed",
      gecko: "prefixed",
      webkit: "prefixed",
    },
    summary: "Standard line-clamp has limited cross-engine baseline support without the legacy -webkit-box and -webkit-line-clamp properties.",
    recommendation: "Use the 3-property bundle: `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N; overflow: hidden;`.",
    codeSnippet: "display: -webkit-box;\n-webkit-line-clamp: 2;\n-webkit-box-orient: vertical;\noverflow: hidden;",
  },
  {
    id: "css-scrollbar-styling",
    title: "Scrollbar Customization Inconsistencies",
    category: "css",
    severity: "visual",
    affectedEngines: {
      blink: "prefixed",
      gecko: "supported",
      webkit: "prefixed",
    },
    summary: "Gecko uses standardized `scrollbar-width` and `scrollbar-color`, whereas Blink and WebKit historically rely on `::-webkit-scrollbar` pseudo-elements.",
    recommendation: "Define both standard `scrollbar-width: thin; scrollbar-color: ...` and `::-webkit-scrollbar` rules.",
    codeSnippet: "/* Standard (Gecko) */\nscrollbar-width: thin;\nscrollbar-color: #555 transparent;\n\n/* WebKit/Blink */\n::-webkit-scrollbar { width: 6px; }",
  },
  {
    id: "css-dynamic-viewport-units",
    title: "Dynamic Viewport Units (dvh, svh, lvh)",
    category: "css",
    severity: "visual",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "supported",
    },
    summary: "Older Safari and legacy mobile browsers fail on dvh/svh/lvh, resulting in layout breakage when mobile address bars expand or collapse.",
    recommendation: "Provide a 100vh fallback before 100dvh for backwards compatibility.",
    codeSnippet: "height: 100vh;\nheight: 100dvh;",
  },
  {
    id: "css-subgrid",
    title: "CSS Grid Subgrid Support & Alignment",
    category: "css",
    severity: "breaking",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "supported",
    },
    summary: "Subgrid requires Chromium 117+, Safari 16+, and Firefox 71+. Older enterprise and embedded webviews will render collapsed layouts without fallback.",
    recommendation: "Feature-query subgrid via `@supports (grid-template-columns: subgrid)`.",
    codeSnippet: "@supports (grid-template-columns: subgrid) {\n  .child { grid-template-columns: subgrid; }\n}",
  },
  {
    id: "css-starting-style",
    title: "CSS @starting-style Entry Transitions",
    category: "css",
    severity: "visual",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "supported",
    },
    summary: "@starting-style for smooth dialog and popover open transitions requires Safari 17.5+ and Firefox 129+.",
    recommendation: "Ensure keyframe animations or standard transitions exist as progressive enhancement fallbacks.",
  },
  {
    id: "api-web-bluetooth-usb-serial",
    title: "Hardware APIs (WebUSB / WebBluetooth / WebSerial)",
    category: "javascript",
    severity: "breaking",
    affectedEngines: {
      blink: "supported",
      gecko: "unsupported",
      webkit: "unsupported",
    },
    summary: "Mozilla (Gecko) and Apple (WebKit) have explicitly declined to implement WebUSB, WebBluetooth, and WebSerial due to security and fingerprinting concerns.",
    recommendation: "Guard hardware API calls with explicit feature detection (`'bluetooth' in navigator`) and present user-friendly fallbacks on non-Chromium browsers.",
    codeSnippet: "if ('bluetooth' in navigator) {\n  // Chromium only\n} else {\n  // Firefox & Safari fallback\n}",
  },
  {
    id: "api-audiocontext-autoplay",
    title: "AudioContext Autoplay Policy Discrepancies",
    category: "media",
    severity: "breaking",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "partial",
    },
    summary: "WebKit imposes ultra-strict user gesture gating on AudioContext; calling `.resume()` outside direct synchronous click event handlers causes silent audio failures in Safari.",
    recommendation: "Unlock AudioContext inside the user's synchronous pointerdown/click event before queuing media playback.",
    codeSnippet: "button.addEventListener('click', () => {\n  if (audioCtx.state === 'suspended') audioCtx.resume();\n});",
  },
  {
    id: "api-view-transitions",
    title: "View Transitions API",
    category: "javascript",
    severity: "visual",
    affectedEngines: {
      blink: "supported",
      gecko: "partial",
      webkit: "supported",
    },
    summary: "`document.startViewTransition()` is supported in Chromium and Safari 18+, but requires nightly/flag configurations in older Gecko versions.",
    recommendation: "Wrap state transitions in a feature check fallback: `if (document.startViewTransition) ... else updateDOM()`.",
    codeSnippet: "if (document.startViewTransition) {\n  document.startViewTransition(update);\n} else {\n  update();\n}",
  },
  {
    id: "dom-datetime-picker",
    title: "Native Date/Time Input Picker Variations",
    category: "dom",
    severity: "visual",
    affectedEngines: {
      blink: "supported",
      gecko: "supported",
      webkit: "partial",
    },
    summary: "Desktop Safari and Firefox render vastly different UI widgets for `<input type=\"date\">` and `<input type=\"time\">` with distinct styling limitations.",
    recommendation: "For critical business workflows, consider accessible custom dropdown pickers or normalize via date-fns/flatpickr.",
  },
  {
    id: "network-itp-storage",
    title: "WebKit Intelligent Tracking Prevention (ITP) & Storage",
    category: "network",
    severity: "breaking",
    affectedEngines: {
      blink: "supported",
      gecko: "partial",
      webkit: "partial",
    },
    summary: "WebKit limits client-side document.cookie expiration to 7 days (or 24 hours via link decoration) and aggressively partitions IndexedDB in cross-site contexts.",
    recommendation: "Rely on server-side HTTP-only cookies with Secure flags for long-lived sessions instead of localStorage or client cookies.",
  },
];

/**
 * JavaScript snippet to inject into the active guest webview to inspect styles and APIs
 */
export const runEngineAuditScript = `
(function() {
  const result = {
    totalStyleRules: 0,
    domNodesCount: document.getElementsByTagName('*').length,
    usedPrefixes: new Set(),
    detectedIssues: [],
  };

  const detectedMap = new Map();

  function recordIssue(id, selector) {
    if (!detectedMap.has(id)) {
      detectedMap.set(id, { count: 1, selector });
    } else {
      const item = detectedMap.get(id);
      item.count++;
    }
  }

  // 1. Inspect DOM & global APIs
  if ('bluetooth' in navigator || 'usb' in navigator || 'serial' in navigator) {
    recordIssue('api-web-bluetooth-usb-serial', 'navigator.usb/bluetooth');
  }
  if (!('startViewTransition' in document)) {
    recordIssue('api-view-transitions', 'document.startViewTransition');
  }

  const dateInputs = document.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]');
  if (dateInputs.length > 0) {
    recordIssue('dom-datetime-picker', dateInputs[0].tagName.toLowerCase());
  }

  // 2. Scan loaded stylesheets
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        result.totalStyleRules += rules.length;

        for (const rule of rules) {
          const cssText = rule.cssText || "";
          
          if (cssText.includes("-webkit-")) result.usedPrefixes.add("-webkit-");
          if (cssText.includes("-moz-")) result.usedPrefixes.add("-moz-");
          if (cssText.includes("-ms-")) result.usedPrefixes.add("-ms-");

          // Backdrop filter check
          if (cssText.includes("backdrop-filter") && !cssText.includes("-webkit-backdrop-filter")) {
            recordIssue('css-backdrop-filter', (rule).selectorText || 'style');
          }

          // Line clamp check
          if (cssText.includes("line-clamp") && !cssText.includes("-webkit-line-clamp")) {
            recordIssue('css-line-clamp', (rule).selectorText || 'style');
          }

          // Scrollbar check
          if (cssText.includes("::-webkit-scrollbar") && !cssText.includes("scrollbar-width")) {
            recordIssue('css-scrollbar-styling', (rule).selectorText || '::-webkit-scrollbar');
          }

          // Subgrid check
          if (cssText.includes("subgrid") && !cssText.includes("@supports")) {
            recordIssue('css-subgrid', (rule).selectorText || 'grid');
          }

          // Dynamic viewport units check
          if (cssText.includes("dvh") || cssText.includes("svh")) {
            recordIssue('css-dynamic-viewport-units', (rule).selectorText || 'body');
          }
        }
      } catch (sheetErr) {
        // Cross-origin stylesheet access restriction - continue
      }
    }
  } catch (e) {}

  // 3. Scan inline computed styles on sample elements
  const sampleElements = Array.from(document.querySelectorAll('header, nav, main, footer, div[class*="blur"], div[class*="card"]')).slice(0, 40);
  for (const el of sampleElements) {
    try {
      const comp = window.getComputedStyle(el);
      if (comp.backdropFilter && comp.backdropFilter !== 'none') {
        const rawStyle = el.getAttribute('style') || '';
        if (!rawStyle.includes('-webkit-backdrop-filter')) {
          recordIssue('css-backdrop-filter', el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''));
        }
      }
    } catch (err) {}
  }

  return {
    totalStyleRules: result.totalStyleRules,
    domNodesCount: result.domNodesCount,
    usedPrefixes: Array.from(result.usedPrefixes),
    detectedIssues: Array.from(detectedMap.entries()).map(([id, val]) => ({
      id,
      occurrenceCount: val.count,
      sampleSelector: val.selector,
    })),
  };
})();
`;
