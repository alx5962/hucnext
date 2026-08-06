const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith(".gbsres")) {
      results.push(fullPath);
    }
  });
  return results;
}

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
console.log("=== ALL .GBSRES FILES IN PROJECT ===");
console.log(walk(projectDir));
