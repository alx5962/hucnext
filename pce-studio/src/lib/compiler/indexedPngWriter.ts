import fs from "fs-extra";
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

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

/**
 * Read the raw PLTE palette from a PNG file without decoding pixels.
 * Returns null if the PNG is not indexed (color type 3).
 */
function readPngPalette(srcPath: string): { palette: [number, number, number][]; colorType: number } | null {
  const buf = fs.readFileSync(srcPath);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) return null;
  }
  let pos = 8;
  let colorType = -1;
  const palette: [number, number, number][] = [];
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.slice(pos, pos + 4).toString("ascii"); pos += 4;
    if (type === "IHDR") {
      colorType = buf[pos + 9];
    } else if (type === "PLTE") {
      for (let i = 0; i < len / 3; i++) {
        palette.push([buf[pos + i * 3], buf[pos + i * 3 + 1], buf[pos + i * 3 + 2]]);
      }
    } else if (type === "IEND") {
      break;
    }
    pos += len + 4;
  }
  return { palette, colorType };
}

function applyTilePaletteFixup(
  pixels: Uint8Array,
  W: number,
  H: number,
  palette: [number, number, number][],
  numSubPals: number
): void {
  const subPalSize = 16;
  for (let ty = 0; ty < H; ty += 8) {
    for (let tx = 0; tx < W; tx += 8) {
      const spCount = new Array<number>(numSubPals).fill(0);
      for (let dy = 0; dy < 8 && ty + dy < H; dy++) {
        for (let dx = 0; dx < 8 && tx + dx < W; dx++) {
          const idx = pixels[(ty + dy) * W + (tx + dx)];
          if ((idx & 0x0F) !== 0) spCount[idx >> 4]++;
        }
      }
      let dominantSp = 0;
      let maxCount = 0;
      for (let sp = 0; sp < numSubPals; sp++) {
        if (spCount[sp] > maxCount) { maxCount = spCount[sp]; dominantSp = sp; }
      }
      const hasConflict = spCount.some((c, sp) => sp !== dominantSp && c > 0);
      if (!hasConflict) continue;
      const domStart = dominantSp * subPalSize;
      const domEnd = Math.min(domStart + subPalSize, palette.length);
      for (let dy = 0; dy < 8 && ty + dy < H; dy++) {
        for (let dx = 0; dx < 8 && tx + dx < W; dx++) {
          const pi = (ty + dy) * W + (tx + dx);
          const idx = pixels[pi];
          if ((idx & 0x0F) === 0 || (idx >> 4) === dominantSp) continue;
          const [pr, pg, pb] = palette[idx];
          let bestLocal = -1;
          let minDiff = Infinity;
          for (let ci = domStart + 1; ci < domEnd; ci++) {
            const [cr, cg, cb] = palette[ci];
            const diff = colorDist(pr, pg, pb, cr, cg, cb);
            if (diff < minDiff) { minDiff = diff; bestLocal = ci; }
          }
          if (bestLocal < 0) bestLocal = (domStart + 1 < domEnd) ? (domStart + 1) : domStart;
          pixels[pi] = bestLocal;
        }
      }
    }
  }
}

/**
 * Apply transparent-slot fixup pass:
 * On PC Engine, index % 16 == 0 is the transparent slot of each sub-palette.
 * Any pixel with such an index shows the VCE backdrop color (typically black).
 * If the source image placed a content color at index % 16 == 0, we swap it
 * with the least-used non-zero slot in the same sub-palette and update pixel indices.
 */
function applyTransparentSlotFixup(pixels: Uint8Array, palette: [number, number, number][]): void {
  const numSubPals = Math.ceil(palette.length / 16);
  for (let sp = 0; sp < numSubPals; sp++) {
    const tSlot = sp * 16;
    const subUsage = new Array<number>(16).fill(0);
    for (let i = 0; i < pixels.length; i++) {
      const idx = pixels[i];
      if ((idx >> 4) === sp) subUsage[idx & 0x0F]++;
    }

    if (subUsage[0] > 0) {
      let swapPos = -1;
      let minUsage = Infinity;
      for (let pos = 1; pos < 16; pos++) {
        const absIdx = sp * 16 + pos;
        if (absIdx >= palette.length) {
          swapPos = pos;
          break;
        }
        if (subUsage[pos] < minUsage) {
          minUsage = subUsage[pos];
          swapPos = pos;
        }
      }

      if (swapPos >= 1) {
        const swapAbsIdx = sp * 16 + swapPos;
        while (palette.length <= swapAbsIdx) {
          palette.push([0, 0, 0]);
        }
        const tmp = palette[tSlot];
        palette[tSlot] = palette[swapAbsIdx];
        palette[swapAbsIdx] = tmp;

        for (let i = 0; i < pixels.length; i++) {
          if (pixels[i] === tSlot) pixels[i] = swapAbsIdx;
          else if (pixels[i] === swapAbsIdx) pixels[i] = tSlot;
        }
      }
    }
  }
}

export function writeIndexedPng(
  destPath: string,
  palette: [number, number, number][],
  pixels: Uint8Array,
  W: number,
  H: number
): void {
  const scanlines = Buffer.alloc(H * (W + 1));
  for (let y = 0; y < H; y++) {
    const lineStart = y * (W + 1);
    scanlines[lineStart] = 0;
    for (let x = 0; x < W; x++) {
      scanlines[lineStart + 1 + x] = pixels[y * W + x];
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 3;
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

export function createBlankIndexedPng(destPath: string, W = 256, H = 224): void {
  const palette: [number, number, number][] = [
    [0, 0, 0], [32, 32, 32], [64, 64, 64], [128, 128, 128]
  ];
  while (palette.length < 16) palette.push([0, 0, 0]);
  const pixels = new Uint8Array(W * H);
  writeIndexedPng(destPath, palette, pixels, W, H);
}

/**
 * Convert a PNG to an indexed PNG ready for HuC's #incchr / #incbat.
 *
 * IMPORTANT: If the source PNG is already an 8-bit indexed PNG with <= maxColors
 * palette entries, its palette is PRESERVED EXACTLY and pixels are re-mapped back
 * to original palette indices via exact color matching. This ensures the sub-palette
 * grouping set by the user is honored (sub-palette N = colors [N*16 .. N*16+15]).
 *
 * For Logo scenes (maxColors = 256), a per-tile palette fixup pass is always
 * applied to enforce the PC Engine hardware constraint: each 8x8 tile may only
 * use colors from ONE 16-color sub-palette.
 *
 * For non-indexed sources or sources exceeding maxColors, a full quantization
 * from true-color is performed.
 */
export function convertToIndexedPng(srcPath: string, destPath: string, maxColors: number = 16): void {
  const paletteLimit = Math.min(Math.max(maxColors, 1), 256);

  // Try to read the original PLTE from the source PNG
  const rawInfo = readPngPalette(srcPath);
  if (rawInfo && rawInfo.colorType === 3 && rawInfo.palette.length <= paletteLimit) {
    // Source is an indexed PNG with an acceptable number of colors.
    // Use pngjs to decode pixels (it handles all filter types correctly),
    // then re-map RGBA back to original palette indices by exact color match.
    const buf = fs.readFileSync(srcPath);
    const png = PNG.sync.read(buf);
    const W = png.width;
    const H = png.height;
    const palette = rawInfo.palette;

    // Build RGB -> palette index lookup from the ORIGINAL palette
    const colorMap = new Map<string, number>();
    for (let i = 0; i < palette.length; i++) {
      const [r, g, b] = palette[i];
      colorMap.set(`${r},${g},${b}`, i);
    }

    const pixels = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const srcIdx = (W * y + x) * 4;
        const r = png.data[srcIdx];
        const g = png.data[srcIdx + 1];
        const b = png.data[srcIdx + 2];
        const key = `${r},${g},${b}`;
        if (colorMap.has(key)) {
          pixels[y * W + x] = colorMap.get(key)!;
        } else {
          // Nearest color fallback (should rarely happen)
          let bestIdx = 0;
          let minDiff = Infinity;
          for (let i = 0; i < palette.length; i++) {
            const [pr, pg, pb] = palette[i];
            const diff = colorDist(r, g, b, pr, pg, pb);
            if (diff < minDiff) { minDiff = diff; bestIdx = i; }
          }
          pixels[y * W + x] = bestIdx;
        }
      }
    }

    // Apply transparent-slot fixup (move content colors away from index % 16 == 0)
    applyTransparentSlotFixup(pixels, palette);

    // Apply per-tile fixup for multi-palette mode (Logo scenes)
    if (paletteLimit > 16) {
      const numSubPals = Math.ceil(palette.length / 16);
      applyTilePaletteFixup(pixels, W, H, palette, numSubPals);
    }

    // Pad palette to at least 16 entries
    while (palette.length < Math.min(16, paletteLimit)) {
      palette.push([0, 0, 0]);
    }

    writeIndexedPng(destPath, palette, pixels, W, H);
    return;
  }

  // Slow path: quantize from true-color (RGBA) PNG
  const buf = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buf);
  const W = png.width;
  const H = png.height;
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

  // Apply transparent-slot fixup (move content colors away from index % 16 == 0)
  applyTransparentSlotFixup(pixels, palette);

  if (paletteLimit > 16) {
    const numSubPals = Math.ceil(paletteLimit / 16);
    applyTilePaletteFixup(pixels, W, H, palette, numSubPals);
  }

  while (palette.length < Math.min(16, paletteLimit)) {
    palette.push([0, 0, 0]);
  }

  writeIndexedPng(destPath, palette, pixels, W, H);
}

export default convertToIndexedPng;
