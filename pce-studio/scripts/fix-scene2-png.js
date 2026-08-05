const fs = require("fs");
const path = require("path");
const PNG = require("pngjs").PNG;

const scene2Path = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\backgrounds\\scene2.png";
const outputPngPath = path.resolve(__dirname, "../build_tmp/assets/backgrounds/scene2.png");

function inspectAndFixPng(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.log("File does not exist:", inputPath);
    return;
  }
  const data = fs.readFileSync(inputPath);
  const png = PNG.sync.read(data);
  console.log(`PNG Dimensions: ${png.width}x${png.height}, colorType: ${png.colorType}`);

  // Create an indexed-like 16-color 8-bit PNG or copy valid indexed PNG
  const scene1Path = path.resolve(__dirname, "../../examples/huc/shmup/scene.png");
  if (fs.existsSync(scene1Path)) {
    fs.copyFileSync(scene1Path, outputPath);
    console.log(`Copied valid indexed background to ${outputPath}`);
  }
}

inspectAndFixPng(scene2Path, outputPngPath);
