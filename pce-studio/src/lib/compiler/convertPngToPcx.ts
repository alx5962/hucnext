import fs from "fs-extra";
import Path from "path";
import { PNG } from "pngjs";

export type CropOptions = {
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  flipX?: boolean;
  sharedPalette?: Uint8Array;
  sharedColorMap?: Map<string, number>;
  padWidthTo?: number;
};

export interface SharedSpritePalette {
  palette: Uint8Array;
  colorMap: Map<string, number>;
}

export function buildPngPalette(pngInput: string | PNG): SharedSpritePalette {
  const srcPng = typeof pngInput === "string" ? PNG.sync.read(fs.readFileSync(pngInput)) : pngInput;

  const palette = new Uint8Array(768);
  const colorMap = new Map<string, number>();
  let colorCount = 0;

  for (let y = 0; y < srcPng.height; y++) {
    for (let x = 0; x < srcPng.width; x++) {
      const srcIdx = (y * srcPng.width + x) * 4;
      const r = srcPng.data[srcIdx];
      const g = srcPng.data[srcIdx + 1];
      const b = srcPng.data[srcIdx + 2];
      const a = srcPng.data[srcIdx + 3];

      const isLimeGreen = g > 240 && r < 180 && b < 50;
      const isMagenta = r > 200 && b > 200 && g < 50;

      if (a < 128 || isLimeGreen || isMagenta) {
        continue;
      }

      const key = `${r},${g},${b}`;
      if (!colorMap.has(key)) {
        if (colorCount < 15) {
          colorCount++;
          colorMap.set(key, colorCount);
          palette[colorCount * 3] = r;
          palette[colorCount * 3 + 1] = g;
          palette[colorCount * 3 + 2] = b;
        } else {
          colorMap.set(key, 15);
        }
      }
    }
  }

  return { palette, colorMap };
}

export function compositeMetaspriteFrame(
  srcPngInput: string | PNG,
  frame: any,
  canvasW: number,
  canvasH: number,
  padWidthTo?: number,
  padHeightTo?: number,
  flipX?: boolean,
  spriteMode?: string
): PNG {
  const srcPng = typeof srcPngInput === "string" ? PNG.sync.read(fs.readFileSync(srcPngInput)) : srcPngInput;
  const dstW = padWidthTo || canvasW;
  const dstH = padHeightTo || canvasH;
  const dstPng = new PNG({ width: dstW, height: dstH });
  for (let i = 0; i < dstPng.data.length; i += 4) {
    dstPng.data[i] = 0;
    dstPng.data[i + 1] = 0;
    dstPng.data[i + 2] = 0;
    dstPng.data[i + 3] = 0;
  }

  const tiles = frame?.tiles || [];
  const is8x8 = (spriteMode === "8x8") || (!spriteMode && tiles.some((t: any) => (t.sliceY % 16 !== 0) || ((t.y || 0) % 16 !== 0)));
  const tileW = 8;
  const tileH = is8x8 ? 8 : 16;

  const originX = Math.max(0, Math.floor(canvasW / 2 - tileW));
  const originY = canvasH - tileH;

  for (const t of tiles) {
    if (typeof t.sliceX !== "number" || typeof t.sliceY !== "number") continue;
    const isTileFlipX = !!t.flipX;
    const isTileFlipY = !!t.flipY;

    let drawX = originX + (t.x || 0);
    if (flipX) {
      drawX = canvasW - (originX + (t.x || 0) + tileW);
    }
    const drawY = originY - (t.y || 0);

    const effectiveFlipX = flipX ? !isTileFlipX : isTileFlipX;
    const effectiveFlipY = isTileFlipY;

    for (let ty = 0; ty < tileH; ty++) {
      for (let tx = 0; tx < tileW; tx++) {
        const sx = t.sliceX + (effectiveFlipX ? (tileW - 1 - tx) : tx);
        const sy = t.sliceY + (effectiveFlipY ? (tileH - 1 - ty) : ty);
        const dx = drawX + tx;
        const dy = drawY + ty;

        if (
          sx >= 0 && sx < srcPng.width &&
          sy >= 0 && sy < srcPng.height &&
          dx >= 0 && dx < dstW &&
          dy >= 0 && dy < dstH
        ) {
          const sIdx = (sy * srcPng.width + sx) * 4;
          const dIdx = (dy * dstW + dx) * 4;
          const a = srcPng.data[sIdx + 3];
          const r = srcPng.data[sIdx];
          const g = srcPng.data[sIdx + 1];
          const b = srcPng.data[sIdx + 2];
          const isLimeGreen = g > 240 && r < 180 && b < 50;
          const isMagenta = r > 200 && b > 200 && g < 50;

          if (a >= 128 && !isLimeGreen && !isMagenta) {
            dstPng.data[dIdx] = r;
            dstPng.data[dIdx + 1] = g;
            dstPng.data[dIdx + 2] = b;
            dstPng.data[dIdx + 3] = 255;
          }
        }
      }
    }
  }
  return dstPng;
}

export function convertPngToPcx(pngInput: string | PNG, pcxPath: string, cropOpts?: CropOptions) {
  const srcPng = typeof pngInput === "string" ? PNG.sync.read(fs.readFileSync(pngInput)) : pngInput;

  let cropX = cropOpts?.cropX ?? 0;
  let cropY = cropOpts?.cropY ?? 0;
  let srcW = cropOpts?.cropW ?? srcPng.width;
  let height = cropOpts?.cropH ?? srcPng.height;
  let width = cropOpts?.padWidthTo ?? srcW;

  const palette = cropOpts?.sharedPalette || new Uint8Array(768);
  const colorMap = cropOpts?.sharedColorMap || new Map<string, number>();
  let colorCount = colorMap.size;

  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = y * width + x;

      if (x >= srcW) {
        pixels[dstIdx] = 0; // Transparent horizontal padding
        continue;
      }

      const srcX = cropOpts?.flipX ? (srcW - 1 - x) : x;
      const realX = cropX + srcX;
      const realY = cropY + y;

      if (realX >= srcPng.width || realY >= srcPng.height) {
        pixels[dstIdx] = 0; // Transparent padding
        continue;
      }

      const srcIdx = (realY * srcPng.width + realX) * 4;
      const r = srcPng.data[srcIdx];
      const g = srcPng.data[srcIdx + 1];
      const b = srcPng.data[srcIdx + 2];
      const a = srcPng.data[srcIdx + 3];

      const isLimeGreen = g > 240 && r < 180 && b < 50;
      const isMagenta = r > 200 && b > 200 && g < 50;

      if (a < 128 || isLimeGreen || isMagenta) {
        pixels[dstIdx] = 0; // Index 0 = Transparent
        continue;
      }

      const key = `${r},${g},${b}`;
      if (!colorMap.has(key)) {
        if (colorCount < 15) {
          colorCount++;
          colorMap.set(key, colorCount);
          palette[colorCount * 3] = r;
          palette[colorCount * 3 + 1] = g;
          palette[colorCount * 3 + 2] = b;
        } else {
          colorMap.set(key, 15);
        }
      }
      pixels[dstIdx] = colorMap.get(key)!;
    }
  }

  let minPixelX = width;
  let maxPixelX = -1;
  let minPixelY = height;
  let maxPixelY = -1;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (pixels[py * width + px] > 0) {
        if (px < minPixelX) minPixelX = px;
        if (px > maxPixelX) maxPixelX = px;
        if (py < minPixelY) minPixelY = py;
        if (py > maxPixelY) maxPixelY = py;
      }
    }
  }

  // Build 128-byte PCX Header
  const header = Buffer.alloc(128);
  header[0] = 0x0A; // PCX ID
  header[1] = 0x05; // Version 3.0
  header[2] = 0x01; // RLE encoding
  header[3] = 0x08; // 8 bpp
  header.writeUInt16LE(0, 4); // Xmin
  header.writeUInt16LE(0, 6); // Ymin
  header.writeUInt16LE(width - 1, 8); // Xmax
  header.writeUInt16LE(height - 1, 10); // Ymax
  header.writeUInt16LE(320, 12); // HDPI
  header.writeUInt16LE(200, 14); // VDPI
  header[65] = 0x01; // 1 plane
  header.writeUInt16LE(width, 66); // Bytes per line
  header.writeUInt16LE(1, 68); // Palette info

  // RLE Encode pixel data
  const rleBuffer: number[] = [];
  let i = 0;
  while (i < pixels.length) {
    let runLength = 1;
    const val = pixels[i];

    while (
      i + runLength < pixels.length &&
      pixels[i + runLength] === val &&
      runLength < 63 &&
      (i + runLength) % width !== 0 // Don't run across scanlines
    ) {
      runLength++;
    }

    if (runLength > 1 || (val & 0xC0) === 0xC0) {
      rleBuffer.push(0xC0 | runLength);
    }
    rleBuffer.push(val);
    i += runLength;
  }

  // 256-color palette marker
  const palMarker = Buffer.from([0x0C]);

  const outBuf = Buffer.concat([
    header,
    Buffer.from(rleBuffer),
    palMarker,
    Buffer.from(palette),
  ]);

  fs.ensureDirSync(Path.dirname(pcxPath));
  fs.writeFileSync(pcxPath, outBuf);

  return { width, height, minPixelX, maxPixelX, minPixelY, maxPixelY };
}
