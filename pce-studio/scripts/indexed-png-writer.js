const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PNG } = require("pngjs");

function writeCrc(buf) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  return crc32(buf);
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcContent = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(writeCrc(crcContent), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function convertToIndexedPng(srcPath, destPath) {
  const buf = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buf);

  // Extract palette (max 16 colors)
  const palette = [];
  const colorMap = new Map();

  function getPaletteIndex(r, g, b) {
    const key = `${r},${g},${b}`;
    if (colorMap.has(key)) return colorMap.get(key);

    if (palette.length < 16) {
      const idx = palette.length;
      palette.push([r, g, b]);
      colorMap.set(key, idx);
      return idx;
    }

    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const [pr, pg, pb] = palette[i];
      const diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    colorMap.set(key, bestIdx);
    return bestIdx;
  }

  // Generate scanlines (filter byte 0 + width palette indices per line)
  const scanlines = Buffer.alloc(png.height * (png.width + 1));

  for (let y = 0; y < png.height; y++) {
    const lineStart = y * (png.width + 1);
    scanlines[lineStart] = 0; // No filter

    for (let x = 0; x < png.width; x++) {
      const srcIdx = (png.width * y + x) * 4;
      const r = png.data[srcIdx];
      const g = png.data[srcIdx + 1];
      const b = png.data[srcIdx + 2];
      const palIdx = getPaletteIndex(r, g, b);
      scanlines[lineStart + 1 + x] = palIdx;
    }
  }

  while (palette.length < 16) {
    palette.push([0, 0, 0]);
  }

  // 1. Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(png.width, 0);
  ihdrData.writeUInt32BE(png.height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 3; // Color type 3 (Indexed)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // 3. PLTE
  const plteData = Buffer.alloc(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plteData[i * 3] = palette[i][0];
    plteData[i * 3 + 1] = palette[i][1];
    plteData[i * 3 + 2] = palette[i][2];
  }
  const plteChunk = makeChunk("PLTE", plteData);

  // 4. IDAT
  const idatCompressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk("IDAT", idatCompressed);

  // 5. IEND
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  const outPngBuf = Buffer.concat([sig, ihdrChunk, plteChunk, idatChunk, iendChunk]);
  fs.writeFileSync(destPath, outPngBuf);
  console.log(`Successfully converted ${path.basename(srcPath)} -> ${path.basename(destPath)} (${png.width}x${png.height}, ${palette.length} colors indexed)`);
}

module.exports = { convertToIndexedPng };

if (require.main === module) {
  const bg2Path = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\backgrounds\\scene2.png";
  const outPath = path.resolve(__dirname, "../build_tmp/assets/backgrounds/scene2.png");
  convertToIndexedPng(bg2Path, outPath);
}
