const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\c3a09e3f-4072-4820-a4bb-b83205c5b5d7";
const outPngPath = path.join(artifactDir, "media__emulator_screenshot.png");

const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();
    console.log("Started MCP server...");

    // Step 60 frames initial
    for (let i = 0; i < 60; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Press right button on controller 1
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });

    // Step 90 frames to walk player into Trigger 1 (X=232px)
    for (let i = 0; i < 90; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Release right button
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });

    // Step 30 frames after teleport
    for (let i = 0; i < 30; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const res = await mcp.callTool("get_screenshot", {});
    const base64Data = res.content[0].data;
    const buf = Buffer.from(base64Data, "base64");

    fs.writeFileSync(outPngPath, buf);
    console.log("Saved trigger entry screenshot to:", outPngPath);

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
