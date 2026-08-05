const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();

    // Step 30 frames to render initial scene and sprites
    for (let i = 0; i < 30; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const screenshotRes = await mcp.callTool("get_screenshot", {});
    console.log("=== SCREENSHOT MCP RESULT ===");
    console.log(screenshotRes);

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
