const fs = require("fs");
const Path = require("path");
const { PNG } = require("pngjs");

function convertPngToPcx(pngPath, pcxPath, cropOpts) {
  const data = fs.readFileSync(pngPath);
  const srcPng = PNG.sync.read(data);

  let cropX = cropOpts?.cropX ?? 0;
  let cropY = cropOpts?.cropY ?? 0;
  let width = cropOpts?.cropW ?? srcPng.width;
  let height = cropOpts?.cropH ?? srcPng.height;

  if (cropX + width > srcPng.width) width = srcPng.width - cropX;
  if (cropY + height > srcPng.height) height = srcPng.height - cropY;

  const bgR = srcPng.data[0];
  const bgG = srcPng.data[1];
  const bgB = srcPng.data[2];

  const palette = new Uint8Array(768);
  const colorMap = new Map();
  let colorCount = 0;

  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((cropY + y) * srcPng.width + (cropX + x)) * 4;
      let r = srcPng.data[srcIdx];
      let g = srcPng.data[srcIdx + 1];
      let b = srcPng.data[srcIdx + 2];
      const a = srcPng.data[srcIdx + 3];

      const dstIdx = y * width + x;

      const isTopLeftBg = Math.abs(r - bgR) <= 5 && Math.abs(g - bgG) <= 5 && Math.abs(b - bgB) <= 5;
      const isPureGreenScreen = r === 0 && g === 255 && b === 0;

      if (a < 128 || isTopLeftBg || isPureGreenScreen) {
        pixels[dstIdx] = 0;
        continue;
      }

      if (r < 170 && g > 150 && b < 140) {
        r = 226;
        g = 247;
        b = 210;
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
      pixels[dstIdx] = colorMap.get(key);
    }
  }

  const header = Buffer.alloc(128);
  header[0] = 0x0A;
  header[1] = 0x05;
  header[2] = 0x01;
  header[3] = 0x08;
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(width - 1, 8);
  header.writeUInt16LE(height - 1, 10);
  header.writeUInt16LE(320, 12);
  header.writeUInt16LE(200, 14);
  header[65] = 0x01;
  header.writeUInt16LE(width, 66);
  header.writeUInt16LE(1, 68);

  const rleBuffer = [];
  let i = 0;
  while (i < pixels.length) {
    let runLength = 1;
    const val = pixels[i];

    while (
      i + runLength < pixels.length &&
      pixels[i + runLength] === val &&
      runLength < 63 &&
      (i + runLength) % width !== 0
    ) {
      runLength++;
    }

    if (runLength > 1 || (val & 0xC0) === 0xC0) {
      rleBuffer.push(0xC0 | runLength);
    }
    rleBuffer.push(val);
    i += runLength;
  }

  const palMarker = Buffer.from([0x0C]);
  const outBuf = Buffer.concat([
    header,
    Buffer.from(rleBuffer),
    palMarker,
    Buffer.from(palette),
  ]);

  if (!fs.existsSync(Path.dirname(pcxPath))) {
    fs.mkdirSync(Path.dirname(pcxPath), { recursive: true });
  }
  fs.writeFileSync(pcxPath, outBuf);

  return { width, height };
}

module.exports = { convertPngToPcx };
