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

export function buildPngPalette(pngPath: string): SharedSpritePalette {
  const data = fs.readFileSync(pngPath);
  const srcPng = PNG.sync.read(data);

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

export function convertPngToPcx(pngPath: string, pcxPath: string, cropOpts?: CropOptions) {
  const data = fs.readFileSync(pngPath);
  const srcPng = PNG.sync.read(data);

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

  return { width, height };
}
