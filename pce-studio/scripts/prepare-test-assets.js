const fs = require("fs");
const path = require("path");
const { convertPngToPcx } = require("../scripts/convert-png-to-pcx");

const srcBgPng = "C:\\workspace\\git\\hucnext\\examples\\huc\\shmup\\scene.png";
const destBgDir = path.resolve(__dirname, "../build_tmp/assets/backgrounds");
fs.mkdirSync(destBgDir, { recursive: true });
fs.copyFileSync(srcBgPng, path.join(destBgDir, "scene.png"));

const srcSprPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\iso_hero.png";
const destSprDir = path.resolve(__dirname, "../build_tmp/assets/sprites");
fs.mkdirSync(destSprDir, { recursive: true });

if (fs.existsSync(srcSprPng)) {
  const destPcx = path.join(destSprDir, "iso_hero.pcx");
  const dims = convertPngToPcx(srcSprPng, destPcx);
  console.log(`Converted iso_hero.png to iso_hero.pcx (${dims.width}x${dims.height})`);
}
