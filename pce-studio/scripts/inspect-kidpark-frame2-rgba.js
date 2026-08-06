const fs = require("fs");
const { PNG } = require("pngjs");

const pngPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const data = fs.readFileSync(pngPath);
const png = PNG.sync.read(data);

console.log("=== kidPark.png FRAME 2 (X=32..47) RGBA VALUES ===");

for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 32; x < 48; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    const str = `${r},${g},${b},${a}`;

    if (a < 128 || (r === 149 && g === 252 && b === 0)) {
      line += " . ";
    } else {
      line += " X ";
    }
  }
  console.log(line);
}
