const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const sc1File = path.join(projectDir, "assets/scenes/scene_1.gbsres");
const sc2File = path.join(projectDir, "assets/scenes/scene_2.gbsres");
const spritesDir = path.join(projectDir, "assets/sprites");

const spritesMap = {};
fs.readdirSync(spritesDir).filter(f => f.endsWith(".gbsres")).forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(spritesDir, f), "utf8"));
  spritesMap[data.id] = data;
});

const sc1 = JSON.parse(fs.readFileSync(sc1File, "utf8"));
const sc2 = JSON.parse(fs.readFileSync(sc2File, "utf8"));

console.log("=== SCENE 1 ACTORS ===");
sc1.actors.forEach((a, i) => {
  const spr = spritesMap[a.spriteSheetId];
  console.log(`Actor ${i}: name=${a.name}, x=${a.x}, y=${a.y}, sprite=${spr ? spr.filename : a.spriteSheetId}`);
});

console.log("=== SCENE 2 ACTORS ===");
sc2.actors.forEach((a, i) => {
  const spr = spritesMap[a.spriteSheetId];
  console.log(`Actor ${i}: name=${a.name}, x=${a.x}, y=${a.y}, sprite=${spr ? spr.filename : a.spriteSheetId}`);
});
