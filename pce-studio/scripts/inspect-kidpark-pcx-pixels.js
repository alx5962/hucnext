const fs = require("fs");

const pcxPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\assets\\sprites\\kidPark_sc1.pcx";
const buf = fs.readFileSync(pcxPath);

// Header is 128 bytes
// RLE decode pixel bytes
const pixels = [];
let idx = 128;
while (idx < buf.length - 769) { // palette is last 768 bytes + 1 byte marker 0x0C
  const b = buf[idx++];
  if ((b & 0xC0) === 0xC0) {
    const count = b & 0x3F;
    const val = buf[idx++];
    for (let c = 0; c < count; c++) pixels.push(val);
  } else {
    pixels.push(b);
  }
}

console.log(`Decoded PCX pixel array length: ${pixels.length} (expected 512)`);

for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < 16; x++) {
    const p = pixels[y * 16 + x];
    line += p > 0 ? "#" : ".";
  }
  console.log(line);
}
