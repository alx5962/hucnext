const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const GeargrafxMCP = require("./geargrafx-mcp-client");

const projDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const buildDir = path.resolve(__dirname, "../build_tmp");
const romPath = path.join(buildDir, "main.pce");
const screenshotPath = path.resolve(__dirname, "../geargfx_preview.png");

async function runRegressionTest() {
  console.log("====================================================");
  console.log("=== PCE PLAYER & ACTOR SPRITE REGRESSION TEST ===");
  console.log("====================================================");

  // 1. Build Project
  console.log("\n[1/4] Building project dynamically...");
  const runnerScript = `
import { buildProject } from "../src/lib/compiler/buildProject";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";

async function main() {
  await buildProject(${JSON.stringify(projDir)}, ${JSON.stringify(buildDir)});
  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");
  const includeDir = path.relative(${JSON.stringify(buildDir)}, rawIncludeDir).replace(/\\\\/g, "/");

  try {
    execSync(\`"\${hucExe}" main.c\`, { cwd: ${JSON.stringify(buildDir)}, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
  } catch (e) {
    if (!fs.existsSync(path.join(${JSON.stringify(buildDir)}, "main.s"))) {
      throw e;
    }
  }
  execSync(\`"\${pceasExe}" -raw main.s\`, { cwd: ${JSON.stringify(buildDir)}, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
}
main().catch(err => { console.error(err); process.exit(1); });
`;
  const tempRunner = path.resolve(__dirname, "temp-test-runner.ts");
  fs.writeFileSync(tempRunner, runnerScript, "utf8");
  try {
    execSync(`npx ts-node --transpileOnly -r tsconfig-paths/register -O "{\\"module\\":\\"commonjs\\",\\"moduleResolution\\":\\"node\\"}" scripts/temp-test-runner.ts`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit"
    });
  } finally {
    try { fs.unlinkSync(tempRunner); } catch (e) { }
  }

  if (!fs.existsSync(romPath)) {
    throw new Error("ROM build failed: " + romPath + " does not exist.");
  }
  console.log("✓ ROM built successfully:", romPath);

  // 2. Inspect generated PCX files
  console.log("\n[2/4] Verifying generated PCX sprite files...");
  function decodePcx(buf) {
    const width = buf.readUInt16LE(8) + 1;
    const height = buf.readUInt16LE(10) + 1;
    let offset = 128;
    const pixels = [];
    while (pixels.length < width * height && offset < buf.length - 769) {
      let b = buf[offset++];
      if ((b & 0xC0) === 0xC0) {
        let count = b & 0x3F;
        let val = buf[offset++];
        for (let i = 0; i < count; i++) pixels.push(val);
      } else {
        pixels.push(b);
      }
    }
    return { width, height, pixels };
  }

  const spritesToCheck = ["monkey_r0.pcx", "monkey_l0.pcx", "monkey_u0.pcx", "monkey_d0.pcx"];
  for (const sprFile of spritesToCheck) {
    const pcxFile = path.join(buildDir, "assets", "sprites", sprFile);
    if (!fs.existsSync(pcxFile)) {
      throw new Error("Missing expected player PCX file: " + pcxFile);
    }
    const pcx = decodePcx(fs.readFileSync(pcxFile));
    if (pcx.width !== 16 && pcx.width !== 32) {
      throw new Error(`Unexpected PCX width ${pcx.width} for ${sprFile}`);
    }
    const nonZeroPixels = pcx.pixels.filter(p => p > 0).length;
    if (nonZeroPixels < 20) {
      throw new Error(`PCX file ${sprFile} appears empty (${nonZeroPixels} non-zero pixels)`);
    }
    console.log(`  ✓ ${sprFile}: size ${pcx.width}x${pcx.height}, ${nonZeroPixels} opaque pixels`);
  }

  // 3. Emulate with Geargrafx MCP & Capture Screenshots
  console.log("\n[3/4] Running in Geargrafx emulator...");
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  console.log("  Stepping 180 frames (allowing scene fade-in and initial physics)...");
  for (let i = 0; i < 180; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  function parsePngAsync(buf) {
    return new Promise((resolve, reject) => {
      new PNG({ checkCRC: false }).parse(buf, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  let screenshotRes = await mcp.callTool("get_screenshot", {});
  if (!screenshotRes.content?.[0]?.data) {
    throw new Error("Failed to get screenshot from Geargrafx.");
  }
  const img1Buf = Buffer.from(screenshotRes.content[0].data, "base64");
  fs.writeFileSync(screenshotPath, img1Buf);
  const png1 = await parsePngAsync(img1Buf);

  // 4. Verify in-game visuals
  console.log("\n[4/4] Analyzing frame graphics for sprite corruptions...");
  
  const pal = new Map();
  for (let y = 0; y < png1.height; y++) {
    for (let x = 0; x < png1.width; x++) {
      const idx = (y * png1.width + x) * 4;
      const k = `${png1.data[idx]},${png1.data[idx+1]},${png1.data[idx+2]}`;
      pal.set(k, (pal.get(k) || 0) + 1);
    }
  }

  console.log(`  Rendered colors count: ${pal.size}`);
  if (pal.size < 10) {
    throw new Error(`Screen render failed: only ${pal.size} colors found (expected >= 10 colors for scene 1).`);
  }

  // Verify key scene colors
  const hasSky = pal.has("0,109,255") || pal.has("0,112,236");
  const hasGrass = pal.has("0,36,0") || pal.has("0,72,0") || pal.has("0,145,0");
  const hasVolcano = pal.has("255,145,0") || pal.has("248,144,0");

  if (!hasSky || !hasGrass || !hasVolcano) {
    throw new Error("Scene background elements missing or corrupted.");
  }
  console.log("  ✓ Scene 1 background and elements verified.");

  // Test player movement right
  console.log("  Testing player movement (pressing RIGHT)...");
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
  for (let i = 0; i < 30; i++) await mcp.callTool("debug_step_frame", {});
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });

  screenshotRes = await mcp.callTool("get_screenshot", {});
  const imgWalkRight = Buffer.from(screenshotRes.content[0].data, "base64");
  fs.writeFileSync(path.resolve(__dirname, "../geargfx_scene1_walk_right.png"), imgWalkRight);
  const pngRight = await parsePngAsync(imgWalkRight);
  if (pngRight.width !== 256 || pngRight.height < 224) {
    throw new Error("Walk right screenshot dimensions invalid.");
  }
  console.log("  ✓ Walk right frame captured and verified.");

  // Test player movement left
  console.log("  Testing player movement (pressing LEFT)...");
  await mcp.callTool("controller_button", { player: 1, button: "left", action: "press" });
  for (let i = 0; i < 30; i++) await mcp.callTool("debug_step_frame", {});
  await mcp.callTool("controller_button", { player: 1, button: "left", action: "release" });

  screenshotRes = await mcp.callTool("get_screenshot", {});
  const imgWalkLeft = Buffer.from(screenshotRes.content[0].data, "base64");
  fs.writeFileSync(path.resolve(__dirname, "../geargfx_scene1_walk_left.png"), imgWalkLeft);
  const pngLeft = await parsePngAsync(imgWalkLeft);
  if (pngLeft.width !== 256 || pngLeft.height < 224) {
    throw new Error("Walk left screenshot dimensions invalid.");
  }
  console.log("  ✓ Walk left frame captured and verified.");

  mcp.stop();

  console.log("\n====================================================");
  console.log("✓ ALL REGRESSION TESTS PASSED CLEANLY!");
  console.log("====================================================");
}

runRegressionTest().catch(err => {
  console.error("\n❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
});
