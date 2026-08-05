const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function inspectScenes() {
  const scenesDir = path.join(projectDir, "project/scenes");
  if (fs.existsSync(scenesDir)) {
    const files = fs.readdirSync(scenesDir);
    console.log("=== SCENES DIR ===");
    console.log(files);

    files.forEach(f => {
      if (f.endsWith(".gbsres")) {
        console.log(`=== ${f} ===`);
        console.log(fs.readFileSync(path.join(scenesDir, f), "utf8"));
      }
    });
  }

  const bgDir = path.join(projectDir, "assets/backgrounds");
  if (fs.existsSync(bgDir)) {
    console.log("=== BACKGROUNDS DIR ===");
    console.log(fs.readdirSync(bgDir));
  }
}

inspectScenes();
