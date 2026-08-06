const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log(`PNG size: ${png.width}x${png.height}`);

for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 32; x < 48; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    if (a < 128 || (g > 170 && r < 160 && b < 160)) {
      line += ".";
    } else {
      line += "#";
    }
  }
  console.log(line);
}
