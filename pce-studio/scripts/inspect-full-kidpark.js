const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log(`=== FULL kidPark.png (${png.width}x${png.height}) ===`);

for (let y = 0; y < png.height; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    // Background color in kidPark.png is around r=99, g=133, b=107
    const isBg = (Math.abs(r - 99) < 20 && Math.abs(g - 133) < 20 && Math.abs(b - 107) < 20) || a < 128;
    if (isBg) {
      line += ".";
    } else {
      line += "#";
    }
  }
  console.log(line);
}
