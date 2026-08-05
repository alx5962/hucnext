const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function checkDetails() {
  const sc1 = path.join(projectDir, "project/scenes/scene_1.gbsres");
  const sc2 = path.join(projectDir, "project/scenes/scene_2.gbsres");
  if (fs.existsSync(sc1)) {
    console.log("=== SCENE 1 ===");
    console.log(fs.readFileSync(sc1, "utf8"));
  }
  if (fs.existsSync(sc2)) {
    console.log("=== SCENE 2 ===");
    console.log(fs.readFileSync(sc2, "utf8"));
  }
}

checkDetails();
