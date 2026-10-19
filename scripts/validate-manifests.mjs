import fs from 'fs';
import path from 'path';

// Validates all extension manifests
const apps = ['tabmind', 'pagepocket', 'linksentry', 'formfill-pro', 'citeright', 'lecturemark'];
let hasError = false;

console.log('--- Validating Extension Manifests ---');

for (const app of apps) {
  const manifestPath = path.resolve(process.cwd(), 'apps', app, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Missing manifest: ${manifestPath}`);
    hasError = true;
    continue;
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    if (manifest.manifest_version !== 3) {
      console.error(`❌ [${app}] manifest_version must be 3, found ${manifest.manifest_version}`);
      hasError = true;
    }
    if (!manifest.name) {
      console.error(`❌ [${app}] missing name`);
      hasError = true;
    } else if (manifest.name.length > 45) {
      console.error(`❌ [${app}] name exceeds Chrome Web Store 45-character limit (${manifest.name.length} chars): "${manifest.name}"`);
      hasError = true;
    }
    if (!manifest.version) {
      console.error(`❌ [${app}] missing version`);
      hasError = true;
    }
    if (!manifest.description) {
      console.error(`❌ [${app}] missing description`);
      hasError = true;
    } else if (manifest.description.length > 132) {
      console.error(`❌ [${app}] description exceeds Chrome Web Store 132-character limit (${manifest.description.length} chars)`);
      hasError = true;
    }
    if (!manifest.action || !manifest.action.default_popup) {
      console.error(`❌ [${app}] missing action.default_popup`);
      hasError = true;
    }

    // Verify icons
    const requiredIcons = ['16', '32', '48', '128'];
    if (!manifest.icons) {
      console.error(`❌ [${app}] missing icons declaration`);
      hasError = true;
    } else {
      for (const size of requiredIcons) {
        if (!manifest.icons[size]) {
          console.error(`❌ [${app}] missing icon for size ${size}`);
          hasError = true;
        } else {
          const iconPath = path.resolve(process.cwd(), 'apps', app, manifest.icons[size].replace(/^\//, ''));
          const publicIconPath = path.resolve(process.cwd(), 'apps', app, 'public', manifest.icons[size].replace(/^\//, ''));
          if (!fs.existsSync(iconPath) && !fs.existsSync(publicIconPath)) {
            console.error(`❌ [${app}] icon file not found on disk: ${manifest.icons[size]}`);
            hasError = true;
          }
        }
      }
    }

    console.log(`✅ [${app}] Manifest V3 valid: "${manifest.name}" (${manifest.name.length}c) | desc: ${manifest.description.length}c`);
  } catch (err) {
    console.error(`❌ [${app}] Failed to parse JSON:`, err);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nManifest validation failed.');
  process.exit(1);
} else {
  console.log('\nAll extension manifests are valid!\n');
}
