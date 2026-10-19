import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate raw PNG with uncompressed/deflated RGBA data
function generatePng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data: height rows, each starting with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData.writeUInt8(0, rowOffset); // filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Draw subtle rounded border/inner emblem
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isInner = x >= width * 0.25 && x <= width * 0.75 && y >= height * 0.25 && y <= height * 0.75;

      if (isInner) {
        rawData.writeUInt8(255, pixelOffset);
        rawData.writeUInt8(255, pixelOffset + 1);
        rawData.writeUInt8(255, pixelOffset + 2);
        rawData.writeUInt8(255, pixelOffset + 3);
      } else if (isBorder) {
        rawData.writeUInt8(Math.max(0, r - 30), pixelOffset);
        rawData.writeUInt8(Math.max(0, g - 30), pixelOffset + 1);
        rawData.writeUInt8(Math.max(0, b - 30), pixelOffset + 2);
        rawData.writeUInt8(255, pixelOffset + 3);
      } else {
        rawData.writeUInt8(r, pixelOffset);
        rawData.writeUInt8(g, pixelOffset + 1);
        rawData.writeUInt8(b, pixelOffset + 2);
        rawData.writeUInt8(a, pixelOffset + 3);
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

// CRC32 calculation table
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

// Generate icons for each app
const apps = [
  { name: 'tabmind', r: 37, g: 99, b: 235 }, // Blue #2563eb
  { name: 'pagepocket', r: 124, g: 58, b: 237 }, // Violet #7c3aed
  { name: 'linksentry', r: 13, g: 148, b: 136 }, // Teal #0d9488
  { name: 'formfill-pro', r: 217, g: 119, b: 6 }, // Amber #d97706
];

const sizes = [16, 32, 48, 128];

for (const app of apps) {
  const iconDir = path.resolve(process.cwd(), 'apps', app.name, 'public', 'icons');
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }

  for (const size of sizes) {
    const png = generatePng(size, size, app.r, app.g, app.b);
    const outFile = path.join(iconDir, `icon-${size}.png`);
    fs.writeFileSync(outFile, png);
  }
  console.log(`✅ Generated valid PNG icons for apps/${app.name}`);
}
