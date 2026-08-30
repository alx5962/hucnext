const GeargrafxMCP = require("./geargrafx-mcp-client");
const path = require("path");
const fs = require("fs");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\bcc1e76c-ef26-4ea4-83fa-ec9982ce3c8e";
const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();

    // Step 60 frames to stabilize
    for (let i = 0; i < 60; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    let shot = await mcp.callTool("get_screenshot", {});
    if (shot?.content?.[0]?.data) {
      fs.writeFileSync(path.join(artifactDir, "parallax_0.png"), Buffer.from(shot.content[0].data, "base64"));
      console.log("Saved parallax_0.png");
    }

    // Press right and move for 120 frames
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
    for (let i = 0; i < 120; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    shot = await mcp.callTool("get_screenshot", {});
    if (shot?.content?.[0]?.data) {
      fs.writeFileSync(path.join(artifactDir, "parallax_120.png"), Buffer.from(shot.content[0].data, "base64"));
      console.log("Saved parallax_120.png");
    }

    // Move more right for another 120 frames
    for (let i = 0; i < 120; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    shot = await mcp.callTool("get_screenshot", {});
    if (shot?.content?.[0]?.data) {
      fs.writeFileSync(path.join(artifactDir, "parallax_240.png"), Buffer.from(shot.content[0].data, "base64"));
      console.log("Saved parallax_240.png");
    }

    await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });
    console.log("Done test-parallax");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mcp.stop();
  }
})();
