const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

function convertToIndexedPng(srcPath, destPath) {
  const buf = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buf);

  if (png.colorType === 3 && png.palette && png.palette.length <= 16) {
    fs.writeFileSync(destPath, buf);
    return;
  }

  // Extract unique RGB colors (max 16)
  const palette = [];
  const colorMap = new Map();

  function getPaletteIndex(r, g, b) {
    const key = `${r},${g},${b}`;
    if (colorMap.has(key)) return colorMap.get(key);

    if (palette.length < 16) {
      const idx = palette.length;
      palette.push([r, g, b, 255]);
      colorMap.set(key, idx);
      return idx;
    }

    // Nearest color match if > 16 colors
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

  const indexedData = Buffer.alloc(png.width * png.height);

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const palIdx = getPaletteIndex(r, g, b);
      indexedData[png.width * y + x] = palIdx;
    }
  }

  // Fill up palette to 16 entries if needed
  while (palette.length < 16) {
    palette.push([0, 0, 0, 255]);
  }

  const outPng = new PNG({
    width: png.width,
    height: png.height,
    colorType: 3, // Indexed
    inputHasAlpha: false
  });
  outPng.palette = palette;
  outPng.data = indexedData;

  const outBuf = PNG.sync.write(outPng);
  fs.writeFileSync(destPath, outBuf);
  console.log(`Converted ${path.basename(srcPath)} -> ${path.basename(destPath)} (${palette.length} colors indexed)`);
}

module.exports = { convertToIndexedPng };

if (require.main === module) {
  const bg2Path = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\backgrounds\\scene2.png";
  const outPath = path.resolve(__dirname, "../build_tmp/assets/backgrounds/scene2.png");
  convertToIndexedPng(bg2Path, outPath);
}
