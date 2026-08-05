const fs = require("fs");
const path = require("path");

const projectPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\project.gbsres";
if (fs.existsSync(projectPath)) {
  const data = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  console.log("=== PROJECT SETTINGS & SCENES ===");
  console.log("Scenes count:", data.scenes?.length);
  console.log("Backgrounds count:", data.backgrounds?.length);
  if (data.backgrounds) {
    console.log("Backgrounds:", JSON.stringify(data.backgrounds, null, 2));
  }
} else {
  console.log("Project file not found at:", projectPath);
}
