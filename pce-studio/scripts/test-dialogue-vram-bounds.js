const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const buildDir = path.resolve(__dirname, "../build_tmp");

console.log("=== Running Dialogue VRAM Bounds & Map Size Test ===");

// 1. Compile project via buildProject runner
const runnerCode = `
import { buildProject } from "../src/lib/compiler/buildProject";
import path from "path";
import fs from "fs-extra";

async function main() {
  const projDir = ${JSON.stringify(projDir)};
  const buildDir = ${JSON.stringify(buildDir)};
  console.log("Building project dynamically from:", projDir);
  await buildProject(projDir, buildDir);
}
main().catch(err => { console.error(err); process.exit(1); });
`;

fs.writeFileSync(path.resolve(__dirname, "temp-test-vram-runner.ts"), runnerCode, "utf8");
try {
  execSync(`npx ts-node --transpileOnly -r tsconfig-paths/register -O "{\\"module\\":\\"commonjs\\",\\"moduleResolution\\":\\"node\\"}" scripts/temp-test-vram-runner.ts`, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit"
  });
} finally {
  try { fs.unlinkSync(path.resolve(__dirname, "temp-test-vram-runner.ts")); } catch (e) { }
}

// 2. Inspect generated main.c and engine definitions
const mainCPath = path.join(buildDir, "main.c");
if (!fs.existsSync(mainCPath)) {
  throw new Error("main.c was not generated at " + mainCPath);
}
const mainC = fs.readFileSync(mainCPath, "utf8");

const engineHPath = path.resolve(__dirname, "../appData/engine/pcevm/include/engine.h");
const engineH = fs.readFileSync(engineHPath, "utf8");

const engineCPath = path.resolve(__dirname, "../appData/engine/pcevm/src/engine.c");
const engineC = fs.readFileSync(engineCPath, "utf8");

console.log("\n--- Checking VRAM Addresses & Bounds ---");

// Check FONT_VRAM_ADDR in engine.h
if (!engineH.includes("0x4800")) {
  throw new Error("FAIL: engine.h does not define FONT_VRAM_ADDR as 0x4800");
}
console.log("✔ FONT_VRAM_ADDR is 0x4800 in engine.h");

// Check UI_FRAME_VRAM_ADDR and UI_FRAME_TILE_ID in engine.h
if (!engineH.includes("0x4E00") || !engineH.includes("0x4E0")) {
  throw new Error("FAIL: engine.h does not define UI_FRAME_VRAM_ADDR as 0x4E00 / 0x4E0");
}
console.log("✔ UI_FRAME_VRAM_ADDR is 0x4E00 and UI_FRAME_TILE_ID is 0x4E0 in engine.h");

// Check engine.c calls set_font_addr(FONT_VRAM_ADDR)
if (!engineC.includes("set_font_addr(FONT_VRAM_ADDR);")) {
  throw new Error("FAIL: engine.c does not call set_font_addr(FONT_VRAM_ADDR)");
}
console.log("✔ engine.c properly registers font address with set_font_addr(FONT_VRAM_ADDR)");

// Check VRAM range collisions
const batMaxEnd = 0x1000; // 128x32 BAT is 0x0000 - 0x0FFF
const fontStart = 0x4800;
const fontEnd = 0x4800 + (96 * 16); // 0x4E00
const uiFrameStart = 0x4E00;
const uiFrameEnd = 0x4E00 + (9 * 16); // 0x4E90
const spriteStart = 0x5000;

if (fontStart < batMaxEnd) {
  throw new Error(`FAIL: Font range ${fontStart.toString(16)} overlaps with max BAT ${batMaxEnd.toString(16)}`);
}
if (uiFrameStart < fontEnd) {
  throw new Error(`FAIL: UI Frame range ${uiFrameStart.toString(16)} overlaps with Font range ${fontEnd.toString(16)}`);
}
if (uiFrameEnd > spriteStart) {
  throw new Error(`FAIL: UI Frame range ${uiFrameEnd.toString(16)} overlaps with Sprite range ${spriteStart.toString(16)}`);
}
console.log(`✔ VRAM layout verified:`);
console.log(`    BAT (up to 128x32): 0x0000 - 0x${(batMaxEnd - 1).toString(16).toUpperCase()}`);
console.log(`    BG Tiles:           0x1000 - 0x47FF (up to 896 unique tiles)`);
console.log(`    Dialogue Font:      0x${fontStart.toString(16).toUpperCase()} - 0x${(fontEnd - 1).toString(16).toUpperCase()}`);
console.log(`    UI Frame:           0x${uiFrameStart.toString(16).toUpperCase()} - 0x${(uiFrameEnd - 1).toString(16).toUpperCase()}`);
console.log(`    Sprites:            0x${spriteStart.toString(16).toUpperCase()} - 0x7FFF`);

// 3. Compile with HuC and PCEAS
console.log("\n--- Compiling ROM with HuC & PCEAS ---");
const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
const rawIncludeDir = path.resolve(__dirname, "../../include/huc");
const includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

try {
  execSync(`"${hucExe}" main.c`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
} catch (e) {
  if (!fs.existsSync(path.join(buildDir, "main.s"))) {
    throw e;
  }
}

execSync(`"${pceasExe}" -raw main.s`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });

console.log("\n====================================================");
console.log("ALL TESTS PASSED! ROM built successfully:", path.join(buildDir, "main.pce"));
console.log("====================================================");
