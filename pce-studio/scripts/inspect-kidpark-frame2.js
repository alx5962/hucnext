const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log("=== kidPark.png FRAME 2 (X=32..47, Right Direction) ===");

for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 32; x < 48; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    const isBg = Math.abs(r - 149) < 10 && Math.abs(g - 252) < 10 && Math.abs(b - 0) < 10;
    if (isBg || a < 128) {
      line += ".";
    } else {
      line += "#";
    }
  }
  console.log(line);
}
