const fs = require("fs");

const romPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.pce";
const rom = fs.readFileSync(romPath);

console.log(`ROM Size: ${rom.length} bytes`);

// Find where actor_sc1_spr is in ROM
// Tile 0 (Head) has non-zero pattern data
// Tile 1 (Body) has non-zero pattern data
