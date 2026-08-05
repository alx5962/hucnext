const fs = require("fs");
const path = require("path");

function purgeStories(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".webpack") {
      continue;
    }
    if (entry.isDirectory()) {
      if (entry.name === "stories" || entry.name.includes("stories")) {
        console.log("Deleting directory:", fullPath);
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        purgeStories(fullPath);
      }
    } else if (entry.name.includes(".stories.")) {
      console.log("Deleting file:", fullPath);
      fs.rmSync(fullPath, { force: true });
    }
  }
}

const rootDir = path.resolve(__dirname, "..");
console.log("Purging all stories files and folders from:", rootDir);
purgeStories(rootDir);
console.log("Purge complete.");
