export type DeviceCategory = "watch" | "mobile" | "tablet" | "desktop";
export type ChassisType = "watch" | "mobile" | "tablet" | "laptop" | "plain";

export interface DevicePreset {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
  userAgent: string;
  chassis: ChassisType;
  description?: string;
  isCircular?: boolean;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // ================= SMART WATCHES =================
  {
    id: "apple-watch-ultra",
    name: "Apple Watch Ultra 2 (49mm)",
    category: "watch",
    width: 410,
    height: 502,
    userAgent:
      "Mozilla/5.0 (Apple-Watch; CPU WatchOS 10_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "watch",
    description: "410 × 502 px • 49mm Titanium",
  },
  {
    id: "apple-watch-series-10",
    name: "Apple Watch Series 10 (46mm)",
    category: "watch",
    width: 416,
    height: 496,
    userAgent:
      "Mozilla/5.0 (Apple-Watch; CPU WatchOS 10_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "watch",
    description: "416 × 496 px • 46mm OLED",
  },
  {
    id: "apple-watch-41mm",
    name: "Apple Watch Series 9 (41mm)",
    category: "watch",
    width: 352,
    height: 430,
    userAgent:
      "Mozilla/5.0 (Apple-Watch; CPU WatchOS 10_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "watch",
    description: "352 × 430 px • 41mm Compact",
  },
  {
    id: "galaxy-watch-6",
    name: "Samsung Galaxy Watch 6 (44mm)",
    category: "watch",
    width: 432,
    height: 432,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-R940) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    chassis: "watch",
    description: "432 × 432 px • Circular Super AMOLED",
    isCircular: true,
  },

  // ================= MOBILE PHONES =================
  {
    id: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    category: "mobile",
    width: 440,
    height: 956,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    chassis: "mobile",
    description: "440 × 956 px • 6.9\" Super Retina",
  },
  {
    id: "iphone-15-pro",
    name: "iPhone 15 / 15 Pro",
    category: "mobile",
    width: 393,
    height: 852,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "mobile",
    description: "393 × 852 px • 6.1\" Dynamic Island",
  },
  {
    id: "iphone-14-13",
    name: "iPhone 14 / 13 / 12",
    category: "mobile",
    width: 390,
    height: 844,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    chassis: "mobile",
    description: "390 × 844 px • 6.1\" Notch",
  },
  {
    id: "iphone-se",
    name: "iPhone SE (3rd Gen)",
    category: "mobile",
    width: 375,
    height: 667,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    chassis: "mobile",
    description: "375 × 667 px • 4.7\" Classic",
  },
  {
    id: "samsung-s24-ultra",
    name: "Samsung Galaxy S24 Ultra",
    category: "mobile",
    width: 412,
    height: 915,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    chassis: "mobile",
    description: "412 × 915 px • 6.8\" Dynamic AMOLED 2X",
  },
  {
    id: "google-pixel-8-pro",
    name: "Google Pixel 8 Pro",
    category: "mobile",
    width: 412,
    height: 892,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    chassis: "mobile",
    description: "412 × 892 px • 6.7\" Actua Display",
  },

  // ================= TABLETS =================
  {
    id: "ipad-pro-12-9",
    name: "iPad Pro 12.9\"",
    category: "tablet",
    width: 1024,
    height: 1366,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "tablet",
    description: "1024 × 1366 px • Liquid Retina XDR",
  },
  {
    id: "ipad-air",
    name: "iPad Air / 11\" Pro",
    category: "tablet",
    width: 820,
    height: 1180,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "tablet",
    description: "820 × 1180 px • 10.9\" Liquid Retina",
  },
  {
    id: "ipad-mini",
    name: "iPad Mini",
    category: "tablet",
    width: 744,
    height: 1133,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    chassis: "tablet",
    description: "744 × 1133 px • 8.3\" Compact Tablet",
  },
  {
    id: "galaxy-tab-s9",
    name: "Samsung Galaxy Tab S9",
    category: "tablet",
    width: 800,
    height: 1280,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    chassis: "tablet",
    description: "800 × 1280 px • 11\" AMOLED",
  },

  // ================= DESKTOPS / LAPTOPS =================
  {
    id: "laptop-macbook-air",
    name: "MacBook Air (13\")",
    category: "desktop",
    width: 1280,
    height: 800,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    chassis: "laptop",
    description: "1280 × 800 px • 13.3\" Retina",
  },
  {
    id: "laptop-1080p",
    name: "Laptop (1080p Full HD)",
    category: "desktop",
    width: 1920,
    height: 1080,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    chassis: "laptop",
    description: "1920 × 1080 px • 16:9 FHD",
  },
];

export function getPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: DeviceCategory): DevicePreset[] {
  return DEVICE_PRESETS.filter((p) => p.category === category);
}

export function getDefaultPresetForCategory(category: DeviceCategory): DevicePreset {
  switch (category) {
    case "watch":
      return DEVICE_PRESETS.find((p) => p.id === "apple-watch-series-10") || DEVICE_PRESETS[0];
    case "mobile":
      return DEVICE_PRESETS.find((p) => p.id === "iphone-15-pro") || DEVICE_PRESETS[4];
    case "tablet":
      return DEVICE_PRESETS.find((p) => p.id === "ipad-air") || DEVICE_PRESETS[10];
    case "desktop":
      return DEVICE_PRESETS.find((p) => p.id === "laptop-macbook-air") || DEVICE_PRESETS[14];
  }
}
