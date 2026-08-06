const fs = require("fs");
const path = require("path");

const buildDir = path.resolve(__dirname, "../build_tmp");
const mainCPath = path.join(buildDir, "main.c");
let content = fs.readFileSync(mainCPath, "utf8");

// Change actor 1 VRAM load in main.c to test tile pattern spacing
console.log("=== Testing Tile Pattern Spacing ===");
