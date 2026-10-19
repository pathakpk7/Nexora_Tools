# Chrome Web Store Publication Guide — Nexora Tools

All extensions are compiled into compliant Manifest V3 production bundles and packaged as individual `.zip` archives ready for immediate upload to the **Chrome Web Store Developer Dashboard**.

---

## 1. Generated Publication Packages
The individual archives are located in [`dist-zip/`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip):

1. **TabMind**: [`dist-zip/tabmind-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/tabmind-v1.0.0.zip)
2. **PagePocket**: [`dist-zip/pagepocket-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/pagepocket-v1.0.0.zip)
3. **LinkSentry**: [`dist-zip/linksentry-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/linksentry-v1.0.0.zip)
4. **FormFill Pro**: [`dist-zip/formfill-pro-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/formfill-pro-v1.0.0.zip)
5. **LectureMark**: [`dist-zip/lecturemark-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/lecturemark-v1.0.0.zip)
6. **CiteRight**: [`dist-zip/citeright-v1.0.0.zip`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/dist-zip/citeright-v1.0.0.zip)

---

## 2. Step-by-Step Publishing Process

### Step 1: Register Chrome Web Store Developer Account
1. Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. Pay the one-time \$5 developer registration fee if you haven't already.

### Step 2: Upload the Extension ZIP
1. In the Developer Dashboard, click **Add new item** in the top right.
2. Drag and drop the corresponding ZIP file (e.g. `dist-zip/tabmind-v1.0.0.zip`).
3. Google will unpack the archive and validate the `manifest.json`.

### Step 3: Complete the Listing Metadata
For each extension:
- **Product Title & Short Summary:** Pre-configured in `manifest.json`.
- **Detailed Description:** Use the comprehensive writeup from the Nexora Tools documentation (`docs/architecture.md`).
- **Category:** Productivity / Workflow.
- **Icons:** Provided at 16x16, 32x32, 48x48, and 128x128 inside each package.
- **Store Screenshots:** Capture screenshots (1280x800 or 640x400) of the popup and full-screen dashboards.

### Step 4: Privacy Practices Disclosure
Google requires declaring how each permission is used. You can copy the exact justifications from [`docs/permissions.md`](file:///c:/Users/patha/OneDrive/Desktop/NEXORA%20TOOLS/docs/permissions.md):
- Confirm: *"This extension does not sell user data, use data for creditworthiness, or transfer data to third parties."*
- Select: **Single Purpose** for each tool.

### Step 5: Submit for Review
Click **Submit for Review**. Review typically takes 24–48 hours for Manifest V3 utilities with minimal permissions.
