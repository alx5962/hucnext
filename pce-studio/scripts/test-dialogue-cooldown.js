const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  console.log("Stepping 30 frames to let scene initialize...");
  for (let i = 0; i < 30; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  console.log("Holding right for 120 frames to reach actor...");
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
  for (let i = 0; i < 120; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });

  console.log("Step 1 frame, then press button I to open dialogue...");
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
  await mcp.callTool("debug_step_frame", {});
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });

  console.log("Immediately mash Button I and D-pad within the 15-frame cooldown (frames 1-10)...");
  for (let f = 0; f < 5; f++) {
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
    await mcp.callTool("debug_step_frame", {});
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });
    await mcp.callTool("debug_step_frame", {});
  }

  // We are at ~frame 11 after dialogue opened. Cooldown is 15 frames.
  // Check that dialogue box (UI frame tile 0xE0 at row 23, col 0) is STILL present!
  const batMid = await mcp.callTool("read_memory", {
    area: 4,
    offset: "02E0",
    size: 2
  });
  console.log("Tile at (row 23, col 0) during cooldown:", batMid.content ? batMid.content[0].text : batMid);
  const dataStr = batMid.content ? JSON.stringify(batMid.content[0]) : "";
  if (!dataStr.includes("E0") && !dataStr.includes("e0")) {
    throw new Error("FAIL: Dialogue closed prematurely during cooldown!");
  }
  console.log("✔ SUCCESS: Dialogue remained open despite rapid button presses during cooldown window!");

  // Step 10 more frames to allow the 15-frame cooldown to expire
  console.log("Stepping 10 frames to let cooldown expire...");
  for (let i = 0; i < 10; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  // Now press directional buttons: verify they DO NOT dismiss dialogue
  console.log("Testing directional button: pressing RIGHT after cooldown...");
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
  await mcp.callTool("debug_step_frame", {});
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });
  await mcp.callTool("debug_step_frame", {});

  const batDir = await mcp.callTool("read_memory", {
    area: 4,
    offset: "02E0",
    size: 2
  });
  const dataDirStr = batDir.content ? JSON.stringify(batDir.content[0]) : "";
  if (!dataDirStr.includes("E0") && !dataDirStr.includes("e0")) {
    throw new Error("FAIL: Directional button closed dialogue!");
  }
  console.log("✔ SUCCESS: Directional buttons do not dismiss dialogue!");

  // Now press Button I to deliberately dismiss dialogue
  console.log("Now pressing Button I to dismiss dialogue...");
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
  for (let i = 0; i < 3; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });
  for (let i = 0; i < 5; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  const batClosed = await mcp.callTool("read_memory", {
    area: 4,
    offset: "02E0",
    size: 2
  });
  console.log("Tile at (row 23, col 0) after deliberate Button I dismiss:", batClosed.content ? batClosed.content[0].text : batClosed);
  const dataClosedStr = batClosed.content?.[0]?.data || "";
  if (dataClosedStr.includes("E0") || dataClosedStr.includes("e0")) {
    throw new Error("FAIL: Dialogue did not close when Button I was pressed after cooldown!");
  }
  console.log("✔ SUCCESS: Dialogue closed cleanly and restored background tile (" + dataClosedStr + ")!");

  mcp.stop();
  console.log("=== ALL DIALOGUE INPUT COOLDOWN TESTS PASSED ===");
  process.exit(0);
})().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
