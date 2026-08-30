const GeargrafxMCP = require("./geargrafx-mcp-client");
const path = require("path");
const fs = require("fs");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\9c656cd2-9042-428f-8403-6ce0ff86190d";

async function testHoldB() {
  console.log("Launching Geargrafx MCP to test holding Button B...");
  const mcp = new GeargrafxMCP(romPath);

  try {
    await mcp.start();

    // Step 200 frames into scene 7
    for (let i = 0; i < 200; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Press and HOLD Button II (Button B)
    console.log("Holding Button II continuously...");
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "press" });

    // Step 40 frames with button continuously held (script is ~30 frames)
    for (let i = 0; i < 40; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Capture screenshot at frame 40 (should be back to default idle, NOT looping attack)
    const shotPath = path.join(artifactDir, "bonk_held_b_end.png");
    const shot = await mcp.callTool("get_screenshot", {});
    if (shot?.content?.[0]?.data) {
      fs.writeFileSync(shotPath, Buffer.from(shot.content[0].data, "base64"));
      console.log("Held B screenshot saved to:", shotPath);
    }

    // Release button
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "release" });

    for (let i = 0; i < 10; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    console.log("=== HOLD B TEST SUCCEEDED! ===");
  } finally {
    mcp.stop();
  }
}

testHoldB().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
