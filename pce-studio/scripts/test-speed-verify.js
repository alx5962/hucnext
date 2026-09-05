const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const GeargrafxMCP = require("./geargrafx-mcp-client");

const buildDir = path.resolve(__dirname, "../build_gbs2_tmp");
const romPath = path.join(buildDir, "main.pce");
const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
const rawIncludeDir = path.resolve(__dirname, "../../include/huc");
const includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

async function main() {
  console.log("=== 1. Compiling main.c with HuC & PCEAS ===");
  try {
    execSync(`"${hucExe}" main.c`, { cwd: buildDir, stdio: "ignore", env: { ...process.env, PCE_INCLUDE: includeDir } });
  } catch (e) {
    if (!fs.existsSync(path.join(buildDir, "main.s"))) {
      console.error("HuC compilation failed without producing main.s:", e);
      process.exit(1);
    }
  }

  execSync(`"${pceasExe}" -raw main.s`, { cwd: buildDir, stdio: "ignore", env: { ...process.env, PCE_INCLUDE: includeDir } });
  console.log("Compilation successful! main.pce generated.");

  console.log("=== 2. Resolving wait_vsync symbol address ===");
  const symText = fs.readFileSync(path.join(buildDir, "main.sym"), "utf8");
  const m = symText.match(/\s+([0-9a-fA-F]+)\s+([0-9a-fA-F]+)\s+_?wait_vsync\s+/);
  if (!m) {
    console.error("Could not find wait_vsync in main.sym");
    process.exit(1);
  }
  const vsyncAddr = "0x" + parseInt(m[2], 16).toString(16);
  console.log("wait_vsync address:", vsyncAddr);

  console.log("=== 3. Launching Geargrafx MCP ===");
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Step 60 frames to complete scene load
  for (let i = 0; i < 60; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  // Set breakpoint at wait_vsync
  await mcp.callTool("set_breakpoint", { address: vsyncAddr });

  // Press right to walk
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });

  console.log("=== 4. Profiling 60 frames of walking in path_to_sample_town ===");
  let missedVblanks = 0;
  const scanlines = [];
  const irqCounts = [];

  for (let f = 0; f < 60; f++) {
    await mcp.callTool("debug_continue", {});
    const memRes = await mcp.callTool("read_memory", { area: 0, offset: "0241", size: 1 });
    let irqCnt = 0;
    if (memRes && memRes.content && memRes.content[0] && memRes.content[0].text) {
      try {
        const parsed = JSON.parse(memRes.content[0].text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          irqCnt = parsed[0];
        } else if (typeof parsed === "number") {
          irqCnt = parsed;
        }
      } catch (e) {}
    }
    irqCounts.push(irqCnt);
    if (irqCnt > 0) {
      missedVblanks++;
    }

    const vdcRes = await mcp.callTool("get_huc6270_status", {});
    let sl = null;
    if (vdcRes && vdcRes.content && vdcRes.content[0] && vdcRes.content[0].text) {
      try {
        const vdcData = JSON.parse(vdcRes.content[0].text);
        sl = vdcData.y !== undefined ? vdcData.y : null;
      } catch (e) {}
    }
    if (sl !== null) {
      scanlines.push(sl);
    }
  }

  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });
  mcp.stop();

  console.log("\n=== PERFORMANCE RESULTS ===");
  console.log(`Total Frames Measured: 60`);
  console.log(`Missed VBLANK Frames (Overflow / Slowdown): ${missedVblanks} / 60`);
  if (scanlines.length > 0) {
    const minSl = Math.min(...scanlines);
    const maxSl = Math.max(...scanlines);
    const avgSl = (scanlines.reduce((a, b) => a + b, 0) / scanlines.length).toFixed(1);
    console.log(`Scanline when reaching wait_vsync: min=${minSl}, max=${maxSl}, avg=${avgSl} (NTSC VBLANK at 240)`);
  }
  console.log(`IRQ counts sample:`, irqCounts.slice(0, 15));

  if (missedVblanks === 0) {
    console.log("\n>>> SUCCESS: LOCKED 60 FPS! No frames missed VBLANK! <<<");
  } else {
    console.log(`\n>>> WARNING: ${missedVblanks} frames missed VBLANK! <<<`);
  }
}

main().catch((err) => {
  console.error("Error running test:", err);
  process.exit(1);
});
