# Architecture Overview — Nexora Tools

## Ecosystem Philosophy
Nexora Tools is a unified suite of four independent, local-first Manifest V3 browser utility extensions:
1. **TabMind** — Intelligent Tab & Session Manager (Blue accent)
2. **PagePocket** — Personal Web Clipper & Knowledge Manager (Violet accent)
3. **LinkSentry** — Bookmark Health & Link Checker (Teal accent)
4. **FormFill Pro** — Privacy-Focused Form Autofill Assistant (Amber accent)

Parent Brand: **Nexora Tools** ("Small Tools. Better Browsing.")

## Monorepo Layout
Built using **pnpm workspaces**, **TypeScript strict mode**, **React 18**, **Tailwind CSS**, and **Vite 6**:

```
nexora-tools/
├── apps/
│   ├── tabmind/          # Manifest V3 extension: Tabs, workspaces, sessions
│   ├── pagepocket/       # Manifest V3 extension: Web clipping, reader, offline library
│   ├── linksentry/       # Manifest V3 extension: Bookmark integrity scanner, audit exporter
│   ├── formfill-pro/     # Manifest V3 extension: Profile autofill, snippet manager
│   └── website/          # Public-facing product showcase & documentation site
├── packages/
│   ├── shared-types/     # Core TypeScript domain entities
│   ├── browser-utils/    # URL normalization, domain extraction, CSV/JSON/MD download helpers
│   ├── storage/          # Type-safe ChromeStorageAdapter & LocalIndexedDB
│   ├── design-system/    # Brand tokens, colors, themes
│   └── ui/               # Reusable WCAG 2.2 AA accessible component library
├── dist-zip/             # Packaged, ready-to-load unpacked extensions
└── scripts/              # Build, manifest validation, icon generator, packaging
```
