const fs = require("fs");
const path = require("path");
const { convertPngToPcx } = require("../scripts/convert-png-to-pcx");

const buildDir = path.resolve(__dirname, "../build_tmp");

const srcBgPng = "C:\\workspace\\git\\hucnext\\examples\\huc\\shmup\\scene.png";
const destBgDir = path.join(buildDir, "assets/backgrounds");
fs.mkdirSync(destBgDir, { recursive: true });
fs.copyFileSync(srcBgPng, path.join(destBgDir, "scene.png"));

const srcSprPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\iso_hero.png";
const destSprDir = path.join(buildDir, "assets/sprites");
fs.mkdirSync(destSprDir, { recursive: true });

if (fs.existsSync(srcSprPng)) {
  const destPcx = path.join(destSprDir, "iso_hero.pcx");
  convertPngToPcx(srcSprPng, destPcx);
}

// Generate test scene_1_collisions.c with top wall (row 3) & bottom wall (row 18)
const collisions = new Array(32 * 28).fill(0);

// Row 3 top wall
for (let x = 0; x < 32; x++) {
  collisions[3 * 32 + x] = 15;
}
// Row 18 bottom wall
for (let x = 0; x < 32; x++) {
  collisions[18 * 32 + x] = 15;
}

const hexCollisions = collisions.map(c => `0x${c.toString(16).padStart(2, "0").toUpperCase()}`).join(", ");

const collisionsCContent = `#include "include/gbs_types.h"\n\nconst unsigned char scene_1_collisions[] = {\n  ${hexCollisions}\n};\n`;
fs.writeFileSync(path.join(buildDir, "scene_1_collisions.c"), collisionsCContent, "utf8");

console.log("Prepared scene_1_collisions.c in build_tmp");
