const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== "build" && item !== "node_modules") {
        searchDir(fullPath);
      }
    } else if (item.endsWith(".gbsres") || item.endsWith(".gbsproj")) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("iso_hero") || content.includes("spriteSheets") || content.includes("spriteSheetId")) {
        console.log(`=== FOUND MATCH IN ${fullPath} ===`);
        console.log(content.substring(0, 500));
      }
    }
  }
}

searchDir(projectDir);
