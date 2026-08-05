const fs = require("fs");
const path = require("path");

const buildTmp = path.resolve(__dirname, "../build_tmp");
if (fs.existsSync(buildTmp)) {
  const files = fs.readdirSync(buildTmp);
  console.log("=== FILES IN BUILD OUTPUT ===");
  console.log(files.filter(f => f.endsWith(".c") || f.endsWith(".h") || f.endsWith(".s")));
} else {
  console.log("build_tmp directory not found");
}
