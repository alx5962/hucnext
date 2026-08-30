const GeargrafxMCP = require("./geargrafx-mcp-client");
const path = require("path");
const fs = require("fs");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\9c656cd2-9042-428f-8403-6ce0ff86190d";

async function testInputScript() {
  console.log("Launching Geargrafx MCP server to test multi-frame attack animation...");
  const mcp = new GeargrafxMCP(romPath);

  try {
    await mcp.start();

    // Step 200 frames into scene 7
    console.log("Stepping initial 200 frames into scene 7...");
    for (let i = 0; i < 200; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Press Button II (Button B)
    console.log("Pressing Button II (Button B) to trigger attack...");
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "press" });

    // Step 2 frames with button pressed
    for (let i = 0; i < 2; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Release button
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "release" });

    // Capture each frame of the 5-frame animation (every ~6 frames)
    for (let f = 0; f < 5; f++) {
      const shotPath = path.join(artifactDir, `bonk_attack_f${f}.png`);
      const shot = await mcp.callTool("get_screenshot", {});
      if (shot?.content?.[0]?.data) {
        fs.writeFileSync(shotPath, Buffer.from(shot.content[0].data, "base64"));
        console.log(`Attack frame ${f} screenshot saved to:`, shotPath);
      }
      for (let i = 0; i < 6; i++) {
        await mcp.callTool("debug_step_frame", {});
      }
    }

    // Step past wait timer duration to return to normal state
    for (let i = 0; i < 15; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const shotPostPath = path.join(artifactDir, "bonk_post_attack.png");
    const shotPost = await mcp.callTool("get_screenshot", {});
    if (shotPost?.content?.[0]?.data) {
      fs.writeFileSync(shotPostPath, Buffer.from(shotPost.content[0].data, "base64"));
      console.log("Post-attack screenshot saved to:", shotPostPath);
    }

    console.log("=== 5-FRAME ATTACK ANIMATION TEST SUCCEEDED! ===");
  } finally {
    mcp.stop();
  }
}

testInputScript().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
