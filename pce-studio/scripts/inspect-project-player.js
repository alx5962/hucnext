const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function inspectProject() {
  const gbsProj = path.join(projectDir, "project.gbsproj");
  if (fs.existsSync(gbsProj)) {
    const data = JSON.parse(fs.readFileSync(gbsProj, "utf8"));
    console.log("=== PROJECT SETTINGS ===");
    console.log("settings:", JSON.stringify(data.settings, null, 2));
  }

  // Check scene 1
  const scene1Res = path.join(projectDir, "project/scenes/scene_1.gbsres");
  if (fs.existsSync(scene1Res)) {
    console.log("=== SCENE 1 RES ===");
    console.log(fs.readFileSync(scene1Res, "utf8"));
  }

  // Check actors in scene 1
  const actorsDir = path.join(projectDir, "project/scenes/scene_1/actors");
  if (fs.existsSync(actorsDir)) {
    const actorFiles = fs.readdirSync(actorsDir);
    console.log("=== SCENE 1 ACTORS ===");
    actorFiles.forEach(f => {
      console.log(`--- ${f} ---`);
      console.log(fs.readFileSync(path.join(actorsDir, f), "utf8"));
    });
  }

  // Check sprites
  const spritesDir = path.join(projectDir, "assets/sprites");
  if (fs.existsSync(spritesDir)) {
    console.log("=== SPRITES DIR ===");
    console.log(fs.readdirSync(spritesDir));
  }
}

inspectProject();
