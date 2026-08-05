const fs = require("fs");
const path = require("path");

const tmpDir = path.resolve(__dirname, "../build_tmp");
if (fs.existsSync(tmpDir)) {
  const files = fs.readdirSync(tmpDir);
  console.log("=== Files in build_tmp ===");
  files.forEach(f => {
    if (f.includes("collision") || f.includes("scene")) {
      console.log(`- ${f}`);
    }
  });
}
