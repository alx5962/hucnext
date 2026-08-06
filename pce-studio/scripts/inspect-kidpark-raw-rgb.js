const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log("=== kidPark.png RAW PIXELS FOR COLUMN 0 (X=0..15) ===");
for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < 16; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];

    if (r === 149 && g === 252 && b === 0) {
      line += ".";
    } else if (r === 9 && g === 18 && b === 25) {
      line += "B"; // Black
    } else if (r === 226 && g === 247 && b === 210) {
      line += "W"; // White/Cream
    } else {
      line += "?";
    }
  }
  console.log(line);
}
