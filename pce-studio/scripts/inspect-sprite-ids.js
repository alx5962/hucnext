const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function checkSprites() {
  const settingsFile = path.join(projectDir, "project/settings.gbsres");
  if (fs.existsSync(settingsFile)) {
    console.log("=== SETTINGS.GBSRES ===");
    console.log(fs.readFileSync(settingsFile, "utf8"));
  }

  const spritesDir = path.join(projectDir, "assets/sprites");
  if (fs.existsSync(spritesDir)) {
    const files = fs.readdirSync(spritesDir);
    files.forEach(f => {
      if (f.endsWith(".gbsres")) {
        console.log(`=== ${f} ===`);
        console.log(fs.readFileSync(path.join(spritesDir, f), "utf8"));
      }
    });
  }
}

checkSprites();
