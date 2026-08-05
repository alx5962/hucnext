const fs = require("fs");
const path = require("path");

const tmpDir = "C:\\Users\\alx59\\AppData\\Local\\Temp\\_pcebuild";
if (fs.existsSync(tmpDir)) {
  const files = fs.readdirSync(tmpDir);
  console.log("=== COMPILED FILES IN TMP ===");
  console.log(files.filter(f => f.endsWith(".c") || f.endsWith(".h")));

  for (const f of files) {
    if (f.startsWith("tilemap_") || f.startsWith("tileset_") || f.startsWith("palette_")) {
      const content = fs.readFileSync(path.join(tmpDir, f), "utf8");
      const lines = content.split("\n").filter(l => l.includes("const unsigned"));
      console.log(`\n--- ${f} ---`);
      console.log(lines.slice(0, 3).join("\n"));
    }
  }
} else {
  console.log("Tmp dir not found:", tmpDir);
}
