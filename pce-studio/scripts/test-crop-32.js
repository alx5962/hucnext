const fs = require("fs");
const { convertPngToPcx } = require("./convert-png-to-pcx.js");

const srcPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\kidPark.png";
const destPcx = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\assets\\sprites\\kidPark_sc1.pcx";

console.log("=== Testing convertPngToPcx with cropX = 32 ===");
convertPngToPcx(srcPng, destPcx, { cropX: 32, cropY: 0, cropW: 16, cropH: 32 });

const buf = fs.readFileSync(destPcx);
console.log(`PCX File size: ${buf.length} bytes`);

const pixels = [];
let idx = 128;
while (idx < buf.length - 769) {
  const b = buf[idx++];
  if ((b & 0xC0) === 0xC0) {
    const count = b & 0x3F;
    const val = buf[idx++];
    for (let c = 0; c < count; c++) pixels.push(val);
  } else {
    pixels.push(b);
  }
}

console.log(`Decoded PCX pixel length: ${pixels.length} (expected 512)`);
for (let y = 0; y < 32; y++) {
  let line = `Y=${y.toString().padStart(2, "0")}: `;
  for (let x = 0; x < 16; x++) {
    const p = pixels[y * 16 + x];
    line += p > 0 ? p.toString(16) : ".";
  }
  console.log(line);
}
