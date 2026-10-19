# Permissions Matrix — Nexora Tools

All four extensions follow the principle of least privilege required by Chrome Extension Manifest V3.

| Extension | Permission | Type | Purpose | User Rejection Handling |
|-----------|------------|------|---------|-------------------------|
| **TabMind** | `tabs` | Required | Query open tabs, titles, URLs, active tab switching, closing duplicates | Disables tab management features |
| | `storage` | Required | Persist named workspace browsing sessions locally | Falls back to in-memory session |
| | `tabGroups` | Required | Native Chrome tab grouping by domain | Disables automatic domain grouping |
| **PagePocket** | `activeTab` | Required | Reads active page URL and title when popup opened or triggered | Popup displays disabled capture view |
| | `storage` | Required | Store clipping preferences and settings | Falls back to in-memory preferences |
| | `contextMenus`| Required | Context-menu integration ("Save highlight to PagePocket") | Highlights only clippable from popup |
| | `scripting` | Required | Extract readable text for clean reader view on demand | Clean article reading view unavailable |
| **LinkSentry** | `bookmarks` | Required | Read user bookmarks tree to audit link health | Audit cannot be run |
| | `storage` | Required | Persist scan audit records and duplicate sets | Results remain in-memory during session |
| **FormFill Pro** | `activeTab` | Required | Inspect input fields on active form | Cannot scan form on page |
| | `storage` | Required | Store user profiles and custom snippets locally on disk | Profiles cleared on browser close |
| | `scripting` | Required | Inject approved values into inputs with synthetic change events | Autofill fails; user can copy snippets |
| **CiteRight** | `activeTab` | Required | Detect active research page to read metadata tags | Metadata extraction unavailable |
| | `storage` | Required | Store citation collections and bibliographies locally | Falls back to in-memory session |
| | `scripting` | Required | Extract bibliographic metadata (DOI, authors, title) from DOM | Manual citation entry required |
| **LectureMark** | `activeTab` | Required | Access active video page to read video title and URL | Video cannot be detected |
| | `storage` | Required | Persist lectures, timestamped notes, and chapters locally via IndexedDB | Notes cannot be saved |
| | `scripting` | Required | Query hardware video playback time and seek to timestamps | Playback synchronization disabled |
| | `sidePanel` | Required | Provide companion side-panel for taking notes side-by-side | Side panel note taking unavailable |
| | `tabs` | Required | Query video tab across windows to control playback from dashboard | Multi-window seeking disabled |
| **OverlayBuster** | `activeTab` | Required | Detect active webpage to identify blocking overlay dialogs and paywall blur | Active page cannot be inspected |
| | `storage` | Required | Persist domain whitelist rules, custom selectors, and lifetime stats | Custom domain rules not saved |
| | `scripting` | Required | Remove blocking DOM nodes, restore overflow scroll, and unblur text | Overlays cannot be removed |

