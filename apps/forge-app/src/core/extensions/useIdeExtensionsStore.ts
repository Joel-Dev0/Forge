import { create } from "zustand";

export interface IdeExtension {
  id: string; // e.g. "esbenp.prettier-vscode"
  name: string;
  publisher: string;
  version: string;
  description: string;
  tagline?: string;
  imageUrl?: string;
  iconSvg: string; // inline SVG vector or image URL
  category: "formatters" | "linters" | "languages" | "ai" | "database" | "cloud" | "tools";
  badge?: string;
  featured?: boolean;
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
  activeCategory: "all" | IdeExtension["category"] | "installed";
  selectedExtensionId: string | null;

  setIdeModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (cat: "all" | IdeExtension["category"] | "installed") => void;
  setSelectedExtensionId: (id: string | null) => void;

  installExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  installFromUrlOrId: (urlOrId: string) => { success: boolean; message: string };
  searchOnlineMarketplace: (query: string) => Promise<IdeExtension[]>;
}

// Curated catalog of VS Code / Open VSX extensions matching Antigravity IDE
export const DEFAULT_IDE_EXTENSIONS: IdeExtension[] = [
  // ── Installed (matches exact reference screenshot order) ──
  {
    id: "llvm-vs-code-extensions.vscode-clangd",
    name: "clangd",
    publisher: "llvm-vs-code-extensions",
    version: "0.1.33",
    description: "C/C++ completion, navigation, and refactoring using clangd server",
    tagline: "C/C++ language server with instant navigation",
    category: "languages",
    badge: "C/C++ Core",
    featured: true,
    rating: 4.8,
    downloads: "4.2M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0C1929"/><path d="M16 6C13.5 6 9 7.5 9 12C9 16.5 13.5 18 16 18C17.5 18 18.5 17.2 19 16.5L16.5 14.5C16.2 14.8 15.5 15.2 14.8 15.2C13 15.2 11.5 14 11.5 12C11.5 10 13 8.8 14.8 8.8C15.5 8.8 16.2 9.2 16.5 9.5L19 7.5C18.5 6.8 17.5 6 16 6Z" fill="#29B6F6"/><path d="M13 7.5C11.5 7.5 8 8.5 8 12C8 15.5 11.5 16.5 13 16.5L13.8 14.2C12.8 14.2 10.5 13.5 10.5 12C10.5 10.5 12.8 9.8 13.8 9.8L13 7.5Z" fill="#66BB6A"/></svg>`,
  },
  {
    id: "devsense.composer-php-vscode",
    name: "Composer",
    publisher: "devsense",
    version: "1.52.1",
    description: "All-in-One composer integration, quick fixes, and package management",
    tagline: "All-in-One composer integration for modern PHP projects",
    category: "tools",
    badge: "Package Manager",
    rating: 4.7,
    downloads: "2.1M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=devsense.composer-php-vscode",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFFFFF"/><rect x="2" y="2" width="20" height="20" rx="3" fill="#3B2619" stroke="#8D6E63" stroke-width="0.8"/><circle cx="12" cy="8" r="3.5" fill="#F5E0D0"/><path d="M9 7C9 5.5 10.2 4.5 12 4.5C13.8 4.5 15 5.5 15 7C15 8.5 13.8 9.5 12 9.5C10.2 9.5 9 8.5 9 7Z" fill="#5D4037"/><path d="M8 15L12 12L16 15L18 20H6L8 15Z" fill="#2E2018"/><rect x="6" y="16.5" width="12" height="3" fill="#D7CCC8"/><text x="12" y="18.8" font-size="2.2" font-weight="900" fill="#2E2018" text-anchor="middle" font-family="sans-serif">COMPOSER</text></svg>`,
  },
  {
    id: "ms-azuretools.vscode-containers",
    name: "Container Tools",
    publisher: "ms-azuretools",
    version: "1.28.0",
    description: "Makes it easy to create, manage, and debug containerized environments",
    tagline: "Docker and Kubernetes development workflows simplified",
    category: "cloud",
    badge: "Azure Tools",
    rating: 4.8,
    downloads: "8.9M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-containers",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0C1F38"/><path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" fill="#0078D4"/><path d="M12 4L19 8L12 12L5 8L12 4Z" fill="#50E6FF"/><path d="M5 8L12 12V20L5 16V8Z" fill="#005BA1"/><path d="M12 12L19 8V16L12 20V12Z" fill="#1994EC"/></svg>`,
  },
  {
    id: "vscjava.vscode-java-debug",
    name: "Debugger for Java",
    publisher: "vscjava",
    version: "0.58.1",
    description: "A lightweight Java debugger for Visual Studio Code based on Java Debug Server",
    tagline: "Breakpoints, call stacks, and expression evaluation for Java",
    category: "tools",
    badge: "Java Tools",
    rating: 4.6,
    downloads: "31.4M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFFFFF"/><path d="M15 13C15 15.5 13.5 17 10 17C6.5 17 5 15.5 5 13V9H15V13ZM15 11H17C18 11 18.5 11.5 18.5 12.5C18.5 13.5 18 14 17 14H15V11Z" fill="#333333"/><path d="M10 5C10 5 9 6.5 10 7.5" stroke="#E53935" stroke-width="1.2" stroke-linecap="round"/><path d="M12.5 4.5C12.5 4.5 11.5 6 12.5 7.5" stroke="#E53935" stroke-width="1.2" stroke-linecap="round"/><circle cx="17.5" cy="17.5" r="4.5" fill="#43A047"/><polygon points="16.5,15.5 19.5,17.5 16.5,19.5" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "ms-azuretools.vscode-docker",
    name: "Docker",
    publisher: "ms-azuretools",
    version: "1.29.3",
    description: "Makes it easy to create, manage, and debug containerized applications",
    tagline: "Build, manage, and deploy containerized apps",
    category: "cloud",
    badge: "DevOps",
    rating: 4.8,
    downloads: "34.1M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#082A4D"/><path d="M5 11H7V13H5V11ZM8 11H10V13H8V11ZM11 11H13V13H11V11ZM14 11H16V13H14V11ZM8 8H10V10H8V8ZM11 8H13V10H11V8ZM14 8H16V10H14V8ZM11 5H13V7H11V5Z" fill="#2496ED"/><path d="M21 12.5C20.5 12.2 19.5 12 18.5 12.5C18 12.7 17.5 13.2 17 13.2C15.8 13.2 4 13.2 3.5 13.5C2.5 14 2 15.5 3 17C4.2 18.8 6.8 19.5 10 19.5C14.5 19.5 18 18 19.5 16C21 14 21.5 13 21 12.5Z" fill="#2496ED"/></svg>`,
  },
  {
    id: "docker.docker-dx",
    name: "Docker DX",
    publisher: "docker",
    version: "0.2.1",
    description: "Edit smarter, ship faster with an enhanced Docker developer experience",
    tagline: "Modern Docker developer tooling & Compose orchestration",
    category: "tools",
    badge: "Official Docker",
    rating: 4.7,
    downloads: "1.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=docker.docker-dx",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0A192F"/><path d="M19.5 13C19 12.7 18.2 12.5 17.5 12.8C17 13 16.5 13.3 16 13.3C15 13.3 5 13.3 4.5 13.5C3.8 14 3.5 15.2 4.2 16.3C5.2 17.8 7.5 18.5 10.5 18.5C14.5 18.5 17.5 17.2 18.8 15.5C20 13.8 20.2 13.3 19.5 13Z" fill="#38BDF8"/><rect x="5.5" y="11" width="1.8" height="1.8" fill="#38BDF8"/><rect x="8" y="11" width="1.8" height="1.8" fill="#38BDF8"/><rect x="10.5" y="11" width="1.8" height="1.8" fill="#38BDF8"/><rect x="13" y="11" width="1.8" height="1.8" fill="#38BDF8"/><rect x="8" y="8.5" width="1.8" height="1.8" fill="#38BDF8"/><rect x="10.5" y="8.5" width="1.8" height="1.8" fill="#38BDF8"/><rect x="13" y="8.5" width="1.8" height="1.8" fill="#38BDF8"/><rect x="10.5" y="6" width="1.8" height="1.8" fill="#38BDF8"/></svg>`,
  },
  {
    id: "esbenp.prettier-vscode",
    name: "Prettier - Code formatter",
    publisher: "esbenp",
    version: "10.4.1",
    description: "Code formatter using prettier. Supports JS, TS, CSS, HTML, JSON, YAML",
    tagline: "Opinionated code formatter with zero config",
    category: "formatters",
    badge: "Essential",
    rating: 4.8,
    downloads: "42.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#1A2B34"/><path d="M7 6H13C15.2091 6 17 7.79086 17 10C17 12.2091 15.2091 14 13 14H10V18H7V6Z" fill="#EA5E5E"/><circle cx="14" cy="15" r="2.5" fill="#F7B93E"/><circle cx="16.5" cy="18.5" r="1.5" fill="#56B6C2"/></svg>`,
  },
  {
    id: "bradlc.vscode-tailwindcss",
    name: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    version: "0.14.3",
    description: "Intelligent Tailwind CSS tooling including autocomplete and linting",
    tagline: "Intelligent CSS tooling, classes & live preview",
    category: "tools",
    badge: "Design System",
    rating: 4.9,
    downloads: "18.5M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0B1120"/><path d="M12 7.5C9.75 7.5 8.375 8.625 7.875 10.875C8.75 9.625 9.875 9.125 11.25 9.375C12.1875 9.545 12.8625 10.23 13.6 10.98C14.8 12.2 16.2 13.625 19.5 13.625C21.75 13.625 23.125 12.5 23.625 10.25C22.75 11.5 21.625 12 20.25 11.75C19.3125 11.58 18.6375 10.895 17.9 10.145C16.7 8.925 15.3 7.5 12 7.5Z" fill="#38BDF8"/></svg>`,
  },
  {
    id: "eamodio.gitlens",
    name: "GitLens — Git supercharged",
    publisher: "GitKraken",
    version: "16.1.0",
    description: "Supercharge Git within Forge projects. Inline blame and visual history",
    tagline: "Inline blame, commit graph & history exploration",
    category: "tools",
    badge: "Git Supercharged",
    rating: 4.9,
    downloads: "36.4M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#181824"/><path d="M6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8C10 8.88373 9.42777 9.6338 8.63245 9.89745V14.1025C9.42777 14.3662 10 15.1163 10 16C10 17.1046 9.10457 18 8 18C6.89543 18 6 17.1046 6 16C6 15.1163 6.57223 14.3662 7.36755 14.1025V9.89745C6.57223 9.6338 6 8.88373 6 8Z" fill="#F05138"/><circle cx="16" cy="8" r="2" fill="#F05138"/></svg>`,
  },
  {
    id: "dbaeumer.vscode-eslint",
    name: "ESLint",
    publisher: "dbaeumer",
    version: "3.0.10",
    description: "Integrates ESLint JavaScript into VS Code with auto quick-fixes",
    tagline: "Find and fix problems in your JavaScript code",
    category: "linters",
    badge: "Essential Linter",
    rating: 4.7,
    downloads: "35.2M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#4B32C3"/><path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" fill="#8080F2"/><path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "ms-python.python",
    name: "Python",
    publisher: "ms-python",
    version: "2026.2.0",
    description: "Rich support for the Python language: IntelliSense, linting, debugging",
    tagline: "IntelliSense, linting, and debugging for Python",
    category: "languages",
    badge: "Top Language",
    rating: 4.6,
    downloads: "128M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-python.python",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#1E293B"/><path d="M11.88 3C8.42 3 8.63 4.5 8.63 4.5L8.64 6.06H12.01V6.57H5.21C5.21 6.57 3 6.32 3 9.77C3 13.22 4.93 13.06 4.93 13.06H6.18V11.3C6.18 9.3 7.89 9.34 7.89 9.34H11.97C13.68 9.34 13.68 7.68 13.68 7.68V4.8C13.68 4.8 13.9 3 11.88 3Z" fill="#387EB8"/><path d="M12.12 21C15.58 21 15.37 19.5 15.37 19.5L15.36 17.94H11.99V17.43H18.79C18.79 17.43 21 17.68 21 14.23C21 10.78 19.07 10.94 19.07 10.94H17.82V12.7C17.82 14.7 16.11 14.66 16.11 14.66H12.03C10.32 14.66 10.32 16.32 10.32 16.32V19.2C10.32 19.2 10.1 21 12.12 21Z" fill="#FFE052"/></svg>`,
  },
  {
    id: "golang.go",
    name: "Go",
    publisher: "golang",
    version: "0.45.0",
    description: "Rich language support for Go: navigation, completion, testing",
    tagline: "Official Go language tooling by Google",
    category: "languages",
    badge: "Cloud Native",
    rating: 4.8,
    downloads: "16.2M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=golang.Go",
    installed: true,
    enabled: true,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#007D9C"/><path d="M6 10C6 8.5 7.5 7 10 7C12.5 7 14 8.5 14 10H12C12 9.5 11 9 10 9C9 9 8 9.5 8 10C8 10.5 9 11 10 11H12V14C12 15.5 10.5 17 8 17C5.5 17 4 15.5 4 14H6C6 14.5 7 15 8 15C9 15 10 14.5 10 14V13H8C6.5 13 6 12 6 10Z" fill="#FFFFFF"/></svg>`,
  },

  // ── Recommended (matches exact reference screenshot order) ──
  {
    id: "christian-kohler.npm-intellisense",
    name: "npm Intellisense",
    publisher: "christian-kohler",
    version: "1.4.5",
    description: "Visual Studio Code plugin that autocompletes npm modules in import statements.",
    tagline: "Autocompletes npm modules in import statements",
    category: "tools",
    badge: "Autocomplete",
    featured: true,
    rating: 5,
    downloads: "555K",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=christian-kohler.npm-intellisense",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFFFFF"/><rect x="2" y="2" width="20" height="20" rx="3" fill="#CB3837"/><path d="M6 7H18V17H12V10H9V17H6V7Z" fill="#FFFFFF"/><rect x="15" y="10" width="3" height="4" fill="#CB3837"/></svg>`,
  },
  {
    id: "ms-edgedevtools.vscode-edge-devtools",
    name: "Microsoft Edge Tools for...",
    publisher: "ms-edgedevtools",
    version: "2.1.8",
    description: "Use the Microsoft Edge Tools from within VS Code to see your site's CSS and console.",
    tagline: "Developer tools & DOM inspection inside your editor",
    category: "tools",
    badge: "Web Inspection",
    featured: true,
    rating: 5,
    downloads: "263K",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-edgedevtools.vscode-edge-devtools",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0C1A2E"/><path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.8 20 18.9 17.4 19.7 13.8C18.6 15.2 16.8 16.1 14.8 16.1C11.5 16.1 8.8 13.4 8.8 10.1C8.8 6.8 11.5 4.1 14.8 4.1C13.9 4 13 4 12 4Z" fill="#0078D4"/><path d="M19.7 13.8C19.9 12.9 20 12 20 11C20 6.6 16.4 3 12 3V5C15.3 5 18 7.7 18 11C18 11.7 17.9 12.4 17.6 13L19.7 13.8Z" fill="#00C7B4"/><path d="M14.8 16.1C13.2 16.1 11.8 15.1 11.2 13.6C10.7 12.3 11 10.8 12 9.8C12.8 9 13.9 8.5 15.1 8.5C17.3 8.5 19.1 10.3 19.1 12.5C19.1 14.5 17.2 16.1 14.8 16.1Z" fill="#2AD582"/></svg>`,
  },
  {
    id: "github.copilot",
    name: "GitHub Copilot",
    publisher: "GitHub",
    version: "1.250.0",
    description: "AI pair programmer that provides autocomplete-style suggestions as you code in your projects.",
    tagline: "Your AI pair programmer across every language",
    category: "ai",
    badge: "Popular AI",
    featured: true,
    rating: 5,
    downloads: "21.6M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=GitHub.copilot",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0D1117"/><path d="M12 5C8 5 5 8 5 12C5 15.5 7.5 18 11 18.8V17C8.5 16.5 7 14.5 7 12C7 9.5 9 7 12 7C15 7 17 9.5 17 12C17 14.5 15.5 16.5 13 17V18.8C16.5 18 19 15.5 19 12C19 8 16 5 12 5Z" fill="#58A6FF"/><circle cx="9.5" cy="11.5" r="1.5" fill="#FFFFFF"/><circle cx="14.5" cy="11.5" r="1.5" fill="#FFFFFF"/></svg>`,
  },
  {
    id: "prisma.prisma",
    name: "Prisma",
    publisher: "Prisma",
    version: "6.4.0",
    description: "Adds syntax highlighting, formatting, auto-completion, jump-to-definition and linting for .prisma schema files.",
    tagline: "Next-generation ORM and schema migrations",
    category: "database",
    badge: "Database",
    rating: 5,
    downloads: "4.7M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=Prisma.prisma",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0C344B"/><path d="M7 19L17 5L14 19H7Z" fill="#5A67D8"/><path d="M12 19L17 5L19 12L14 19H12Z" fill="#16A394"/></svg>`,
  },
  {
    id: "rust-lang.rust-analyzer",
    name: "rust-analyzer",
    publisher: "rust-lang",
    version: "0.4.2320",
    description: "Rust language support with full syntax tree, semantic highlighting, and cargo diagnostics.",
    tagline: "High-performance language server for Rust",
    category: "languages",
    badge: "Systems",
    rating: 5,
    downloads: "5.8M",
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer",
    installed: false,
    enabled: false,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#1C1817"/><circle cx="12" cy="12" r="8" stroke="#DEA584" stroke-width="2"/><path d="M12 8V16M8 12H16" stroke="#DEA584" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#CE412B"/></svg>`,
  },
];

const STORAGE_KEY = "forge_ide_extensions_v3";

function loadSavedIdeExtensions(): IdeExtension[] {
  try {
    // 1. Check for legacy v1 stored state to migrate user preferences (installed/enabled)
    const v1Raw = typeof window !== "undefined" ? localStorage.getItem("forge_ide_extensions_v1") : null;
    const v1InstalledMap = new Map<string, { installed: boolean; enabled: boolean }>();
    if (v1Raw) {
      try {
        const v1Parsed: any[] = JSON.parse(v1Raw);
        if (Array.isArray(v1Parsed)) {
          for (const item of v1Parsed) {
            if (item && item.id) {
              v1InstalledMap.set(item.id, {
                installed: Boolean(item.installed),
                enabled: item.enabled !== false,
              });
            }
          }
        }
      } catch {}
      try {
        localStorage.removeItem("forge_ide_extensions_v1");
      } catch {}
    }

    // 2. Read current v2 storage
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed: IdeExtension[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, IdeExtension>();
        for (const def of DEFAULT_IDE_EXTENSIONS) {
          map.set(def.id, def);
        }
        for (const item of parsed) {
          const def = map.get(item.id);
          if (def) {
            map.set(item.id, {
              ...def,
              ...item,
              imageUrl: def.imageUrl || item.imageUrl,
              tagline: def.tagline || item.tagline,
              badge: def.badge || item.badge,
              featured: def.featured ?? item.featured,
              iconSvg: def.iconSvg || item.iconSvg,
            });
          } else {
            map.set(item.id, item);
          }
        }
        return Array.from(map.values());
      }
    }

    // 3. First time v2 load: apply any previously installed states from v1 to DEFAULT_IDE_EXTENSIONS
    if (v1InstalledMap.size > 0) {
      const migrated = DEFAULT_IDE_EXTENSIONS.map((ext) => {
        const prev = v1InstalledMap.get(ext.id);
        if (prev) {
          return {
            ...ext,
            installed: prev.installed,
            enabled: prev.enabled,
          };
        }
        return ext;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {}
      return migrated;
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
    const urlMatch = trimmed.match(/itemName=([a-zA-Z0-9_.-]+)/i);
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
      tagline: `VS Code extension by ${publisher}`,
      category: "tools",
      badge: "Marketplace",
      rating: 4.8,
      downloads: "100K+",
      marketplaceUrl: `https://marketplace.visualstudio.com/items?itemName=${extensionId}`,
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80",
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
