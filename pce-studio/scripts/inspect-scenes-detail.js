const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const sc1ActorFile = path.join(projectDir, "project/scenes/scene_1/actors/actor.gbsres");
const sc2ActorFile = path.join(projectDir, "project/scenes/scene_2/actors/actor.gbsres");
const spritesDir = path.join(projectDir, "assets/sprites");

const spritesMap = {};
fs.readdirSync(spritesDir).filter(f => f.endsWith(".gbsres")).forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(spritesDir, f), "utf8"));
  spritesMap[data.id] = data;
});

const sc1Actor = JSON.parse(fs.readFileSync(sc1ActorFile, "utf8"));
const sc2Actor = JSON.parse(fs.readFileSync(sc2ActorFile, "utf8"));

const spr1 = spritesMap[sc1Actor.spriteSheetId];
const spr2 = spritesMap[sc2Actor.spriteSheetId];

console.log("=== SCENE 1 ACTOR ===");
console.log(`Name=${sc1Actor.name}, x=${sc1Actor.x}, y=${sc1Actor.y}, spriteSheetId=${sc1Actor.spriteSheetId}, filename=${spr1 ? spr1.filename : "unknown"}`);
console.log(JSON.stringify(sc1Actor, null, 2));

console.log("=== SCENE 2 ACTOR ===");
console.log(`Name=${sc2Actor.name}, x=${sc2Actor.x}, y=${sc2Actor.y}, spriteSheetId=${sc2Actor.spriteSheetId}, filename=${spr2 ? spr2.filename : "unknown"}`);
console.log(JSON.stringify(sc2Actor, null, 2));
