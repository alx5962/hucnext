const fs = require("fs");
const path = require("path");
const PNG = require("pngjs").PNG;

function convertPngToPcx(pngPath, pcxPath) {
  const data = fs.readFileSync(pngPath);
  const png = PNG.sync.read(data);
  const width = png.width;
  const height = png.height;

  // Build 256 color palette (16 colors mapped)
  const palette = new Uint8Array(768);
  const colorMap = new Map();
  let colorCount = 0;

  const pixels = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    if (a < 128) {
      pixels[i] = 0; // Index 0 = Transparent
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
    pixels[i] = colorMap.get(key);
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

  // RLE encode pixels
  const rleBuffer = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const val = pixels[y * width + x];
      let run = 1;
      while (x + run < width && pixels[y * width + x + run] === val && run < 63) {
        run++;
      }
      if (run > 1 || val >= 0xC0) {
        rleBuffer.push(0xC0 | run);
      }
      rleBuffer.push(val);
      x += run;
    }
  }

  const outBuf = Buffer.concat([
    header,
    Buffer.from(rleBuffer),
    Buffer.from([0x0C]), // Palette marker
    Buffer.from(palette)
  ]);

  fs.writeFileSync(pcxPath, outBuf);
  console.log(`Converted ${pngPath} (${width}x${height}) -> ${pcxPath} (${outBuf.length} bytes)`);
}

module.exports = { convertPngToPcx };

if (require.main === module) {
  const testPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\actor.png";
  const testPcx = path.resolve(__dirname, "../build_tmp/assets/sprites/actor.pcx");
  if (fs.existsSync(testPng)) {
    fs.mkdirSync(path.dirname(testPcx), { recursive: true });
    convertPngToPcx(testPng, testPcx);
  }
}
