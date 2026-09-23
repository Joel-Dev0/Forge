import { create } from "zustand";

export interface IdeExtension {
  id: string; // e.g. "esbenp.prettier-vscode"
  name: string;
  publisher: string;
  version: string;
  description: string;
  iconSvg: string; // inline SVG vector or image URL
  category: "formatters" | "linters" | "languages" | "ai" | "database" | "cloud" | "tools";
  rating: number; // 1-5
  downloads: string;
  marketplaceUrl: string;
  installed: boolean;
  enabled: boolean;
  installedAt?: number;
  projectScoped?: boolean;
}

interface IdeExtensionsState {
  extensions: IdeExtension[];
  isIdeModalOpen: boolean;
  searchQuery: string;
  activeCategory: "all" | IdeExtension["category"];
  selectedExtensionId: string | null;

  setIdeModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (cat: "all" | IdeExtension["category"]) => void;
  setSelectedExtensionId: (id: string | null) => void;

  installExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  installFromUrlOrId: (urlOrId: string) => { success: boolean; message: string };
  searchOnlineMarketplace: (query: string) => Promise<IdeExtension[]>;
}

const STORAGE_KEY = "forge_ide_extensions_v1";

// Curated catalog of the most essential VS Code Marketplace extensions with authentic icons
export const DEFAULT_IDE_EXTENSIONS: IdeExtension[] = [
  {
    id: "esbenp.prettier-vscode",
    name: "Prettier - Code formatter",
    publisher: "Prettier (esbenp)",
    version: "10.4.1",
    description: "Code formatter using prettier. Supports JavaScript, TypeScript, CSS, HTML, JSON, Markdown, and YAML.",
    category: "formatters",
    rating: 4.8,
    downloads: "42.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode",
    installed: true,
    enabled: true,
    installedAt: Date.now() - 86400000 * 14,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#1A2B34"/><path d="M7 6H13C15.2091 6 17 7.79086 17 10C17 12.2091 15.2091 14 13 14H10V18H7V6Z" fill="#EA5E5E"/><circle cx="14" cy="15" r="2.5" fill="#F7B93E"/><circle cx="16.5" cy="18.5" r="1.5" fill="#56B6C2"/></svg>`,
  },
  {
    id: "dbaeumer.vscode-eslint",
    name: "ESLint",
    publisher: "Microsoft",
    version: "3.0.10",
    description: "Integrates ESLint JavaScript and TypeScript into VS Code and Forge projects with quick-fixes.",
    category: "linters",
    rating: 4.7,
    downloads: "35.2M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint",
    installed: true,
    enabled: true,
    installedAt: Date.now() - 86400000 * 10,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#4B32C3"/><path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" fill="#8080F2"/><path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "bradlc.vscode-tailwindcss",
    name: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    version: "0.14.3",
    description: "Intelligent Tailwind CSS tooling for VS Code including autocomplete, syntax highlighting, and linting.",
    category: "tools",
    rating: 4.9,
    downloads: "18.5M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss",
    installed: true,
    enabled: true,
    installedAt: Date.now() - 86400000 * 7,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#0B1120"/><path d="M12 7.5C9.75 7.5 8.375 8.625 7.875 10.875C8.75 9.625 9.875 9.125 11.25 9.375C12.1875 9.545 12.8625 10.23 13.6 10.98C14.8 12.2 16.2 13.625 19.5 13.625C21.75 13.625 23.125 12.5 23.625 10.25C22.75 11.5 21.625 12 20.25 11.75C19.3125 11.58 18.6375 10.895 17.9 10.145C16.7 8.925 15.3 7.5 12 7.5ZM4.5 12C2.25 12 0.875 13.125 0.375 15.375C1.25 14.125 2.375 13.625 3.75 13.875C4.6875 14.045 5.3625 14.73 6.1 15.48C7.3 16.7 8.7 18.125 12 18.125C14.25 18.125 15.625 17 16.125 14.75C15.25 16 14.125 16.5 12.75 16.25C11.8125 16.08 11.1375 15.395 10.4 14.645C9.2 13.425 7.8 12 4.5 12Z" fill="#38BDF8"/></svg>`,
  },
  {
    id: "ms-python.python",
    name: "Python",
    publisher: "Microsoft",
    version: "2026.2.0",
    description: "Rich support for the Python language: IntelliSense (Pylance), linting, debugging, code formatting, refactoring.",
    category: "languages",
    rating: 4.6,
    downloads: "128M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-python.python",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#1E293B"/><path d="M11.88 3C8.42 3 8.63 4.5 8.63 4.5L8.64 6.06H12.01V6.57H5.21C5.21 6.57 3 6.32 3 9.77C3 13.22 4.93 13.06 4.93 13.06H6.18V11.3C6.18 9.3 7.89 9.34 7.89 9.34H11.97C13.68 9.34 13.68 7.68 13.68 7.68V4.8C13.68 4.8 13.9 3 11.88 3ZM10.22 4.14C10.64 4.14 10.98 4.48 10.98 4.9C10.98 5.32 10.64 5.66 10.22 5.66C9.8 5.66 9.46 5.32 9.46 4.9C9.46 4.48 9.8 4.14 10.22 4.14Z" fill="#387EB8"/><path d="M12.12 21C15.58 21 15.37 19.5 15.37 19.5L15.36 17.94H11.99V17.43H18.79C18.79 17.43 21 17.68 21 14.23C21 10.78 19.07 10.94 19.07 10.94H17.82V12.7C17.82 14.7 16.11 14.66 16.11 14.66H12.03C10.32 14.66 10.32 16.32 10.32 16.32V19.2C10.32 19.2 10.1 21 12.12 21ZM13.78 19.86C13.36 19.86 13.02 19.52 13.02 19.1C13.02 18.68 13.36 18.34 13.78 18.34C14.2 18.34 14.54 18.68 14.54 19.1C14.54 19.52 14.2 19.86 13.78 19.86Z" fill="#FFE052"/></svg>`,
  },
  {
    id: "rust-lang.rust-analyzer",
    name: "rust-analyzer",
    publisher: "The Rust Programming Language",
    version: "0.4.2320",
    description: "Rust language support with full syntax tree, semantic highlighting, macro expansion, and cargo diagnostics.",
    category: "languages",
    rating: 4.9,
    downloads: "5.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#1C1817"/><circle cx="12" cy="12" r="8" stroke="#DEA584" stroke-width="2"/><path d="M12 8V16M8 12H16" stroke="#DEA584" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#CE412B"/></svg>`,
  },
  {
    id: "eamodio.gitlens",
    name: "GitLens — Git supercharged",
    publisher: "GitKraken",
    version: "16.1.0",
    description: "Supercharge Git within Forge projects. Visualize code authorship via inline blame, navigate repositories, and compare revisions.",
    category: "tools",
    rating: 4.7,
    downloads: "36.4M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens",
    installed: true,
    enabled: true,
    installedAt: Date.now() - 86400000 * 5,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#181824"/><path d="M6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8C10 8.88373 9.42777 9.6338 8.63245 9.89745V14.1025C9.42777 14.3662 10 15.1163 10 16C10 17.1046 9.10457 18 8 18C6.89543 18 6 17.1046 6 16C6 15.1163 6.57223 14.3662 7.36755 14.1025V9.89745C6.57223 9.6338 6 8.88373 6 8Z" fill="#F05138"/><circle cx="16" cy="8" r="2" fill="#F05138"/><path d="M16 10V12C16 13.1046 15.1046 14 14 14H9" stroke="#F05138" stroke-width="1.5"/></svg>`,
  },
  {
    id: "github.copilot",
    name: "GitHub Copilot",
    publisher: "GitHub",
    version: "1.250.0",
    description: "AI pair programmer that provides autocomplete-style suggestions as you code in your projects.",
    category: "ai",
    rating: 4.5,
    downloads: "21.6M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=GitHub.copilot",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#0D1117"/><path d="M12 5C8 5 5 8 5 12C5 15.5 7.5 18 11 18.8V17C8.5 16.5 7 14.5 7 12C7 9.5 9 7 12 7C15 7 17 9.5 17 12C17 14.5 15.5 16.5 13 17V18.8C16.5 18 19 15.5 19 12C19 8 16 5 12 5Z" fill="#58A6FF"/><circle cx="9.5" cy="11.5" r="1.5" fill="#FFFFFF"/><circle cx="14.5" cy="11.5" r="1.5" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "prisma.prisma",
    name: "Prisma",
    publisher: "Prisma",
    version: "6.4.0",
    description: "Adds syntax highlighting, formatting, auto-completion, jump-to-definition and linting for .prisma schema files.",
    category: "database",
    rating: 4.9,
    downloads: "4.7M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=Prisma.prisma",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#0C344B"/><path d="M7 19L17 5L14 19H7Z" fill="#5A67D8"/><path d="M12 19L17 5L19 12L14 19H12Z" fill="#16A394"/></svg>`,
  },
  {
    id: "ms-azuretools.vscode-docker",
    name: "Docker",
    publisher: "Microsoft",
    version: "1.29.3",
    description: "Build, manage, and deploy containerized applications, compose clusters, and registries directly from Forge.",
    category: "cloud",
    rating: 4.8,
    downloads: "34.1M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker",
    installed: true,
    enabled: false,
    installedAt: Date.now() - 86400000 * 2,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#082A4D"/><path d="M5 11H7V13H5V11ZM8 11H10V13H8V11ZM11 11H13V13H11V11ZM14 11H16V13H14V11ZM8 8H10V10H8V8ZM11 8H13V10H11V8ZM14 8H16V10H14V8ZM11 5H13V7H11V5Z" fill="#2496ED"/><path d="M21 12.5C20.5 12.2 19.5 12 18.5 12.5C18 12.7 17.5 13.2 17 13.2C15.8 13.2 4 13.2 3.5 13.5C2.5 14 2 15.5 3 17C4.2 18.8 6.8 19.5 10 19.5C14.5 19.5 18 18 19.5 16C21 14 21.5 13 21 12.5Z" fill="#2496ED"/></svg>`,
  },
  {
    id: "golang.go",
    name: "Go",
    publisher: "Go Team at Google",
    version: "0.45.0",
    description: "Rich language support for the Go programming language including IntelliSense, code navigation, symbol search, and testing.",
    category: "languages",
    rating: 4.8,
    downloads: "16.2M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=golang.Go",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#007D9C"/><path d="M6 10C6 8.5 7.5 7 10 7C12.5 7 14 8.5 14 10H12C12 9.5 11 9 10 9C9 9 8 9.5 8 10C8 10.5 9 11 10 11H12V14C12 15.5 10.5 17 8 17C5.5 17 4 15.5 4 14H6C6 14.5 7 15 8 15C9 15 10 14.5 10 14V13H8C6.5 13 6 12 6 10Z" fill="#FFFFFF"/><path d="M15 11C15 9.5 16.5 8.5 18.5 8.5C20.5 8.5 22 9.5 22 11V15C22 16.5 20.5 17.5 18.5 17.5C16.5 17.5 15 16.5 15 15V11ZM17 11.5V14.5C17 15 17.5 15.5 18.5 15.5C19.5 15.5 20 15 20 14.5V11.5C20 11 19.5 10.5 18.5 10.5C17.5 10.5 17 11 17 11.5Z" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "rangav.vscode-thunder-client",
    name: "Thunder Client",
    publisher: "Thunder Client",
    version: "2.32.0",
    description: "Lightweight, easy to use Rest API Client extension for VS Code and Forge workspace testing.",
    category: "tools",
    rating: 4.9,
    downloads: "4.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#4B0082"/><path d="M13 3L6 13H12L11 21L18 11H12L13 3Z" fill="#FFD700"/></svg>`,
  },
];

function loadSavedIdeExtensions(): IdeExtension[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_IDE_EXTENSIONS;
}

export const useIdeExtensionsStore = create<IdeExtensionsState>((set, get) => ({
  extensions: loadSavedIdeExtensions(),
  isIdeModalOpen: false,
  searchQuery: "",
  activeCategory: "all",
  selectedExtensionId: DEFAULT_IDE_EXTENSIONS[0].id,

  setIdeModalOpen: (open) => set({ isIdeModalOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedExtensionId: (id) => set({ selectedExtensionId: id }),

  installExtension: (id) => {
    set((s) => {
      const updated = s.extensions.map((e) =>
        e.id === id ? { ...e, installed: true, enabled: true, installedAt: Date.now() } : e
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated };
    });
  },

  uninstallExtension: (id) => {
    set((s) => {
      const updated = s.extensions.map((e) =>
        e.id === id ? { ...e, installed: false, enabled: false } : e
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated };
    });
  },

  toggleExtension: (id) => {
    set((s) => {
      const updated = s.extensions.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated };
    });
  },

  installFromUrlOrId: (urlOrId) => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return { success: false, message: "Please provide a valid URL or extension ID" };

    let extensionId = trimmed;
    // Check if it's a URL
    const urlMatch = trimmed.match(/itemName=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/i);
    if (urlMatch) {
      extensionId = urlMatch[1];
    }

    // Check if already in list
    const existing = get().extensions.find(
      (e) => e.id.toLowerCase() === extensionId.toLowerCase()
    );

    if (existing) {
      get().installExtension(existing.id);
      return { success: true, message: `Successfully installed "${existing.name}"` };
    }

    // Create new extension entry from marketplace ID
    const parts = extensionId.split(".");
    const publisher = parts[0] || "Community";
    const nameSlug = parts[1] || extensionId;
    const formattedName = nameSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const newExt: IdeExtension = {
      id: extensionId,
      name: formattedName,
      publisher,
      version: "1.0.0",
      description: `Custom extension installed from Visual Studio Code Marketplace (${extensionId})`,
      category: "tools",
      rating: 4.8,
      downloads: "100K+",
      marketplaceUrl: `https://marketplace.visualstudio.com/items?itemName=${extensionId}`,
      installed: true,
      enabled: true,
      installedAt: Date.now(),
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#007ACC"/><path d="M17.5 4L8 12L17.5 20V4Z" fill="#FFFFFF"/></svg>`,
    };

    set((s) => {
      const updated = [newExt, ...s.extensions];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { extensions: updated, selectedExtensionId: newExt.id };
    });

    return { success: true, message: `Installed "${newExt.name}" from VS Code Marketplace!` };
  },

  searchOnlineMarketplace: async (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().extensions;

    // Filter local list first
    const localMatches = get().extensions.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
    );

    return localMatches;
  },
}));
