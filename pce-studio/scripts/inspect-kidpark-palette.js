const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

const colorCounts = {};

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    const key = `(${r},${g},${b},a=${a})`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }
}

console.log("=== kidPark.png UNIQUE COLORS ===");
console.log(colorCounts);
