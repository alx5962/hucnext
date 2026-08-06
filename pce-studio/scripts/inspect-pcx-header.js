const fs = require("fs");
const path = require("path");

const pcxPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\assets\\sprites\\kidPark_sc1.pcx";
const buf = fs.readFileSync(pcxPath);

console.log("=== kidPark_sc1.pcx HEADER ===");
console.log(`Manufacturer: 0x${buf[0].toString(16)} (expected 0x0A)`);
console.log(`Version: 0x${buf[1].toString(16)} (expected 0x05)`);
console.log(`Encoding: 0x${buf[2].toString(16)} (expected 0x01)`);
console.log(`BPP: ${buf[3]}`);
const xmin = buf.readUInt16LE(4);
const ymin = buf.readUInt16LE(6);
const xmax = buf.readUInt16LE(8);
const ymax = buf.readUInt16LE(10);
const width = xmax - xmin + 1;
const height = ymax - ymin + 1;
console.log(`Dimensions: ${width}x${height}`);
console.log(`BytesPerLine: ${buf.readUInt16LE(66)}`);
console.log(`Total File Size: ${buf.length} bytes`);
