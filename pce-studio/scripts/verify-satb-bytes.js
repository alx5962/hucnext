const fs = require("fs");
const path = require("path");

const lstPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.lst";
const mainSPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.s";

console.log("=== INSPECTING main.s FOR _actor_update_all ===");
const mainS = fs.readFileSync(mainSPath, "utf8");

const lines = mainS.split("\n");
let inProc = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("_actor_update_all")) {
    inProc = true;
  }
  if (inProc) {
    console.log(`${(i+1).toString().padStart(4, " ")}: ${lines[i]}`);
    if (lines[i].includes(".endp")) break;
  }
}
