# Forge

<p align="center">
  <img src="apps/forge-site/public/logo.png" alt="Forge Browser Logo" width="120" height="120" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>High-performance, privacy-first web browser focused on developer productivity and digital autonomy.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg" alt="License: GPL-3.0-or-later" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen.svg" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg" alt="pnpm Package Manager" />
  <img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platform Support" />
  <a href="https://github.com/Joel-Dev0/Forge/issues"><img src="https://img.shields.io/github/issues/Joel-Dev0/Forge" alt="Open Issues" /></a>
</p>

---

## Overview

**Forge** is an open-source, next-generation browser built for software engineers, security researchers, and power users who require absolute control over their web environment. Powered by Electron, Vite, React, and modular security engines, Forge eliminates tracking, strips malvertising, integrates raw network inspection, and provides built-in productivity workflows without relying on heavyweight, telemetry-ridden commercial browser forks.

---

## Key Features

### 🛡️ Forge Shield & Native Adblock Engine
- **Multi-List Compilation**: Built-in high-performance rule engine supporting EasyList, EasyPrivacy, and uBlock QuickFixes.
- **Cosmetic & Scriptlet Injection**: Live DOM element hiding, dynamic CSS injection, and scriptlet defusers.
- **YouTube Ad Fast-Forward & Sanitization**: Strips pre-roll ad queues directly from player responses and accelerates unavoidable ads silently without interrupting video timestamps or playlist playback.
- **Tracker & Parameter Stripping**: Automatically purges tracking query parameters (`utm_*`, `fbclid`, `gclid`, etc.) and halts malvertising domains before DNS resolution.

### 🔒 Privacy, Sandbox & Identity Isolation
- **Partitioned Sessions**: Granular cookie isolation and sandboxed container profiles.
- **Anti-Fingerprinting**: Mitigates canvas, audio, and hardware fingerprinting vectors.
- **Instant Privacy Cleaner**: Fast modal (`Ctrl + Shift + Del`) to purge cache, storage, cookies, and active sessions on demand.
- **Stealth & Incognito Windows**: Disposable private browsing sessions that leave zero trace on local storage.

### 🌐 Advanced Network Engine, WireGuard & Tor
- **Proxy Provider Architecture**: Easily route browser traffic through custom HTTP, SOCKS5, or raw socket proxies.
- **WireGuard VPN Integration**: Parse `.conf` profiles, manage VPN tunnels, and enforce a strict network Kill Switch (`packages/network-core`).
- **Tor Onion Routing**: Native circuit management and routing for `.onion` hidden services (`packages/tor-core`).

### 💻 Developer-Grade Tooling & Inspection
- **Live Network Inspector**: Real-time HTTP/HTTPS transaction monitor featuring Chrome DevTools Protocol (CDP) body inspection.
- **Blocked Requests Inspector**: Inspect every network request intercepted and blocked by the adblock engine.
- **API Monitor & Console IA**: Built-in developer telemetry panel with an interactive AI coding assistant (`Console IA`).
- **Visual & Compatibility Inspectors**: Diagnose layout inconsistencies, inspect accessibility trees, and audit web standards compatibility.
- **Performance Analyzer**: Measure frame rates, memory footprints, and CPU usage per tab.

### 🗂️ Workspaces, Split View & Focus Mode
- **Customizable Workspaces**: Organize tabs and contexts into isolated developer workspaces.
- **Side-by-Side Split View**: View two pages concurrently in the same window for responsive debugging and comparative testing.
- **Focus Mode & Ambient Synthesizer**: Integrated Pomodoro timer accompanied by a procedural Web Audio ambient sound synthesizer.
- **Pinned Memory Cards & Notes**: Quick-access scratchpad overlay for persistent developer notes and scratch data across sessions.

### 🧩 Chrome Extensions Compatibility
- **CRX3 Loader & Manifest Parser**: Install and run unpacked Chromium extensions and web store extensions directly within Forge.

---

## Workspaces & Architecture

Forge is organized as a monorepo managed with `pnpm` workspaces:

```
Forge/
├── apps/
│   ├── forge-app/          # Electron desktop browser (React 19, Vite 8, Tailwind CSS)
│   └── forge-site/         # Official landing page & download portal (Next.js 16, GSAP)
├── packages/
│   ├── adblock-engine/     # High-throughput adblocking, cosmetic & scriptlet engine
│   ├── network-core/       # Proxy routing, WireGuard VPN parser & Kill Switch
│   ├── privacy-core/       # Session sandboxing, cookie isolation & fingerprint defense
│   └── tor-core/           # Tor circuit routing & onion service integrations
├── docs/                   # Architectural blueprints & specifications
└── LICENSE                 # GNU General Public License v3.0
```

| Package / Application | Description |
| :--- | :--- |
| **`apps/forge-app`** | Desktop browser application combining the Electron main process with a high-performance React UI. |
| **`apps/forge-site`** | Landing page, documentation hub, and installer distribution portal built with Next.js. |
| **`@forge/adblock-engine`** | Standalone filter engine supporting ABP/uBlock rule syntax, element hiding, and YouTube scriptlets. |
| **`@forge/network-core`** | Network abstraction layer supporting Direct, Proxy, and WireGuard VPN tunnels with fail-safe Kill Switch. |
| **`@forge/privacy-core`** | Privacy utilities for managing isolated browser partitions and anti-tracking rules. |
| **`@forge/tor-core`** | Utilities for Tor proxy management and Onion circuit routing. |

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22` recommended)
- **Package Manager**: `pnpm` (`v9.0.0` or higher)
- **Git**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Joel-Dev0/Forge.git
   cd Forge
   ```

2. Install all dependencies across the monorepo:
   ```bash
   pnpm install
   ```

### Running Locally

- **Launch Forge Desktop Browser (Development Mode)**:
  ```bash
  pnpm --filter forge-app dev
  ```
  *This concurrently launches the Vite dev server and the Electron application with hot-reloading.*

- **Launch Forge Website & Portal**:
  ```bash
  pnpm --filter forge-site dev
  ```
  *Accessible at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).*

---

## Testing & Quality Assurance

Forge maintains comprehensive test suites for all core engine packages:

```bash
# Run all package unit and integration tests
pnpm --filter @forge/adblock-engine test
pnpm --filter @forge/network-core test
pnpm --filter @forge/privacy-core test
pnpm --filter @forge/tor-core test
```

### Type Checking & Linting

```bash
# Type check the desktop application
pnpm --filter forge-app exec tsc --noEmit

# Lint the codebase
pnpm --filter forge-app lint
pnpm --filter forge-site lint
```

---

## Production Build

To build production-ready bundles:

```bash
# Build the Electron browser bundles
pnpm --filter forge-app build

# Build the official website
pnpm --filter forge-site build
```

The compiled Electron output is emitted to `apps/forge-app/dist-electron/` (`main.js`, `preload.cjs`, `guestPreload.cjs`, and `extensionPopupPreload.cjs`).

---

## Keyboard Shortcuts

Forge is optimized for keyboard-first navigation:

| Action | Shortcut (Windows / Linux) | Shortcut (macOS) |
| :--- | :--- | :--- |
| **New Tab** | `Ctrl + T` | `Cmd + T` |
| **Close Tab** | `Ctrl + W` | `Cmd + W` |
| **Reopen Closed Tab** | `Ctrl + Shift + T` | `Cmd + Shift + T` |
| **Next / Previous Tab** | `Ctrl + Tab` / `Ctrl + Shift + Tab` | `Cmd + Alt + →` / `Cmd + Alt + ←` |
| **Focus Address Bar** | `Ctrl + L` / `Alt + D` | `Cmd + L` |
| **New Private Window** | `Ctrl + Shift + N` | `Cmd + Shift + N` |
| **In-Page Search** | `Ctrl + F` | `Cmd + F` |
| **Picture-in-Picture (PiP)** | `Alt + P` | `Option + P` |
| **Privacy Cleaner Modal** | `Ctrl + Shift + Del` | `Cmd + Shift + Backspace` |
| **Downloads Manager** | `Ctrl + J` | `Cmd + J` |
| **Browsing History** | `Ctrl + H` | `Cmd + Y` |
| **Shortcuts & Hotkeys Guide** | `F1` | `F1` |
| **Toggle Fullscreen** | `F11` | `Cmd + Ctrl + F` |

---

## Security & Auditing

Security is a foundational pillar of Forge. The repository includes an extensive third-party assessment:
- **`Forge_Browser_Security_Audit_Report.pdf`**: Comprehensive architectural security audit detailing process sandboxing, IPC validation, network isolation, and webview boundaries.

If you discover a potential vulnerability, please report it responsibly by opening a private security advisory on GitHub or emailing the maintainers directly.

---

## Contributing

Contributions from the developer community are warmly welcomed!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "feat: add amazing feature"`).
4. Run tests to ensure regression-free code (`pnpm --filter @forge/adblock-engine test`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## License

Forge is licensed under the GNU General Public License
version 3 or later (GPL-3.0-or-later).

Copyright © 2026 Joel-Dev0
