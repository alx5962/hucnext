const fs = require("fs");

const rom = fs.readFileSync("C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.pce");

// Bank 0x0A is at offset (0x0A * 8192) = 0x14000
// Address 0x56C8 in bank 0x0A (ROM offset = 0x14000 + (0x56C8 & 0x1FFF) = 0x14000 + 0x16C8 = 0x156C8)
const offset = 0x14000 + (0x56C8 & 0x1FFF);
const sprData = rom.slice(offset, offset + 256);

console.log(`=== DUMPING _actor_sc1_spr (Offset 0x${offset.toString(16)}, length ${sprData.length}) ===`);

console.log("--- TILE 0 (Words 0..63, Bytes 0..127) ---");
let nonZeroTile0 = 0;
for (let i = 0; i < 128; i++) {
  if (sprData[i] !== 0) nonZeroTile0++;
}
console.log(`Tile 0 Non-Zero Bytes: ${nonZeroTile0} / 128`);

console.log("--- TILE 1 (Words 64..127, Bytes 128..255) ---");
let nonZeroTile1 = 0;
for (let i = 128; i < 256; i++) {
  if (sprData[i] !== 0) nonZeroTile1++;
}
console.log(`Tile 1 Non-Zero Bytes: ${nonZeroTile1} / 128`);

// Print hex dump of Tile 0 vs Tile 1
console.log("Tile 0 First 16 bytes:", Array.from(sprData.slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join(" "));
console.log("Tile 1 First 16 bytes:", Array.from(sprData.slice(128, 144)).map(b => b.toString(16).padStart(2, "0")).join(" "));
