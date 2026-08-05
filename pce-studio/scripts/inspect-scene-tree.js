const fs = require("fs");
const path = require("path");

const projectDir = "C:\\Users\\alx59\\Documents\\PCEtest1";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith(".gbsres")) {
      results.push(full);
    }
  });
  return results;
}

const gbsresFiles = walk(path.join(projectDir, "project/scenes"));
gbsresFiles.forEach(f => {
  console.log(`=== ${path.relative(projectDir, f)} ===`);
  console.log(fs.readFileSync(f, "utf8"));
});
