const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const kidParkRes = path.join(projectDir, "assets/sprites/kidPark.png.gbsres");

if (fs.existsSync(kidParkRes)) {
  const data = JSON.parse(fs.readFileSync(kidParkRes, "utf8"));
  console.log("=== KIDPARK.PNG.GBSRES ===");
  console.log(JSON.stringify(data, null, 2));
}
