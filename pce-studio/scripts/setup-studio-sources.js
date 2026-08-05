const path = require("path");
const fs = require("fs");

const srcSource = path.resolve("C:/workspace/git/gb-studio/src");
const srcDest = path.resolve(__dirname, "../src");

const appDataSource = path.resolve("C:/workspace/git/gb-studio/appData");
const appDataDest = path.resolve(__dirname, "../appData");

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      const childSrc = path.join(src, childItemName);
      const childDest = path.join(dest, childItemName);
      // Skip overwriting custom pcevm engine and custom compiler files
      if (childSrc.includes("appData\\engine\\pcevm") || childSrc.includes("appData/engine/pcevm")) {
        return;
      }
      copyRecursiveSync(childSrc, childDest);
    });
  } else {
    // Only copy if destination file doesn't already exist to preserve custom PCE edits
    if (!fs.existsSync(dest)) {
      fs.cpSync(src, dest);
    }
  }
}

console.log("Copying studio source files...");
copyRecursiveSync(srcSource, srcDest);
copyRecursiveSync(appDataSource, appDataDest);

// Also copy tsconfig.json and other configs if missing
const configs = ["tsconfig.json", "tsconfig.scripts.json", "patrons.json", "contributors.json"];
configs.forEach(cfg => {
  const s = path.resolve("C:/workspace/git/gb-studio", cfg);
  const d = path.resolve(__dirname, "..", cfg);
  if (fs.existsSync(s) && !fs.existsSync(d)) {
    fs.cpSync(s, d);
  }
});

console.log("Studio source files setup complete!");
