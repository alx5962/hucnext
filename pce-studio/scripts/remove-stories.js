const fs = require("fs");
const path = require("path");

const storiesDir = path.resolve(__dirname, "../src/stories");
if (fs.existsSync(storiesDir)) {
  console.log("Removing src/stories folder...");
  fs.rmSync(storiesDir, { recursive: true, force: true });
  console.log("src/stories removed.");
}
