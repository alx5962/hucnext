const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const bg2Path = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\backgrounds\\scene2.png";

if (fs.existsSync(bg2Path)) {
  const buf = fs.readFileSync(bg2Path);
  const png = PNG.sync.read(buf);
  console.log("Scene 2 PNG Info:");
  console.log(`Dimensions: ${png.width}x${png.height}`);
  console.log(`ColorType: ${png.colorType}`);
  console.log(`Palette entries: ${png.palette ? png.palette.length : 0}`);
} else {
  console.log("scene2.png not found at", bg2Path);
}
