import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Generates custom branded PNG icon for OverlayBuster: "A Shield with a Lightning Zap"
 */
function generateShieldZapIcon(width, height) {
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
  const rCorner = width * 0.22;

  // Background Emerald gradient: #059669 (5, 150, 105)
  const baseR = 5;
  const baseG = 150;
  const baseB = 105;

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

      const nx = x / width; // 0..1
      const ny = y / height; // 0..1

      // ----------------------------------------------------
      // SHIELD + LIGHTNING ZAP GLYPH GEOMETRY
      // ----------------------------------------------------
      // 1. The Shield outline:
      // Top flat edge with slight center dip: ny around 0.22 to 0.50
      // Bottom pointed curve down to (0.50, 0.82)
      const sx = Math.abs(nx - 0.50); // distance from center line: 0..0.5
      const inShieldTop = ny >= 0.20 && ny <= 0.48 && sx <= 0.28;
      const inShieldBottom = ny > 0.48 && ny <= 0.82 && sx <= 0.28 * (1 - (ny - 0.48) / 0.34);
      const inShield = inShieldTop || inShieldBottom;

      // Shield border vs shield inner
      const inShieldInnerTop = ny >= 0.25 && ny <= 0.48 && sx <= 0.22;
      const inShieldInnerBottom = ny > 0.48 && ny <= 0.77 && sx <= 0.22 * (1 - (ny - 0.48) / 0.29);
      const inShieldInner = inShieldInnerTop || inShieldInnerBottom;
      const isShieldBorder = inShield && !inShieldInner;

      // 2. The Lightning Zap (centered, energetic zigzag):
      // Upper segment: goes from (0.55, 0.26) down-left to (0.42, 0.52)
      // Middle shelf: cuts horizontally right to (0.54, 0.52)
      // Lower segment: goes from (0.54, 0.52) down-left to point at (0.45, 0.75)
      const inZapUpper =
        ny >= 0.26 && ny <= 0.52 && Math.abs((nx - 0.55) + (ny - 0.26) * 0.5) <= 0.055;
      const inZapLower =
        ny >= 0.50 && ny <= 0.74 && Math.abs((nx - 0.54) + (ny - 0.50) * 0.38) <= 0.050;
      const inZapCenter =
        ny >= 0.48 && ny <= 0.54 && nx >= 0.38 && nx <= 0.58;

      const isZap = inZapUpper || inZapLower || inZapCenter;

      let r = baseR;
      let g = baseG;
      let b = baseB;
      let a = 255;

      if (isZap) {
        // Bright golden energetic yellow for lightning bolt
        r = 253;
        g = 224;
        b = 71;
      } else if (isShieldBorder) {
        // Crisp clean white for the shield perimeter
        r = 241;
        g = 245;
        b = 249;
      } else if (inShieldInner) {
        // Darker emerald contrast inside the shield
        r = 4;
        g = 120;
        b = 87;
      } else {
        // Outer gradient
        const grad = Math.floor(ny * 25);
        r = Math.max(0, baseR - grad);
        g = Math.max(0, baseG - grad);
        b = Math.max(0, baseB - grad);
      }

      rawData.writeUInt8(r, pixelOffset);
      rawData.writeUInt8(g, pixelOffset + 1);
      rawData.writeUInt8(b, pixelOffset + 2);
      rawData.writeUInt8(a, pixelOffset + 3);
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

const sizes = [16, 32, 48, 128];
const dirs = [
  path.resolve(process.cwd(), 'apps', 'overlaybuster', 'public', 'icons'),
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  const png = generateShieldZapIcon(size, size);
  const fname = `icon-${size}.png`;
  for (const dir of dirs) {
    fs.writeFileSync(path.join(dir, fname), png);
  }
}

console.log('✅ Generated OverlayBuster "Shield with Lightning Zap" icons (16, 32, 48, 128)!');
