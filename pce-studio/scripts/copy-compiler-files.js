const fs = require("fs");
const path = require("path");

const srcFile = "C:/workspace/git/gb-studio/src/lib/compiler/compileData.ts";
const destFile = path.resolve(__dirname, "../src/lib/compiler/compileData.ts");

console.log(`Copying full compileData.ts from ${srcFile}...`);
fs.copyFileSync(srcFile, destFile);
console.log("compileData.ts copied successfully.");
