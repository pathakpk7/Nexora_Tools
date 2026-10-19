import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Generates custom branded PNG icon for LectureMark: "A Pen on a Page"
 */
function generatePenOnPageIcon(width, height) {
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
  const rCorner = width * 0.20;

  // Background indigo color: #4f46e5 (79, 70, 229)
  const baseR = 79;
  const baseG = 70;
  const baseB = 229;

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
      // "PEN ON THE PAGE" GLYPH GEOMETRY
      // ----------------------------------------------------
      // 1. The Document Page (notebook sheet in background)
      const inPageRect = nx >= 0.20 && nx <= 0.68 && ny >= 0.18 && ny <= 0.82;
      const isPageBorder =
        inPageRect &&
        (nx <= 0.25 || nx >= 0.63 || ny <= 0.23 || ny >= 0.77);

      // Horizontal ruled lines on the page (simulating written notes)
      const isPageLine1 = nx >= 0.28 && nx <= 0.52 && ny >= 0.32 && ny <= 0.36;
      const isPageLine2 = nx >= 0.28 && nx <= 0.44 && ny >= 0.44 && ny <= 0.48;
      const isPageLine3 = nx >= 0.28 && nx <= 0.50 && ny >= 0.56 && ny <= 0.60;
      const isPageLine4 = nx >= 0.28 && nx <= 0.56 && ny >= 0.68 && ny <= 0.72;

      const isPage = isPageBorder || isPageLine1 || isPageLine2 || isPageLine3 || isPageLine4;

      // 2. The Pen resting and writing on the page (angled at 45 degrees)
      // Pen center line: nx + ny ≈ 0.98, going from (0.78, 0.20) to (0.46, 0.52)
      const u = (nx + ny) - 0.98; // perpendicular distance * sqrt(2)
      const v = (nx - ny) - 0.18; // position along pen axis: positive is top-right, negative is nib
      const distFromPenAxis = Math.abs(u) / 1.4142;

      // Pen shaft / body:
      const inPenBody = distFromPenAxis <= 0.055 && v >= -0.15 && v <= 0.45;
      // Pen nib (pointed tip touching the page):
      const inPenNib = distFromPenAxis <= 0.055 * (1 - (v - -0.15) / -0.15) && v >= -0.30 && v < -0.15;
      // Pen grip / ring accent:
      const inPenRing = distFromPenAxis <= 0.065 && Math.abs(v - -0.10) <= 0.025;
      // Pen top cap:
      const inPenCap = distFromPenAxis <= 0.060 && v >= 0.38 && v <= 0.48;

      const isPen = inPenBody || inPenNib || inPenRing || inPenCap;

      // Combine
      let r = baseR;
      let g = baseG;
      let b = baseB;
      let a = 255;

      if (isPen) {
        if (inPenNib) {
          // Bright gold/amber nib tip
          r = 251;
          g = 191;
          b = 36;
        } else if (inPenRing || inPenCap) {
          // Metallic silver/white accent
          r = 226;
          g = 232;
          b = 240;
        } else {
          // Sleek clean white/cream pen body
          r = 255;
          g = 255;
          b = 255;
        }
      } else if (isPage) {
        // Clean white document page and ruled lines
        r = 241;
        g = 245;
        b = 249;
      } else {
        // Gradient on background
        const grad = Math.floor(ny * 30);
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
  path.resolve(process.cwd(), 'apps', 'lecturemark', 'public', 'icons'),
  path.resolve(process.cwd(), 'apps', 'lecturemark', 'dist', 'icons'),
  path.resolve(process.cwd(), 'dist-zip', 'lecturemark', 'icons'),
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  const png = generatePenOnPageIcon(size, size);
  const fname = `icon-${size}.png`;
  for (const dir of dirs) {
    fs.writeFileSync(path.join(dir, fname), png);
  }
}

console.log('✅ Generated LectureMark "Pen on a Page" icons (16, 32, 48, 128)!');
