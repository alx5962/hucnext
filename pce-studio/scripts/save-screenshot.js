const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = process.env.ARTIFACT_DIR || "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\6e785bf3-1811-41d1-84c4-73dafd6d76fb";
const outPngPath = path.join(artifactDir, "media__emulator_screenshot.png");

const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();

    // Step 20 frames initial
    for (let i = 0; i < 20; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Press LEFT button
    await mcp.callTool("controller_button", { player: 1, button: "left", action: "press" });

    // Step 20 frames while moving LEFT
    for (let i = 0; i < 20; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const res = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(outPngPath, Buffer.from(res.content[0].data, "base64"));
    console.log("Saved Left-moving Scene 2 screenshot to:", outPngPath);

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
