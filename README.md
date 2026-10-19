# ⚡ Nexora Tools — Small Tools. Better Browsing.

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Passing_(23/23)-10B981?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A suite of lightweight, independent, privacy-first Manifest V3 browser utility extensions engineered to eliminate daily browsing bottlenecks.**

[Explore Extensions](#-extensions-in-the-ecosystem) • [Architecture](#-monorepo-architecture) • [Quickstart Guide](#-how-to-load-in-google-chrome) • [Developer Commands](#-developer-commands)

</div>

---

## 💡 Why Nexora Tools?

We spend 80% of our daily workflow inside a web browser—yet we constantly battle the same tiny papercuts:
- 40+ open tabs devouring RAM
- Obtrusive newsletter modals and paywall backdrops locking our page scrollbars
- Clunky note-taking across technical video lectures without timestamps
- Form autofill tools that upload personal data to third-party clouds
- Bookmark bars rotting with 404 dead links and duplicates

**Nexora Tools** fixes these headaches with zero compromise:
- 🔒 **100% Local & Privacy-First** — Stored securely on your device (IndexedDB & Chrome Local Storage). Zero analytics, zero telemetry, zero cloud backdoors.
- ⚡ **Manifest V3 Native** — Instant cold starts, event-driven service workers, and minimal memory overhead.
- 🎨 **Unified Design System** — Built with React, Tailwind CSS, and Lucide icons for a clean, cohesive, dark-mode native experience.

---

## 🚀 Extensions in the Ecosystem

| Extension | Accent | Category | Core Superpower |
|---|---|---|---|
| [**TabMind**](#1-tabmind--intelligent-tab--session-manager) | `Blue` | Tab Management | Cluster tabs by domain, suspend inactive tabs, and save/restore named workspaces. |
| [**LectureMark**](#2-lecturemark--timestamped-notes--video-lecture-organizer) | `Rose` | Video Learning | Timestamped note-taking side-panel for video lectures with 1-click playback seek. |
| [**OverlayBuster**](#3-overlaybuster--intelligent-popup-paywall--overlay-blocker) | `Emerald` | Content Freedom | Vaporizes intrusive modals, unblurs masked text, restores frozen scrollbars, and includes Element Zap. |
| [**FormFill Pro**](#4-formfill-pro--privacy-focused-form-autofill) | `Amber` | Productivity | Local custom persona profiles with live fill preview and snippet manager. |
| [**PagePocket**](#5-pagepocket--web-clipper--knowledge-manager) | `Violet` | Knowledge Base | Distraction-free reader view, text highlighting, and offline IndexedDB knowledge vault. |
| [**LinkSentry**](#6-linksentry--bookmark-health--link-checker) | `Teal` | Bookmarks & Links | Background audit engine that detects broken 404s, redirects, duplicates, and exports reports. |
| [**CiteRight**](#7-citeright--instant-academic-citation-generator) | `Cyan` | Research & Academia | 1-click citation formatter (APA, MLA, Chicago, Harvard, BibTeX) with metadata scraper. |

---

## 🛠 Deep Dive into Each Tool

### 1. TabMind — Intelligent Tab & Session Manager
* **The Problem:** 40+ tabs opened during research clog your browser, spike memory usage, and make finding tabs impossible.
* **Key Features:**
  - Fast instant search across all open windows and tabs.
  - Automatic domain grouping via Chrome's native `tabGroups` API.
  - Sleep inactive tabs to release RAM without losing scroll position.
  - Save, export, and restore full multi-window browsing workspaces.

### 2. LectureMark — Timestamped Notes & Video Lecture Organizer
* **The Problem:** Watching 2+ hour tutorials on YouTube or Coursera and taking notes in a separate doc loses playback context.
* **Key Features:**
  - Side-panel notes editor synced directly with the active video player.
  - Captures exact timestamps in real time with markdown support.
  - Interactive chapter markers and lecture organization.
  - Click any timestamped note to instantly jump to that exact second in the video.

### 3. OverlayBuster — Intelligent Popup, Paywall & Overlay Blocker
* **The Problem:** Reading an article or docs page and getting slapped with newsletter overlays, blurred paywalls, and frozen page scrolling (`overflow: hidden`).
* **Key Features:**
  - Automatic heuristic detection of overlay backdrops, modal dialogues, and locked containers.
  - Unblurs masked CSS filters (`backdrop-filter: blur`, `filter: blur`).
  - Restores body and HTML scrolllocks instantly.
  - Interactive **Element Zap** crosshair mode to manually target and vaporize stubborn page obstructions.
  - Clean Reader Mode for distraction-free reading.

### 4. FormFill Pro — Privacy-Focused Form Autofill
* **The Problem:** Re-typing repetitive details or test datasets is exhausting, but cloud autofill tools store sensitive profiles on remote servers.
* **Key Features:**
  - 100% offline profile storage (Personal, Work, Developer Test Personas).
  - Smart field detection supporting text, select, radio, and checkboxes.
  - "Review Before Fill" visual overlay preview to inspect target fields before injecting data.
  - Dispatches native synthetic events (`input`, `change`) for seamless compatibility with React/Vue forms.

### 5. PagePocket — Web Clipper & Knowledge Manager
* **The Problem:** Cloud-based bookmarking apps are heavy, require paid subscriptions, and track your reading habits.
* **Key Features:**
  - Single-click article clipper that strips away ads, tracking scripts, and sidebars.
  - In-browser text highlighting and note tagging.
  - Local IndexedDB knowledge vault with full-text search.
  - Export clippings as clean Markdown, JSON, or HTML.

### 6. LinkSentry — Bookmark Health & Link Checker
* **The Problem:** Years of bookmarks pile up into dead links, 404s, domain parking pages, and dozens of duplicates.
* **Key Features:**
  - Asynchronous multi-threaded link integrity verification.
  - Detects HTTP 404, 500, redirect chains, and duplicate URLs.
  - Visual health breakdown chart with response latency metrics.
  - Export audit logs to CSV and JSON.

### 7. CiteRight — Instant Academic Citation Generator
* **The Problem:** Generating properly formatted citations for papers, articles, and documentation is tedious and full of ads.
* **Key Features:**
  - Extracts OpenGraph, Dublin Core, and schema.org metadata from the active tab.
  - Instant conversion to APA 7th, MLA 9th, Chicago, Harvard, and BibTeX.
  - Copy formatted citations or BibTeX entries with one click.

---

## 🏗 Monorepo Architecture

Nexora Tools is structured as a scalable pnpm monorepo with shared type packages, utility libraries, and design tokens:

```
nexora-tools/
├── apps/
│   ├── tabmind/          # TabMind Manifest V3 Extension
│   ├── lecturemark/      # LectureMark Manifest V3 Extension
│   ├── overlaybuster/    # OverlayBuster Manifest V3 Extension
│   ├── formfill-pro/     # FormFill Pro Manifest V3 Extension
│   ├── pagepocket/       # PagePocket Manifest V3 Extension
│   ├── linksentry/       # LinkSentry Manifest V3 Extension
│   ├── citeright/        # CiteRight Manifest V3 Extension
│   └── website/          # Nexora Tools Showcase Landing Page
├── packages/
│   ├── shared-types/     # Core TypeScript domain entities & schemas
│   ├── browser-utils/    # URL parsing, duplicates, file exporters
│   ├── storage/          # Type-safe ChromeStorageAdapter & LocalIndexedDB
│   ├── design-system/    # Brand tokens, colors, themes
│   └── ui/               # Accessible shared UI component library
├── dist-zip/             # Ready-to-load unpacked extensions & CWS ZIPs
└── scripts/              # Manifest validators, icon generator & packaging pipeline
```

---

## ⚡ How to Load in Google Chrome

You can run any of these extensions immediately in developer mode:

1. Clone this repository:
   ```bash
   git clone https://github.com/pathakpk7/Nexora_Tools.git
   cd Nexora_Tools
   ```
2. Install dependencies & build all extensions:
   ```bash
   pnpm install
   pnpm build:all
   pnpm package:extensions
   ```
3. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
4. Toggle **Developer mode** in the top-right corner.
5. Click **Load unpacked** in the top-left toolbar.
6. Select any extension folder inside `dist-zip/`:
   - `dist-zip/tabmind`
   - `dist-zip/lecturemark`
   - `dist-zip/overlaybuster`
   - `dist-zip/formfill-pro`
   - `dist-zip/pagepocket`
   - `dist-zip/linksentry`
   - `dist-zip/citeright`
7. 🎉 The extension is now active in your Chrome toolbar!

---

## 💻 Developer Commands

All common commands are orchestrated from the root workspace:

```bash
# 📦 Install all dependencies across the entire monorepo
pnpm install

# 🧪 Run Vitest test suites (23+ unit tests)
pnpm test

# 🔍 Dry-run TypeScript type checking
pnpm typecheck

# 🏗️ Build all extensions & showcase site
pnpm build:all

# ⚡ Build individual extensions
pnpm build:tabmind
pnpm build:lecturemark
pnpm build:overlaybuster
pnpm build:formfill
pnpm build:pagepocket
pnpm build:linksentry
pnpm build:citeright
pnpm build:website

# 🛡️ Validate Manifest V3 schemas and security permissions
pnpm validate:manifests

# 🎁 Package extensions into dist-zip/ (ready-to-upload ZIPs & unpacked folders)
pnpm package:extensions
```

---

## 🔒 Privacy & Security Guarantee

- **No Remote Telemetry:** We collect zero analytics, behavioral data, or user queries.
- **No Third-Party APIs:** All processing, parsing, and storage happens entirely in your local browser instance.
- **Minimal Permissions:** Each extension requests only the minimum Chrome permissions required for its specific job.
- **Fully Open-Source:** Audit the source code directly anytime.

---

## 🤝 Contributing

Contributions are welcome! Whether you want to report an issue, suggest a feature, or add a new extension:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingUtility`).
3. Commit your Changes (`git commit -m 'feat: add amazing utility'`).
4. Push to the Branch (`git push origin feature/AmazingUtility`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Crafted with precision by <strong>Pathak</strong> • Made for power users who love clean, fast browsing.</sub>
</div>
