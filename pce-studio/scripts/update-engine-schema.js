const fs = require("fs");
const path = require("path");

const srcEngineJson = "C:/workspace/git/gb-studio/appData/engine/engine.json";
const destEngineJson = path.resolve(__dirname, "../appData/engine/engine.json");

console.log("Copying full engine.json schema...");
fs.copyFileSync(srcEngineJson, destEngineJson);
console.log("engine.json updated successfully.");
