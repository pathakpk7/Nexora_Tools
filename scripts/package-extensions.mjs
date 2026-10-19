import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const apps = ['tabmind', 'pagepocket', 'linksentry', 'formfill-pro', 'citeright', 'lecturemark'];
const distZipDir = path.resolve(process.cwd(), 'dist-zip');

if (!fs.existsSync(distZipDir)) {
  fs.mkdirSync(distZipDir, { recursive: true });
}

console.log('--- Packaging Built Extensions for Chrome Web Store Release ---');

for (const app of apps) {
  const appDist = path.resolve(process.cwd(), 'apps', app, 'dist');
  if (!fs.existsSync(appDist)) {
    console.warn(`⚠️ [${app}] Dist directory not found (${appDist}). Run build first.`);
    continue;
  }

  // Copy dist to release package folder
  const targetDir = path.resolve(distZipDir, app);
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.cpSync(appDist, targetDir, { recursive: true });

  // Copy manifest.json
  const manifestSource = path.resolve(process.cwd(), 'apps', app, 'manifest.json');
  let version = '1.0.0';
  if (fs.existsSync(manifestSource)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestSource, 'utf-8'));
      if (manifest.version) version = manifest.version;
    } catch {}
    fs.copyFileSync(manifestSource, path.resolve(targetDir, 'manifest.json'));
    fs.copyFileSync(manifestSource, path.resolve(appDist, 'manifest.json'));
  }

  // Copy icons if not present in dist
  const publicIcons = path.resolve(process.cwd(), 'apps', app, 'public', 'icons');
  const targetIcons = path.resolve(targetDir, 'icons');
  if (fs.existsSync(publicIcons) && !fs.existsSync(targetIcons)) {
    fs.cpSync(publicIcons, targetIcons, { recursive: true });
  }

  // Generate .zip archive for Chrome Web Store upload
  const zipFile = path.resolve(distZipDir, `${app}-v${version}.zip`);
  try {
    // Delete existing zip if present
    if (fs.existsSync(zipFile)) {
      fs.unlinkSync(zipFile);
    }
    // Windows 10/11 bsdtar supports .zip archiving
    execSync(`tar -a -cf "${zipFile}" -C "${targetDir}" .`);
    console.log(`📦 [${app}] Created Chrome Web Store ZIP: dist-zip/${app}-v${version}.zip`);
  } catch (err) {
    console.warn(`⚠️ [${app}] Could not auto-generate .zip with tar:`, err.message);
  }

  console.log(`📂 [${app}] Packaged ready-to-load folder: dist-zip/${app}`);
}

console.log('\nPackaging complete! Upload ZIPs to Chrome Web Store or load unpacked from dist-zip/<app>\n');
