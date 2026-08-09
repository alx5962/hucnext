import fs from "fs-extra";
import path from "path";
import zlib from "zlib";
import { PNG } from "pngjs";

function writeCrc(buf: Buffer): number {
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buffer: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  return crc32(buf);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcContent = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(writeCrc(crcContent), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Perceptual color distance (luma-weighted squared) */
function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

/**
 * Convert a PNG to an indexed PNG ready for HuC's #incchr / #incbat.
 *
 * For Logo scenes (maxColors = 256), a per-tile palette fixup pass is applied:
 * each 8x8 tile must use colors from only ONE 16-color sub-palette group
 * (PC Engine hardware constraint enforced by #incbat). Any pixels from a
 * minority sub-palette within a tile are remapped to the nearest color within
 * the dominant sub-palette for that tile.
 *
 * For normal scenes (maxColors = 16, the default), the image is quantized to
 * a single 16-color palette.
 */
export function convertToIndexedPng(srcPath: string, destPath: string, maxColors: number = 16): void {
  const buf = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buf);
  const W = png.width;
  const H = png.height;

  const paletteLimit = Math.min(Math.max(maxColors, 1), 256);

  // ---- Step 1: Build a global palette from unique RGB colors ----
  const palette: [number, number, number][] = [];
  const colorMap = new Map<string, number>();

  function getPaletteIndex(r: number, g: number, b: number): number {
    const key = `${r},${g},${b}`;
    if (colorMap.has(key)) return colorMap.get(key)!;

    if (palette.length < paletteLimit) {
      const idx = palette.length;
      palette.push([r, g, b]);
      colorMap.set(key, idx);
      return idx;
    }

    // Nearest-color fallback (entire palette)
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const [pr, pg, pb] = palette[i];
      const diff = colorDist(r, g, b, pr, pg, pb);
      if (diff < minDiff) { minDiff = diff; bestIdx = i; }
    }
    colorMap.set(key, bestIdx);
    return bestIdx;
  }

  // ---- Step 2: Build initial pixel index array ----
  const pixels = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcIdx = (W * y + x) * 4;
      pixels[y * W + x] = getPaletteIndex(
        png.data[srcIdx],
        png.data[srcIdx + 1],
        png.data[srcIdx + 2]
      );
    }
  }

  // ---- Step 3: Per-tile palette fixup (only for multi-palette mode) ----
  // PC Engine: each 8x8 tile may only use colors from ONE 16-color sub-palette.
  // Sub-palette number = palette index >> 4.
  // Transparent pixels (index & 0xF == 0) are skipped in palette detection.
  if (paletteLimit > 16) {
    const subPalSize = 16;
    const numSubPals = Math.ceil(paletteLimit / subPalSize);

    for (let ty = 0; ty < H; ty += 8) {
      for (let tx = 0; tx < W; tx += 8) {
        // Count non-transparent pixels per sub-palette in this tile
        const spCount = new Array<number>(numSubPals).fill(0);
        for (let dy = 0; dy < 8 && ty + dy < H; dy++) {
          for (let dx = 0; dx < 8 && tx + dx < W; dx++) {
            const idx = pixels[(ty + dy) * W + (tx + dx)];
            if ((idx & 0x0F) !== 0) spCount[idx >> 4]++;
          }
        }

        // Find dominant sub-palette (most pixels)
        let dominantSp = 0;
        let maxCount = 0;
        for (let sp = 0; sp < numSubPals; sp++) {
          if (spCount[sp] > maxCount) { maxCount = spCount[sp]; dominantSp = sp; }
        }

        // Check if there are any minority sub-palettes
        const hasConflict = spCount.some((c, sp) => sp !== dominantSp && c > 0);
        if (!hasConflict) continue;

        // Build nearest-color lookup from dominant sub-palette
        const domStart = dominantSp * subPalSize;
        const domEnd = Math.min(domStart + subPalSize, palette.length);

        // Remap pixels from minority sub-palettes to nearest color in dominant sp
        for (let dy = 0; dy < 8 && ty + dy < H; dy++) {
          for (let dx = 0; dx < 8 && tx + dx < W; dx++) {
            const pi = (ty + dy) * W + (tx + dx);
            const idx = pixels[pi];
            if ((idx & 0x0F) === 0 || (idx >> 4) === dominantSp) continue;

            // This pixel is from the wrong sub-palette — remap
            const [pr, pg, pb] = palette[idx];
            let bestLocal = -1;
            let minDiff = Infinity;
            // Search from index 1 within dominant sp to avoid transparent slot
            for (let ci = domStart + 1; ci < domEnd; ci++) {
              const [cr, cg, cb] = palette[ci];
              const diff = colorDist(pr, pg, pb, cr, cg, cb);
              if (diff < minDiff) { minDiff = diff; bestLocal = ci; }
            }
            // Fallback: also consider index 0 of dominant sp (transparent)
            if (bestLocal < 0) bestLocal = domStart;
            pixels[pi] = bestLocal;
          }
        }
      }
    }
  }

  // ---- Step 4: Pad palette to at least 16 entries ----
  while (palette.length < Math.min(16, paletteLimit)) {
    palette.push([0, 0, 0]);
  }

  // ---- Step 5: Write indexed PNG ----
  const scanlines = Buffer.alloc(H * (W + 1));
  for (let y = 0; y < H; y++) {
    const lineStart = y * (W + 1);
    scanlines[lineStart] = 0; // No filter
    for (let x = 0; x < W; x++) {
      scanlines[lineStart + 1 + x] = pixels[y * W + x];
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 3; // Color type 3 (Indexed)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  const plteData = Buffer.alloc(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plteData[i * 3] = palette[i][0];
    plteData[i * 3 + 1] = palette[i][1];
    plteData[i * 3 + 2] = palette[i][2];
  }
  const plteChunk = makeChunk("PLTE", plteData);

  const idatChunk = makeChunk("IDAT", zlib.deflateSync(scanlines));
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  fs.writeFileSync(destPath, Buffer.concat([sig, ihdrChunk, plteChunk, idatChunk, iendChunk]));
}

export default convertToIndexedPng;


