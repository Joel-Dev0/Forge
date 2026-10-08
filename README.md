# Forge

> High-performance, privacy-first web browser focused on developer productivity and digital autonomy.

Forge is built with modern web technologies, Electron, and privacy-enhancing engines designed to deliver seamless browsing, aggressive tracker and ad neutralization, customizable workspaces, and developer-grade tooling.

## Workspaces & Architecture

- **`apps/forge-app`**: The primary Electron desktop browser application built with React and Vite.
- **`apps/forge-site`**: The official landing page, download portal, and web presence built with Next.js.
- **`packages/adblock-engine`**: High-performance cosmetic, network, and scriptlet adblocking engine with EasyList, EasyPrivacy, and uBlock-style rule support.
- **`packages/privacy-core`**: Cookie isolation, session sandboxing, and fingerprint protection.
- **`packages/network-core`**: Proxy, routing, and network intercept abstractions.
- **`packages/tor-core`**: Onion routing and Tor proxy integration utilities.

## License

Forge is licensed under the GNU General Public License
version 3 or later (GPL-3.0-or-later).

Copyright © 2026 Joel-Dev0
