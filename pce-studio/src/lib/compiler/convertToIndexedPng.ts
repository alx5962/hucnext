import fs from "fs-extra";
import Path from "path";
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

  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
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

export function convertToIndexedPng(srcPath: string, destPath: string) {
  if (!fs.existsSync(srcPath)) return;
  const buf = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buf);

  // If already indexed with <= 16 colors, keep original
  if (png.colorType === 3 && png.palette && png.palette.length <= 16) {
    fs.ensureDirSync(Path.dirname(destPath));
    fs.writeFileSync(destPath, buf);
    return;
  }

  const palette: number[][] = [];
  const colorMap = new Map<string, number>();

  function getPaletteIndex(r: number, g: number, b: number): number {
    const key = `${r},${g},${b}`;
    if (colorMap.has(key)) return colorMap.get(key)!;

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

  const scanlines = Buffer.alloc(png.height * (png.width + 1));

  for (let y = 0; y < png.height; y++) {
    const lineStart = y * (png.width + 1);
    scanlines[lineStart] = 0;

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

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(png.width, 0);
  ihdrData.writeUInt32BE(png.height, 4);
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

  const idatCompressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk("IDAT", idatCompressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  const outPngBuf = Buffer.concat([sig, ihdrChunk, plteChunk, idatChunk, iendChunk]);
  fs.ensureDirSync(Path.dirname(destPath));
  fs.writeFileSync(destPath, outPngBuf);
}
