const fs = require("fs");

const projPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\project.gbsproj";
const proj = JSON.parse(fs.readFileSync(projPath, "utf8"));

console.log("=== SPRITES IN project.gbsproj ===");
proj.sprites.forEach(s => {
  console.log(`ID: ${s.id}, Name: ${s.name}, Filename: ${s.filename}, canvasWidth: ${s.canvasWidth}, canvasHeight: ${s.canvasHeight}, boundsWidth: ${s.boundsWidth}, boundsHeight: ${s.boundsHeight}`);
});
