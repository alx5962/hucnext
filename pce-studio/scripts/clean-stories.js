const fs = require("fs");
const path = require("path");

function removeStories(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item === "stories") {
        console.log(`Removing directory: ${fullPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        removeStories(fullPath);
      }
    } else if (item.endsWith(".stories.tsx") || item.endsWith(".stories.ts") || item.endsWith(".stories.jsx") || item.endsWith(".stories.js")) {
      console.log(`Removing file: ${fullPath}`);
      fs.rmSync(fullPath, { force: true });
    }
  }
}

const srcDir = path.resolve(__dirname, "../src");
console.log("Cleaning all storybook files from src...");
removeStories(srcDir);
console.log("Storybook clean complete.");
