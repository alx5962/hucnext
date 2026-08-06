const fs = require("fs");
const path = require("path");

const gbsFile = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png.gbsres";
const data = JSON.parse(fs.readFileSync(gbsFile, "utf8"));
console.log("=== kidPark.png.gbsres ===");
console.log(`canvasWidth=${data.canvasWidth}, canvasHeight=${data.canvasHeight}`);
console.log(JSON.stringify(data, null, 2));
