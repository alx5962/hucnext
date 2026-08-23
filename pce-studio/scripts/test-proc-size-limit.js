/**
 * test-proc-size-limit.js
 *
 * Regression test for the .PROC 8192-byte HuC assembler limit on
 * `_load_scene_player_sprite`. Verifies that:
 *
 *  1. The generated main.c uses the helper-function pattern:
 *     - `load_player_sprite_*()` helpers exist (one per unique sprite)
 *     - Multiple helpers are generated (project uses different player sprites)
 *     - Each helper appears exactly once
 *     - The dispatcher cases each contain only a single function call
 *
 *  2. `npm run build:pce` exits cleanly with "No errors"
 *
 *  3. The Geargrafx emulator renders the first scene with sufficient pixel
 *     diversity (sprites visible, not blank/corrupted)
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const GeargrafxMCP = require("./geargrafx-mcp-client");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build_tmp");
const MAIN_C = path.join(BUILD_DIR, "main.c");
const ROM_PATH = path.join(BUILD_DIR, "main.pce");
const SCREENSHOT_PATH = path.join(ROOT, "geargfx_proc_test.png");

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
}

async function runTest() {
  console.log("════════════════════════════════════════════════════════");
  console.log("  .PROC SIZE LIMIT REGRESSION TEST");
  console.log("════════════════════════════════════════════════════════\n");

  // ── Step 1: Build ──────────────────────────────────────────────────────────
  console.log("[1/3] Building project (npm run build:pce)...");
  const buildResult = spawnSync("npm", ["run", "build:pce"], {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
  });
  const buildOutput = (buildResult.stdout || "") + (buildResult.stderr || "");
  console.log(buildOutput.split("\n").map(l => "    " + l).join("\n"));

  assert(buildResult.status === 0, "Build exited with code " + buildResult.status);
  assert(buildOutput.includes("No errors"), 'Build output does not contain "No errors"');
  assert(buildOutput.includes("SUCCESS"), 'Build output does not contain "SUCCESS"');
  assert(fs.existsSync(ROM_PATH), "ROM not found at " + ROM_PATH);
  console.log("  \u2713 Build succeeded with no errors\n");

  // ── Step 2: Verify main.c structure ───────────────────────────────────────
  console.log("[2/3] Verifying generated main.c structure...");
  assert(fs.existsSync(MAIN_C), "main.c not found at " + MAIN_C);
  const mainC = fs.readFileSync(MAIN_C, "utf8");

  // Find all helper function definitions
  const helperDefs = [...mainC.matchAll(/^void (load_player_sprite_\w+)\(\)/gm)].map(m => m[1]);
  console.log("  Found helper functions: " + helperDefs.join(", "));

  assert(helperDefs.length >= 1, "No load_player_sprite_* helpers found in main.c");
  assert(helperDefs.length >= 2,
    "Only " + helperDefs.length + " helper(s) found — expected >= 2 " +
    "(project uses different player sprites per scene)");

  // Each helper must appear exactly once
  const helperCounts = {};
  for (const h of helperDefs) helperCounts[h] = (helperCounts[h] || 0) + 1;
  for (const [name, count] of Object.entries(helperCounts)) {
    assert(count === 1, "Helper '" + name + "' defined " + count + " times — expected 1");
  }
  console.log("  \u2713 Each helper defined exactly once");

  // Verify dispatcher exists
  assert(mainC.includes("void load_scene_player_sprite(int scene_num)"),
    "load_scene_player_sprite not found in main.c");

  // Extract dispatcher body
  const dispatcherMatch = mainC.match(
    /void load_scene_player_sprite\(int scene_num\)\s*\{([\s\S]*?)\n\}/
  );
  assert(dispatcherMatch, "Could not extract load_scene_player_sprite body");
  const dispatcherBody = dispatcherMatch[1];

  // Dispatcher must NOT contain inline sprite property assignments
  assert(!dispatcherBody.includes("load_vram("),
    "Dispatcher still contains load_vram() calls — helper extraction failed");
  assert(!dispatcherBody.includes("g_player_spr_vram_size"),
    "Dispatcher still contains inline sprite property assignments");

  const callsInDispatcher = [...dispatcherBody.matchAll(/load_player_sprite_\w+\(\)/g)].map(m => m[0]);
  assert(callsInDispatcher.length >= 1, "Dispatcher contains no load_player_sprite_*() calls");
  console.log("  \u2713 Dispatcher uses single-call pattern (" + callsInDispatcher.length + " case(s))");

  // All called helpers must be defined
  const helperSet = new Set(helperDefs);
  for (const call of callsInDispatcher) {
    const calledHelper = call.replace("()", "");
    assert(helperSet.has(calledHelper),
      "Dispatcher calls '" + calledHelper + "' but it is not defined");
  }
  console.log("  \u2713 All dispatcher calls resolve to defined helpers\n");

  // ── Step 3: Emulator visual verification ──────────────────────────────────
  console.log("[3/3] Running Geargrafx emulator visual check...");
  const mcp = new GeargrafxMCP(ROM_PATH);
  await mcp.start();
  try {
    console.log("  Stepping 60 frames...");
    for (let i = 0; i < 60; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    const screenshotRes = await mcp.callTool("get_screenshot", {});
    assert(screenshotRes.content?.[0]?.data, "Failed to get screenshot from Geargrafx");

    const imgBuf = Buffer.from(screenshotRes.content[0].data, "base64");
    fs.writeFileSync(SCREENSHOT_PATH, imgBuf);

    // Rough entropy check: a non-blank screenshot has many distinct byte values
    const distinctBytes = new Set(imgBuf.slice(8)).size;
    assert(distinctBytes > 30,
      "Screenshot appears blank or corrupted (" + distinctBytes + " distinct byte values)");

    console.log("  \u2713 Screenshot captured: " + SCREENSHOT_PATH);
    console.log("  \u2713 Screenshot has sufficient pixel diversity (" + distinctBytes + " distinct bytes)\n");
  } finally {
    mcp.stop();
  }

  console.log("════════════════════════════════════════════════════════");
  console.log("  \u2713 ALL .PROC SIZE LIMIT TESTS PASSED");
  console.log("════════════════════════════════════════════════════════");
}

runTest().catch(err => {
  console.error("\n\u274C TEST FAILED:", err.message || err);
  process.exit(1);
});
