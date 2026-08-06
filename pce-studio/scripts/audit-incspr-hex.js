const fs = require("fs");
const path = require("path");

const romPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.pce";
const rom = fs.readFileSync(romPath);

// Look for actor_sc1_pal or actor_sc1_spr in main.lst / main.sym
const lstPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.lst";
const symPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.sym";

if (fs.existsSync(symPath)) {
  console.log("=== MAIN.SYM ===");
  const symText = fs.readFileSync(symPath, "utf8");
  symText.split("\n").filter(l => l.includes("actor_sc1")).forEach(l => console.log(l));
}

if (fs.existsSync(lstPath)) {
  console.log("=== MAIN.LST actor_sc1 ===");
  const lstText = fs.readFileSync(lstPath, "utf8");
  lstText.split("\n").filter(l => l.includes("actor_sc1")).forEach(l => console.log(l));
}
