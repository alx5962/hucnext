const fs = require("fs");

const rom = fs.readFileSync("C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.pce");
const offset = 0x14000 + (0x56C8 & 0x1FFF);
const sprData = rom.slice(offset, offset + 256);

// PC Engine VRAM sprite tiles are 4-plane bitplanes (16x16 pixels per tile = 128 bytes)
// Each 16x16 tile consists of four 8x8 blocks in order:
// Block 0: Top-Left 8x8 (bytes 0..31)
// Block 1: Top-Right 8x8 (bytes 32..63)
// Block 2: Bottom-Left 8x8 (bytes 64..95)
// Block 3: Bottom-Right 8x8 (bytes 96..127)

function decodeTile(tileBytes) {
  const grid = Array(16).fill(0).map(() => Array(16).fill(0));

  for (let b = 0; b < 4; b++) {
    const blockOffset = b * 32;
    const startX = (b % 2) * 8;
    const startY = Math.floor(b / 2) * 8;

    for (let y = 0; y < 8; y++) {
      const p0 = tileBytes[blockOffset + y * 2];
      const p1 = tileBytes[blockOffset + y * 2 + 1];
      const p2 = tileBytes[blockOffset + 16 + y * 2];
      const p3 = tileBytes[blockOffset + 16 + y * 2 + 1];

      for (let x = 0; x < 8; x++) {
        const bit = 7 - x;
        const color =
          (((p0 >> bit) & 1) << 0) |
          (((p1 >> bit) & 1) << 1) |
          (((p2 >> bit) & 1) << 2) |
          (((p3 >> bit) & 1) << 3);
        grid[startY + y][startX + x] = color;
      }
    }
  }
  return grid;
}

const tile0Grid = decodeTile(sprData.slice(0, 128));
const tile1Grid = decodeTile(sprData.slice(128, 256));

console.log("=== TILE 0 (HEAD) DECODED VRAM PIXELS ===");
for (let y = 0; y < 16; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < 16; x++) {
    const c = tile0Grid[y][x];
    line += c > 0 ? c.toString(16) : ".";
  }
  console.log(line);
}

console.log("\n=== TILE 1 (BODY & LEGS) DECODED VRAM PIXELS ===");
for (let y = 0; y < 16; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < 16; x++) {
    const c = tile1Grid[y][x];
    line += c > 0 ? c.toString(16) : ".";
  }
  console.log(line);
}
