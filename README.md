# Nexora Tools — Small Tools. Better Browsing.

A premium collection of four independent, privacy-first Manifest V3 browser utility extensions sharing a unified design system and monorepo architecture.

## Extensions in the Ecosystem

| Product | Accent | Role | Key Capabilities |
|---|---|---|---|
| **TabMind** | Blue (`#2563eb`) | Intelligent Tab & Session Manager | Open tab search, duplicate closure, domain grouping (`tabGroups`), persistent named workspaces & session restore |
| **PagePocket** | Violet (`#7c3aed`) | Personal Web Clipper & Knowledge Base | Webpage bookmarking, highlighted quotes capture, clean reader view, IndexedDB local storage, Markdown/JSON export |
| **LinkSentry** | Teal (`#0d9488`) | Bookmark Health & Link Checker | Bookmark tree inspection, reachability scan engine, redirect chain detection, duplicate finding, CSV/JSON report export |
| **FormFill Pro** | Amber (`#d97706`) | Privacy-Focused Form Autofill | Multiple custom user profiles (Personal, College, Career), review-before-fill preview, event dispatching, reusable snippet vault |

---

## Workspace Architecture

```
nexora-tools/
├── apps/
│   ├── tabmind/          # TabMind Manifest V3 Extension
│   ├── pagepocket/       # PagePocket Manifest V3 Extension
│   ├── linksentry/       # LinkSentry Manifest V3 Extension
│   ├── formfill-pro/     # FormFill Pro Manifest V3 Extension
│   └── website/          # Nexora Tools Public Showcase Site
├── packages/
│   ├── shared-types/     # Core TypeScript domain entities
│   ├── browser-utils/    # URL parsing, duplicates, CSV/JSON/MD file exporters
│   ├── storage/          # Type-safe ChromeStorageAdapter & LocalIndexedDB
│   ├── design-system/    # Brand tokens, colors, themes
│   └── ui/               # Reusable WCAG 2.2 AA accessible component library
├── dist-zip/             # Packaged, ready-to-load unpacked extensions
└── scripts/              # Build, manifest validation, icon generator, packaging
```

---

## Developer Commands

```bash
# Install all dependencies across workspace
pnpm install

# Run all test suites
pnpm test

# Build all 4 extensions and the showcase website
pnpm build:all

# Build extensions individually
pnpm build:tabmind
pnpm build:pagepocket
pnpm build:linksentry
pnpm build:formfill
pnpm build:website

# Validate extension manifests (MV3 schema compliance)
pnpm validate:manifests

# Package extensions into dist-zip/ for loading in Chrome
pnpm package:extensions
```

---

## How to Load in Google Chrome

1. Open Google Chrome and enter `chrome://extensions` in the address bar.
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select any extension from the `dist-zip/` directory:
   - `dist-zip/tabmind`
   - `dist-zip/pagepocket`
   - `dist-zip/linksentry`
   - `dist-zip/formfill-pro`
5. The extension will appear in your Chrome toolbar ready for use.
