import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Generates custom branded PNG icons with distinctive glyph shapes for each extension
 */
function generateCustomIcon(width, height, brand) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = createChunk('IHDR', ihdr);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const rCorner = width * 0.18;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData.writeUInt8(0, rowOffset); // filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle boundary check
      const dx = Math.max(0, Math.abs(x - cx) - (cx - rCorner));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - rCorner));
      const isOutside = dx * dx + dy * dy > rCorner * rCorner;

      if (isOutside) {
        // Transparent outside rounded corners
        rawData.writeUInt8(0, pixelOffset);
        rawData.writeUInt8(0, pixelOffset + 1);
        rawData.writeUInt8(0, pixelOffset + 2);
        rawData.writeUInt8(0, pixelOffset + 3);
        continue;
      }

      // Check custom glyph geometry for each app
      let isGlyph = false;
      const nx = x / width; // 0..1
      const ny = y / height; // 0..1

      if (brand.name === 'tabmind') {
        // TabMind: Browsing Tab layers icon
        // Top tab header
        const isTabTop = ny >= 0.22 && ny <= 0.38 && nx >= 0.22 && nx <= 0.65;
        // Tab card body
        const isTabCard = ny >= 0.36 && ny <= 0.78 && nx >= 0.22 && nx <= 0.78;
        const isCardBorder =
          isTabCard &&
          (nx <= 0.28 || nx >= 0.72 || ny <= 0.42 || ny >= 0.72 || (ny >= 0.52 && ny <= 0.58 && nx >= 0.32 && nx <= 0.68));
        isGlyph = isTabTop || isCardBorder;
      } else if (brand.name === 'pagepocket') {
        // PagePocket: Bookmark Ribbon & Pocket emblem
        const isRibbon =
          nx >= 0.32 &&
          nx <= 0.68 &&
          ny >= 0.22 &&
          ny <= 0.76 &&
          !(ny > 0.62 && Math.abs(nx - 0.5) < (ny - 0.62) * 1.4);
        isGlyph = isRibbon;
      } else if (brand.name === 'linksentry') {
        // LinkSentry: Security Shield with Checkmark
        const inShield = ny >= 0.22 && ny <= 0.78 && nx >= 0.25 && nx <= 0.75;
        const check1 = Math.abs(ny - (0.45 + (nx - 0.35) * 0.5)) < 0.08 && nx >= 0.32 && nx <= 0.46;
        const check2 = Math.abs(ny - (0.50 - (nx - 0.46) * 0.9)) < 0.08 && nx >= 0.46 && nx <= 0.68;
        isGlyph = (check1 || check2) && inShield;
      } else if (brand.name === 'formfill-pro') {
        // FormFill Pro: Lightning speed autofill zap
        const zap1 = ny >= 0.22 && ny <= 0.52 && Math.abs(nx - (0.6 - (ny - 0.22) * 0.6)) < 0.12;
        const zap2 = ny >= 0.46 && ny <= 0.78 && Math.abs(nx - (0.55 - (ny - 0.46) * 0.6)) < 0.12;
        isGlyph = zap1 || zap2;
      } else if (brand.name === 'lecturemark') {
        // LectureMark: Pen on the Page
        const inPageRect = nx >= 0.20 && nx <= 0.68 && ny >= 0.18 && ny <= 0.82;
        const isPageBorder = inPageRect && (nx <= 0.25 || nx >= 0.63 || ny <= 0.23 || ny >= 0.77);
        const isPageLine = (nx >= 0.28 && nx <= 0.52 && ny >= 0.32 && ny <= 0.36) ||
          (nx >= 0.28 && nx <= 0.44 && ny >= 0.44 && ny <= 0.48) ||
          (nx >= 0.28 && nx <= 0.50 && ny >= 0.56 && ny <= 0.60);
        const distFromPen = Math.abs((nx + ny) - 0.98) / 1.4142;
        const v = (nx - ny) - 0.18;
        const inPen = distFromPen <= 0.055 && v >= -0.25 && v <= 0.45;
        isGlyph = isPageBorder || isPageLine || inPen;
      }

      if (isGlyph) {
        // Clean white glyph
        rawData.writeUInt8(255, pixelOffset);
        rawData.writeUInt8(255, pixelOffset + 1);
        rawData.writeUInt8(255, pixelOffset + 2);
        rawData.writeUInt8(255, pixelOffset + 3);
      } else {
        // Subtle vertical gradient on background
        const shade = Math.floor(ny * 25);
        rawData.writeUInt8(Math.max(0, brand.r - shade), pixelOffset);
        rawData.writeUInt8(Math.max(0, brand.g - shade), pixelOffset + 1);
        rawData.writeUInt8(Math.max(0, brand.b - shade), pixelOffset + 2);
        rawData.writeUInt8(255, pixelOffset + 3);
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBody = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcBody);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const apps = [
  { name: 'tabmind', r: 37, g: 99, b: 235 }, // Blue
  { name: 'pagepocket', r: 124, g: 58, b: 237 }, // Violet
  { name: 'linksentry', r: 13, g: 148, b: 136 }, // Teal
  { name: 'formfill-pro', r: 217, g: 119, b: 6 }, // Amber
  { name: 'lecturemark', r: 79, g: 70, b: 229 }, // Indigo
];

const sizes = [16, 32, 48, 128];

for (const app of apps) {
  const publicDir = path.resolve(process.cwd(), 'apps', app.name, 'public', 'icons');
  const distDir = path.resolve(process.cwd(), 'apps', app.name, 'dist', 'icons');
  const distZipDir = path.resolve(process.cwd(), 'dist-zip', app.name, 'icons');

  [publicDir, distDir, distZipDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  for (const size of sizes) {
    const png = generateCustomIcon(size, size, app);
    const fname = `icon-${size}.png`;
    fs.writeFileSync(path.join(publicDir, fname), png);
    if (fs.existsSync(distDir)) fs.writeFileSync(path.join(distDir, fname), png);
    if (fs.existsSync(distZipDir)) fs.writeFileSync(path.join(distZipDir, fname), png);
  }
  console.log(`✨ Generated custom designed icons (16, 32, 48, 128) for ${app.name}`);
}
