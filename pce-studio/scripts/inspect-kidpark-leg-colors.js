const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log("=== kidPark.png Leg Pixels (X=32..47, Y=16..31) ===");
for (let y = 16; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 32; x < 48; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    const isGreenScreen = g > 120 && g > r + 30 && g > b + 30;
    if (a < 128) {
      line += " [TRANS]";
    } else if (isGreenScreen) {
      line += " [CUT_GREEN]";
    } else {
      line += ` (${r},${g},${b})`;
    }
  }
  console.log(line);
}
