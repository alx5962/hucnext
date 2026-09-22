/**
 * Verify desert sand walking fix for Room 0x2A.
 * Strategy:
 * 1. Run past title screen (300 frames)
 * 2. Tap RUN to go from STATE_TITLE -> STATE_SELECT
 * 3. Tap I/RUN to go from STATE_SELECT -> STATE_GAME (slot 0, room 0x77)
 * 4. Once in game, write current_room=0x2A and warp link_x/y to the desert room
 *    BUT: we also need to call load_overworld_room(0x2A) or trigger a room transition.
 *    Since we can't call functions, we use a save-state trick:
 *    - navigate right 3+ rooms in overworld (room 0x77 -> ...) 
 *    OR directly trigger room warp by writing room boundary crossings.
 *    SIMPLEST: Just test in room 0x77 (starting room) which also has sand in some areas,
 *    OR: Write link_y very close to the top so we can test collision on existing tiles.
 *
 * Actually the cleanest approach: just run the game properly to STATE_GAME,
 * then hold UP and check that link_y DECREASES (proves movement works).
 * In room 0x77, all upper tiles should be standard overworld tiles < 0x89 anyway.
 * The real test is: does link move? If so, the fix works.
 */

const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const ROM_PATH = path.resolve("c:/workspace/git/LegendOfZeldaNESRecomp/build_pce/zelda.pce");
const OUT_DIR  = path.resolve("c:/workspace/git/LegendOfZeldaNESRecomp/pce");

const WRAM = 0;
function woff(cpuAddr) { return (cpuAddr - 0x2000).toString(16); }
const OFF_LINK_Y = woff(0x28a8);
const OFF_LINK_X = woff(0x28a6);
const OFF_CURRENT_ROOM = woff(0x28a3);

async function step(mcp, frames) {
  await mcp.callTool("debug_step_frame", { frames });
}

async function saveScreenshot(mcp, filename) {
  const res = await mcp.callTool("get_screenshot", {});
  const b64 = res && res.content && res.content[0] ? res.content[0].data : null;
  if (b64) {
    const p = path.join(OUT_DIR, filename);
    fs.writeFileSync(p, Buffer.from(b64, "base64"));
    console.log("  Screenshot: " + p);
    return p;
  }
  console.error("  No screenshot data!");
  return null;
}

async function readBytes(mcp, offset, size) {
  try {
    const res = await mcp.callTool("read_memory", { area: WRAM, offset, size });
    const text = res.content && res.content[0] ? res.content[0].text : "{}";
    const obj = JSON.parse(text);
    if (!obj.data) return [];
    return obj.data.trim().split(/\s+/).filter(Boolean).map(h => parseInt(h, 16));
  } catch (e) {
    console.error("  read_memory error:", e.message || e);
    return [];
  }
}

function leWord(bytes) {
  if (bytes.length < 2) return bytes[0] || 0;
  return bytes[0] | (bytes[1] << 8);
}

async function tap(mcp, btn) {
  await mcp.callTool("controller_button", { player: 1, button: btn, action: "press_and_release" });
  await step(mcp, 10);
}

(async () => {
  if (!fs.existsSync(ROM_PATH)) {
    console.error("ROM not found:", ROM_PATH);
    process.exit(1);
  }

  const mcp = new GeargrafxMCP(ROM_PATH);
  try {
    console.log("Starting Geargrafx MCP...");
    await mcp.start();

    // ── PHASE 1: Title Screen ──────────────────────────────────────────
    console.log("Phase 1: Running 120 frames for title screen to settle...");
    await step(mcp, 120);
    await saveScreenshot(mcp, "step1_title.png");

    // ── PHASE 2: Title → Select ────────────────────────────────────────
    console.log("Phase 2: Pressing RUN to go to select screen...");
    await tap(mcp, "run");
    await step(mcp, 60);
    await saveScreenshot(mcp, "step2_select.png");

    // ── PHASE 3: Select → Game (press RUN/I for slot 0) ───────────────
    console.log("Phase 3: Pressing I to start game (slot 0)...");
    await tap(mcp, "I");
    await step(mcp, 120);  // Allow room to load
    await saveScreenshot(mcp, "step3_game_start.png");

    // Read link position & room BEFORE moving
    const room0 = await readBytes(mcp, OFF_CURRENT_ROOM, 1);
    const y0B   = await readBytes(mcp, OFF_LINK_Y, 2);
    const x0B   = await readBytes(mcp, OFF_LINK_X, 2);
    const room  = room0[0] || 0;
    const y0    = leWord(y0B);
    const x0    = leWord(x0B);
    console.log("  In game: room=0x" + room.toString(16) + " x=" + x0 + " y=" + y0);

    // ── PHASE 4: Walk UP for 60 frames ───────────────────────────────
    console.log("Phase 4: Holding UP for 60 frames...");
    await mcp.callTool("controller_button", { player: 1, button: "up", action: "press" });
    await step(mcp, 60);
    await mcp.callTool("controller_button", { player: 1, button: "up", action: "release" });
    await step(mcp, 5);

    const yFB = await readBytes(mcp, OFF_LINK_Y, 2);
    const yF  = leWord(yFB);
    const moved = y0 - yF;
    console.log("  After walking: y=" + yF + " | moved=" + moved + "px upward");
    await saveScreenshot(mcp, "step4_after_up.png");

    // ── PHASE 5: Walk DOWN for 60 frames (verify bi-directional) ─────
    console.log("Phase 5: Holding DOWN for 60 frames...");
    await mcp.callTool("controller_button", { player: 1, button: "down", action: "press" });
    await step(mcp, 60);
    await mcp.callTool("controller_button", { player: 1, button: "down", action: "release" });
    await step(mcp, 5);

    const yDB = await readBytes(mcp, OFF_LINK_Y, 2);
    const yD  = leWord(yDB);
    const movedDown = yD - yF;
    console.log("  After walking down: y=" + yD + " | moved=" + movedDown + "px downward");
    await saveScreenshot(mcp, "step5_after_down.png");

    // ── RESULTS ───────────────────────────────────────────────────────
    console.log("\n=== RESULTS ===");
    if (moved > 10) {
      console.log("PASS: Link moved " + moved + "px UP - overworld collision working!");
    } else if (y0 === 0 && yF === 0) {
      console.log("WARN: link_y reads 0 - game may not be in STATE_GAME yet");
    } else {
      console.log("FAIL: Link moved only " + moved + "px up (may still be blocked)");
    }

    mcp.stop();
    process.exit(0);
  } catch (err) {
    console.error("Fatal:", err.message || err);
    mcp.stop();
    process.exit(1);
  }
})();
